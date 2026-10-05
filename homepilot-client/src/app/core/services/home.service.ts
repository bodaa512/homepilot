import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/api.model';
import {
  CreateHomePayload,
  Home,
  HomeMember,
  HomeMembershipEntry,
  HomeSummaryCounts,
  HomeMemberRole,
  InviteMemberPayload,
  UpdateHomePayload,
} from '../models/home.model';

const ACTIVE_HOME_KEY = 'hp_active_home';

/**
 * كل شاشة تانية (الأجهزة، المستندات، المصاريف، الصيانة) مربوطة ببيت
 * واحد (homeId) — الخدمة دي بتحمّل بيوت المستخدم مرة واحدة وبتتابع
 * أنهي بيت "شغّال" دلوقتي، بحيث باقي الخدمات تقدر تستخدم activeHomeId
 * من غير ما كل شاشة تعمل النداء ده لوحدها.
 */
@Injectable({ providedIn: 'root' })
export class HomeService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/homes`;

  private readonly homesSignal = signal<Home[]>([]);
  private readonly loadedSignal = signal(false);
  private readonly selectedHomeIdSignal = signal<string | null>(this.readStoredHomeId());

  /** دور المستخدم في كل بيت (homeId → role) — عشان نعرض "تعديل" لمالك البيت بس، زي ما السيرفر بيشترط. */
  private readonly rolesSignal = signal<Record<string, HomeMemberRole>>({});

  readonly homes = this.homesSignal.asReadonly();
  readonly loaded = this.loadedSignal.asReadonly();

  /** أول بيت متاح كـ default لو مفيش اختيار محفوظ أو الاختيار المحفوظ بقى مش موجود. */
  readonly activeHomeId = computed<string | null>(() => {
    const stored = this.selectedHomeIdSignal();
    const homes = this.homesSignal();
    if (stored && homes.some((h) => h._id === stored)) return stored;
    return homes[0]?._id ?? null;
  });

  readonly activeHome = computed<Home | null>(
    () => this.homesSignal().find((h) => h._id === this.activeHomeId()) ?? null,
  );

  private loadRequest$: Observable<Home[]> | null = null;

  /** يحمّل البيوت مرة واحدة (ولو اتنادت تاني بعد النجاح، بترجّع نفس القائمة الحالية على طول). */
  load(): Observable<Home[]> {
    if (this.loadedSignal()) {
      return new Observable<Home[]>((subscriber) => {
        subscriber.next(this.homesSignal());
        subscriber.complete();
      });
    }
    if (!this.loadRequest$) {
      this.loadRequest$ = this.http.get<ApiEnvelope<{ homes: HomeMembershipEntry[] }>>(this.base).pipe(
        tap((res) => this.rememberRoles(res.data.homes)),
        map((res) => res.data.homes.map((entry) => entry.home)),
        tap((homes) => {
          this.homesSignal.set(homes);
          this.loadedSignal.set(true);
          this.loadRequest$ = null;
        }),
      );
    }
    return this.loadRequest$;
  }

  /** بيعيد تحميل قايمة البيوت من السيرفر (من غير ما يمسح البيت الشغّال) — بعد ما بيت يتضاف من مكان تاني زي الوحدات. */
  refresh(): Observable<Home[]> {
    return this.http.get<ApiEnvelope<{ homes: HomeMembershipEntry[] }>>(this.base).pipe(
      tap((res) => this.rememberRoles(res.data.homes)),
      map((res) => res.data.homes.map((entry) => entry.home)),
      tap((homes) => {
        this.homesSignal.set(homes);
        this.loadedSignal.set(true);
      }),
    );
  }

  /** هل المستخدم يقدر يعدّل البيت ده؟ (مالك البيت بس — صلاحية home:update في السيرفر.) */
  canEdit(homeId: string): boolean {
    return this.rolesSignal()[homeId] === 'OWNER';
  }

  /** تعديل بيانات بيت — بيحدّث القايمة المحلية بالنسخة اللي رجعت من السيرفر. */
  update(homeId: string, payload: UpdateHomePayload): Observable<Home> {
    return this.http.put<ApiEnvelope<{ home: Home }>>(`${this.base}/${homeId}`, payload).pipe(
      map((res) => res.data.home),
      tap((home) => this.homesSignal.update((list) => list.map((h) => (h._id === home._id ? { ...h, ...home } : h)))),
    );
  }

  create(payload: CreateHomePayload): Observable<Home> {
    return this.http.post<ApiEnvelope<{ home: Home }>>(this.base, payload).pipe(
      map((res) => res.data.home),
      tap((home) => {
        this.homesSignal.update((list) => [...list, home]);
        this.rolesSignal.update((roles) => ({ ...roles, [home._id]: 'OWNER' }));
        this.setActiveHome(home._id);
      }),
    );
  }

  members(homeId: string): Observable<HomeMember[]> {
    return this.http
      .get<ApiEnvelope<{ members: HomeMember[] }>>(`${this.base}/${homeId}/members`)
      .pipe(map((res) => res.data.members));
  }

  inviteMember(homeId: string, payload: InviteMemberPayload): Observable<HomeMember> {
    return this.http
      .post<ApiEnvelope<{ membership: HomeMember }>>(`${this.base}/${homeId}/members/invite`, payload)
      .pipe(map((res) => res.data.membership));
  }

  summary(homeId: string): Observable<HomeSummaryCounts> {
    return this.http
      .get<ApiEnvelope<HomeSummaryCounts>>(`${this.base}/${homeId}/summary`)
      .pipe(map((res) => res.data));
  }

  setActiveHome(homeId: string): void {
    this.selectedHomeIdSignal.set(homeId);
    try {
      localStorage.setItem(ACTIVE_HOME_KEY, homeId);
    } catch {
      /* الوضع الخاص ممكن يمنع التخزين — مش مشكلة، هيفضل الاختيار لحد ما الصفحة تتقفل */
    }
  }

  /** بتتنادى من app-shell عند تسجيل الخروج، عشان بيانات مستخدم متفضلش لمستخدم تاني على نفس الجهاز. */
  reset(): void {
    this.homesSignal.set([]);
    this.rolesSignal.set({});
    this.loadedSignal.set(false);
    this.selectedHomeIdSignal.set(null);
    this.loadRequest$ = null;
    try {
      localStorage.removeItem(ACTIVE_HOME_KEY);
    } catch {
      /* ignore */
    }
  }

  private rememberRoles(entries: HomeMembershipEntry[]): void {
    this.rolesSignal.set(Object.fromEntries(entries.map((e) => [e.home._id, e.role])));
  }

  private readStoredHomeId(): string | null {
    try {
      return localStorage.getItem(ACTIVE_HOME_KEY);
    } catch {
      return null;
    }
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state.component';
import { ModalComponent } from '../../../../shared/ui/modal.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { HomeService } from '../../../../core/services/home.service';
import {
  CreateHomePayload,
  HOME_ROLE_LABELS,
  HOME_TYPE_LABELS,
  Home,
  HomeMember,
  HomeMemberRole,
  HomeType,
  UpdateHomePayload,
} from '../../../../core/models/home.model';
import { apiErrorMessage } from '../../../../core/utils/http-error.util';

type HomesState = 'loading' | 'ready' | 'error';

/**
 * شاشة "بيوتي" — عرض كل البيوت اللي المستخدم عضو فيها، اختيار البيت
 * "الشغّال" حاليًا (اللي باقي الشاشات بتتعامل معاه)، إضافة بيت جديد،
 * وإدارة أعضاء كل بيت (البيت ممكن يتشارك فيه أكتر من شخص في السيرفر).
 */
@Component({
  selector: 'hp-home-list',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, EmptyStateComponent, ModalComponent],
  template: `
    <hp-page-header title="بيوتي" subtitle="اختار البيت اللي عاوز تشتغل عليه، أو ضيف بيت جديد.">
      <button type="button" class="hp-btn hp-btn--primary hp-btn--sm" (click)="openForm()">+ بيت جديد</button>
    </hp-page-header>

    <div class="hp-alert hp-alert--error" *ngIf="state() === 'error'">
      {{ errorMessage() }}
      <button type="button" class="hp-btn hp-btn--ghost hp-btn--sm" (click)="fetch()">حاول تاني</button>
    </div>

    <div class="hp-grid-skeleton" *ngIf="state() === 'loading'">
      <div class="hp-skeleton" style="height: 130px" *ngFor="let i of [1, 2, 3]"></div>
    </div>

    <ng-container *ngIf="state() === 'ready'">
      <hp-empty-state
        *ngIf="homes().length === 0"
        title="لسه معملتش أي بيت"
        hint="ضيف بيتك الأول عشان تقدر تسجّل أجهزتك ومصاريفك وصيانتك."
      >
        <button type="button" class="hp-btn hp-btn--primary" (click)="openForm()">أضف أول بيت</button>
      </hp-empty-state>

      <div class="homes-grid" *ngIf="homes().length > 0">
        <div class="home-card" *ngFor="let home of homes()" [class.home-card--active]="home._id === activeHomeId()">
          <div class="home-card__top">
            <h3>{{ home.name }}</h3>
            <span class="hp-badge hp-badge--ok" *ngIf="home._id === activeHomeId()">شغّال دلوقتي</span>
          </div>
          <p class="hp-muted">{{ typeLabel(home.type) }}<ng-container *ngIf="home.city"> · {{ home.city }}</ng-container></p>
          <p class="hp-muted home-card__address" *ngIf="home.address">{{ home.address }}</p>

          <div class="home-card__actions">
            <button
              type="button"
              class="hp-btn hp-btn--sm"
              [class.hp-btn--primary]="home._id !== activeHomeId()"
              [class.hp-btn--ghost]="home._id === activeHomeId()"
              [disabled]="home._id === activeHomeId()"
              (click)="selectHome(home)"
            >
              {{ home._id === activeHomeId() ? 'ده اللي شغّال' : 'اشتغل على البيت ده' }}
            </button>
            <button type="button" class="hp-btn hp-btn--ghost hp-btn--sm" (click)="toggleMembers(home)">
              {{ expandedId() === home._id ? 'اقفل الأعضاء' : 'الأعضاء' }}
            </button>
            <button
              type="button"
              class="hp-btn hp-btn--ghost hp-btn--sm"
              *ngIf="canEdit(home)"
              (click)="openEdit(home)"
            >
              تعديل
            </button>
          </div>

          <div class="members" *ngIf="expandedId() === home._id">
            <div class="hp-alert hp-alert--error" *ngIf="membersError()">{{ membersError() }}</div>
            <p class="hp-muted" *ngIf="membersLoading()">بيتم التحميل...</p>

            <div class="member" *ngFor="let m of members()">
              <span class="avatar-sm">{{ initials(m.user.fullName) }}</span>
              <span class="member__info">
                <strong>{{ m.user.fullName }}</strong>
                <span class="hp-muted">{{ m.user.email }}</span>
              </span>
              <span class="hp-badge hp-badge--info">{{ roleLabel(m.role) }}</span>
            </div>

            <ng-container *ngIf="inviteTarget() === home._id; else inviteToggle">
              <div class="hp-alert hp-alert--error" *ngIf="inviteError()">{{ inviteError() }}</div>
              <form class="invite-form" (submit)="submitInvite($event, home)">
                <input
                  type="email"
                  required
                  placeholder="إيميل الشخص (لازم يكون عنده حساب HomePilot)"
                  [value]="inviteEmail()"
                  (input)="inviteEmail.set($any($event.target).value)"
                />
                <select [value]="inviteRole()" (change)="inviteRole.set($any($event.target).value)">
                  <option value="MEMBER">عضو</option>
                  <option value="ADMIN">مشرف</option>
                  <option value="VIEWER">مشاهد فقط</option>
                </select>
                <button type="submit" class="hp-btn hp-btn--primary hp-btn--sm" [disabled]="inviting()">
                  <span class="hp-spin" *ngIf="inviting()"></span> ادعُ
                </button>
              </form>
            </ng-container>
            <ng-template #inviteToggle>
              <button type="button" class="hp-btn hp-btn--sm" (click)="openInvite(home)">+ ادعُ عضو</button>
            </ng-template>
          </div>
        </div>
      </div>
    </ng-container>

    <hp-modal *ngIf="showForm()" [title]="editingId() ? 'تعديل البيت' : 'بيت جديد'" (closed)="closeForm()">
      <div class="hp-alert hp-alert--error" *ngIf="createError()">{{ createError() }}</div>
      <form class="hp-form-grid" (submit)="submitForm($event)">
        <div class="hp-field hp-field--full">
          <label for="newHomeName">اسم البيت</label>
          <input
            id="newHomeName"
            type="text"
            required
            placeholder="مثلاً: شقة المعادي"
            [value]="form.name()"
            (input)="form.name.set($any($event.target).value)"
          />
        </div>
        <div class="hp-field">
          <label for="newHomeType">نوع البيت</label>
          <select id="newHomeType" [value]="form.type()" (change)="form.type.set($any($event.target).value)">
            <option *ngFor="let opt of typeOptions" [value]="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="hp-field">
          <label for="newHomeCity">المدينة (اختياري)</label>
          <input
            id="newHomeCity"
            type="text"
            [value]="form.city()"
            (input)="form.city.set($any($event.target).value)"
          />
        </div>
        <div class="hp-field hp-field--full">
          <label for="newHomeAddress">العنوان (اختياري)</label>
          <input
            id="newHomeAddress"
            type="text"
            [value]="form.address()"
            (input)="form.address.set($any($event.target).value)"
          />
        </div>
        <div class="hp-form-actions hp-field--full">
          <button type="submit" class="hp-btn hp-btn--primary" [disabled]="creating()">
            <span class="hp-spin" *ngIf="creating()"></span>
            {{ creating() ? (editingId() ? 'بيتم الحفظ...' : 'بيتم الإضافة...') : (editingId() ? 'احفظ التعديلات' : 'أضف البيت') }}
          </button>
        </div>
      </form>
    </hp-modal>
  `,
  styles: [
    `
      .hp-grid-skeleton { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--hp-space-4); }

      .homes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: var(--hp-space-4);
      }
      .home-card {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: var(--hp-space-4);
        background: var(--hp-surface);
        border: 1px solid var(--hp-border);
        border-radius: var(--hp-radius-md);
      }
      .home-card--active { border-color: var(--hp-ok); box-shadow: 0 0 0 1px var(--hp-ok) inset; }
      .home-card__top { display: flex; align-items: center; justify-content: space-between; gap: var(--hp-space-2); }
      .home-card__top h3 { font-size: var(--hp-text-md); }
      .home-card__address { margin-bottom: var(--hp-space-2); }
      .home-card__actions { display: flex; gap: var(--hp-space-2); margin-top: auto; flex-wrap: wrap; }

      .members {
        display: flex;
        flex-direction: column;
        gap: var(--hp-space-2);
        margin-top: var(--hp-space-3);
        padding-top: var(--hp-space-3);
        border-top: 1px solid var(--hp-border);
      }
      .member { display: flex; align-items: center; gap: var(--hp-space-2); }
      .member__info { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
      .avatar-sm {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: var(--hp-navy-700);
        color: #fff;
        font-size: 11px;
        font-weight: var(--hp-weight-semi);
        flex: none;
      }
      .invite-form { display: flex; gap: var(--hp-space-2); flex-wrap: wrap; }
      .invite-form input { flex: 1; min-width: 160px; }
    `,
  ],
})
export class HomeListComponent implements OnInit {
  private readonly homeService = inject(HomeService);

  readonly state = signal<HomesState>('loading');
  readonly errorMessage = signal('');

  readonly homes = this.homeService.homes;
  readonly activeHomeId = this.homeService.activeHomeId;

  readonly showForm = signal(false);
  /** لو فيه قيمة، الفورم بيعدّل البيت ده بدل ما يضيف بيت جديد. */
  readonly editingId = signal<string | null>(null);
  readonly creating = signal(false);
  readonly createError = signal('');

  readonly expandedId = signal<string | null>(null);
  readonly members = signal<HomeMember[]>([]);
  readonly membersLoading = signal(false);
  readonly membersError = signal('');

  readonly inviteTarget = signal<string | null>(null);
  readonly inviteEmail = signal('');
  readonly inviteRole = signal<Exclude<HomeMemberRole, 'OWNER'>>('MEMBER');
  readonly inviting = signal(false);
  readonly inviteError = signal('');

  readonly typeOptions = Object.entries(HOME_TYPE_LABELS).map(([value, label]) => ({
    value: value as HomeType,
    label,
  }));

  readonly form = {
    name: signal(''),
    type: signal<HomeType>('apartment'),
    city: signal(''),
    address: signal(''),
  };

  ngOnInit(): void {
    this.fetch();
  }

  fetch(): void {
    this.state.set('loading');
    this.homeService.load().subscribe({
      next: () => this.state.set('ready'),
      error: (err: unknown) => {
        this.state.set('error');
        this.errorMessage.set(apiErrorMessage(err));
      },
    });
  }

  typeLabel(type: HomeType): string {
    return HOME_TYPE_LABELS[type] ?? type;
  }

  roleLabel(role: HomeMemberRole): string {
    return HOME_ROLE_LABELS[role] ?? role;
  }

  initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
  }

  selectHome(home: Home): void {
    this.homeService.setActiveHome(home._id);
  }

  // ------------------------------- الأعضاء -------------------------------
  toggleMembers(home: Home): void {
    if (this.expandedId() === home._id) {
      this.expandedId.set(null);
      this.inviteTarget.set(null);
      return;
    }
    this.expandedId.set(home._id);
    this.inviteTarget.set(null);
    this.loadMembers(home._id);
  }

  private loadMembers(homeId: string): void {
    this.membersLoading.set(true);
    this.membersError.set('');
    this.members.set([]);
    this.homeService.members(homeId).subscribe({
      next: (members) => {
        this.members.set(members);
        this.membersLoading.set(false);
      },
      error: (err: unknown) => {
        this.membersLoading.set(false);
        this.membersError.set(apiErrorMessage(err));
      },
    });
  }

  openInvite(home: Home): void {
    this.inviteEmail.set('');
    this.inviteRole.set('MEMBER');
    this.inviteError.set('');
    this.inviteTarget.set(home._id);
  }

  submitInvite(event: Event, home: Home): void {
    event.preventDefault();
    if (this.inviting()) return;
    const email = this.inviteEmail().trim();
    if (!email) {
      this.inviteError.set('اكتب إيميل الشخص.');
      return;
    }
    this.inviting.set(true);
    this.inviteError.set('');
    this.homeService.inviteMember(home._id, { email, role: this.inviteRole() }).subscribe({
      next: () => {
        this.inviting.set(false);
        this.inviteTarget.set(null);
        this.loadMembers(home._id);
      },
      error: (err: unknown) => {
        this.inviting.set(false);
        this.inviteError.set(apiErrorMessage(err, 'مقدرناش ندعوه — حاول تاني.'));
      },
    });
  }

  // ------------------------------- بيت جديد / تعديل بيت -------------------------------
  openForm(): void {
    this.editingId.set(null);
    this.form.name.set('');
    this.form.type.set('apartment');
    this.form.city.set('');
    this.form.address.set('');
    this.createError.set('');
    this.showForm.set(true);
  }

  canEdit(home: Home): boolean {
    return this.homeService.canEdit(home._id);
  }

  openEdit(home: Home): void {
    this.editingId.set(home._id);
    this.form.name.set(home.name);
    this.form.type.set(home.type);
    this.form.city.set(home.city ?? '');
    this.form.address.set(home.address ?? '');
    this.createError.set('');
    this.showForm.set(true);
  }

  closeForm(): void {
    if (this.creating()) return;
    this.showForm.set(false);
    this.editingId.set(null);
  }

  submitForm(event: Event): void {
    event.preventDefault();
    if (this.creating()) return;

    const name = this.form.name().trim();
    if (!name) {
      this.createError.set('اكتب اسم البيت.');
      return;
    }

    this.creating.set(true);
    this.createError.set('');

    const editId = this.editingId();
    if (editId) {
      // في التعديل بنبعت '' صريحة عشان المستخدم يقدر يمسح المدينة/العنوان.
      const payload: UpdateHomePayload = {
        name,
        type: this.form.type(),
        city: this.form.city().trim(),
        address: this.form.address().trim(),
      };
      this.homeService.update(editId, payload).subscribe({
        next: () => {
          this.creating.set(false);
          this.showForm.set(false);
          this.editingId.set(null);
        },
        error: (err: unknown) => {
          this.creating.set(false);
          this.createError.set(apiErrorMessage(err, 'مقدرناش نحفظ التعديلات — حاول تاني.'));
        },
      });
      return;
    }

    const payload: CreateHomePayload = {
      name,
      type: this.form.type(),
      city: this.form.city().trim() || undefined,
      address: this.form.address().trim() || undefined,
    };

    this.homeService.create(payload).subscribe({
      next: () => {
        this.creating.set(false);
        this.showForm.set(false);
      },
      error: (err: unknown) => {
        this.creating.set(false);
        this.createError.set(apiErrorMessage(err, 'مقدرناش نضيف البيت — حاول تاني.'));
      },
    });
  }
}

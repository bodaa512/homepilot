import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';
import { HpStatus, StatusBadgeComponent } from '../../../../shared/ui/status-badge.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state.component';
import { ModalComponent } from '../../../../shared/ui/modal.component';
import { SearchService } from '../../../../core/services/search.service';
import { HomeService } from '../../../../core/services/home.service';
import { AssetService } from '../../../../core/services/asset.service';
import { RoomService } from '../../../../core/services/room.service';
import { ASSET_CATEGORY_LABELS, Asset, AssetCategory, CreateAssetPayload } from '../../../../core/models/asset.model';
import { Room } from '../../../../core/models/room.model';
import { assetConditionView, warrantyView } from '../../../../core/utils/status.util';
import { formatArabicDate } from '../../../../core/utils/formatters';
import { apiErrorMessage } from '../../../../core/utils/http-error.util';

type Filter = 'all' | AssetCategory | 'warranty-soon';
type PageState = 'loading' | 'no-home' | 'ready' | 'error';

interface AssetRow {
  id: string;
  name: string;
  modelLabel: string;
  room: string;
  category: AssetCategory;
  warrantyPercent: number;
  warrantyLabel: string;
  warrantyColor: string;
  lastServiceLabel: string;
  status: HpStatus;
  statusLabel: string;
  icon: SafeHtml;
  warrantyRaw: number;
}

const ICONS: Record<string, string> = {
  ac: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="8" rx="2"/><path d="M7 17c1.5-2 3-2 4.5 0S15 19 17 17"/></svg>`,
  washer: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M7 7h2"/></svg>`,
  heater: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="6" y="3" width="12" height="14" rx="3"/><path d="M9 21h6M12 17v4"/></svg>`,
  fridge: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 10h14M9 6v1M9 14v2"/></svg>`,
  box: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/></svg>`,
};

const CATEGORY_ICON: Record<AssetCategory, keyof typeof ICONS> = {
  air_conditioner: 'ac',
  washing_machine: 'washer',
  dishwasher: 'washer',
  water_heater: 'heater',
  refrigerator: 'fridge',
  oven: 'box',
  microwave: 'box',
  television: 'box',
  water_pump: 'box',
  router: 'box',
  security_camera: 'box',
  solar_panel: 'box',
  furniture: 'box',
  smart_device: 'box',
  other: 'box',
};

const FILTER_CATEGORIES: AssetCategory[] = ['air_conditioner', 'refrigerator', 'washing_machine', 'water_heater'];

/**
 * جدول الأجهزة والأصول — مربوط بـ AssetService.list(homeId) الحقيقي.
 * فيه كمان إدارة مبسّطة للغرف (RoomService) عشان تقدر تنظّم أجهزتك
 * على غرف، وحذف حقيقي للأجهزة.
 */
@Component({
  selector: 'hp-asset-list',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent, PageHeaderComponent, EmptyStateComponent, ModalComponent],
  template: `
    <hp-page-header title="الأجهزة والأصول" [subtitle]="subtitle()">
      <button type="button" class="hp-btn hp-btn--quiet hp-btn--sm" (click)="exportCsv()" [disabled]="!assets().length">
        تصدير
      </button>
      <button type="button" class="hp-btn hp-btn--primary hp-btn--sm" (click)="openCreate()" [disabled]="state() !== 'ready'">
        أضف جهاز
      </button>
    </hp-page-header>

    <ng-container [ngSwitch]="state()">
      <div *ngSwitchCase="'loading'" class="hp-stack">
        <div class="hp-skeleton hp-skeleton-row"></div>
        <div class="hp-skeleton hp-skeleton-row"></div>
        <div class="hp-skeleton hp-skeleton-row"></div>
      </div>

      <div *ngSwitchCase="'error'" class="hp-alert hp-alert--error">{{ errorMessage() }}</div>

      <hp-empty-state *ngSwitchCase="'no-home'" title="لسه معملتش بيت" hint="ضيف بيتك الأول من لوحة القيادة قبل ما تسجّل أجهزتك.">
        <a class="hp-btn hp-btn--primary" routerLink="/app/home">روح للوحة القيادة</a>
      </hp-empty-state>

      <ng-container *ngSwitchCase="'ready'">
        <div class="hp-alert hp-alert--error" *ngIf="actionError()" style="margin-bottom: var(--hp-space-3)">
          {{ actionError() }}
        </div>

        <!-- ------------------------------- الغرف ------------------------------- -->
        <div class="rooms-bar">
          <span class="hp-muted rooms-bar__label">الغرف:</span>
          <span class="room-chip" *ngFor="let r of rooms()">
            {{ r.name }}
            <button type="button" class="room-chip__x" (click)="removeRoom(r)" [attr.aria-label]="'احذف غرفة ' + r.name">
              ×
            </button>
          </span>

          <ng-container *ngIf="addingRoom(); else addRoomToggle">
            <form class="room-add-form" (submit)="submitRoom($event)">
              <input
                type="text"
                autofocus
                placeholder="اسم الغرفة"
                [value]="newRoomName()"
                (input)="newRoomName.set($any($event.target).value)"
              />
              <button type="submit" class="hp-btn hp-btn--primary hp-btn--sm" [disabled]="roomSaving()">
                <span class="hp-spin" *ngIf="roomSaving()"></span> ضيف
              </button>
              <button type="button" class="hp-btn hp-btn--ghost hp-btn--sm" (click)="addingRoom.set(false)">إلغاء</button>
            </form>
          </ng-container>
          <ng-template #addRoomToggle>
            <button type="button" class="hp-chip hp-chip--dashed" (click)="addingRoom.set(true)">+ غرفة</button>
          </ng-template>
        </div>

        <div class="hp-cluster" style="margin-bottom: var(--hp-space-3)">
          <button
            type="button"
            *ngFor="let f of filters"
            class="hp-chip"
            [class.hp-chip--on]="filter() === f.value"
            (click)="filter.set(f.value)"
          >
            {{ f.label }}
          </button>
        </div>

        <div class="hp-block" *ngIf="filtered().length; else empty">
          <div class="hp-table-wrap">
            <table class="hp-table">
              <thead>
                <tr>
                  <th>الجهاز</th>
                  <th>المكان</th>
                  <th>الضمان</th>
                  <th>آخر صيانة</th>
                  <th>الحالة</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let asset of filtered()">
                  <td>
                    <div class="thing">
                      <span class="thing__icon" [innerHTML]="asset.icon"></span>
                      <span>
                        <b>{{ asset.name }}</b>
                        <small class="hp-mono">{{ asset.modelLabel }}</small>
                      </span>
                    </div>
                  </td>
                  <td>{{ asset.room }}</td>
                  <td>
                    <div class="warr">
                      <span class="trk"><i [style.width.%]="asset.warrantyPercent" [style.background]="asset.warrantyColor"></i></span>
                      <span>{{ asset.warrantyLabel }}</span>
                    </div>
                  </td>
                  <td>{{ asset.lastServiceLabel }}</td>
                  <td><hp-status-badge [status]="asset.status" [label]="asset.statusLabel" /></td>
                  <td>
                    <button
                      type="button"
                      class="hp-btn hp-btn--ghost hp-btn--sm hp-btn--danger"
                      [disabled]="deletingId() === asset.id"
                      (click)="removeAsset(asset)"
                    >
                      <span class="hp-spin" *ngIf="deletingId() === asset.id"></span>
                      {{ deletingId() === asset.id ? '' : 'احذف' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <ng-template #empty>
          <hp-empty-state title="مفيش أجهزة مطابقة" hint="جرّب فلتر تاني، أو ضيف جهاز جديد.">
            <button type="button" class="hp-btn hp-btn--primary" (click)="openCreate()">أضف جهاز</button>
          </hp-empty-state>
        </ng-template>
      </ng-container>
    </ng-container>

    <hp-modal *ngIf="showCreate()" title="أضف جهاز" (closed)="closeCreate()">
      <div class="hp-alert hp-alert--error" *ngIf="createError()">{{ createError() }}</div>
      <form class="hp-form-grid" (submit)="submitCreate($event)">
        <div class="hp-field hp-field--full">
          <label for="assetName">اسم الجهاز</label>
          <input id="assetName" type="text" required placeholder="مثلاً: تكييف شارب ١.٥ حصان"
            [value]="form.name()" (input)="form.name.set($any($event.target).value)" />
        </div>
        <div class="hp-field">
          <label for="assetCategory">النوع</label>
          <select id="assetCategory" [value]="form.category()" (change)="form.category.set($any($event.target).value)">
            <option *ngFor="let opt of categoryOptions" [value]="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="hp-field">
          <label for="assetRoom">الغرفة (اختياري)</label>
          <select id="assetRoom" [value]="form.room()" (change)="form.room.set($any($event.target).value)">
            <option value="">بدون غرفة</option>
            <option *ngFor="let r of rooms()" [value]="r._id">{{ r.name }}</option>
          </select>
        </div>
        <div class="hp-field">
          <label for="assetBrand">الماركة (اختياري)</label>
          <input id="assetBrand" type="text" [value]="form.brand()" (input)="form.brand.set($any($event.target).value)" />
        </div>
        <div class="hp-field">
          <label for="assetPrice">سعر الشراء (اختياري)</label>
          <input id="assetPrice" type="number" min="0" [value]="form.purchasePrice()" (input)="form.purchasePrice.set($any($event.target).value)" />
        </div>
        <div class="hp-field">
          <label for="assetWarranty">تاريخ انتهاء الضمان (اختياري)</label>
          <input id="assetWarranty" type="date" [value]="form.warrantyExpiration()" (input)="form.warrantyExpiration.set($any($event.target).value)" />
        </div>
        <div class="hp-form-actions hp-field--full">
          <button type="button" class="hp-btn hp-btn--ghost" (click)="closeCreate()">إلغاء</button>
          <button type="submit" class="hp-btn hp-btn--primary" [disabled]="creating()">
            <span class="hp-spin" *ngIf="creating()"></span>
            {{ creating() ? 'بيتم الإضافة...' : 'أضف الجهاز' }}
          </button>
        </div>
      </form>
    </hp-modal>
  `,
  styles: [
    `
      :host { display: block; }

      .thing { display: flex; align-items: center; gap: 11px; }
      .thing__icon {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        flex: none;
        border-radius: var(--hp-radius-sm);
        background: var(--hp-surface-sunken);
        border: 1px solid var(--hp-border);
        color: var(--hp-text-muted);
      }
      .thing b { display: block; font-weight: var(--hp-weight-semi); }
      .thing small { color: var(--hp-text-muted); font-size: 12px; }

      .warr { display: flex; align-items: center; gap: var(--hp-space-2); font-size: var(--hp-text-xs); }
      .warr .trk { width: 72px; height: 6px; border-radius: 4px; background: var(--hp-surface-sunken); border: 1px solid var(--hp-border); overflow: hidden; }
      .warr .trk i { display: block; height: 100%; }

      .rooms-bar { display: flex; align-items: center; gap: var(--hp-space-2); flex-wrap: wrap; margin-bottom: var(--hp-space-4); }
      .rooms-bar__label { font-size: var(--hp-text-sm); }
      .room-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 6px 4px 10px;
        border-radius: 999px;
        background: var(--hp-surface-sunken);
        border: 1px solid var(--hp-border);
        font-size: var(--hp-text-sm);
      }
      .room-chip__x {
        display: grid;
        place-items: center;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: transparent;
        border: 0;
        color: var(--hp-text-muted);
        font-size: 14px;
        line-height: 1;
        cursor: pointer;
      }
      .room-chip__x:hover { background: var(--hp-late-bg); color: var(--hp-late-text); }
      .hp-chip--dashed { border-style: dashed; }
      .room-add-form { display: flex; align-items: center; gap: 6px; }
      .room-add-form input { height: 32px; width: 140px; }
    `,
  ],
})
export class AssetListComponent implements OnInit {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly homeService = inject(HomeService);
  private readonly assetService = inject(AssetService);
  private readonly roomService = inject(RoomService);
  private readonly search = inject(SearchService);

  readonly state = signal<PageState>('loading');
  readonly errorMessage = signal('');
  readonly actionError = signal('');
  readonly assets = signal<AssetRow[]>([]);
  readonly rooms = signal<Room[]>([]);
  readonly deletingId = signal<string | null>(null);

  readonly addingRoom = signal(false);
  readonly newRoomName = signal('');
  readonly roomSaving = signal(false);

  readonly filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'الكل' },
    ...FILTER_CATEGORIES.map((c) => ({ value: c as Filter, label: ASSET_CATEGORY_LABELS[c] })),
    { value: 'warranty-soon', label: 'ضمان قارب ينتهي' },
  ];
  readonly filter = signal<Filter>('all');

  readonly categoryOptions = Object.entries(ASSET_CATEGORY_LABELS).map(([value, label]) => ({
    value: value as AssetCategory,
    label,
  }));

  readonly subtitle = computed(() => (this.state() === 'ready' ? `${this.assets().length} جهاز مسجّل` : ''));

  readonly filtered = computed(() => {
    const f = this.filter();
    let list = this.assets();
    if (f === 'warranty-soon') list = list.filter((a) => a.warrantyRaw > 0 && a.warrantyRaw <= 40);
    else if (f !== 'all') list = list.filter((a) => a.category === f);
    // خانة البحث في الشريط العلوي (SearchService) — بتفلتر بالاسم/الموديل/الغرفة.
    return list.filter((a) => this.search.matches(a.name, a.modelLabel, a.room));
  });

  readonly showCreate = signal(false);
  readonly creating = signal(false);
  readonly createError = signal('');
  readonly form = {
    name: signal(''),
    category: signal<AssetCategory>('other'),
    room: signal(''),
    brand: signal(''),
    purchasePrice: signal(''),
    warrantyExpiration: signal(''),
  };

  private homeId: string | null = null;

  ngOnInit(): void {
    this.homeService.load().subscribe({
      next: () => {
        this.homeId = this.homeService.activeHomeId();
        if (!this.homeId) {
          this.state.set('no-home');
          return;
        }
        this.fetchAll(this.homeId);
      },
      error: (err: unknown) => {
        this.state.set('error');
        this.errorMessage.set(apiErrorMessage(err));
      },
    });
  }

  openCreate(): void {
    this.form.name.set('');
    this.form.category.set('other');
    this.form.room.set('');
    this.form.brand.set('');
    this.form.purchasePrice.set('');
    this.form.warrantyExpiration.set('');
    this.createError.set('');
    this.showCreate.set(true);
  }

  closeCreate(): void {
    if (this.creating()) return;
    this.showCreate.set(false);
  }

  submitCreate(event: Event): void {
    event.preventDefault();
    if (this.creating() || !this.homeId) return;

    const name = this.form.name().trim();
    if (!name) {
      this.createError.set('لازم تكتب اسم للجهاز.');
      return;
    }

    const payload: CreateAssetPayload = {
      name,
      category: this.form.category(),
      room: this.form.room() || undefined,
      brand: this.form.brand().trim() || undefined,
      purchasePrice: this.form.purchasePrice() ? Number(this.form.purchasePrice()) : undefined,
      warrantyExpiration: this.form.warrantyExpiration() || undefined,
    };

    this.creating.set(true);
    this.createError.set('');

    this.assetService.create(this.homeId, payload).subscribe({
      next: () => {
        this.creating.set(false);
        this.showCreate.set(false);
        if (this.homeId) this.fetchAssets(this.homeId);
      },
      error: (err: unknown) => {
        this.creating.set(false);
        this.createError.set(apiErrorMessage(err));
      },
    });
  }

  removeAsset(asset: AssetRow): void {
    if (this.deletingId()) return;
    this.deletingId.set(asset.id);
    this.actionError.set('');
    this.assetService.remove(asset.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.assets.update((list) => list.filter((a) => a.id !== asset.id));
      },
      error: (err: unknown) => {
        this.deletingId.set(null);
        this.actionError.set(apiErrorMessage(err, 'مقدرناش نحذف الجهاز — حاول تاني.'));
      },
    });
  }

  // ------------------------------- الغرف -------------------------------
  submitRoom(event: Event): void {
    event.preventDefault();
    if (this.roomSaving() || !this.homeId) return;
    const name = this.newRoomName().trim();
    if (!name) return;

    this.roomSaving.set(true);
    this.roomService.create(this.homeId, { name }).subscribe({
      next: (room) => {
        this.roomSaving.set(false);
        this.newRoomName.set('');
        this.addingRoom.set(false);
        this.rooms.update((list) => [...list, room]);
      },
      error: (err: unknown) => {
        this.roomSaving.set(false);
        this.actionError.set(apiErrorMessage(err, 'مقدرناش نضيف الغرفة — حاول تاني.'));
      },
    });
  }

  removeRoom(room: Room): void {
    this.actionError.set('');
    this.roomService.remove(room._id).subscribe({
      next: () => this.rooms.update((list) => list.filter((r) => r._id !== room._id)),
      error: (err: unknown) => this.actionError.set(apiErrorMessage(err, 'مقدرناش نحذف الغرفة — حاول تاني.')),
    });
  }

  exportCsv(): void {
    const rows = [['الاسم', 'النوع', 'المكان', 'الضمان', 'آخر صيانة', 'الحالة']];
    for (const a of this.assets()) {
      rows.push([a.name, ASSET_CATEGORY_LABELS[a.category] ?? a.category, a.room, a.warrantyLabel, a.lastServiceLabel, a.statusLabel]);
    }
    const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'assets.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  private fetchAll(homeId: string): void {
    this.state.set('loading');
    forkJoin({ assets: this.assetService.list(homeId), rooms: this.roomService.list(homeId) }).subscribe({
      next: ({ assets, rooms }) => {
        this.rooms.set(rooms);
        this.assets.set(assets.map((a) => this.toRow(a)));
        this.state.set('ready');
      },
      error: (err: unknown) => {
        this.state.set('error');
        this.errorMessage.set(apiErrorMessage(err));
      },
    });
  }

  private fetchAssets(homeId: string): void {
    this.assetService.list(homeId).subscribe({
      next: (assets: Asset[]) => this.assets.set(assets.map((a) => this.toRow(a))),
      error: (err: unknown) => this.actionError.set(apiErrorMessage(err)),
    });
  }

  private toRow(asset: Asset): AssetRow {
    const warranty = warrantyView(asset.warrantyStart, asset.warrantyExpiration);
    const condition = assetConditionView(asset.condition);
    const modelParts = [asset.brand, asset.modelName].filter(Boolean).join(' ');

    return {
      id: asset._id,
      name: asset.name,
      modelLabel: modelParts || '—',
      room: asset.room?.name ?? '—',
      category: asset.category,
      warrantyPercent: warranty.percent,
      warrantyLabel: warranty.label,
      warrantyColor: warranty.color,
      warrantyRaw: warranty.percent,
      lastServiceLabel: asset.lastMaintenanceAt ? formatArabicDate(asset.lastMaintenanceAt, false) : '—',
      status: condition.status,
      statusLabel: condition.label,
      icon: this.svg(ICONS[CATEGORY_ICON[asset.category] ?? 'box']),
    };
  }

  private svg(markup: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(markup);
  }
}

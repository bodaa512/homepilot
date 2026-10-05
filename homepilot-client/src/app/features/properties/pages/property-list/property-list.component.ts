import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state.component';
import { ModalComponent } from '../../../../shared/ui/modal.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge.component';
import { HomeService } from '../../../../core/services/home.service';
import { PropertyService } from '../../../../core/services/property.service';
import { PropertyEntry, PropertyUnit } from '../../../../core/models/property.model';
import { formatArabicNumber } from '../../../../core/utils/formatters';
import { apiErrorMessage } from '../../../../core/utils/http-error.util';

type PropsState = 'loading' | 'ready' | 'error';

/**
 * العقارات: مجموعة عقارات (مباني)، كل عقار فيه وحدات، وكل وحدة ليها
 * مستأجر. كل وحدة بتتعمل كـ"بيت" مستقل في حسابك (بتظهر في «بيوتي»)
 * — والمستأجر لازم يكون عنده حساب HomePilot بنفس الإيميل.
 */
@Component({
  selector: 'hp-property-list',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, EmptyStateComponent, ModalComponent, StatusBadgeComponent],
  template: `
    <hp-page-header title="العقارات" subtitle="العقارات اللي بتديرها، ووحداتها، ومستأجريها.">
      <button type="button" class="hp-btn hp-btn--primary hp-btn--sm" (click)="openCreate()">+ عقار جديد</button>
    </hp-page-header>

    <div class="hp-alert hp-alert--error" *ngIf="state() === 'error'">
      {{ errorMessage() }}
      <button type="button" class="hp-btn hp-btn--ghost hp-btn--sm" (click)="fetch()">حاول تاني</button>
    </div>
    <div class="hp-alert hp-alert--error" *ngIf="actionError()">{{ actionError() }}</div>
    <div class="hp-alert hp-alert--info" *ngIf="notice()">{{ notice() }}</div>

    <div class="hp-stack" *ngIf="state() === 'loading'">
      <div class="hp-skeleton hp-skeleton-row" *ngFor="let i of [1, 2, 3]"></div>
    </div>

    <ng-container *ngIf="state() === 'ready'">
      <hp-empty-state
        *ngIf="entries().length === 0"
        title="لسه مفيش عقارات"
        hint="لو بتأجّر أو بتدير مبنى فيه وحدات، ضيفه هنا وتابع كل وحدة ومستأجرها."
      >
        <button type="button" class="hp-btn hp-btn--primary" (click)="openCreate()">أضف أول عقار</button>
      </hp-empty-state>

      <div class="props" *ngIf="entries().length > 0">
        <div class="prop" *ngFor="let e of entries()">
          <div class="prop__head">
            <div>
              <strong>{{ e.property.name }}</strong>
              <div class="hp-muted">
                {{ e.property.city }}<ng-container *ngIf="e.property.city && e.property.address"> · </ng-container>{{ e.property.address }}
              </div>
            </div>
            <div class="prop__stats">
              <span class="hp-badge hp-badge--info">{{ n(e.occupiedUnits) }} / {{ n(e.totalUnits) }} مؤجّرة</span>
              <button type="button" class="hp-btn hp-btn--ghost hp-btn--sm" (click)="toggleUnits(e)">
                {{ expandedId() === e.property._id ? 'اقفل الوحدات' : 'الوحدات' }}
              </button>
            </div>
          </div>

          <div class="units" *ngIf="expandedId() === e.property._id">
            <div class="hp-muted" *ngIf="unitsLoading()">بيتم التحميل...</div>
            <div class="hp-muted" *ngIf="!unitsLoading() && units().length === 0">مفيش وحدات لسه.</div>

            <div class="unit" *ngFor="let u of units()">
              <span>وحدة {{ u.unitNumber }}</span>
              <hp-status-badge
                [status]="u.status === 'occupied' ? 'ok' : 'neutral'"
                [label]="u.status === 'occupied' ? 'مؤجّرة' : 'فاضية'"
              ></hp-status-badge>
              <button
                type="button"
                class="hp-btn hp-btn--ghost hp-btn--sm"
                *ngIf="u.status === 'vacant'"
                (click)="openTenant(u)"
              >
                عيّن مستأجر
              </button>
            </div>

            <button type="button" class="hp-btn hp-btn--sm" (click)="openUnit(e)">+ وحدة جديدة</button>
          </div>
        </div>
      </div>
    </ng-container>

    <!-- عقار جديد -->
    <hp-modal *ngIf="showCreate()" title="عقار جديد" (closed)="showCreate.set(false)">
      <div class="hp-alert hp-alert--error" *ngIf="formError()">{{ formError() }}</div>
      <form class="hp-form-grid" (submit)="submitCreate($event)">
        <div class="hp-field hp-field--full">
          <label for="propName">اسم العقار</label>
          <input id="propName" type="text" required [value]="pName()" (input)="pName.set($any($event.target).value)" />
        </div>
        <div class="hp-field">
          <label for="propCity">المدينة (اختياري)</label>
          <input id="propCity" type="text" [value]="pCity()" (input)="pCity.set($any($event.target).value)" />
        </div>
        <div class="hp-field">
          <label for="propAddr">العنوان (اختياري)</label>
          <input id="propAddr" type="text" [value]="pAddress()" (input)="pAddress.set($any($event.target).value)" />
        </div>
        <div class="hp-form-actions hp-field--full">
          <button type="submit" class="hp-btn hp-btn--primary" [disabled]="submitting()">
            <span class="hp-spin" *ngIf="submitting()"></span> أضف العقار
          </button>
        </div>
      </form>
    </hp-modal>

    <!-- وحدة جديدة -->
    <hp-modal *ngIf="unitTarget()" title="وحدة جديدة" (closed)="unitTarget.set(null)">
      <div class="hp-alert hp-alert--error" *ngIf="formError()">{{ formError() }}</div>
      <form class="hp-stack" (submit)="submitUnit($event)">
        <div class="hp-field">
          <label for="unitNo">رقم/اسم الوحدة</label>
          <input id="unitNo" type="text" required placeholder="مثلاً: 4ب" [value]="unitNumber()" (input)="unitNumber.set($any($event.target).value)" />
        </div>
        <div class="hp-form-actions">
          <button type="submit" class="hp-btn hp-btn--primary" [disabled]="submitting()">
            <span class="hp-spin" *ngIf="submitting()"></span> أضف الوحدة
          </button>
        </div>
      </form>
    </hp-modal>

    <!-- تعيين مستأجر -->
    <hp-modal *ngIf="tenantTarget()" title="تعيين مستأجر" (closed)="tenantTarget.set(null)">
      <div class="hp-alert hp-alert--error" *ngIf="formError()">{{ formError() }}</div>
      <form class="hp-form-grid" (submit)="submitTenant($event)">
        <div class="hp-field hp-field--full">
          <label for="tEmail">إيميل المستأجر</label>
          <input id="tEmail" type="email" required [value]="tEmail()" (input)="tEmail.set($any($event.target).value)" />
          <span class="hp-hint">لازم يكون عنده حساب HomePilot بنفس الإيميل ده.</span>
        </div>
        <div class="hp-field">
          <label for="tStart">بداية العقد (اختياري)</label>
          <input id="tStart" type="date" [value]="tStart()" (input)="tStart.set($any($event.target).value)" />
        </div>
        <div class="hp-field">
          <label for="tEnd">نهاية العقد (اختياري)</label>
          <input id="tEnd" type="date" [value]="tEnd()" (input)="tEnd.set($any($event.target).value)" />
        </div>
        <div class="hp-field hp-field--full">
          <label for="tRent">قيمة الإيجار (اختياري)</label>
          <input id="tRent" type="number" min="0" step="any" [value]="tRent()" (input)="tRent.set($any($event.target).value)" />
        </div>
        <div class="hp-form-actions hp-field--full">
          <button type="submit" class="hp-btn hp-btn--primary" [disabled]="submitting()">
            <span class="hp-spin" *ngIf="submitting()"></span> عيّن المستأجر
          </button>
        </div>
      </form>
    </hp-modal>
  `,
  styles: [
    `
      .props { display: flex; flex-direction: column; gap: var(--hp-space-3); }
      .prop {
        padding: var(--hp-space-4);
        background: var(--hp-surface);
        border: 1px solid var(--hp-border);
        border-radius: var(--hp-radius-md);
      }
      .prop__head { display: flex; align-items: center; justify-content: space-between; gap: var(--hp-space-3); flex-wrap: wrap; }
      .prop__stats { display: flex; align-items: center; gap: var(--hp-space-2); }
      .units {
        display: flex;
        flex-direction: column;
        gap: var(--hp-space-2);
        margin-top: var(--hp-space-4);
        padding-top: var(--hp-space-3);
        border-top: 1px solid var(--hp-border);
      }
      .unit { display: flex; align-items: center; gap: var(--hp-space-3); }
      .unit > span:first-child { min-width: 90px; }
      .units > button { align-self: flex-start; margin-top: var(--hp-space-2); }
    `,
  ],
})
export class PropertyListComponent implements OnInit {
  private readonly propertyService = inject(PropertyService);
  private readonly homeService = inject(HomeService);

  readonly state = signal<PropsState>('loading');
  readonly errorMessage = signal('');
  readonly actionError = signal('');
  readonly notice = signal('');
  readonly entries = signal<PropertyEntry[]>([]);

  readonly expandedId = signal<string | null>(null);
  readonly units = signal<PropertyUnit[]>([]);
  readonly unitsLoading = signal(false);

  readonly submitting = signal(false);
  readonly formError = signal('');

  // عقار جديد
  readonly showCreate = signal(false);
  readonly pName = signal('');
  readonly pCity = signal('');
  readonly pAddress = signal('');

  // وحدة جديدة
  readonly unitTarget = signal<PropertyEntry | null>(null);
  readonly unitNumber = signal('');

  // مستأجر
  readonly tenantTarget = signal<PropertyUnit | null>(null);
  readonly tEmail = signal('');
  readonly tStart = signal('');
  readonly tEnd = signal('');
  readonly tRent = signal('');

  ngOnInit(): void {
    this.fetch();
  }

  n(value: number): string {
    return formatArabicNumber(value);
  }

  fetch(): void {
    this.state.set('loading');
    this.propertyService.list().subscribe({
      next: (entries) => {
        this.entries.set(entries);
        this.state.set('ready');
      },
      error: (err: unknown) => {
        this.state.set('error');
        this.errorMessage.set(apiErrorMessage(err));
      },
    });
  }

  toggleUnits(entry: PropertyEntry): void {
    if (this.expandedId() === entry.property._id) {
      this.expandedId.set(null);
      return;
    }
    this.expandedId.set(entry.property._id);
    this.loadUnits(entry.property._id);
  }

  private loadUnits(propertyId: string): void {
    this.unitsLoading.set(true);
    this.units.set([]);
    this.propertyService.units(propertyId).subscribe({
      next: (units) => {
        this.units.set(units);
        this.unitsLoading.set(false);
      },
      error: (err: unknown) => {
        this.unitsLoading.set(false);
        this.actionError.set(apiErrorMessage(err));
      },
    });
  }

  // ------------------------------- عقار جديد -------------------------------
  openCreate(): void {
    this.pName.set('');
    this.pCity.set('');
    this.pAddress.set('');
    this.formError.set('');
    this.showCreate.set(true);
  }

  submitCreate(event: Event): void {
    event.preventDefault();
    if (this.submitting()) return;
    const name = this.pName().trim();
    if (!name) {
      this.formError.set('اكتب اسم العقار.');
      return;
    }
    this.submitting.set(true);
    this.formError.set('');
    this.propertyService
      .create({ name, city: this.pCity().trim() || undefined, address: this.pAddress().trim() || undefined })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showCreate.set(false);
          this.fetch();
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.formError.set(apiErrorMessage(err));
        },
      });
  }

  // ------------------------------- وحدة جديدة -------------------------------
  openUnit(entry: PropertyEntry): void {
    this.unitNumber.set('');
    this.formError.set('');
    this.unitTarget.set(entry);
  }

  submitUnit(event: Event): void {
    event.preventDefault();
    const target = this.unitTarget();
    const unitNumber = this.unitNumber().trim();
    if (!target || this.submitting()) return;
    if (!unitNumber) {
      this.formError.set('اكتب رقم الوحدة.');
      return;
    }
    this.submitting.set(true);
    this.formError.set('');
    this.propertyService.addUnit(target.property._id, unitNumber).subscribe({
      next: () => {
        this.submitting.set(false);
        this.unitTarget.set(null);
        this.notice.set('اتضافت الوحدة — وبقت بتظهر كبيت جديد في «بيوتي».');
        this.loadUnits(target.property._id);
        this.fetch();
        // الوحدة بتتعمل كبيت جديد على السيرفر، فنحدّث قايمة البيوت.
        this.homeService.refresh().subscribe({ error: () => undefined });
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.formError.set(apiErrorMessage(err));
      },
    });
  }

  // ------------------------------- مستأجر -------------------------------
  openTenant(unit: PropertyUnit): void {
    this.tEmail.set('');
    this.tStart.set('');
    this.tEnd.set('');
    this.tRent.set('');
    this.formError.set('');
    this.tenantTarget.set(unit);
  }

  submitTenant(event: Event): void {
    event.preventDefault();
    const unit = this.tenantTarget();
    const email = this.tEmail().trim();
    if (!unit || this.submitting()) return;
    if (!email) {
      this.formError.set('اكتب إيميل المستأجر.');
      return;
    }

    const rent = this.tRent().trim() === '' ? undefined : Number(this.tRent());
    if (rent !== undefined && (!Number.isFinite(rent) || rent < 0)) {
      this.formError.set('قيمة الإيجار لازم تكون رقم صحيح.');
      return;
    }

    this.submitting.set(true);
    this.formError.set('');
    this.propertyService
      .assignTenant(unit._id, {
        email,
        leaseStart: this.tStart() || undefined,
        leaseEnd: this.tEnd() || undefined,
        rentAmount: rent,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.tenantTarget.set(null);
          const expanded = this.expandedId();
          if (expanded) this.loadUnits(expanded);
          this.fetch();
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.formError.set(apiErrorMessage(err));
        },
      });
  }
}

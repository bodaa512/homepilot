import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state.component';
import { ModalComponent } from '../../../../shared/ui/modal.component';
import { SearchService } from '../../../../core/services/search.service';
import { HomeService } from '../../../../core/services/home.service';
import { DocumentService } from '../../../../core/services/document.service';
import { DOCUMENT_TYPE_LABELS, HpDocument, HpDocumentType } from '../../../../core/models/document.model';
import { documentStatusView, formatFileSize } from '../../../../core/utils/status.util';
import { formatArabicDate, formatCurrency } from '../../../../core/utils/formatters';
import { apiErrorMessage } from '../../../../core/utils/http-error.util';
import { triggerBrowserDownload } from '../../../../core/utils/download.util';

type Filter = 'all' | HpDocumentType;
type PageState = 'loading' | 'no-home' | 'ready' | 'error';

interface DocumentRow {
  id: string;
  title: string;
  meta: string;
  /** المبلغ والتاريخ اللي الـ OCR طلّعهم من الصورة (لو لقى) — بيتعرضوا تحت الاسم. */
  ocr: { amount?: string; date?: string } | null;
  type: HpDocumentType;
  typeLabel: string;
  status: 'ok' | 'due' | 'late' | 'info' | 'neutral';
  statusLabel: string;
  fileName: string;
}

const FILTER_TYPES: HpDocumentType[] = ['invoice', 'contract', 'warranty', 'insurance'];

/**
 * أرشيف المستندات — مربوط بـ DocumentService الحقيقي: رفع multipart
 * فعلي، وتنزيل بـ blob (الراوت محمي بهيدر Authorization فمينفعش
 * <a href> عادي).
 */
@Component({
  selector: 'hp-document-list',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent, PageHeaderComponent, EmptyStateComponent, ModalComponent],
  template: `
    <input
      #fileInput
      type="file"
      style="display:none"
      accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
      (change)="onFileSelected($event)"
    />

    <hp-page-header title="المستندات" [subtitle]="subtitle()">
      <button type="button" class="hp-btn hp-btn--primary hp-btn--sm" (click)="fileInput.click()" [disabled]="state() !== 'ready'">
        ارفع مستند
      </button>
    </hp-page-header>

    <ng-container [ngSwitch]="state()">
      <div *ngSwitchCase="'loading'" class="hp-stack">
        <div class="hp-skeleton hp-skeleton-row"></div>
        <div class="hp-skeleton hp-skeleton-row"></div>
        <div class="hp-skeleton hp-skeleton-row"></div>
      </div>

      <div *ngSwitchCase="'error'" class="hp-alert hp-alert--error">{{ errorMessage() }}</div>

      <hp-empty-state *ngSwitchCase="'no-home'" title="لسه معملتش بيت" hint="ضيف بيتك الأول من لوحة القيادة قبل ما ترفع مستندات.">
        <a class="hp-btn hp-btn--primary" routerLink="/app/home">روح للوحة القيادة</a>
      </hp-empty-state>

      <ng-container *ngSwitchCase="'ready'">
        <div class="hp-alert hp-alert--error" *ngIf="actionError()" style="margin-bottom: var(--hp-space-3)">
          {{ actionError() }}
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
          <div class="hp-row" *ngFor="let doc of filtered()">
            <span [class]="'hp-tick hp-tick--' + doc.status"></span>
            <div class="hp-row__main">
              <b>{{ doc.title }}</b>
              <small>{{ doc.meta }}</small>
              <span class="ocr" *ngIf="doc.ocr" title="اتقرا أوتوماتيك من الصورة — راجعه قبل ما تعتمد عليه">
                <span class="ocr__item" *ngIf="doc.ocr.amount">المبلغ <b>{{ doc.ocr.amount }}</b></span>
                <span class="ocr__item" *ngIf="doc.ocr.date">التاريخ <b>{{ doc.ocr.date }}</b></span>
              </span>
            </div>
            <span class="hp-badge hp-badge--neutral">{{ doc.typeLabel }}</span>
            <hp-status-badge [status]="doc.status" [label]="doc.statusLabel" />
            <button type="button" class="hp-btn hp-btn--ghost hp-btn--sm" (click)="download(doc)" [disabled]="downloadingId() === doc.id">
              <span class="hp-spin" *ngIf="downloadingId() === doc.id"></span>
              {{ downloadingId() === doc.id ? '...' : 'عرض' }}
            </button>
            <button
              type="button"
              class="hp-btn hp-btn--ghost hp-btn--sm hp-btn--danger"
              [disabled]="deletingId() === doc.id"
              (click)="removeDocument(doc)"
            >
              <span class="hp-spin" *ngIf="deletingId() === doc.id"></span>
              {{ deletingId() === doc.id ? '' : 'احذف' }}
            </button>
          </div>
        </div>

        <ng-template #empty>
          <hp-empty-state title="لسه مفيش مستندات من النوع ده" hint="ارفع فاتورة أو عقد وHomePilot يحفظه ليك.">
            <button type="button" class="hp-btn hp-btn--primary" (click)="fileInput.click()">ارفع مستند</button>
          </hp-empty-state>
        </ng-template>
      </ng-container>
    </ng-container>

    <hp-modal *ngIf="pendingFile()" title="تفاصيل المستند" (closed)="cancelUpload()">
      <div class="hp-alert hp-alert--error" *ngIf="uploadError()">{{ uploadError() }}</div>
      <p class="hp-muted" style="margin-bottom: var(--hp-space-4)">{{ pendingFile()?.name }}</p>
      <form class="hp-form-grid" (submit)="confirmUpload($event)">
        <div class="hp-field hp-field--full">
          <label for="docType">نوع المستند</label>
          <select id="docType" [value]="uploadType()" (change)="uploadType.set($any($event.target).value)">
            <option *ngFor="let opt of typeOptions" [value]="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="hp-field hp-field--full">
          <label for="docExpiry">تاريخ الانتهاء (لو مستند زي عقد أو ضمان)</label>
          <input id="docExpiry" type="date" [value]="uploadExpiry()" (input)="uploadExpiry.set($any($event.target).value)" />
        </div>
        <div class="hp-form-actions hp-field--full">
          <button type="button" class="hp-btn hp-btn--ghost" (click)="cancelUpload()">إلغاء</button>
          <button type="submit" class="hp-btn hp-btn--primary" [disabled]="uploading()">
            <span class="hp-spin" *ngIf="uploading()"></span>
            {{ uploading() ? 'بيترفع...' : 'ارفع الملف' }}
          </button>
        </div>
      </form>
    </hp-modal>
  `,
  styles: [
    `
      :host { display: block; }

      /* بيانات الـ OCR تحت اسم المستند: خط رفيع وشكل هادي، مش شارات تزاحم الصف */
      .ocr { display: flex; flex-wrap: wrap; gap: 2px var(--hp-space-3); margin-top: 3px; }
      .ocr__item { font-size: var(--hp-text-xs); color: var(--hp-text-muted); white-space: nowrap; }
      .ocr__item b {
        display: inline;
        color: var(--hp-text);
        font-weight: var(--hp-weight-semi);
        overflow: visible;
        white-space: nowrap;
      }
    `,
  ],
})
export class DocumentListComponent implements OnInit {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  private readonly homeService = inject(HomeService);
  private readonly documentService = inject(DocumentService);

  readonly state = signal<PageState>('loading');
  readonly errorMessage = signal('');
  readonly documents = signal<DocumentRow[]>([]);

  readonly filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'الكل' },
    ...FILTER_TYPES.map((t) => ({ value: t as Filter, label: DOCUMENT_TYPE_LABELS[t] })),
  ];
  readonly filter = signal<Filter>('all');

  readonly typeOptions = Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => ({
    value: value as HpDocumentType,
    label,
  }));

  readonly subtitle = computed(() => (this.state() === 'ready' ? `${this.documents().length} مستند محفوظ` : ''));

  readonly filtered = computed(() => {
    const f = this.filter();
    const list = f === 'all' ? this.documents() : this.documents().filter((d) => d.type === f);
    // خانة البحث في الشريط العلوي (SearchService) — بتفلتر بالاسم/النوع.
    return list.filter((d) => this.search.matches(d.title, d.meta, d.typeLabel));
  });

  private readonly search = inject(SearchService);

  readonly pendingFile = signal<File | null>(null);
  readonly uploadType = signal<HpDocumentType>('other');
  readonly uploadExpiry = signal('');
  readonly uploading = signal(false);
  readonly uploadError = signal('');
  readonly downloadingId = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly actionError = signal('');

  private homeId: string | null = null;

  ngOnInit(): void {
    this.homeService.load().subscribe({
      next: () => {
        this.homeId = this.homeService.activeHomeId();
        if (!this.homeId) {
          this.state.set('no-home');
          return;
        }
        this.fetchDocuments(this.homeId);
      },
      error: (err: unknown) => {
        this.state.set('error');
        this.errorMessage.set(apiErrorMessage(err));
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    this.pendingFile.set(file);
    this.uploadType.set('other');
    this.uploadExpiry.set('');
    this.uploadError.set('');
  }

  cancelUpload(): void {
    if (this.uploading()) return;
    this.pendingFile.set(null);
    if (this.fileInputRef) this.fileInputRef.nativeElement.value = '';
  }

  confirmUpload(event: Event): void {
    event.preventDefault();
    const file = this.pendingFile();
    if (!file || this.uploading() || !this.homeId) return;

    this.uploading.set(true);
    this.uploadError.set('');

    this.documentService.upload(this.homeId, file, this.uploadType(), this.uploadExpiry() || undefined).subscribe({
      next: () => {
        this.uploading.set(false);
        this.pendingFile.set(null);
        if (this.fileInputRef) this.fileInputRef.nativeElement.value = '';
        if (this.homeId) this.fetchDocuments(this.homeId);
      },
      error: (err: unknown) => {
        this.uploading.set(false);
        this.uploadError.set(apiErrorMessage(err));
      },
    });
  }

  download(doc: DocumentRow): void {
    if (this.downloadingId()) return;
    this.downloadingId.set(doc.id);
    this.actionError.set('');
    this.documentService.download(doc.id).subscribe({
      next: (blob: Blob) => {
        this.downloadingId.set(null);
        triggerBrowserDownload(blob, doc.fileName);
      },
      error: (err: unknown) => {
        this.downloadingId.set(null);
        this.actionError.set(apiErrorMessage(err, 'مقدرناش ننزّل الملف — حاول تاني.'));
      },
    });
  }

  removeDocument(doc: DocumentRow): void {
    if (this.deletingId()) return;
    this.deletingId.set(doc.id);
    this.actionError.set('');
    this.documentService.remove(doc.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.documents.update((list) => list.filter((d) => d.id !== doc.id));
      },
      error: (err: unknown) => {
        this.deletingId.set(null);
        this.actionError.set(apiErrorMessage(err, 'مقدرناش نحذف المستند — حاول تاني.'));
      },
    });
  }

  private fetchDocuments(homeId: string): void {
    this.state.set('loading');
    this.documentService.list(homeId).subscribe({
      next: (docs: HpDocument[]) => {
        this.documents.set(docs.map((d) => this.toRow(d)));
        this.state.set('ready');
      },
      error: (err: unknown) => {
        this.state.set('error');
        this.errorMessage.set(apiErrorMessage(err));
      },
    });
  }

  private toRow(doc: HpDocument): DocumentRow {
    const statusView = documentStatusView(doc.expirationDate);
    const metaParts = [formatFileSize(doc.sizeBytes), formatArabicDate(doc.createdAt)];
    return {
      id: doc._id,
      title: doc.originalName,
      meta: metaParts.join(' · '),
      ocr: this.ocrView(doc),
      type: doc.type,
      typeLabel: DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type,
      status: statusView.status,
      statusLabel: statusView.label,
      fileName: doc.originalName,
    };
  }

  /** المبلغ/التاريخ المستخرجين — بيرجّع null لو الـ OCR ماطلّعش حاجة (أو التاريخ تالف) عشان مانعرضش سطر فاضي. */
  private ocrView(doc: HpDocument): DocumentRow['ocr'] {
    const amount =
      typeof doc.extractedAmount === 'number' && Number.isFinite(doc.extractedAmount)
        ? formatCurrency(doc.extractedAmount)
        : undefined;

    let date: string | undefined;
    if (doc.extractedDate) {
      const parsed = new Date(doc.extractedDate);
      if (!Number.isNaN(parsed.getTime())) date = formatArabicDate(parsed);
    }

    return amount || date ? { amount, date } : null;
  }
}

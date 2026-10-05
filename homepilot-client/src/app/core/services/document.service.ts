import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/api.model';
import { HpDocument, HpDocumentType } from '../models/document.model';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(homeId: string): Observable<HpDocument[]> {
    return this.http
      .get<ApiEnvelope<{ documents: HpDocument[] }>>(`${this.apiUrl}/homes/${homeId}/documents`)
      .pipe(map((res) => res.data.documents));
  }

  /** رفع فعلي multipart — اسم الحقل "file" لازم يطابق multer().single('file') في السيرفر. */
  upload(homeId: string, file: File, type: HpDocumentType, expirationDate?: string): Observable<HpDocument> {
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    if (expirationDate) form.append('expirationDate', expirationDate);

    return this.http
      .post<ApiEnvelope<{ document: HpDocument }>>(`${this.apiUrl}/homes/${homeId}/documents`, form)
      .pipe(map((res) => res.data.document));
  }

  /** الراوت محمي بـ requireAuth، فلازم يتجاب كـ blob (مش <a href> عادي) عشان هيدر الـ Authorization يتبعت معاه. */
  download(documentId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documents/${documentId}/download`, { responseType: 'blob' });
  }

  remove(documentId: string): Observable<void> {
    return this.http.delete<ApiEnvelope<null>>(`${this.apiUrl}/documents/${documentId}`).pipe(map(() => undefined));
  }
}

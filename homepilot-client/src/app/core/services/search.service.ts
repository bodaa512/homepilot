import { Injectable, signal } from '@angular/core';

/**
 * خانة البحث في الشريط العلوي. مفيش endpoint بحث في السيرفر، فالبحث
 * بيتعمل على الفرونت: الشاشات (الأجهزة، المستندات) بتقرا query وتفلتر
 * اللي ظاهر عندها.
 */
@Injectable({ providedIn: 'root' })
export class SearchService {
  readonly query = signal('');

  matches(...fields: (string | undefined)[]): boolean {
    const q = this.query().trim().toLowerCase();
    if (!q) return true;
    return fields.some((f) => (f ?? '').toLowerCase().includes(q));
  }
}

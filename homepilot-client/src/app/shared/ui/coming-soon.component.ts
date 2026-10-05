import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from './empty-state.component';
import { PageHeaderComponent } from './page-header.component';

/**
 * مكان مؤقت لأي شاشة لسه ماتعملتش، عشان الروابط في القائمة الجانبية
 * ماتوديش على صفحة فاضية. امسحه لما كل الشاشات تجهز.
 */
@Component({
  selector: 'hp-coming-soon',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, EmptyStateComponent],
  template: `
    <hp-page-header title="الشاشة دي لسه مش جاهزة" />
    <hp-empty-state title="بنشتغل عليها" hint="لحد ما تجهز، كمّل من لوحة القيادة.">
      <a class="hp-btn hp-btn--primary" routerLink="/app/home">افتح لوحة القيادة</a>
    </hp-empty-state>
  `,
})
export class ComingSoonComponent {}

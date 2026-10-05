import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, computed, effect, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { HomeService } from '../../core/services/home.service';
import { MaintenanceService } from '../../core/services/maintenance.service';
import { SearchService } from '../../core/services/search.service';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationBellComponent } from './notification-bell.component';

/**
 * عنصر واحد في القائمة الجانبية.
 * `roles` فاضية أو مش موجودة = تظهر للكل.
 */
interface NavItem {
  label: string;
  path: string;
  icon: string;
  exact?: boolean;
  roles?: string[];
  badge?: () => number;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

/** نفس العنصر بعد تجهيزه للعرض: الأيقونة متعقّمة والعدّاد رقم جاهز. */
interface NavItemView {
  label: string;
  path: string;
  icon: SafeHtml;
  exact: boolean;
  count: number;
}

interface NavGroupView {
  title?: string;
  items: NavItemView[];
}

@Component({
  selector: 'hp-app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, NotificationBellComponent],
  template: `
    <div class="shell" [class.shell--collapsed]="collapsed()">
      <!-- ظل أسود خلف الدرج على الموبايل -->
      <div class="scrim" *ngIf="drawerOpen()" (click)="closeDrawer()" aria-hidden="true"></div>

      <aside class="side" id="app-nav" [class.side--open]="drawerOpen()">
        <a class="brand" routerLink="/app/home" (click)="closeDrawer()">
          <span class="brand__mark"><i></i></span>
          <span class="brand__name">HomePilot</span>
        </a>

        <nav class="nav" aria-label="القائمة الرئيسية">
          <ng-container *ngFor="let group of visibleGroups()">
            <p class="nav__group" *ngIf="group.title">{{ group.title }}</p>
            <a
              *ngFor="let item of group.items"
              class="nav__item"
              [routerLink]="item.path"
              routerLinkActive="nav__item--on"
              [routerLinkActiveOptions]="{ exact: item.exact }"
              (click)="closeDrawer()"
            >
              <span class="nav__icon" [innerHTML]="item.icon"></span>
              <span class="nav__label">{{ item.label }}</span>
              <span class="nav__count" *ngIf="item.count > 0">{{ item.count }}</span>
            </a>
          </ng-container>
        </nav>

        <div class="side__foot">
          <button type="button" class="hp-btn hp-btn--ghost hp-btn--sm side__collapse" (click)="toggleCollapse()">
            {{ collapsed() ? 'وسّع القائمة' : 'صغّر القائمة' }}
          </button>
        </div>
      </aside>

      <div class="body">
        <header class="topbar">
          <button
            type="button"
            class="topbar__burger"
            (click)="drawerOpen() ? closeDrawer() : openDrawer()"
            [attr.aria-expanded]="drawerOpen()"
            aria-controls="app-nav"
            aria-label="القائمة"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          <div class="topbar__title">
            <h1>{{ pageTitle() }}</h1>
          </div>

          <label class="topbar__search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="search"
              placeholder="ابحث في أجهزتك ومستنداتك"
              [attr.aria-label]="'بحث'"
              [value]="searchService.query()"
              (input)="searchService.query.set($any($event.target).value)"
            />
          </label>

          <hp-notification-bell />

          <button
            type="button"
            class="topbar__icon"
            (click)="toggleTheme()"
            [attr.aria-label]="theme() === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'"
          >
            <svg *ngIf="theme() !== 'dark'" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />
            </svg>
            <svg *ngIf="theme() === 'dark'" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
            </svg>
          </button>

          <a class="topbar__user" routerLink="/app/settings" title="حسابي" aria-label="حسابي">
            <span class="avatar">{{ initials() }}</span>
            <span class="topbar__user-name">{{ userName() }}</span>
          </a>

          <button type="button" class="topbar__icon" (click)="logout()" aria-label="تسجيل الخروج" title="تسجيل الخروج">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
            </svg>
          </button>
        </header>

        <div class="verify-bar" role="status" *ngIf="showVerifyBar()">
          <span class="verify-bar__text">
            <ng-container *ngIf="resendState() !== 'sent'">إيميلك لسه مش متفعّل — فعّله من الرابط اللي وصلك على {{ userEmail() }}.</ng-container>
            <span class="verify-bar__done" *ngIf="resendState() === 'sent'">بعتنالك رابط تفعيل جديد على {{ userEmail() }} — شوف الإيميل (وفولدر الـ spam).</span>
          </span>
          <button
            type="button"
            class="hp-btn hp-btn--quiet hp-btn--sm"
            *ngIf="resendState() !== 'sent'"
            [disabled]="resendState() === 'sending'"
            (click)="resendVerification()"
          >
            <span class="hp-spin" *ngIf="resendState() === 'sending'"></span>
            {{ resendState() === 'error' ? 'حاول تاني' : 'ابعت الرابط تاني' }}
          </button>
        </div>

        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        min-height: 100dvh;
        background: var(--hp-bg);
      }

      .shell {
        min-height: 100vh;
        min-height: 100dvh;
      }

      /* القائمة مثبّتة على حافة الشاشة دايمًا (position: fixed).
         مهم: inline-START مش inline-end — في RTL الـ start هو اليمين، وده
         اللي بيطابق اتجاه خروج الدرج على الموبايل (translateX تحت). كانت
         inline-end فبتتثبّت على الشمال، وكود الموبايل بيزحلقها لنص الشاشة
         بدل ما يخرّجها برّه. */
      .side {
        position: fixed;
        inset-block: 0;
        inset-inline-start: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: var(--hp-space-4) var(--hp-space-3);
        background: var(--hp-surface);
        border-inline-end: 1px solid var(--hp-border);
        overflow-y: auto;
        width: var(--hp-sidebar-w);
        z-index: var(--hp-z-sticky);
        transition: width var(--hp-duration) var(--hp-ease);
      }
      .shell--collapsed .side { width: 72px; }

      /* المحتوى بياخد مساحة من نفس جهة القائمة بالظبط، فمهما اتغيّر عرض
         الشاشة الاتنين هيفضلوا جنب بعض صح، مش هيتراكبوا ولا يطلعوا في النص. */
      .body {
        display: flex;
        flex-direction: column;
        min-width: 0;
        margin-inline-start: var(--hp-sidebar-w);
        min-height: 100vh;
        min-height: 100dvh;
        transition: margin var(--hp-duration) var(--hp-ease);
      }
      .shell--collapsed .body { margin-inline-start: 72px; }

      .brand {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 2px 8px var(--hp-space-4);
        font-weight: var(--hp-weight-semi);
        font-size: var(--hp-text-sm);
        color: var(--hp-text);
        text-decoration: none;
      }
      .brand:hover { text-decoration: none; }
      .brand__mark {
        width: 26px;
        height: 26px;
        border-radius: 7px;
        background: var(--hp-navy-700);
        display: grid;
        place-items: center;
        flex: none;
      }
      /* لمبة خضرا = النظام شغّال — نفس لغة الحالة بتاعة التطبيق */
      .brand__mark i {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--hp-ok);
        box-shadow: 0 0 0 3px rgba(28, 138, 107, 0.3);
      }

      .nav { display: flex; flex-direction: column; gap: 2px; }
      .nav__group {
        font-size: 11.5px;
        font-weight: var(--hp-weight-medium);
        color: var(--hp-text-muted);
        padding: var(--hp-space-4) 10px var(--hp-space-1);
        margin: 0;
      }

      .nav__item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border-radius: var(--hp-radius-sm);
        font-size: var(--hp-text-sm);
        font-weight: var(--hp-weight-medium);
        color: var(--hp-text-muted);
        text-decoration: none;
        transition: background var(--hp-duration-fast) var(--hp-ease),
                    color var(--hp-duration-fast) var(--hp-ease);
      }
      .nav__item:hover {
        background: var(--hp-surface-sunken);
        color: var(--hp-text);
        text-decoration: none;
      }
      .nav__item--on {
        background: var(--hp-navy-700);
        color: #fff;
      }
      .nav__icon { display: flex; flex: none; }
      .nav__icon ::ng-deep svg { stroke: currentColor; }
      .nav__label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      .nav__count {
        margin-inline-start: auto;
        min-width: 20px;
        padding: 1px 7px;
        border-radius: var(--hp-radius-pill);
        background: var(--hp-late);
        color: #fff;
        font-size: 11.5px;
        font-weight: var(--hp-weight-semi);
        text-align: center;
      }
      .nav__item--on .nav__count { background: rgba(255, 255, 255, 0.22); }

      .side__foot { margin-top: auto; padding-top: var(--hp-space-4); }
      .side__collapse { width: 100%; }

      /* القائمة المصغّرة: أيقونات بس */
      .shell--collapsed .brand__name,
      .shell--collapsed .nav__label,
      .shell--collapsed .nav__group,
      .shell--collapsed .nav__count,
      .shell--collapsed .side__collapse { display: none; }
      .shell--collapsed .nav__item { justify-content: center; padding-inline: 0; }
      .shell--collapsed .side__foot::before {
        content: '···';
        display: block;
        text-align: center;
        color: var(--hp-text-muted);
        cursor: pointer;
      }

      /* ------------------------------ المحتوى ------------------------------ */

      .topbar {
        position: sticky;
        top: 0;
        z-index: var(--hp-z-sticky);
        display: flex;
        align-items: center;
        gap: var(--hp-space-3);
        height: var(--hp-topbar-h);
        padding: 0 var(--hp-space-6);
        background: color-mix(in srgb, var(--hp-bg) 88%, transparent);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid var(--hp-border);
      }
      .topbar__title { min-width: 0; }
      .topbar__title h1 {
        font-size: var(--hp-text-lg);
        font-weight: var(--hp-weight-semi);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .topbar__burger {
        display: none;
        width: 38px;
        height: 38px;
        padding: 0;
        background: var(--hp-surface);
        border: 1px solid var(--hp-border);
        border-radius: var(--hp-radius-md);
        color: var(--hp-text);
      }
      .topbar__burger:hover { border-color: var(--hp-border-strong); }
      .topbar__burger:focus-visible,
      .topbar__user:focus-visible { outline: 2px solid var(--hp-info); outline-offset: 2px; }

      .topbar__search {
        display: flex;
        align-items: center;
        gap: var(--hp-space-2);
        margin-inline-start: auto;
        padding-inline-start: var(--hp-space-3);
        background: var(--hp-surface);
        border: 1px solid var(--hp-border);
        border-radius: var(--hp-radius-md);
        color: var(--hp-text-muted);
        min-width: 240px;
      }
      .topbar__search input {
        border: 0;
        background: transparent;
        padding-inline: 0 var(--hp-space-3);
        padding-block: 8px;
      }
      .topbar__search input:focus { box-shadow: none; border: 0; }
      .topbar__search:focus-within { border-color: var(--hp-info); }

      .topbar__icon {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        background: var(--hp-surface);
        border: 1px solid var(--hp-border);
        border-radius: var(--hp-radius-md);
        color: var(--hp-text-muted);
        flex: none;
      }
      .topbar__icon:hover { color: var(--hp-text); border-color: var(--hp-border-strong); }

      .topbar__user {
        display: flex;
        align-items: center;
        gap: var(--hp-space-2);
        padding: 2px 4px;
        border-radius: var(--hp-radius-pill);
        color: inherit;
        text-decoration: none;
        min-width: 0;
      }
      .topbar__user:hover { background: var(--hp-surface-sunken); text-decoration: none; }
      .topbar__user-name { font-size: var(--hp-text-sm); font-weight: var(--hp-weight-medium); }
      .avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--hp-navy-700);
        color: #fff;
        display: grid;
        place-items: center;
        font-size: var(--hp-text-xs);
        font-weight: var(--hp-weight-semi);
        flex: none;
      }

      .content {
        flex: 1;
        padding: var(--hp-space-5) var(--hp-space-6) var(--hp-space-10);
        min-width: 0;
      }

      /* شريط تنبيه تفعيل الإيميل — تحت الشريط العلوي، بلون "قرّب ميعاده" (كهرماني) */
      .verify-bar {
        display: flex;
        align-items: center;
        gap: var(--hp-space-3);
        flex-wrap: wrap;
        padding: var(--hp-space-2) var(--hp-space-6);
        background: var(--hp-due-bg);
        border-bottom: 1px solid color-mix(in srgb, var(--hp-due) 40%, transparent);
        color: var(--hp-due-text);
        font-size: var(--hp-text-sm);
      }
      .verify-bar__text { flex: 1; min-width: 200px; }
      .verify-bar .hp-btn { color: var(--hp-due-text); border-color: color-mix(in srgb, var(--hp-due) 55%, transparent); }
      .verify-bar__done { font-weight: var(--hp-weight-medium); }

      .scrim {
        display: none;
        position: fixed;
        inset: 0;
        z-index: calc(var(--hp-z-drawer) - 1);
        background: rgba(8, 15, 28, 0.5);
      }

      /* ------------------------------ الموبايل ------------------------------ */
      @media (max-width: 900px) {
        .side {
          z-index: var(--hp-z-drawer);
          width: min(280px, 84vw);
          transform: translateX(-100%);
          /* مقفول = مخفي تمامًا (مش بس برّه الشاشة) عشان الـ Tab ما يدخلش
             على روابطه، وبيتأخر الإخفاء لحد ما الحركة تخلص. */
          visibility: hidden;
          transition: transform var(--hp-duration) var(--hp-ease),
                      visibility 0s linear var(--hp-duration);
        }
        /* في RTL الدرج بيخرج من اليمين (والقائمة مثبّتة على اليمين) */
        :host-context([dir='rtl']) .side { transform: translateX(100%); }
        .side--open {
          transform: translateX(0) !important;
          visibility: visible;
          box-shadow: var(--hp-shadow-pop);
          transition-delay: 0s;
        }

        /* على الموبايل القائمة درج بيتفتح فوق المحتوى، مش عمود ثابت جنبه —
           فالتصغير (collapse) مالوش معنى هنا، وعرض المحتوى لازم يبقى كامل
           من غير أي margin محجوز للقائمة (اللي بقت overlay مش عمود جنبها). */
        .shell--collapsed .side { width: min(280px, 84vw); }
        .body,
        .shell--collapsed .body { margin-inline-start: 0; }

        .scrim { display: block; }
        .topbar__burger { display: grid; place-items: center; flex: none; }
        .topbar { padding-inline: var(--hp-space-4); }
        .verify-bar { padding-inline: var(--hp-space-4); }
        .topbar__search { min-width: 0; flex: 1; }
        .topbar__title h1 { display: none; }
        .topbar__user-name { display: none; }
        .content { padding: var(--hp-space-4) var(--hp-space-4) var(--hp-space-10); }

        .shell--collapsed .brand__name,
        .shell--collapsed .nav__label,
        .shell--collapsed .nav__group,
        .shell--collapsed .nav__count { display: initial; }
        .shell--collapsed .nav__item { justify-content: flex-start; padding-inline: 10px; }
      }

      @media (max-width: 560px) {
        .topbar__search { display: none; }
        .topbar__title h1 { display: block; }
      }
    `,
  ],
})
export class AppShellComponent implements OnInit {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly auth = inject(AuthService);
  private readonly homeService = inject(HomeService);
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly notificationService = inject(NotificationService);
  readonly searchService = inject(SearchService);

  readonly userName = computed(() => this.auth.user()?.fullName ?? '');
  readonly userRole = computed<string>(() => this.auth.user()?.role ?? 'owner');
  readonly userEmail = computed(() => this.auth.user()?.email ?? '');

  /** الشريط بيظهر طول ما الإيميل مش متفعّل، ويختفي لوحده أول ما يتفعّل. */
  readonly showVerifyBar = computed(() => {
    const user = this.auth.user();
    return !!user && !user.isEmailVerified;
  });
  readonly resendState = signal<'idle' | 'sending' | 'sent' | 'error'>('idle');

  /** عدد مهام الصيانة المفتوحة — بيتحسب فعليًا من الباك إند في ngOnInit، بيبدأ بصفر لحد ما يوصل الرد. */
  readonly openTasksCount = signal(0);
  // مفيش شاشة "طلبات الخدمة" لسه (coming soon) فمفيش مصدر بيانات حقيقي للعدّاد ده — صفر بدل رقم وهمي.
  readonly openRequestsCount = signal(0);

  readonly collapsed = signal(this.readStored('hp_sidebar_collapsed') === '1');
  readonly drawerOpen = signal(false);
  readonly theme = signal<'light' | 'dark'>(this.initialTheme());
  readonly pageTitle = signal('لوحة القيادة');

  readonly initials = computed(() =>
    this.userName()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join(''),
  );

  private readonly groups: NavGroup[] = [
    {
      items: [
        { label: 'لوحة القيادة', path: '/app/home', icon: icons.home },
        { label: 'بيوتي', path: '/app/homes', icon: icons.homes },
        { label: 'الأجهزة والأصول', path: '/app/assets', icon: icons.assets },
        { label: 'المستندات', path: '/app/documents', icon: icons.docs },
        { label: 'ذاكرة البيت', path: '/app/memory', icon: icons.memory },
      ],
    },
    {
      title: 'المتابعة',
      items: [
        { label: 'الصيانة', path: '/app/maintenance', icon: icons.wrench, badge: () => this.openTasksCount() },
        { label: 'المصاريف', path: '/app/expenses', icon: icons.money },
        { label: 'الاشتراكات', path: '/app/subscriptions', icon: icons.repeat },
        { label: 'التقويم', path: '/app/calendar', icon: icons.calendar },
      ],
    },
    {
      title: 'الخدمات',
      items: [
        {
          label: 'طلبات الخدمة',
          path: '/app/service-requests',
          icon: icons.chat,
          badge: () => this.openRequestsCount(),
        },
        { label: 'المساعد الذكي', path: '/app/ai-assistant', icon: icons.spark },
        { label: 'الإنجازات', path: '/app/achievements', icon: icons.star },
        { label: 'العقارات', path: '/app/properties', icon: icons.building },
      ],
    },
    {
      title: 'مقدّم الخدمة',
      items: [
        { label: 'ملفّي', path: '/app/provider', icon: icons.badge, roles: ['provider'] },
        { label: 'الطلبات المفتوحة', path: '/app/provider/requests', icon: icons.inbox, roles: ['provider'] },
      ],
    },
    {
      title: 'الإدارة',
      items: [
        { label: 'المستخدمون', path: '/app/admin/users', icon: icons.users, roles: ['platform_admin'] },
        { label: 'التحليلات', path: '/app/admin/analytics', icon: icons.chart, roles: ['platform_admin'] },
        { label: 'مقدّمو الخدمة', path: '/app/admin/providers', icon: icons.badge, roles: ['platform_admin'] },
      ],
    },
    {
      items: [
        { label: 'حسابي', path: '/app/settings', icon: icons.user, exact: true },
        { label: 'الاشتراك والفواتير', path: '/app/settings/billing', icon: icons.card },
      ],
    },
  ];

  /** المجموعات بعد ترشيح العناصر اللي مش من صلاحية المستخدم. */
  readonly visibleGroups = computed<NavGroupView[]>(() => {
    const role = this.userRole();
    return this.groups
      .map((group) => ({
        title: group.title,
        items: group.items
          .filter((item) => !item.roles?.length || item.roles.includes(role))
          .map<NavItemView>((item) => ({
            label: item.label,
            path: item.path,
            exact: item.exact ?? false,
            count: item.badge ? item.badge() : 0,
            icon: this.sanitizer.bypassSecurityTrustHtml(item.icon),
          })),
      }))
      .filter((group) => group.items.length > 0);
  });

  constructor(private readonly router: Router) {
    this.applyTheme(this.theme());

    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.drawerOpen.set(false);
      this.pageTitle.set(this.titleForUrl(this.router.url));
    });

    // الصفحة ماتتحركش وراء الدرج وهو مفتوح على الموبايل.
    effect(() => {
      if (typeof document === 'undefined') return;
      document.body.style.overflow = this.drawerOpen() ? 'hidden' : '';
    });

    // كل ما البيت "الشغّال" يتغيّر (المستخدم بدّله من شاشة "بيوتي" مثلًا)،
    // حدّث عدّاد مهام الصيانة المفتوحة بدل ما يفضل واقف على رقم بيت تاني.
    effect(() => {
      const homeId = this.homeService.activeHomeId();
      if (homeId) this.refreshOpenTasksCount();
      else this.openTasksCount.set(0);
    });
  }

  ngOnInit(): void {
    // البيوت بتتحمّل هنا (مش بس في كل شاشة على حدة) عشان القائمة الجانبية
    // جاهزة من أول لحظة — كل شاشة فرعية بتنادي homeService.load() برضو،
    // وهي آمنة تتنادى أكتر من مرة (بترجّع نفس النتيجة المحمّلة).
    this.homeService.load().subscribe({
      error: () => {
        /* الشاشة الفرعية (لوحة القيادة) هي اللي هتعرض رسالة الخطأ */
      },
    });
  }

  logout(): void {
    this.auth.logout().subscribe(() => {
      this.homeService.reset();
      this.notificationService.reset();
      this.searchService.query.set('');
      this.router.navigateByUrl('/auth/login');
    });
  }

  @HostListener('document:keydown.escape')
  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  /** لو الشاشة كبرت وهو مفتوح، الدرج بيرجع قائمة ثابتة — مينفعش يفضل "مفتوح" ومعاه scrim مخفي. */
  @HostListener('window:resize')
  onResize(): void {
    if (this.drawerOpen() && typeof window !== 'undefined' && window.innerWidth > 900) {
      this.drawerOpen.set(false);
    }
  }

  resendVerification(): void {
    if (this.resendState() === 'sending') return;
    this.resendState.set('sending');
    this.auth.resendVerification().subscribe({
      // لو كان متفعّل أصلًا، الخدمة بتحدّث المستخدم والشريط بيختفي لوحده.
      next: () => this.resendState.set('sent'),
      error: () => this.resendState.set('error'),
    });
  }

  openDrawer(): void {
    this.drawerOpen.set(true);
  }

  toggleCollapse(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    this.writeStored('hp_sidebar_collapsed', next ? '1' : '0');
  }

  toggleTheme(): void {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    this.applyTheme(next);
    this.writeStored('hp_theme', next);
  }

  /** عنوان الشاشة في الشريط العلوي، مأخوذ من نفس أسماء القائمة. */
  private titleForUrl(url: string): string {
    const clean = url.split('?')[0];
    const all = this.groups.flatMap((group) => group.items);
    const match = all
      .filter((item) => clean === item.path || clean.startsWith(item.path + '/'))
      .sort((a, b) => b.path.length - a.path.length)[0];
    return match?.label ?? 'HomePilot';
  }

  /** بيحسب عدد مهام الصيانة المفتوحة (مش منجزة/ملغاة/متخطاة) لشارة القائمة الجانبية. */
  private refreshOpenTasksCount(): void {
    const homeId = this.homeService.activeHomeId();
    if (!homeId) {
      this.openTasksCount.set(0);
      return;
    }
    this.maintenanceService.list(homeId).subscribe({
      next: (tasks) => {
        const open = tasks.filter((t) => t.status === 'PENDING' || t.status === 'OVERDUE' || t.status === 'IN_PROGRESS');
        this.openTasksCount.set(open.length);
      },
      error: () => this.openTasksCount.set(0),
    });
  }

  private initialTheme(): 'light' | 'dark' {
    const stored = this.readStored('hp_theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-hp-theme', theme);
  }

  private readStored(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private writeStored(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* الوضع الخاص في بعض المتصفحات بيمنع التخزين — مش مشكلة */
    }
  }
}

/** أيقونات inline — مفيش مكتبة أيقونات، عشان الـ bundle يفضل صغير. */
const icons = {
  home: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 10v10h14V10"/></svg>`,
  homes: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M3 21h18M5 21V9l7-5 7 5v12"/><path d="M10 21v-6h4v6"/></svg>`,
  assets: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>`,
  docs: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M14 3v5h5M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M9 13h6M9 17h4"/></svg>`,
  memory: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  wrench: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 1 5.4-5.4z"/></svg>`,
  money: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>`,
  repeat: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
  calendar: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>`,
  chat: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  spark: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V5a3 3 0 0 1 6 0v2M9 13h.01M15 13h.01"/></svg>`,
  star: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M12 3l2.2 5.2 5.8.5-4.4 3.8 1.3 5.5L12 15.9 7.1 18l1.3-5.5L4 8.7l5.8-.5z"/></svg>`,
  building: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h6v6"/></svg>`,
  badge: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="12" cy="9" r="5"/><path d="M8.5 13.5L7 22l5-2.5L17 22l-1.5-8.5"/></svg>`,
  inbox: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M4.5 5h15l1.5 8v6H3v-6z"/></svg>`,
  users: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5.5a3.5 3.5 0 0 1 0 7M18 20a6 6 0 0 0-3-5.2"/></svg>`,
  chart: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>`,
  user: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`,
  card: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg>`,
};

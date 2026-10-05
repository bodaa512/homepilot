import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

const comingSoon = () =>
  import('./shared/ui/coming-soon.component').then((m) => m.ComingSoonComponent);

export const routes: Routes = [
  // الصفحة التسويقية
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/marketing/pages/landing/landing.component').then((m) => m.LandingComponent),
  },

  // شاشات الدخول والتسجيل — لو المستخدم داخل بالفعل، guestGuard بيوجّهه لـ /app/home على طول.
  {
    path: 'auth/login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/register/register.component').then((m) => m.RegisterComponent),
  },
  // نسيت كلمة المرور — للضيوف بس (guestGuard).
  {
    path: 'auth/forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  // روابط الإيميل — شكلها ثابت زي ما السيرفر بيبعتها (CLIENT_URL/reset-password?token=…).
  // مفتوحة للكل من غير guard: الرابط ممكن يتفتح من أي جهاز، داخل أو لأ.
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/pages/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./features/auth/pages/verify-email/verify-email.component').then((m) => m.VerifyEmailComponent),
  },
  // أي رابط دخول تاني (زي auth/provider من صفحة الهبوط) يروح لشاشة الدخول العادية لحد ما تتعمل شاشات مخصّصة.
  { path: 'auth/:page', redirectTo: '/auth/login' },

  // التطبيق نفسه، جوّه الـ shell (القائمة الجانبية + الشريط العلوي) — محمي بـ authGuard.
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/app-shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/home/pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'assets',
        loadComponent: () =>
          import('./features/assets/pages/asset-list/asset-list.component').then((m) => m.AssetListComponent),
      },
      {
        path: 'homes',
        loadComponent: () =>
          import('./features/homes/pages/home-list/home-list.component').then((m) => m.HomeListComponent),
      },
      {
        path: 'memory',
        loadComponent: () =>
          import('./features/memory/pages/memory-timeline/memory-timeline.component').then(
            (m) => m.MemoryTimelineComponent,
          ),
      },
      {
        path: 'settings',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/settings/pages/account-page/account-page.component').then(
            (m) => m.AccountPageComponent,
          ),
      },
      {
        path: 'settings/billing',
        loadComponent: () =>
          import('./features/billing/pages/billing-page/billing-page.component').then(
            (m) => m.BillingPageComponent,
          ),
      },
      {
        path: 'service-requests',
        loadComponent: () =>
          import('./features/service-requests/pages/service-request-list/service-request-list.component').then(
            (m) => m.ServiceRequestListComponent,
          ),
      },
      {
        path: 'service-requests/:id',
        loadComponent: () =>
          import('./features/service-requests/pages/service-request-detail/service-request-detail.component').then(
            (m) => m.ServiceRequestDetailComponent,
          ),
      },
      {
        path: 'properties',
        loadComponent: () =>
          import('./features/properties/pages/property-list/property-list.component').then(
            (m) => m.PropertyListComponent,
          ),
      },
      {
        path: 'ai-assistant',
        loadComponent: () =>
          import('./features/ai/pages/ai-assistant/ai-assistant.component').then((m) => m.AiAssistantComponent),
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./features/calendar/pages/calendar-page/calendar-page.component').then(
            (m) => m.CalendarPageComponent,
          ),
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./features/documents/pages/document-list/document-list.component').then(
            (m) => m.DocumentListComponent,
          ),
      },
      {
        path: 'maintenance',
        loadComponent: () =>
          import('./features/maintenance/pages/task-list/task-list.component').then((m) => m.TaskListComponent),
      },
      {
        path: 'expenses',
        loadComponent: () =>
          import('./features/expenses/pages/expense-list/expense-list.component').then(
            (m) => m.ExpenseListComponent,
          ),
      },
      {
        path: 'subscriptions',
        loadComponent: () =>
          import('./features/subscriptions/pages/subscription-list/subscription-list.component').then(
            (m) => m.SubscriptionListComponent,
          ),
      },
      {
        path: 'achievements',
        loadComponent: () =>
          import('./features/achievements/pages/achievement-list/achievement-list.component').then(
            (m) => m.AchievementListComponent,
          ),
      },
      // باقي عناصر القائمة لسه ملهاش شاشات
      { path: '**', loadComponent: comingSoon },
    ],
  },

  { path: '**', redirectTo: '' },
];

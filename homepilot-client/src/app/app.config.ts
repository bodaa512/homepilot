import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

// Angular 21+ بيشتغل zoneless تلقائي (من غير zone.js). التوكن والبيانات
// بيتخزنوا في signals، فالتحديث بعد أي نداء HttpClient بيوصل للشاشة
// عادي من غير ما نحتاج نظام الـ zones القديم.
export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes), provideHttpClient(withInterceptors([authInterceptor]))],
};

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** لو المستخدم داخل بالفعل، مايشوفش شاشة الدخول/التسجيل تاني. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.ensureSession().pipe(
    map(() => {
      if (!auth.isAuthenticated()) return true;
      return router.createUrlTree(['/app/home']);
    }),
  );
};

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const unauthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If the admin is already logged in, they shouldn't see the login page again.
  // Bump them straight to the dashboard.
  if (authService.getRefreshToken()) {
    router.navigate(['/overview']);
    return false;
  }

  return true;
};

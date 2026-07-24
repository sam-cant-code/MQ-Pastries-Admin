import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If a refresh token exists, we consider the session active on the client side.
  // If the token is actually expired/invalid, our AuthInterceptor will intercept the 
  // 401 on the first API call, delete the token, and force a redirect back to login.
  if (authService.getRefreshToken()) {
    return true;
  }

  // Not logged in, redirect to login page
  router.navigate(['/login']);
  return false;
};

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { HttpClient, HttpBackend } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const httpBackend = inject(HttpBackend);
  const http = new HttpClient(httpBackend);
  
  const accessToken = authService.getAccessToken();

  if (accessToken) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized globally
      if (error.status === 401 && !req.url.includes('/auth/login') && !req.url.includes('/auth/refresh')) {
        const refreshToken = authService.getRefreshToken();
        
        if (refreshToken) {
          // Attempt to get a new access token using the refresh token
          return http.post<any>(`${environment.apiUrl}/auth/refresh`, { refreshToken }).pipe(
            switchMap((response) => {
              localStorage.setItem('access_token', response.accessToken);
              if (response.refreshToken) {
                 localStorage.setItem('refresh_token', response.refreshToken);
              }
              
              // Retry the original failed request with the new token
              const clonedRequest = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${response.accessToken}`
                }
              });
              
              return next(clonedRequest);
            }),
            catchError((refreshError) => {
              // Refresh token is expired or invalid
              authService.logout();
              router.navigate(['/login']);
              return throwError(() => refreshError);
            })
          );
        } else {
          // No refresh token available, redirect to login
          authService.logout();
          router.navigate(['/login']);
          return throwError(() => error);
        }
      }
      
      return throwError(() => error);
    })
  );
};

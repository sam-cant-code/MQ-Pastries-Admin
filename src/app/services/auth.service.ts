import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  email: string;
  password?: string;
  captchaToken?: string;
}

export interface LoginResponse {
  otpRequired?: boolean;
  captchaRequired?: boolean;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface OtpRequest {
  email: string;
  otpCode: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/auth`; 

  login(req: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, req).pipe(
      tap((res) => this.saveTokens(res))
    );
  }

  verifyOtp(req: OtpRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/verify-otp`, req).pipe(
      tap((res) => this.saveTokens(res))
    );
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/reset-password`, { token, newPassword });
  }

  private saveTokens(res: any) {
    if (res.token) localStorage.setItem('access_token', res.token);
    if (res.accessToken) localStorage.setItem('access_token', res.accessToken);
    if (res.refreshToken) localStorage.setItem('refresh_token', res.refreshToken);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
}

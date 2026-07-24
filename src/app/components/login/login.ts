import { Component, inject, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

declare global {
  interface Window {
    turnstile: any;
  }
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
})
export class Login implements AfterViewInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginStep: 'CREDENTIALS' | 'OTP' | 'FORGOT_PASSWORD' | 'FORGOT_PASSWORD_SUCCESS' = 'CREDENTIALS';
  isLoading = false;
  errorMessage = '';

  captchaToken: string | null = null;
  turnstileWidgetId: any = null;

  credentialsForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [false]
  });

  otpForm = this.fb.group({
    otpCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
  });

  forgotPasswordForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  ngAfterViewInit() {
    this.renderTurnstile();
  }

  onLoginSubmit(event?: Event) {
    if (event) event.preventDefault();
    if (this.credentialsForm.invalid || !this.captchaToken) return;
    
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const { email, password } = this.credentialsForm.value;

      this.authService.login({ email: email!, password: password!, captchaToken: this.captchaToken }).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          if (res.otpRequired) {
            this.loginStep = 'OTP';
          } else {
            this.router.navigate(['/overview']);
          }
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error("Login Error:", err);
          this.isLoading = false;
          this.captchaToken = null;
          this.errorMessage = err.error?.message || 'Login failed. Please check your credentials.';
          
          try {
            if (this.turnstileWidgetId !== null && window.turnstile) {
                window.turnstile.reset(this.turnstileWidgetId);
            }
          } catch (e) {
            console.error("Failed to reset turnstile:", e);
          }
          
          this.cdr.detectChanges();
        }
      });
    } catch (err: any) {
      console.error("Sync Error:", err);
      this.isLoading = false;
      this.errorMessage = "An unexpected error occurred. Please check console.";
      this.cdr.detectChanges();
    }
  }

  onForgotPassword(event: Event) {
    event.preventDefault();
    this.errorMessage = '';
    this.loginStep = 'FORGOT_PASSWORD';
  }

  onForgotPasswordSubmit() {
    if (this.forgotPasswordForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';
    const email = this.forgotPasswordForm.value.email!;

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.isLoading = false;
        this.loginStep = 'FORGOT_PASSWORD_SUCCESS';
      },
      error: (err: any) => {
        console.error("Forgot Password Error:", err);
        this.isLoading = false;
        this.errorMessage = 'Failed to request password reset. Please try again.';
      }
    });
  }

  private cdr = inject(ChangeDetectorRef);

  renderTurnstile() {
    this.cdr.detectChanges(); // Force DOM update so #turnstile-container exists
    
    if (window.turnstile) {
      // Remove old widget if it exists to prevent duplicate ID issues
      if (this.turnstileWidgetId !== null) {
        try {
          window.turnstile.remove(this.turnstileWidgetId);
        } catch (e) {
          console.error('Error removing old turnstile widget', e);
        }
        this.turnstileWidgetId = null;
      }

      setTimeout(() => { 
        try {
          this.turnstileWidgetId = window.turnstile.render('#turnstile-container', {
            sitekey: '1x00000000000000000000AA', // Dummy sitekey for testing
            callback: (token: string) => {
              this.captchaToken = token;
              this.cdr.detectChanges();
            },
            'error-callback': () => {
               this.errorMessage = 'Captcha failed to load. Please refresh the page.';
               this.cdr.detectChanges();
            }
          });
        } catch (e) {
          console.error("Turnstile render error:", e);
          this.errorMessage = 'Failed to render security verification. Please refresh.';
          this.cdr.detectChanges();
        }
      }, 50);
    } else {
      this.errorMessage = 'Security verification system is currently unavailable (script blocked).';
      this.cdr.detectChanges();
    }
  }



  onOtpSubmit() {
    if (this.otpForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const email = this.credentialsForm.value.email!;
    const otpCode = this.otpForm.value.otpCode!;

    this.authService.verifyOtp({ email, otpCode }).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/overview']);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Invalid or expired OTP.';
      }
    });
  }
}

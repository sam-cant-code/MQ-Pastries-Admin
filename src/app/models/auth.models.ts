export interface LoginRequest {
  email: string;
  password?: string;
  captchaToken?: string;
}

export interface LoginResponse {
  otpRequired: boolean;
  captchaRequired: boolean;
}

export interface OtpVerificationRequest {
  email: string;
  otpCode: string;
}

export interface AdminDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  admin: AdminDto;
}

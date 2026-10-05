export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  rol: string;
}

export interface Sesion {
  token: string;
  username: string;
  rol: string;
}
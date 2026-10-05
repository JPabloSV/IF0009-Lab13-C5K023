import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { API_URL } from '../api.config';
import { AuthResponse, LoginRequest, Sesion } from '../models/auth.models';

const TOKEN_KEY = 'medpharm_token';
const USER_KEY = 'medpharm_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // Estado de la sesión como signal (se recupera de localStorage al recargar)
  private readonly _sesion = signal<Sesion | null>(this.leerSesion());
  readonly sesion = this._sesion.asReadonly();
  readonly autenticado = computed(() => this._sesion() !== null);

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/login`, credentials).pipe(
      tap(res => {
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USER_KEY, JSON.stringify({ username: res.username, rol: res.rol }));
        this._sesion.set({ token: res.token, username: res.username, rol: res.rol });
      })
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._sesion.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this._sesion()?.token ?? null;
  }

  private leerSesion(): Sesion | null {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = localStorage.getItem(USER_KEY);
    if (!token || !user || this.tokenExpirado(token)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return null;
    }
    try {
      const { username, rol } = JSON.parse(user);
      return { token, username, rol };
    } catch {
      return null;
    }
  }

  private tokenExpirado(token: string): boolean {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}
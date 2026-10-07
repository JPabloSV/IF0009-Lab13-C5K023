# MedPharm Express — Laboratorio 13 (IF0009)

**Estudiante:** Juan Pablo Solano Vásquez · **Carné:** C5K023  
**Curso:** IF0009 – Desarrollo de Software IV · Universidad de Costa Rica, Sede del Atlántico

Sistema full-stack de gestión de recetas médicas y despacho de farmacia, con autenticación JWT,
API REST en Spring Boot y cliente SPA en Angular con Formularios Reactivos y Signals.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Backend | Java 25, Spring Boot 4.1.1, Spring Security, Spring Data JPA, H2 (en memoria), jjwt 0.12.6, Lombok |
| Frontend | Angular 22 (standalone, zoneless), Reactive Forms, Signals, HttpClient |
| Herramientas | Maven Wrapper, Angular CLI, Node.js 24, Git |

> El enunciado indica Spring Boot 3 y Angular 19. Se utilizaron las versiones más recientes
> instaladas; los conceptos solicitados (JPA, Spring Security + JWT, componentes standalone,
> `signal()`, `computed()`, `HttpInterceptorFn`, `CanActivateFn`, `FormGroup`/`FormArray`) son los mismos.

## Estructura

```
IF0009-Lab13-C5K023/
├── docs/
│   └── error_jwt_401.png
├── medpharm-backend/      # Spring Boot (model, repository, security, dto, service, controller, exception)
└── medpharm-frontend/     # Angular (services, interceptors, guards, validators, components)
```

## Ejecución

**Backend** (puerto 8080):

```bash
cd medpharm-backend
./mvnw spring-boot:run
```

**Frontend** (puerto 4200):

```bash
cd medpharm-frontend
npm install
ng serve
```

Abrir http://localhost:4200

### Usuarios de prueba

| Usuario | Contraseña | Rol |
|---|---|---|
| `medico1` | `password123` | MEDICO |
| `farma1` | `password123` | FARMACEUTICO |

> El hash BCrypt incluido originalmente en `data.sql` estaba incompleto (52 caracteres en lugar de 60),
> por lo que ninguna contraseña coincidía. Se regeneró con el mismo `BCryptPasswordEncoder` del proyecto.

Consola H2: http://localhost:8080/h2-console · JDBC URL `jdbc:h2:mem:medpharmdb` · usuario `sa` · sin contraseña.

## API REST

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| POST | `/api/v1/auth/login` | No | Autentica y devuelve `{ token, username, rol }` |
| GET | `/api/v1/medicamentos` | JWT | Catálogo de medicamentos |
| GET | `/api/v1/recetas` | JWT | Lista de recetas (más recientes primero) |
| GET | `/api/v1/recetas/estado/{estado}` | JWT | Filtra por `PENDIENTE`, `DESPACHADA` o `CANCELADA` |
| POST | `/api/v1/recetas` | JWT | Crea una receta con sus detalles; valida stock. El médico se toma del token |
| PATCH | `/api/v1/recetas/{id}/estado` | JWT | Cambia una receta `PENDIENTE` a `DESPACHADA` (descuenta stock) o `CANCELADA` |

Todos los errores se devuelven en formato **RFC 7807** (`application/problem+json`) mediante
`GlobalExceptionHandler`: 400 (validación, con detalle por campo), 401 (sin token / credenciales
inválidas), 404 (recurso inexistente) y 409 (stock insuficiente o receta ya procesada).

---

## Parte 3: Análisis y depuración del error 401

### Prueba realizada

Se eliminó temporalmente el registro del interceptor en `medpharm-frontend/src/app/app.config.ts`:

```ts
// Configuración normal
provideHttpClient(withInterceptors([authInterceptor]))

// Configuración de la prueba
provideHttpClient()
```

Con una sesión iniciada (token presente en `localStorage`), se navegó a `/recetas`. La petición
`GET http://localhost:8080/api/v1/recetas` fue rechazada con **HTTP 401 Unauthorized**:

![Error 401 sin interceptor](docs/error_jwt_401.png)

Respuesta del servidor:

```json
{
  "type": "about:blank",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Autenticacion requerida: token JWT ausente, invalido o expirado",
  "instance": "/api/v1/recetas"
}
```

### ¿Por qué el servidor rechazó la petición?

1. **La API es stateless.** `SecurityConfig` usa `SessionCreationPolicy.STATELESS`: el servidor no
   guarda sesión ni cookie. Cada petición debe demostrar por sí misma quién es el usuario, y la única
   forma aceptada es la cabecera `Authorization: Bearer <token>`.
2. **El token existía, pero no se envió.** El JWT estaba guardado en `localStorage`, pero `HttpClient`
   no lo lee ni lo adjunta por su cuenta. Sin el interceptor, la petición salió **sin** la cabecera
   `Authorization`, como se observa en *Request Headers* en la pestaña Network.
3. **El filtro no pudo autenticar.** `AuthTokenFilter` busca un header que empiece con `Bearer `. Al no
   encontrarlo, no valida nada y deja el `SecurityContext` vacío (petición anónima).
4. **La regla de autorización la bloqueó.** `/api/v1/recetas` cae en `anyRequest().authenticated()`.
   Como la petición es anónima, Spring Security invoca el `AuthenticationEntryPoint`
   (`AuthEntryPointJwt`), que responde **401** con el cuerpo RFC 7807. La petición nunca llega a
   `RecetaController`.

> **401 vs 403:** 401 significa "no sé quién sos" (falta autenticación); 403 significa "sé quién sos,
> pero no tenés permiso". Sin `AuthEntryPointJwt`, Spring Security responde 403 por defecto en
> configuraciones stateless, lo que confunde el diagnóstico. Por eso se registró un entry point propio.

> **No fue un error de CORS.** La respuesta incluye `Vary: Origin` y el preflight `OPTIONS` está
> permitido (`requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()`), y `Authorization` está en
> `allowedHeaders`. Si CORS fallara, el navegador mostraría *"blocked by CORS policy"* y estado 0,
> no un 401 con cuerpo JSON legible.

### ¿Cómo lo resuelve el interceptor?

`authInterceptor` (`src/app/interceptors/auth.interceptor.ts`) es una función `HttpInterceptorFn` que
se ejecuta en **todas** las peticiones de `HttpClient`, antes de que salgan al servidor:

```ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  const request = token && req.url.startsWith(API_URL)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.endsWith('/auth/login')) auth.logout();
      return throwError(() => err);
    })
  );
};
```

- **Obtiene el token** desde `AuthService` (que lo guardó en `localStorage` al hacer login).
- **Clona la petición** con `req.clone()`, porque `HttpRequest` es **inmutable**, y le agrega
  `Authorization: Bearer <token>`.
- **Solo lo envía a la propia API** (`API_URL`), para no filtrar el token a dominios externos.
- **Centraliza la lógica:** `RecetaService` y `MedicamentoService` no manejan cabeceras; ningún
  servicio puede "olvidar" enviarlas.
- **Maneja la expiración:** si el servidor responde 401 (token vencido o inválido), cierra la sesión
  y redirige a `/login`.

Se registra una sola vez en `app.config.ts` con `provideHttpClient(withInterceptors([authInterceptor]))`.
Al restaurarlo, la misma petición devuelve **200 OK** y en *Request Headers* aparece
`Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...` (algoritmo HS256 / HMAC-SHA256).

### Flujo completo

```
Login ──POST /auth/login──► AuthController ──► AuthenticationManager (BCrypt) ──► JwtUtils.generarToken()
  ◄── { token, username, rol } ── AuthService guarda en localStorage + signal

GET /recetas
  Angular: authInterceptor agrega "Authorization: Bearer <token>"
  Spring:  AuthTokenFilter valida firma/expiración ──► SecurityContext ──► RecetaController ──► 200 OK
           (sin header o token inválido) ──► AuthEntryPointJwt ──► 401
```
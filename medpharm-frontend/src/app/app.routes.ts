import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './components/login/login.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'recetas',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/recetas-list/recetas-list.component').then(m => m.RecetasListComponent)
  },
  {
    path: 'nueva-receta',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/receta-form/receta-form.component').then(m => m.RecetaFormComponent)
  },
  { path: '', pathMatch: 'full', redirectTo: 'recetas' },
  { path: '**', redirectTo: 'recetas' }
];
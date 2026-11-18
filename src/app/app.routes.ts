import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'auth',
        pathMatch: 'full',
    },
    {
        path: 'auth',
        loadComponent: () => import('./features/auth/auth').then((m) => m.Auth),
        pathMatch: 'full',
        canActivate: [guestGuard],
    },
    {
        path: 'home',
        loadComponent: () => import('./features/home/home').then((m) => m.Home),
        pathMatch: 'full',
        canActivate: [authGuard],
    },
    {
        path: 'library',
        loadComponent: () => import('./features/library/library').then((m) => m.Library),
        pathMatch: 'full',
        canActivate: [authGuard],
    },
    {
        path: 'library/album/:id',
        loadComponent: () => import('./features/album/album').then((m) => m.Album),
        pathMatch: 'full',
        canActivate: [authGuard],
    }
];

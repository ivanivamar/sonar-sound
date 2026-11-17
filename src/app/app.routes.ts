import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'library',
        pathMatch: 'full',
    },
    {
        path: 'library',
        loadComponent: () => import('./features/library/library').then((m) => m.Library),
        pathMatch: 'full',
    },
    {
        path: 'library/album/:id',
        loadComponent: () => import('./features/album/album').then((m) => m.Album),
        pathMatch: 'full',
    }
];

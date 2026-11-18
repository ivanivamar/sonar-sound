import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return auth.isSignedIn()
        ? true
        : router.createUrlTree(['/auth'], { queryParams: { returnUrl: state.url } });
};

export const guestGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return auth.isSignedIn() ? router.createUrlTree(['/library']) : true;
};

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { catchError, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // check if the request starts with https://www.googleapis.com/
    if (req.url.startsWith('https://www.googleapis.com/')) {
        const token = authService.getValidToken();
        if (token) {
            req = req.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`
                }
            });
        }

        // handle 401 Unauthorized if needed
        return next(req).pipe(
            catchError((error) => {
                if (error instanceof HttpErrorResponse && error.status === 401) {
                    authService.clearSession();
                    router.navigate(['/auth'], { queryParams: { returnUrl: router.url } });
                }
                return throwError(() => error);
            })
        );
    }
    return next(req);
};
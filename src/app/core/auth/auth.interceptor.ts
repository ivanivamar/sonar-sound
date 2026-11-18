import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { catchError, throwError } from 'rxjs';

/**
 * Adds the current bearer token to Google API requests.
 *
 * Requests to other hosts pass through unchanged. A 401 response from Google
 * clears the local auth session, and the original error is rethrown.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);

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

        // On 401 the token is dead: clear the session (App's effect redirects to /auth), then re-throw
        return next(req).pipe(
            catchError((error) => {
                if (error instanceof HttpErrorResponse && error.status === 401) {
                    authService.clearSession();
                }
                return throwError(() => error);
            })
        );
    }
    return next(req);
};
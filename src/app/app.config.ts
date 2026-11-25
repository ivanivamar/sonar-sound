import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { PreloadAllModules, provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';
import { withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { authInterceptor } from './core/auth/auth.interceptor';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideRouter(routes, withComponentInputBinding(), withPreloading(PreloadAllModules)),
        provideHttpClient(withInterceptors([authInterceptor]))
    ],
};

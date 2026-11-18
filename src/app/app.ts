import { Component, effect, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { Sidebar } from './shared/components/sidebar/sidebar';
import { Atmosphere } from './shared/components/atmosphere/atmosphere';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, Sidebar, Atmosphere],
    templateUrl: './app.html',
    styleUrl: './app.scss',
})
export class App {
    protected readonly title = signal('sonar-sound');

    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    constructor() {
        // Send the user to /auth whenever the session ends (sign-out button, token expiry or a 401).
        // Only react to a true → false change: a signed-out first load is handled by authGuard.
        let wasSignedIn = this.authService.isSignedIn();

        effect(() => {
            const isSignedIn = this.authService.isSignedIn();

            if (wasSignedIn && !isSignedIn) {
                this.router.navigate(['/auth'], { queryParams: { returnUrl: this.router.url } });
            }

            wasSignedIn = isSignedIn;
        });
    }
}

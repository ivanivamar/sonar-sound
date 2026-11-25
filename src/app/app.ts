import { Component, effect, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { Sidebar } from './layout/sidebar/sidebar';
import { Atmosphere } from './layout/atmosphere/atmosphere';
import { AtmosphereService } from './layout/atmosphere/atmosphere.service';
import { Topbar } from './layout/topbar/topbar';
import { CdkVirtualScrollableElement } from '@angular/cdk/scrolling';
import { Player } from './shared/media/player/player';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, Sidebar, Atmosphere, Topbar, CdkVirtualScrollableElement, Player],
    templateUrl: './app.html',
    styleUrl: './app.scss',
    host: {
        '[style.--atmosphere-accent-hue]': 'atmosphereState().hue',
        '[style.--atmosphere-accent-chroma]': 'atmosphereState().chroma',
    },
})
export class App {
    protected readonly title = signal('sonar-sound');
    protected readonly atmosphereState = inject(AtmosphereService).state;
    protected readonly pageScrolled = signal(false);

    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    protected readonly currentNavigation = this.router.currentNavigation;

    constructor() {
        // Send the user to /auth whenever the session ends (sign-out button, token expiry or a 401).
        // Only react to a true → false change: a signed-out first load is handled by authGuard.
        let wasSignedIn = this.authService.isSignedIn();

        effect(() => {
            const isSignedIn = this.authService.isSignedIn();

            if (!isSignedIn) {
                this.pageScrolled.set(false);
            }

            if (wasSignedIn && !isSignedIn) {
                this.router.navigate(['/auth'], { queryParams: { returnUrl: this.router.url } });
            }

            wasSignedIn = isSignedIn;
        });
    }

    protected updatePageScroll(scrollTop: number): void {
        this.pageScrolled.set(scrollTop > 0);
    }
}

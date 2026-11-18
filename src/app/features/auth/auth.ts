import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Ripple } from '../../shared/directives/ripple';

@Component({
    imports: [Ripple],
    selector: 'app-auth',
    styleUrl: './auth.scss',
    templateUrl: './auth.html',
})
export class Auth {
    authService = inject(AuthService);
    router = inject(Router);
    route = inject(ActivatedRoute);

    private readonly returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/library';
    private readonly error = signal<string | null>(null);

    async onSignIn() {
        this.error.set(null);
        try {
            await this.authService.signIn();
            this.router.navigateByUrl(this.returnUrl);
        } catch (error) {
            this.error.set('Sign-in failed: ' + (error as Error).message);
        }
    }
}

import { computed, Service, signal } from '@angular/core';
import { GOOGLE_CLIENT_ID } from '../config';

@Service()
export class AuthService {
    private readonly token = signal<string | null>(null);
    private readonly expiresAt = signal<number | null>(null);
    private expiryTimer?: ReturnType<typeof setTimeout>

    readonly isSignedIn = computed(() => this.token() !== null);

    constructor() {
        // restore token from localStorage if token hasn't expired
        const token = localStorage.getItem('auth_token');
        const expiresAt = localStorage.getItem('auth_token_expires_at');
        if (token && expiresAt && Date.now() < Number(expiresAt)) {
            this.token.set(token);
            this.expiresAt.set(Number(expiresAt));
            this.scheduleExpiry(Number(expiresAt));
        }
    }

    signIn(): Promise<void> {
        return new Promise((resolve, reject) => {
            const tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile',
                callback: (response) => {
                    if (response.error) {
                        this.token.set(null);
                        this.expiresAt.set(null);
                        reject(response.error);
                        return;
                    }
                    this.handleToken(response);
                    resolve();
                },
                error_callback: (error) => {
                    this.token.set(null);
                    this.expiresAt.set(null);
                    reject(new Error(error.type))
                }
            });

            tokenClient.requestAccessToken();
        });
    }

    signOut() {
        const token = this.token();
        if (token) {
            google.accounts.oauth2.revoke(token, () => console.log('Token revoked'));
        }
        this.clearSession();
    }

    clearSession() {
        this.token.set(null);
        this.expiresAt.set(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_token_expires_at');
        if (this.expiryTimer) {
            clearTimeout(this.expiryTimer);
        }
    }

    getValidToken(): string | null {
        const token = this.token();
        const expiresAt = this.expiresAt();
        if (token && expiresAt && Date.now() < expiresAt) {
            return token;
        }
        return null;
    }

    scheduleExpiry(expiresAt: number) {
        if (this.expiryTimer) {
            clearTimeout(this.expiryTimer);
        }
        const delay = expiresAt - Date.now();
        if (delay > 0) {
            this.expiryTimer = setTimeout(() => {
                this.clearSession();
            }, delay);
        }
    }

    private handleToken(response: google.accounts.oauth2.TokenResponse) {
        const expiresAt = Date.now() + Number(response.expires_in) * 1000;
        this.token.set(response.access_token);
        this.expiresAt.set(expiresAt);
        localStorage.setItem('auth_token', response.access_token);
        localStorage.setItem('auth_token_expires_at', expiresAt.toString());
        this.scheduleExpiry(expiresAt);
    }
}

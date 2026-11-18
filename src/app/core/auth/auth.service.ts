import { computed, Service, signal } from '@angular/core';
import { GOOGLE_CLIENT_ID } from '../config';

/**
 * Manages Google OAuth access-token sign-in and the current browser session.
 *
 * A valid token and its expiration timestamp are persisted in local storage,
 * restored when the service is created, and cleared when the session expires.
 */
@Service()
export class AuthService {
    private readonly token = signal<string | null>(null);
    private readonly expiresAt = signal<number | null>(null);
    private expiryTimer?: ReturnType<typeof setTimeout>

    /** Whether the service currently has an access token in memory. */
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

    /**
     * Starts Google OAuth and stores the access token returned by Google.
     *
     * Requests read-only Google Drive access and the user's basic profile.
     * The promise resolves after the token is stored, or rejects if the OAuth
     * flow returns an error.
     */
    signIn(): Promise<void> {
        return new Promise((resolve, reject) => {
            const tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile',
                callback: (response) => {
                    if (response.error) {
                        this.token.set(null);
                        this.expiresAt.set(null);
                        reject(new Error(response.error))
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

    /** Revokes the current Google access token, if present, and clears the local session. */
    signOut() {
        const token = this.token();
        if (token) {
            google.accounts.oauth2.revoke(token, () => console.log('Token revoked'));
        }
        this.clearSession();
    }

    /** Clears the in-memory token, persisted credentials, and scheduled expiry timer. */
    clearSession() {
        this.token.set(null);
        this.expiresAt.set(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_token_expires_at');
        if (this.expiryTimer) {
            clearTimeout(this.expiryTimer);
        }
    }

    /**
     * Returns the access token only while its recorded expiration time is in the future.
     *
     * @returns The valid access token, or `null` when the session is missing or expired.
     */
    getValidToken(): string | null {
        const token = this.token();
        const expiresAt = this.expiresAt();
        if (token && expiresAt && Date.now() < expiresAt) {
            return token;
        }
        return null;
    }

    /**
     * Schedules session cleanup for the given expiration time.
     *
     * Replaces any previously scheduled timer. The timestamp is expressed in
     * milliseconds since the Unix epoch.
     */
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

    /** Updates in-memory and persisted session data from a successful OAuth response. */
    private handleToken(response: google.accounts.oauth2.TokenResponse) {
        const expiresAt = Date.now() + Number(response.expires_in) * 1000;
        this.token.set(response.access_token);
        this.expiresAt.set(expiresAt);
        localStorage.setItem('auth_token', response.access_token);
        localStorage.setItem('auth_token_expires_at', expiresAt.toString());
        this.scheduleExpiry(expiresAt);
    }
}

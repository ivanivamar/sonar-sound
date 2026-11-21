import { Service, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { DriveFile } from '../library/library-file.model';

@Service()
export class DriveStreamService {
    private readonly authService = inject(AuthService);

    private listening = false;

    /**
     * Registers the drive stream service worker.
     */
    async register(): Promise<void> {
        if (!('serviceWorker' in navigator) || !window.isSecureContext) {
            throw new Error('Drive streaming requires a service worker and a secure context.');
        }

        this.listenForWorker();

        const workerUrl = new URL('drive-stream-worker.js', document.baseURI);
        const existing = await navigator.serviceWorker.getRegistration(document.baseURI);

        if (existing?.active && existing.active.scriptURL !== workerUrl.href) {
            throw new Error('A different service worker controls this scope.');
        }

        await navigator.serviceWorker.register(workerUrl);

        await new Promise<void>((resolve, reject) => {
            const finish = (error?: Error) => {
                clearTimeout(timeout);
                navigator.serviceWorker.removeEventListener('controllerchange', checkController);
                if (error) reject(error);
                else resolve();
            };

            const checkController = () => {
                const controller = navigator.serviceWorker.controller;
                if (!controller) return;

                if (controller.scriptURL !== workerUrl.href) {
                    finish(new Error('A different service worker controls this page.'));
                    return;
                }

                finish();
            }

            const timeout = setTimeout(() => {
                finish(new Error('The Drive streaming worker did not take control in time.'));
            }, 10_000);

            navigator.serviceWorker.addEventListener('controllerchange', checkController);
            checkController();
        });
    }

    /**
     * Creates a stream URL for the given Drive file.
     */
    createStreamUrl(file: DriveFile): string {
        // Validate the file ID and size before creating the stream URL.
        if (!/^[a-zA-Z0-9_-]+$/.test(file.id) ||
            !Number.isSafeInteger(file.size) || file.size <= 0) {
            throw new Error('A valid Drive file ID and size are required.');
        }

        // Create the stream URL with the file ID and size as query parameters.
        const url = new URL('__drive-stream/test', document.baseURI);
        url.searchParams.set('fileId', file.id);
        url.searchParams.set('size', String(file.size));
        return url.href;
    }

    /**
     * Listens for messages from the drive stream service worker and responds to pings.
     */
    private listenForWorker(): void {
        if (this.listening) return;
        this.listening = true;

        // Listen for messages from the service worker.
        navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
            // Ignore messages not coming from the active service worker.
            if (event.source !== navigator.serviceWorker.controller) return;

            // Respond to ping messages from the service worker.
            if (event.data?.type === 'drive-stream:token' && event.ports[0]) {
                event.ports[0].postMessage({
                    token: this.authService.getValidToken()
                });
            }
        });
    }
}

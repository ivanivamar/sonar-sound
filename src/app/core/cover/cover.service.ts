import { Service, inject, effect, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
    Observable, tap, map, shareReplay, catchError, throwError,
    defer, firstValueFrom, from, of, retry, switchMap, timer,
} from 'rxjs';
import { DriveService } from '../drive/drive.service';
import { AuthService } from '../auth/auth.service';
import { RequestLimiter } from './request-limiter';

interface CoverEntry {
    blob: Blob;
    url: string;
}

const CACHE_NAME = 'sonar-covers';
const MAX_PARALLEL_DOWNLOADS = 4;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

const cacheKey = (fileId: string) => `https://covers.sonar-sound.invalid/${fileId}`;

/** Rate limits, server errors and dropped connections are worth retrying; the rest are not. */
function isRetryable(error: unknown): boolean {
    return error instanceof HttpErrorResponse
        && (error.status === 0 || error.status === 403 || error.status === 429 || error.status >= 500);
}

/**
 * Downloads each cover once and serves it both as an object URL and as the raw blob.
 *
 * Downloads are limited in parallel and retried with backoff, and the images are kept in
 * Cache Storage so later sessions skip Drive entirely. The persisted copies are removed on sign-out.
 */
@Service()
export class CoverService {
    private readonly driveService = inject(DriveService);
    private readonly authService = inject(AuthService);

    private readonly requests = new Map<string, Observable<CoverEntry>>();
    private readonly createdUrls = new Set<string>();
    private readonly limiter = new RequestLimiter(MAX_PARALLEL_DOWNLOADS);

    constructor() {
        effect(() => {
            if (!this.authService.isSignedIn()) {
                this.requests.clear();
                this.createdUrls.forEach(url => URL.revokeObjectURL(url));
                this.createdUrls.clear();
            }
        });

        effect(() => {
            if (this.authService.signOutCount() > 0) {
                untracked(() => void this.clearPersistedCovers());
            }
        });
    }

    /**
     * Returns the URL for the given cover file ID.
     *
     * @param fileId ID of the cover file.
     * @returns An observable that emits the URL of the cover.
     */
    getUrl(fileId: string): Observable<string> {
        return this.getEntry(fileId).pipe(map(entry => entry.url));
    }

    /**
     * Returns the downloaded image for the given cover file ID, e.g. to read its pixels.
     *
     * @param fileId ID of the cover file.
     * @returns An observable that emits the cover blob.
     */
    getBlob(fileId: string): Observable<Blob> {
        return this.getEntry(fileId).pipe(map(entry => entry.blob));
    }

    private getEntry(fileId: string): Observable<CoverEntry> {
        let entry$ = this.requests.get(fileId);
        if (!entry$) {
            entry$ = this.loadBlob(fileId).pipe(
                map((blob) => ({ blob, url: URL.createObjectURL(blob) })),
                tap((entry) => this.createdUrls.add(entry.url)),
                catchError((error) => {
                    this.requests.delete(fileId); // let a later call try again
                    return throwError(() => error);
                }),
                shareReplay({ bufferSize: 1, refCount: false }),
            );
            this.requests.set(fileId, entry$);
        }
        return entry$;
    }

    private loadBlob(fileId: string): Observable<Blob> {
        return defer(() => from(this.readPersisted(fileId))).pipe(
            switchMap(cached => cached ? of(cached) : this.download(fileId).pipe(
                tap(blob => void this.writePersisted(fileId, blob)),
            )),
        );
    }

    // Each attempt takes its own slot, so a backing-off retry doesn't block other covers.
    private download(fileId: string): Observable<Blob> {
        return defer(() =>
            this.limiter.run(() => firstValueFrom(this.driveService.downloadBlob(fileId))),
        ).pipe(
            retry({
                count: MAX_RETRIES,
                delay: (error, attempt) => isRetryable(error)
                    ? timer(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1))
                    : throwError(() => error),
            }),
        );
    }

    // Cache Storage is unavailable outside secure contexts; the persisted layer is best-effort.
    private async readPersisted(fileId: string): Promise<Blob | undefined> {
        try {
            const cache = await caches.open(CACHE_NAME);
            return await (await cache.match(cacheKey(fileId)))?.blob();
        } catch {
            return undefined;
        }
    }

    private async writePersisted(fileId: string, blob: Blob): Promise<void> {
        try {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(cacheKey(fileId), new Response(blob, { headers: { 'Content-Type': blob.type } }));
        } catch {
            // Quota or unsupported environment: the cover still works for this session.
        }
    }

    private async clearPersistedCovers(): Promise<void> {
        try {
            await caches.delete(CACHE_NAME);
        } catch {
            // Nothing persisted, or Cache Storage is unavailable.
        }
    }
}

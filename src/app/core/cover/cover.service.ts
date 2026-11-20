import { Service, inject, effect } from '@angular/core';
import { Observable, tap, map, shareReplay, catchError, throwError } from 'rxjs';
import { DriveService } from '../drive/drive.service';
import { AuthService } from '../auth/auth.service';

@Service()
export class CoverService {
    private readonly driveService = inject(DriveService);
    private readonly authService = inject(AuthService);

    private readonly requests = new Map<string, Observable<string>>();
    private readonly createdUrls = new Set<string>();

    constructor() {
        effect(() => {
            if (!this.authService.isSignedIn()) {
                this.requests.clear();
                this.createdUrls.forEach(url => URL.revokeObjectURL(url));
                this.createdUrls.clear();
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
        let url$ = this.requests.get(fileId);
        if (!url$) {
            url$ = this.driveService.downloadBlob(fileId).pipe(
                map((blob) => URL.createObjectURL(blob)),
                tap((url) => this.createdUrls.add(url)),
                catchError((error) => {
                    this.requests.delete(fileId); // let a later call try again
                    return throwError(() => error);
                }),
                shareReplay({ bufferSize: 1, refCount: false }),
            );
            this.requests.set(fileId, url$);
        }
        return url$;
    }


}

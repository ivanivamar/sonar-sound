import { Service, inject, effect } from '@angular/core';
import { Observable, of, tap, map } from 'rxjs';
import { DriveService } from '../drive/drive.service';
import { AuthService } from '../auth/auth.service';

@Service()
export class CoverService {
    private readonly driveService = inject(DriveService);
    private readonly urls = new Map<string, string>();
    private readonly authService = inject(AuthService);

    constructor() {
        effect(() => {
            if (!this.authService.isSignedIn()) {
                this.urls.forEach(url => URL.revokeObjectURL(url));
                this.urls.clear();
            }
        });
    }

    getUrl(fileId: string): Observable<string> {
        if (this.urls.has(fileId)) {
            return of(this.urls.get(fileId)!);
        }
        // Replace the following line with the actual logic to get the URL
        return this.driveService.downloadBlob(fileId).pipe(
            map(blob => URL.createObjectURL(blob)),
            tap(url => this.urls.set(fileId, url))
        );
    }


}

import { inject, Service } from '@angular/core';
import { catchError, from, Observable, of, shareReplay, switchMap } from 'rxjs';
import { CoverColor, dominantColor, NEUTRAL } from './cover-color';
import { CoverService } from './cover.service';

const SAMPLE = 32;

@Service()
export class CoverColorService {
    private readonly coverService = inject(CoverService);
    private readonly cache = new Map<string, Observable<CoverColor>>();

    getColor(coverId: string): Observable<CoverColor> {
        let color$ = this.cache.get(coverId);
        if (!color$) {
            color$ = this.coverService.getBlob(coverId).pipe(
                switchMap((blob) => from(sample(blob))),
                catchError(() => { this.cache.delete(coverId); return of(NEUTRAL); }),
                shareReplay({ bufferSize: 1, refCount: false }),
            );
            this.cache.set(coverId, color$);
        }
        return color$;
    }
}

async function sample(blob: Blob): Promise<CoverColor> {
    const bitmap = await createImageBitmap(blob, { resizeWidth: SAMPLE, resizeHeight: SAMPLE, resizeQuality: 'low' });
    const canvas = new OffscreenCanvas(SAMPLE, SAMPLE);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return NEUTRAL;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    return dominantColor(ctx.getImageData(0, 0, SAMPLE, SAMPLE).data);
}

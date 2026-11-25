import { inject, Injector, runInInjectionContext, Service, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { atmosphere } from '../../layout/atmosphere/atmosphere.service';
import { CoverColorService } from '../cover/cover-color.service';
import { CoverColor } from '../cover/cover-color';
import { trackCoverId } from '../cover/cover-id';
import { TrackRow } from '../library/library-file.model';
import { LibraryService } from '../library/library.service';
import { MediaSessionService } from './media-session.service';

@Service()
export class PlayerArtworkService {
    private readonly injector = inject(Injector);
    private readonly coverColorService = inject(CoverColorService);
    private readonly library = inject(LibraryService);
    private readonly mediaSession = inject(MediaSessionService);
    private readonly _cover = signal<string | null>(null);
    private readonly _color = signal<CoverColor | null>(null);
    private version = 0;
    private atmosphereInitialized = false;

    readonly cover = this._cover.asReadonly();
    readonly color = this._color.asReadonly();

    load(track: TrackRow): void {
        this.initializeAtmosphere();
        this.clear();
        const version = this.version;
        const album = this.library.getAlbumById(track.albumId);
        const coverId = trackCoverId(track, album);
        if (!coverId) return;

        this._cover.set(coverId);
        void this.mediaSession.setArtwork(coverId);

        const known = coverId === album?.cover ? album.coverColor : null;
        if (known) {
            this._color.set(known);
            return;
        }

        void this.loadColor(coverId, version);
    }

    clear(): void {
        this.version++;
        this._cover.set(null);
        this._color.set(null);
    }

    private async loadColor(coverId: string, version: number): Promise<void> {
        try {
            const color = await firstValueFrom(this.coverColorService.getColor(coverId));
            if (version === this.version) this._color.set(color);
        } catch (error: unknown) {
            if (version === this.version) console.warn('Could not load cover color:', error);
        }
    }

    private initializeAtmosphere(): void {
        if (this.atmosphereInitialized) return;
        this.atmosphereInitialized = true;

        runInInjectionContext(this.injector, () =>
            atmosphere(() => {
                const color = this.color();
                return {
                    hue: color ? String(color.hue) : null,
                    chroma: color ? String(color.chroma) : null,
                };
            }),
        );
    }
}

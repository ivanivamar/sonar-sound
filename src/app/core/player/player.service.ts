import { inject, Injector, runInInjectionContext, Service, signal } from '@angular/core';
import { TrackRow } from '../library/library-file.model';
import { DriveService } from '../drive/drive.service';
import { firstValueFrom } from 'rxjs';
import { atmosphere } from '../../layout/atmosphere/atmosphere.service';
import { CoverColorService } from '../cover/cover-color.service';
import { LibraryService } from '../library/library.service';
import { CoverColor } from '../cover/cover-color';

@Service()
export class PlayerService {
    private readonly injector = inject(Injector);
    private readonly driveService = inject(DriveService);
    private readonly coverColorService = inject(CoverColorService);
    private readonly libraryService = inject(LibraryService);

    readonly currentTrack = signal<TrackRow | null>(null);
    readonly isPlaying = signal(false);
    readonly position = signal(0);
    readonly duration = signal(0);
    readonly isBuffering = signal(false);
    readonly error = signal<string | null>(null);
    readonly cover = signal<string | null>(null);
    readonly coverColor = signal<CoverColor | null>(null);

    private readonly audio = new Audio();
    private audioUrl: string | null = null;
    private loadVersion = 0;
    private atmosphereInitialized = false;

    constructor() {
        this.audio.addEventListener('playing', () => this.isPlaying.set(true));
        this.audio.addEventListener('pause', () => this.isPlaying.set(false));
        this.audio.addEventListener('ended', () => this.isPlaying.set(false));
        this.audio.addEventListener('timeupdate', () => this.position.set(this.audio.currentTime));
        this.audio.addEventListener('durationchange', () => {
            const duration = this.audio.duration;
            this.duration.set(Number.isFinite(duration) ? duration : 0);
        });
    }

    async playTrack(track: TrackRow): Promise<void> {
        const version = ++this.loadVersion;

        this.audio.pause();
        this.audio.removeAttribute('src');
        this.audio.load();

        if (this.audioUrl) {
            URL.revokeObjectURL(this.audioUrl);
            this.audioUrl = null;
        }

        this.currentTrack.set(track);
        this.initializeAtmosphere();
        this.position.set(0);
        this.duration.set(0);
        this.error.set(null);
        this.coverColor.set(null);
        this.cover.set(null);
        this.isBuffering.set(true);

        void this.loadCoverColor(track, version);

        try {
            const blob = await firstValueFrom(this.driveService.downloadBlob(track.flac.id));

            // Another track was selected while this one was downloading.
            if (version !== this.loadVersion) return;

            this.audioUrl = URL.createObjectURL(blob);
            this.audio.src = this.audioUrl;

            await this.play();
        } catch (error: unknown) {
            if (version !== this.loadVersion) return;

            this.error.set(
                error instanceof Error ? error.message : 'Could not download the track.',
            );
        } finally {
            if (version === this.loadVersion) {
                this.isBuffering.set(false);
            }
        }
    }

    async play(): Promise<void> {
        try {
            await this.audio.play();
            this.error.set(null);
        } catch (error: unknown) {
            this.error.set(
                error instanceof Error ? error.message : 'Could not play audio.',
            );
        }
    }

    pause(): void {
        this.audio.pause();
    }

    toggle(): void {
        if (this.audio.paused) {
            this.play();
        } else {
            this.pause();
        }
    }

    seek(seconds: number) {
        this.audio.currentTime = seconds;
    }

    private async loadCoverColor(track: TrackRow, version: number): Promise<void> {
        try {
            const coverId = track.cover
                ?? this.libraryService.getAlbumById(track.albumId)?.cover;
            if (!coverId) return;

            const color = await firstValueFrom(this.coverColorService.getColor(coverId));
            if (version === this.loadVersion) {
                this.coverColor.set(color);
                this.cover.set(coverId);
            }
        } catch {
            // Artwork is optional; playback should continue without a colour.
        }
    }

    private initializeAtmosphere(): void {
        if (this.atmosphereInitialized) return;
        this.atmosphereInitialized = true;

        // playTrack() runs from event handlers, so atmosphere()'s inject() needs an explicit context.
        runInInjectionContext(this.injector, () =>
            atmosphere(() => {
                const color = this.coverColor();
                return {
                    hue: color ? String(color.hue) : null,
                    chroma: color ? String(color.chroma) : null,
                };
            }),
        );
    }
}

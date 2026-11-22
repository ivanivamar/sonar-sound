import {
    computed,
    effect,
    inject,
    Injector,
    runInInjectionContext,
    Service,
    signal,
    untracked,
} from '@angular/core';
import { PlayHistoryService } from './play-history.service';
import { PlayTrackingService } from './play-tracking.service';
import { DriveStreamService } from '../drive/drive-stream.service';
import { TrackRow } from '../library/library-file.model';
import { firstValueFrom } from 'rxjs';
import { atmosphere } from '../../layout/atmosphere/atmosphere.service';
import { CoverColorService } from '../cover/cover-color.service';
import { LibraryService } from '../library/library.service';
import { CoverColor } from '../cover/cover-color';
import { trackCoverId } from '../cover/cover-id';
import { AuthService } from '../auth/auth.service';
import { MediaSessionService } from './media-session.service';

export enum RepeatMode {
    Off,
    One,
    All,
}

@Service()
export class PlayerService {
    // Services injected via Angular's dependency injection system.
    private readonly injector = inject(Injector);
    private readonly authService = inject(AuthService);
    private readonly coverColorService = inject(CoverColorService);
    private readonly libraryService = inject(LibraryService);
    private readonly driveStreamService = inject(DriveStreamService);
    private readonly mediaSession = inject(MediaSessionService);
    private readonly playTracking = inject(PlayTrackingService);
    private readonly playHistory = inject(PlayHistoryService);

    // Signals and state variables for the player.
    private readonly _currentTrack = signal<TrackRow | null>(null);
    private readonly _isPlaying = signal(false);
    private readonly _position = signal(0);
    private readonly _duration = signal(0);
    private readonly _error = signal<string | null>(null);
    private readonly _cover = signal<string | null>(null);
    private readonly _coverColor = signal<CoverColor | null>(null);
    private readonly loading = signal(false);
    private readonly stalled = signal(false);
    private readonly _repeat = signal<RepeatMode>(RepeatMode.Off);

    // Readonly versions of the signals exposed to consumers of the service.
    readonly currentTrack = this._currentTrack.asReadonly();
    readonly isPlaying = this._isPlaying.asReadonly();
    readonly position = this._position.asReadonly();
    readonly duration = this._duration.asReadonly();
    readonly error = this._error.asReadonly();
    readonly cover = this._cover.asReadonly();
    readonly coverColor = this._coverColor.asReadonly();
    /** True while the track loads and whenever playback is waiting for data. */
    readonly isBuffering = computed(() => this.loading() || this.stalled());
    readonly repeat = this._repeat.asReadonly();

    // HTMLAudioElement used for playback and related state.
    private readonly audio = new Audio();
    private audioUrl: string | null = null;
    private sourceReady = false;
    private loadVersion = 0;
    private atmosphereInitialized = false;

    private trackingStarted = false;
    private trackingAdvancing = false;
    private trackingSeeking = false;

    constructor() {
        this.audio.addEventListener('playing', () => {
            this.stalled.set(false);
            this._isPlaying.set(true);
            this.mediaSession.setPlaybackState('playing');
        });
        this.audio.addEventListener('canplay', () => this.stalled.set(false));
        this.audio.addEventListener('waiting', () => {
            if (this.audioUrl) this.stalled.set(true);
        });
        this.audio.addEventListener('pause', () => {
            this.stalled.set(false);
            this._isPlaying.set(false);
            this.mediaSession.setPlaybackState('paused');
        });
        this.audio.addEventListener('ended', () => {
            this._isPlaying.set(false);
            this.mediaSession.setPlaybackState('paused');
        });
        this.audio.addEventListener('timeupdate', () => {
            this._position.set(this.audio.currentTime);
            this.mediaSession.updatePosition(this.audio);
        });
        this.audio.addEventListener('durationchange', () => {
            const duration = this.audio.duration;
            this._duration.set(Number.isFinite(duration) ? duration : 0);
            this.mediaSession.updatePosition(this.audio);
        });
        this.audio.addEventListener('error', () => {
            // Clearing the source also resets the element; only a loaded source is a real failure.
            if (!this.audioUrl) return;

            this.sourceReady = false;
            this.stalled.set(false);
            this._isPlaying.set(false);
            this._error.set(this.audio.error?.message || 'Could not play this audio file.');
        });

        void this.driveStreamService.register().catch((error: unknown) => {
            console.error('Could not register the Drive streaming worker:', error);
        });

        this.mediaSession.registerActions({
            play: () => {
                const track = this._currentTrack();
                if (!track || this.loading()) return;

                if (!this.sourceReady) {
                    void this.playTrack(track);
                } else if (this.audio.paused) {
                    void this.play();
                }
            },
            pause: () => {
                if (this._currentTrack() && !this.loading()) this.pause();
            },
            seek: (time) => {
                const duration = this.audio.duration;
                if (!this.sourceReady || !Number.isFinite(duration) || duration <= 0) return;
                this.seek(Math.min(duration, Math.max(0, time)));
            },
        });

        this.attachPlayTracking();

        effect(() => {
            if (!this.authService.isSignedIn()) {
                untracked(() => {
                    if (this._currentTrack()) this.reset();
                    this.playHistory.clear();
                });
            }
        });
    }

    async playTrack(track: TrackRow): Promise<void> {
        this.releaseAudio();
        const version = this.loadVersion;

        this._currentTrack.set(track);

        this.mediaSession.setTrack(track);

        this.initializeAtmosphere();
        this._position.set(0);
        this._duration.set(0);
        this._error.set(null);
        this._coverColor.set(null);
        this._cover.set(null);
        this._isPlaying.set(false);
        this.loading.set(true);

        void this.loadCover(track, version);

        try {
            await this.driveStreamService.register();

            // Another track was selected, or the session ended, while this one was loading.
            if (version !== this.loadVersion) return;

            this.audioUrl = this.driveStreamService.createStreamUrl(track.flac);
            this.audio.src = this.audioUrl;
            this.sourceReady = true;

            await this.play();
        } catch (error: unknown) {
            if (version !== this.loadVersion) return;

            this.sourceReady = false;
            this._error.set(error instanceof Error ? error.message : 'Could not load the track.');
        } finally {
            if (version === this.loadVersion) {
                this.loading.set(false);
            }
        }
    }

    async play(): Promise<void> {
        try {
            await this.audio.play();
            this._error.set(null);
        } catch (error: unknown) {
            // Loading another source interrupts a pending play(); that is not a failure.
            if (error instanceof DOMException && error.name === 'AbortError') return;

            this._error.set(error instanceof Error ? error.message : 'Could not play audio.');
        }
    }

    pause(): void {
        this.audio.pause();
    }

    /** Pauses or resumes the current track, retrying its load if it never loaded. */
    toggle(): void {
        const track = this._currentTrack();
        if (!track || this.loading()) return;

        if (!this.sourceReady) {
            void this.playTrack(track);
        } else if (this.audio.paused) {
            void this.play();
        } else {
            this.pause();
        }
    }

    seek(seconds: number): void {
        if (seconds === this.audio.currentTime) return;

        this.sampleHeard();
        this.trackingSeeking = true;
        this.playTracking.stopProgress();

        try {
            this.audio.currentTime = seconds;
        } catch (error) {
            this.trackingSeeking = false;
            if (this.trackingAdvancing && !this.audio.seeking) {
                this.resumeTrackingProgress();
            }
            throw error;
        }
    }

    toggleRepeat() {
        this._repeat.set(
            this._repeat() === RepeatMode.Off
                ? RepeatMode.One
                : this._repeat() === RepeatMode.One
                  ? RepeatMode.All
                  : RepeatMode.Off,
        );
    }

    /** Stops playback, cancels any pending load and clears all track state. */
    private reset(): void {
        this.releaseAudio();
        this._currentTrack.set(null);
        this._position.set(0);
        this._duration.set(0);
        this._error.set(null);
        this._coverColor.set(null);
        this._cover.set(null);
        this._isPlaying.set(false);
        this.loading.set(false);

        this.mediaSession.clear();
    }

    /** Releases the audio source and cancels any pending load. */
    private releaseAudio(): void {
        this.finishTracking();
        this.loadVersion++;
        this.sourceReady = false;
        this.stalled.set(false);

        this.mediaSession.clearPosition();

        this.audio.pause();
        this.audioUrl = null;
        this.audio.removeAttribute('src');
        this.audio.load();
    }

    private sampleHeard(): void {
        if (!this.trackingAdvancing || this.trackingSeeking || this.audio.seeking) return;

        this.playTracking.sampleProgress(
            this.audio.currentTime,
            performance.now(),
            this.audio.playbackRate,
        );
    }

    private resumeTrackingProgress(): void {
        this.playTracking.resumeProgress(
            this.audio.currentTime,
            performance.now(),
            this.audio.playbackRate,
        );
    }

    private finishTracking(): void {
        this.sampleHeard();
        this.playTracking.clear();
        this.trackingStarted = false;
        this.trackingAdvancing = false;
        this.trackingSeeking = false;
    }

    private attachPlayTracking(): void {
        this.audio.addEventListener('playing', () => {
            const track = this._currentTrack();
            if (!track || !this.audioUrl || this.audio.paused) return;

            if (!this.trackingStarted) {
                this.playTracking.start(track.id, Date.now(), this.audio.duration);
                this.trackingStarted = true;
            }

            this.trackingAdvancing = true;
            if (!this.trackingSeeking && !this.audio.seeking) {
                this.resumeTrackingProgress();
            }
        });

        this.audio.addEventListener('timeupdate', () => this.sampleHeard());
        this.audio.addEventListener('ratechange', () => this.sampleHeard());

        this.audio.addEventListener('durationchange', () => {
            this.playTracking.setDuration(this.audio.duration);
        });

        const stopProgress = () => {
            this.sampleHeard();
            this.trackingAdvancing = false;
            this.playTracking.stopProgress();
        };

        this.audio.addEventListener('pause', stopProgress);
        this.audio.addEventListener('waiting', stopProgress);
        this.audio.addEventListener('error', stopProgress);

        this.audio.addEventListener('seeking', () => {
            this.trackingSeeking = true;
            this.playTracking.stopProgress();
        });

        this.audio.addEventListener('seeked', () => {
            this.trackingSeeking = false;
            if (this.trackingAdvancing && !this.audio.paused) {
                this.resumeTrackingProgress();
            }
        });

        this.audio.addEventListener('ended', () => this.finishTracking());
    }

    private async loadCover(track: TrackRow, version: number): Promise<void> {
        const album = this.libraryService.getAlbumById(track.albumId);
        const coverId = trackCoverId(track, album);
        if (!coverId) return;

        this._cover.set(coverId);
        void this.mediaSession.setArtwork(coverId);

        // Only the album's own cover has a precomputed colour.
        const known = coverId === album?.cover ? album.coverColor : null;
        if (known) {
            this._coverColor.set(known);
            return;
        }

        try {
            const color = await firstValueFrom(this.coverColorService.getColor(coverId));
            if (version === this.loadVersion) {
                this._coverColor.set(color);
            }
        } catch {
            // The colour is optional; the cover and playback continue without it.
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

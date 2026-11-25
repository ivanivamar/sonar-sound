import { computed, effect, inject, Service, signal, untracked } from '@angular/core';
import { PlayHistoryService } from './tracking/play-history.service';
import { PlayTrackingService } from './tracking/play-tracking.service';
import { AudioPlayTracking } from './tracking/audio-play-tracking';
import { DriveStreamService } from '../drive/drive-stream.service';
import { TrackRow } from '../library/library-file.model';
import { LibraryService } from '../library/library.service';
import { AuthService } from '../auth/auth.service';
import { MediaSessionService } from './media-session.service';
import { PlayerArtworkService } from './player-artwork.service';
import { QueueService } from './queue/queue.service';
import { adjacentEntryIndex, QueueState } from './queue/queue.model';

export enum RepeatMode {
    Off,
    One,
    All,
}

const PREVIOUS_RESTART_THRESHOLD_SECONDS = 3;

@Service()
export class PlayerService {
    // Services injected via Angular's dependency injection system.
    private readonly authService = inject(AuthService);
    private readonly libraryService = inject(LibraryService);
    private readonly driveStreamService = inject(DriveStreamService);
    private readonly mediaSession = inject(MediaSessionService);
    private readonly playTracking = inject(PlayTrackingService);
    private readonly playHistory = inject(PlayHistoryService);
    private readonly queue = inject(QueueService);
    private readonly artwork = inject(PlayerArtworkService);

    // Signals and state variables for the player.
    private readonly _currentTrack = signal<TrackRow | null>(null);
    private readonly _isPlaying = signal(false);
    private readonly _position = signal(0);
    private readonly _duration = signal(0);
    private readonly _error = signal<string | null>(null);
    private readonly loading = signal(false);
    private readonly stalled = signal(false);
    private readonly _repeat = signal<RepeatMode>(RepeatMode.Off);

    // Readonly versions of the signals exposed to consumers of the service.
    readonly currentTrack = this._currentTrack.asReadonly();
    readonly isPlaying = this._isPlaying.asReadonly();
    readonly position = this._position.asReadonly();
    readonly duration = this._duration.asReadonly();
    readonly error = this._error.asReadonly();
    readonly cover = this.artwork.cover;
    readonly coverColor = this.artwork.color;
    /** True while the track loads and whenever playback is waiting for data. */
    readonly isBuffering = computed(() => this.loading() || this.stalled());
    readonly repeat = this._repeat.asReadonly();
    private readonly _seekCompleted = signal(0);
    readonly seekCompleted = this._seekCompleted.asReadonly();

    // HTMLAudioElement used for playback and related state.
    private readonly audio = new Audio();
    private audioUrl: string | null = null;
    private sourceReady = false;
    private loadVersion = 0;
    private readonly audioTracking: AudioPlayTracking;

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
        this.audio.addEventListener('ended', () => this.handleTrackEnded());
        this.audio.addEventListener('timeupdate', () => {
            this._position.set(this.audio.currentTime);
            this.mediaSession.updatePosition(this.audio);
        });
        this.audio.addEventListener('seeked', () => {
            this._position.set(this.audio.currentTime);
            this._seekCompleted.update((count) => count + 1);
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
                    void this.loadTrack(track);
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
            next: () => {
                void this.nextTrack().catch((error: unknown) => {
                    this._error.set(
                        error instanceof Error ? error.message : 'Could not play the next track.',
                    );
                });
            },
            previous: () => {
                void this.previousTrack().catch((error: unknown) => {
                    this._error.set(
                        error instanceof Error
                            ? error.message
                            : 'Could not play the previous track.',
                    );
                });
            },
        });

        this.audioTracking = new AudioPlayTracking(
            this.audio,
            this.playTracking,
            () => this._currentTrack()?.id ?? null,
            () => !!this.audioUrl,
        );

        effect(() => {
            if (!this.authService.isSignedIn()) {
                untracked(() => {
                    if (this._currentTrack()) this.reset();
                    this.queue.replace([], -1);
                    this.playHistory.clear();
                });
            }
        });
    }

    async playTrack(track: TrackRow): Promise<void> {
        this.queue.replace([{ entryId: crypto.randomUUID(), trackId: track.id }], 0);

        await this.loadTrack(track);
    }

    private async loadTrack(
        track: TrackRow,
        options: { autoplay?: boolean; startAt?: number } = {},
    ): Promise<void> {
        this.releaseAudio();
        const version = this.loadVersion;

        this._currentTrack.set(track);

        this.mediaSession.setTrack(track);

        this._position.set(0);
        this._duration.set(0);
        this._error.set(null);
        this._isPlaying.set(false);
        this.loading.set(true);

        this.artwork.load(track);

        try {
            await this.driveStreamService.register();

            // Another track was selected, or the session ended, while this one was loading.
            if (version !== this.loadVersion) return;

            this.audioUrl = this.driveStreamService.createStreamUrl(track.flac);
            this.audio.src = this.audioUrl;
            this.sourceReady = true;

            if (options.startAt) this.seekWhenReady(options.startAt, version);
            if (options.autoplay ?? true) await this.play();
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
            void this.loadTrack(track);
        } else if (this.audio.paused) {
            void this.play();
        } else {
            this.pause();
        }
    }

    seek(seconds: number): void {
        this.audioTracking.seek(seconds);
    }

    toggleRepeat() {
        this._repeat.set(
            this._repeat() === RepeatMode.Off
                ? RepeatMode.All
                : this._repeat() === RepeatMode.All
                  ? RepeatMode.One
                  : RepeatMode.Off,
        );
    }

    async playQueue(trackIds: readonly string[], startIndex: number): Promise<void> {
        if (!Number.isInteger(startIndex) || startIndex < 0 || startIndex >= trackIds.length) {
            throw new RangeError('Invalid starting track.');
        }

        const track = this.libraryService.getTrackRowById(trackIds[startIndex]);
        if (!track) {
            throw new Error('The selected track is not available in the library.');
        }

        const entries = trackIds.map((trackId) => ({
            entryId: crypto.randomUUID(),
            trackId,
        }));

        this.queue.replace(entries, startIndex);
        await this.loadTrack(track);
    }

    async restoreQueue(state: QueueState, repeat: RepeatMode, positionSeconds = 0): Promise<void> {
        const entry = state.entries[state.currentIndex];
        const track = entry ? this.libraryService.getTrackRowById(entry.trackId) : undefined;
        if (entry && !track) {
            throw new Error('The saved track is not available in the library.');
        }

        this.queue.restore(state);
        this._repeat.set(repeat);

        if (track) {
            await this.loadTrack(track, { autoplay: false, startAt: positionSeconds });
        }
    }

    async playQueueEntry(entryId: string): Promise<void> {
        const entry = this.queue.state().entries.find((item) => item.entryId === entryId);
        if (!entry) {
            throw new Error('Queue entry not found.');
        }

        const track = this.libraryService.getTrackRowById(entry.trackId);
        if (!track) {
            throw new Error('The selected track is not available in the library.');
        }

        this.queue.select(entryId);
        await this.loadTrack(track);
    }

    async nextTrack(): Promise<void> {
        const state = this.queue.state();
        const index = adjacentEntryIndex(state, 'next', this.repeat() === RepeatMode.All);

        if (index === null) return;

        await this.playQueueEntry(state.entries[index].entryId);
    }

    async previousTrack(): Promise<void> {
        if (this.audio.currentTime > PREVIOUS_RESTART_THRESHOLD_SECONDS) {
            this.seek(0);
            return;
        }

        const state = this.queue.state();
        const index = adjacentEntryIndex(state, 'previous', this.repeat() === RepeatMode.All);

        if (index === null) return;

        await this.playQueueEntry(state.entries[index].entryId);
    }

    /** Stops playback, cancels any pending load and clears all track state. */
    private reset(): void {
        this.releaseAudio();
        this._currentTrack.set(null);
        this._position.set(0);
        this._duration.set(0);
        this._error.set(null);
        this.artwork.clear();
        this._isPlaying.set(false);
        this.loading.set(false);

        this.mediaSession.clear();
    }

    /** Releases the audio source and cancels any pending load. */
    private releaseAudio(): void {
        this.audioTracking.finish();
        this.loadVersion++;
        this.sourceReady = false;
        this.stalled.set(false);

        this.mediaSession.clearPosition();

        this.audio.pause();
        this.audioUrl = null;
        this.audio.removeAttribute('src');
        this.audio.load();
    }

    private handleTrackEnded(): void {
        this._isPlaying.set(false);
        this.mediaSession.setPlaybackState('paused');

        // Finish counting this playback before a new track can start.
        this.audioTracking.finish();

        const state = this.queue.state();
        if (state.currentIndex === -1) return;

        const nextIndex =
            this.repeat() === RepeatMode.One
                ? state.currentIndex
                : adjacentEntryIndex(state, 'next', this.repeat() === RepeatMode.All);

        if (nextIndex === null) return;

        void this.playQueueEntry(state.entries[nextIndex].entryId).catch((error: unknown) => {
            this._error.set(
                error instanceof Error ? error.message : 'Could not play the next track.',
            );
        });
    }

    // Seeks directly on the element, not through seek(), so restoring a position is never sampled as listening.
    private seekWhenReady(seconds: number, version: number): void {
        const apply = () => {
            // A newer load or a reset replaced this source.
            if (version !== this.loadVersion) return;

            const duration = this.audio.duration;
            this.audio.currentTime = Number.isFinite(duration)
                ? Math.min(seconds, duration)
                : seconds;
            this._position.set(this.audio.currentTime);
        };

        if (this.audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
            apply();
        } else {
            this.audio.addEventListener('loadedmetadata', apply, { once: true });
        }
    }
}

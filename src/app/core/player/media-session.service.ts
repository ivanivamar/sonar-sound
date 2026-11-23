import { inject, Service } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CoverService } from '../cover/cover.service';
import { TrackRow } from '../library/library-file.model';

interface MediaSessionActions {
    play: () => void;
    pause: () => void;
    seek: (time: number) => void;
    next: () => void;
    previous: () => void;
}

@Service()
export class MediaSessionService {
    private readonly coverService = inject(CoverService);
    private artworkVersion = 0;

    registerActions(actions: MediaSessionActions): void {
        if (!('mediaSession' in navigator)) return;

        navigator.mediaSession.setActionHandler('play', actions.play);
        navigator.mediaSession.setActionHandler('pause', actions.pause);

        this.registerOptionalActionHandler('seekto', (details) => {
            if (typeof details.seekTime === 'number' && Number.isFinite(details.seekTime)) {
                actions.seek(details.seekTime);
            }
        });
        this.registerOptionalActionHandler('nexttrack', actions.next);
        this.registerOptionalActionHandler('previoustrack', actions.previous);
    }

    setTrack(track: TrackRow): void {
        this.artworkVersion++;
        if ('mediaSession' in navigator && typeof MediaMetadata !== 'undefined') {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track.title,
                artist: track.artist,
                album: track.albumTitle ?? '',
            });
        }
    }

    async setArtwork(coverId: string): Promise<void> {
        if (!('mediaSession' in navigator) || !navigator.mediaSession.metadata) return;

        const version = this.artworkVersion;
        try {
            const url = await firstValueFrom(this.coverService.getUrl(coverId));
            if (version === this.artworkVersion && navigator.mediaSession.metadata) {
                navigator.mediaSession.metadata.artwork = [{ src: url }];
            }
        } catch (error: unknown) {
            if (version === this.artworkVersion) {
                console.warn('Could not load media artwork:', error);
            }
        }
    }

    setPlaybackState(state: MediaSessionPlaybackState): void {
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = state;
    }

    updatePosition(
        audio: Pick<HTMLMediaElement, 'duration' | 'currentTime' | 'playbackRate'>,
    ): void {
        if (
            !('mediaSession' in navigator) ||
            typeof navigator.mediaSession.setPositionState !== 'function'
        )
            return;

        const { duration, currentTime, playbackRate } = audio;
        if (
            !Number.isFinite(duration) ||
            duration <= 0 ||
            !Number.isFinite(currentTime) ||
            !Number.isFinite(playbackRate) ||
            playbackRate <= 0
        )
            return;

        navigator.mediaSession.setPositionState({
            duration,
            position: Math.min(duration, Math.max(0, currentTime)),
            playbackRate,
        });
    }

    clearPosition(): void {
        if (
            'mediaSession' in navigator &&
            typeof navigator.mediaSession.setPositionState === 'function'
        ) {
            navigator.mediaSession.setPositionState();
        }
    }

    clear(): void {
        this.artworkVersion++;
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = null;
            navigator.mediaSession.playbackState = 'none';
        }
    }

    private registerOptionalActionHandler(
        action: MediaSessionAction,
        handler: MediaSessionActionHandler,
    ): void {
        try {
            navigator.mediaSession.setActionHandler(action, handler);
        } catch (error: unknown) {
            if (
                error instanceof TypeError ||
                (error instanceof DOMException && error.name === 'NotSupportedError')
            ) {
                console.warn(`Media Session ${action} action is not supported:`, error);
                return;
            }

            throw error;
        }
    }
}

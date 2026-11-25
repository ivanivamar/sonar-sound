import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { CoverColorService } from '../cover/cover-color.service';
import { DriveStreamService } from '../drive/drive-stream.service';
import { TrackRow } from '../library/library-file.model';
import { LibraryService } from '../library/library.service';
import { MediaSessionService } from './media-session.service';
import { PlayHistoryService } from './tracking/play-history.service';
import { PlayTrackingService } from './tracking/play-tracking.service';
import { QueueService } from './queue/queue.service';
import { PlayerService } from './player.service';

class FakeAudio extends EventTarget {
    static instance: FakeAudio;

    paused = true;
    currentTime = 0;
    duration = NaN;
    src = '';
    error: { message: string } | null = null;

    constructor() {
        super();
        FakeAudio.instance = this;
    }

    play(): Promise<void> {
        this.paused = false;
        this.dispatchEvent(new Event('playing'));
        return Promise.resolve();
    }

    pause(): void {
        if (this.paused) return;
        this.paused = true;
        this.dispatchEvent(new Event('pause'));
    }

    load(): void {
        this.currentTime = 0;
    }

    removeAttribute(name: string): void {
        if (name === 'src') this.src = '';
    }
}

function makeTrack(id: string): TrackRow {
    return {
        id,
        title: `Track ${id}`,
        artist: 'Artist',
        albumId: 'album',
        artistId: 'artist',
        flac: { id: `flac-${id}` },
        cover: 'cover-id',
    } as TrackRow;
}

describe('PlayerService', () => {
    const signedIn = signal(true);
    const signOutCount = signal(0);
    const registerStreamWorker = vi.fn<() => Promise<void>>();
    const createStreamUrl = vi.fn<(file: { id: string }) => string>();
    const getColor = vi.fn();
    const getAlbumById = vi.fn();
    let service: PlayerService;

    beforeEach(() => {
        vi.stubGlobal('Audio', FakeAudio);

        signedIn.set(true);
        signOutCount.set(0);
        registerStreamWorker.mockReset().mockResolvedValue(undefined);
        createStreamUrl.mockReset().mockImplementation((file) => `stream:${file.id}`);
        getColor.mockReset().mockReturnValue(of({ hue: 200, chroma: 0.5 }));
        getAlbumById.mockReset().mockReturnValue(undefined);

        TestBed.configureTestingModule({
            providers: [
                {
                    provide: AuthService,
                    useValue: { isSignedIn: signedIn.asReadonly(), signOutCount },
                },
                {
                    provide: DriveStreamService,
                    useValue: { register: registerStreamWorker, createStreamUrl },
                },
                { provide: CoverColorService, useValue: { getColor } },
                { provide: LibraryService, useValue: { getAlbumById } },
                {
                    provide: MediaSessionService,
                    useValue: {
                        registerActions: vi.fn(),
                        setTrack: vi.fn(),
                        setArtwork: vi.fn(),
                        setPlaybackState: vi.fn(),
                        updatePosition: vi.fn(),
                        clearPosition: vi.fn(),
                        clear: vi.fn(),
                    },
                },
                {
                    provide: PlayTrackingService,
                    useValue: {
                        start: vi.fn(),
                        setDuration: vi.fn(),
                        addHeard: vi.fn(),
                        clear: vi.fn(),
                        resumeProgress: vi.fn(),
                        sampleProgress: vi.fn(),
                        stopProgress: vi.fn(),
                    },
                },
                { provide: PlayHistoryService, useValue: { clear: vi.fn() } },
                { provide: QueueService, useValue: { replace: vi.fn() } },
            ],
        });
        service = TestBed.inject(PlayerService);
        registerStreamWorker.mockClear();
    });

    afterEach(() => vi.unstubAllGlobals());

    it('pauses and resumes the current track', async () => {
        await service.playTrack(makeTrack('a'));
        expect(service.isPlaying()).toBe(true);

        service.toggle();
        expect(service.isPlaying()).toBe(false);

        service.toggle();
        expect(service.isPlaying()).toBe(true);
        expect(registerStreamWorker).toHaveBeenCalledTimes(1);
    });

    it('retries worker registration when toggling a track that failed to load', async () => {
        registerStreamWorker.mockRejectedValueOnce(new Error('Network down'));
        await service.playTrack(makeTrack('a'));

        expect(service.error()).toBe('Network down');
        expect(service.isBuffering()).toBe(false);

        service.toggle();
        await vi.waitFor(() => expect(service.isPlaying()).toBe(true));

        expect(registerStreamWorker).toHaveBeenCalledTimes(2);
        expect(service.error()).toBeNull();
    });

    it('reports audio element errors', async () => {
        await service.playTrack(makeTrack('a'));

        FakeAudio.instance.error = { message: 'Decode failed' };
        FakeAudio.instance.dispatchEvent(new Event('error'));

        expect(service.error()).toBe('Decode failed');
        expect(service.isPlaying()).toBe(false);
    });

    it('shows buffering while audio waits for data', async () => {
        await service.playTrack(makeTrack('a'));
        expect(service.isBuffering()).toBe(false);

        FakeAudio.instance.dispatchEvent(new Event('waiting'));
        expect(service.isBuffering()).toBe(true);

        FakeAudio.instance.dispatchEvent(new Event('playing'));
        expect(service.isBuffering()).toBe(false);
    });

    it('ignores a pending stream registration when switching tracks', async () => {
        let finishRegistration!: () => void;
        const pendingRegistration = new Promise<void>((resolve) => {
            finishRegistration = resolve;
        });
        registerStreamWorker.mockReturnValueOnce(pendingRegistration);

        const first = service.playTrack(makeTrack('a'));
        await service.playTrack(makeTrack('b'));
        finishRegistration();
        await first;

        expect(service.currentTrack()?.id).toBe('b');
        expect(createStreamUrl).toHaveBeenCalledTimes(1);
        expect(createStreamUrl).toHaveBeenCalledWith(makeTrack('b').flac);
        expect(service.isPlaying()).toBe(true);
    });

    it('stops playback and clears state on sign-out', async () => {
        await service.playTrack(makeTrack('a'));

        signedIn.set(false);
        TestBed.tick();

        expect(FakeAudio.instance.paused).toBe(true);
        expect(FakeAudio.instance.src).toBe('');
        expect(service.currentTrack()).toBeNull();
        expect(service.isPlaying()).toBe(false);
        expect(service.cover()).toBeNull();
    });

    it('discards a pending stream registration on sign-out', async () => {
        let finishRegistration!: () => void;
        const pendingRegistration = new Promise<void>((resolve) => {
            finishRegistration = resolve;
        });
        registerStreamWorker.mockReturnValueOnce(pendingRegistration);

        const playing = service.playTrack(makeTrack('a'));
        signedIn.set(false);
        TestBed.tick();
        finishRegistration();
        await playing;

        expect(createStreamUrl).not.toHaveBeenCalled();
        expect(service.currentTrack()).toBeNull();
        expect(service.isBuffering()).toBe(false);
    });

    it("uses the album's precomputed colour without sampling the cover", async () => {
        getAlbumById.mockReturnValue({ cover: 'cover-id', coverColor: { hue: 10, chroma: 0.3 } });

        await service.playTrack(makeTrack('a'));

        expect(service.coverColor()).toEqual({ hue: 10, chroma: 0.3 });
        expect(getColor).not.toHaveBeenCalled();
    });

    it('shows the cover even when colour extraction fails', async () => {
        getColor.mockReturnValue(throwError(() => new Error('canvas blocked')));

        await service.playTrack(makeTrack('a'));
        await Promise.resolve();

        expect(service.cover()).toBe('cover-id');
        expect(service.coverColor()).toBeNull();
        expect(service.isPlaying()).toBe(true);
    });
});

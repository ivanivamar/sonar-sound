import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { CoverColorService } from '../cover/cover-color.service';
import { CoverService } from '../cover/cover.service';
import { DriveStreamService } from '../drive/drive-stream.service';
import { TrackRow } from '../library/library-file.model';
import { LibraryService } from '../library/library.service';
import { MediaSessionService } from './media-session.service';
import { PlayerService } from './player.service';

class FakeMetadata {
    title: string;
    artist: string;
    album: string;
    artwork: MediaImage[];

    constructor(init: MediaMetadataInit) {
        this.title = init.title ?? '';
        this.artist = init.artist ?? '';
        this.album = init.album ?? '';
        this.artwork = init.artwork ?? [];
    }
}

class FakeAudio extends EventTarget {
    static instance: FakeAudio;
    paused = true;
    currentTime = 0;
    duration = 100;
    playbackRate = 1;
    src = '';
    error = null;

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
        if (!this.paused) {
            this.paused = true;
            this.dispatchEvent(new Event('pause'));
        }
    }

    load(): void {
        this.currentTime = 0;
    }

    removeAttribute(name: string): void {
        if (name === 'src') this.src = '';
    }
}

function track(id: string): TrackRow {
    return {
        id, title: `Track ${id}`, artist: 'Artist', albumId: 'album', artistId: 'artist',
        disc: 1, track: 1, syncedLyrics: false, addedAt: '', albumTitle: 'Album',
        flac: { id: `flac-${id}`, size: 100 },
        mobile: { id: 'mobile', size: 100, codec: 'aac', bitrate: '128' },
        cover: `cover-${id}`,
    };
}

describe('MediaSessionService', () => {
    const signedIn = signal(true);
    const getUrl = vi.fn();
    const handlers = new Map<MediaSessionAction, MediaSessionActionHandler>();
    let media: {
        metadata: FakeMetadata | null;
        playbackState: MediaSessionPlaybackState;
        setActionHandler: ReturnType<typeof vi.fn>;
        setPositionState: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        handlers.clear();
        signedIn.set(true);
        getUrl.mockReset().mockReturnValue(of('blob:cover'));
        media = {
            metadata: null,
            playbackState: 'none',
            setActionHandler: vi.fn((action: MediaSessionAction, handler: MediaSessionActionHandler) => {
                handlers.set(action, handler);
            }),
            setPositionState: vi.fn(),
        };
        vi.stubGlobal('navigator', { mediaSession: media });
        vi.stubGlobal('MediaMetadata', FakeMetadata);
        vi.stubGlobal('Audio', FakeAudio);
        TestBed.configureTestingModule({
            providers: [
                { provide: CoverService, useValue: { getUrl } },
                { provide: CoverColorService, useValue: { getColor: () => of({ hue: 1, chroma: 1 }) } },
                { provide: LibraryService, useValue: { getAlbumById: () => undefined } },
                { provide: AuthService, useValue: { isSignedIn: signedIn } },
                {
                    provide: DriveStreamService,
                    useValue: {
                        register: vi.fn().mockResolvedValue(undefined),
                        createStreamUrl: (file: { id: string }) => `/stream/${file.id}`,
                    },
                },
            ],
        });
    });

    afterEach(() => vi.unstubAllGlobals());

    it('connects media actions and state to the player and clears them on sign-out', async () => {
        const player = TestBed.inject(PlayerService);
        await player.playTrack(track('a'));
        expect(media.metadata?.title).toBe('Track a');
        expect(media.playbackState).toBe('playing');
        expect(FakeAudio.instance.src).toBe('/stream/flac-a');
        await vi.waitFor(() => expect(media.metadata?.artwork).toEqual([{ src: 'blob:cover' }]));

        handlers.get('pause')?.({ action: 'pause' });
        expect(player.isPlaying()).toBe(false);
        expect(media.playbackState).toBe('paused');
        handlers.get('play')?.({ action: 'play' });
        expect(player.isPlaying()).toBe(true);
        handlers.get('seekto')?.({ action: 'seekto', seekTime: 120 });
        expect(FakeAudio.instance.currentTime).toBe(100);
        handlers.get('seekto')?.({ action: 'seekto', seekTime: NaN });
        expect(FakeAudio.instance.currentTime).toBe(100);

        signedIn.set(false);
        TestBed.tick();
        expect(media.metadata).toBeNull();
        expect(media.playbackState).toBe('none');
        expect(FakeAudio.instance.src).toBe('');
    });

    it('does not replace new metadata with artwork from an earlier track or session', async () => {
        const service = TestBed.inject(MediaSessionService);
        const oldCover = new Subject<string>();
        const pendingCover = new Subject<string>();
        getUrl.mockReturnValueOnce(oldCover).mockReturnValueOnce(pendingCover);

        service.setTrack(track('a'));
        const oldRequest = service.setArtwork('cover-a');
        service.setTrack(track('b'));
        oldCover.next('blob:old');
        await oldRequest;
        expect(media.metadata?.title).toBe('Track b');
        expect(media.metadata?.artwork).toEqual([]);

        const pendingRequest = service.setArtwork('cover-b');
        service.clear();
        service.setTrack(track('c'));
        pendingCover.next('blob:stale');
        await pendingRequest;
        expect(media.metadata?.title).toBe('Track c');
        expect(media.metadata?.artwork).toEqual([]);
    });

    it('reports valid, bounded positions and clears them', () => {
        const service = TestBed.inject(MediaSessionService);
        service.updatePosition({ duration: NaN, currentTime: 3, playbackRate: 1 });
        expect(media.setPositionState).not.toHaveBeenCalled();

        service.updatePosition({ duration: 10, currentTime: 12, playbackRate: 1 });
        expect(media.setPositionState).toHaveBeenCalledWith({ duration: 10, position: 10, playbackRate: 1 });
        service.clearPosition();
        expect(media.setPositionState).toHaveBeenLastCalledWith();
    });

    it('continues without Media Session support', () => {
        vi.stubGlobal('navigator', {});
        const service = TestBed.inject(MediaSessionService);
        expect(() => {
            service.registerActions({ play: vi.fn(), pause: vi.fn(), seek: vi.fn() });
            service.setTrack(track('a'));
            service.updatePosition({ duration: 10, currentTime: 3, playbackRate: 1 });
            service.clearPosition();
            service.clear();
        }).not.toThrow();
    });

    it('keeps play and pause handlers when seeking is unsupported', () => {
        media.setActionHandler.mockImplementation((action: MediaSessionAction, handler: MediaSessionActionHandler) => {
            if (action === 'seekto') throw new TypeError('Unsupported action');
            handlers.set(action, handler);
        });
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const play = vi.fn();
        const pause = vi.fn();
        TestBed.inject(MediaSessionService).registerActions({ play, pause, seek: vi.fn() });

        handlers.get('play')?.({ action: 'play' });
        handlers.get('pause')?.({ action: 'pause' });
        expect(play).toHaveBeenCalledOnce();
        expect(pause).toHaveBeenCalledOnce();
        expect(warning).toHaveBeenCalledOnce();
        warning.mockRestore();
    });
});

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { CoverColorService } from '../cover/cover-color.service';
import { DriveService } from '../drive/drive.service';
import { TrackRow } from '../library/library-file.model';
import { LibraryService } from '../library/library.service';
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
    const downloadBlob = vi.fn<(id: string) => Observable<Blob>>();
    const getColor = vi.fn();
    const getAlbumById = vi.fn();
    let service: PlayerService;
    let createObjectURL: ReturnType<typeof vi.fn>;
    let revokeObjectURL: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.stubGlobal('Audio', FakeAudio);
        let urlCount = 0;
        createObjectURL = vi.fn(() => `blob:track-${++urlCount}`);
        revokeObjectURL = vi.fn();
        URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
        URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;

        signedIn.set(true);
        downloadBlob.mockReset().mockReturnValue(of(new Blob(['audio'])));
        getColor.mockReset().mockReturnValue(of({ hue: 200, chroma: 0.5 }));
        getAlbumById.mockReset().mockReturnValue(undefined);

        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: { isSignedIn: signedIn.asReadonly() } },
                { provide: DriveService, useValue: { downloadBlob } },
                { provide: CoverColorService, useValue: { getColor } },
                { provide: LibraryService, useValue: { getAlbumById } },
            ],
        });
        service = TestBed.inject(PlayerService);
    });

    afterEach(() => vi.unstubAllGlobals());

    it('pauses and resumes the current track', async () => {
        await service.playTrack(makeTrack('a'));
        expect(service.isPlaying()).toBe(true);

        service.toggle();
        expect(service.isPlaying()).toBe(false);

        service.toggle();
        expect(service.isPlaying()).toBe(true);
        expect(downloadBlob).toHaveBeenCalledTimes(1);
    });

    it('retries the download when toggling a track that failed to load', async () => {
        downloadBlob.mockReturnValueOnce(throwError(() => new Error('Network down')));
        await service.playTrack(makeTrack('a'));

        expect(service.error()).toBe('Network down');
        expect(service.isBuffering()).toBe(false);

        service.toggle();
        await vi.waitFor(() => expect(service.isPlaying()).toBe(true));

        expect(downloadBlob).toHaveBeenCalledTimes(2);
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

    it('releases the previous blob and ignores its download when switching tracks', async () => {
        const slowDownload = new Subject<Blob>();
        downloadBlob.mockReturnValueOnce(slowDownload);

        const first = service.playTrack(makeTrack('a'));
        await service.playTrack(makeTrack('b'));
        slowDownload.next(new Blob(['late']));
        await first;

        expect(service.currentTrack()?.id).toBe('b');
        expect(createObjectURL).toHaveBeenCalledTimes(1);
        expect(service.isPlaying()).toBe(true);

        await service.playTrack(makeTrack('c'));
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:track-1');
    });

    it('stops playback and clears state on sign-out', async () => {
        await service.playTrack(makeTrack('a'));

        signedIn.set(false);
        TestBed.tick();

        expect(FakeAudio.instance.paused).toBe(true);
        expect(FakeAudio.instance.src).toBe('');
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:track-1');
        expect(service.currentTrack()).toBeNull();
        expect(service.isPlaying()).toBe(false);
        expect(service.cover()).toBeNull();
    });

    it('discards a pending download on sign-out', async () => {
        const pending = new Subject<Blob>();
        downloadBlob.mockReturnValueOnce(pending);

        const playing = service.playTrack(makeTrack('a'));
        signedIn.set(false);
        TestBed.tick();
        pending.next(new Blob(['late']));
        await playing;

        expect(createObjectURL).not.toHaveBeenCalled();
        expect(service.currentTrack()).toBeNull();
        expect(service.isBuffering()).toBe(false);
    });

    it('uses the album\'s precomputed colour without sampling the cover', async () => {
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

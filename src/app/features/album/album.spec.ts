import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { App } from '../../app';
import { AuthService } from '../../core/auth/auth.service';
import { CoverColorService } from '../../core/cover/cover-color.service';
import { CoverService } from '../../core/cover/cover.service';
import { AlbumFile, ArtistFile, TrackRow } from '../../core/library/library-file.model';
import { LibraryService } from '../../core/library/library.service';
import { PlayerService } from '../../core/player/player.service';
import { Album } from './album';

describe('Album', () => {
    let fixture: ComponentFixture<Album>;
    const albums = signal<Record<string, AlbumFile>>({});
    const artists = signal<Record<string, ArtistFile>>({});
    const tracks = signal<TrackRow[]>([]);
    const getUrl = vi.fn((id: string) => of(`blob:${id}`));
    const getColor = vi.fn((id: string) =>
        of(id === 'cover-1' ? { hue: 120, chroma: 0.8 } : { hue: 240, chroma: 0.4 }),
    );
    const playQueue = vi.fn();

    beforeEach(async () => {
        albums.set({});
        artists.set({});
        tracks.set([]);
        getUrl.mockClear();
        getColor.mockClear();
        playQueue.mockReset().mockResolvedValue(undefined);

        await TestBed.configureTestingModule({
            imports: [Album, App],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: { isSignedIn: signal(true) } },
                {
                    provide: LibraryService,
                    useValue: {
                        isLoading: signal(false),
                        getAlbumById: (id: string) => albums()[id],
                        getAlbumTracks: () => tracks(),
                        getArtistById: (id: string) => artists()[id],
                    },
                },
                { provide: CoverService, useValue: { getUrl } },
                { provide: CoverColorService, useValue: { getColor } },
                {
                    provide: PlayerService,
                    useValue: {
                        currentTrack: signal(null),
                        isPlaying: signal(false),
                        isBuffering: signal(false),
                        playTrack: vi.fn(),
                        playQueue,
                        toggle: vi.fn(),
                    },
                },
            ],
        })
            .overrideComponent(App, { set: { template: '<app-atmosphere />' } })
            .compileComponents();

        fixture = TestBed.createComponent(Album);
        fixture.componentRef.setInput('id', 'album-1');
    });

    it('loads the artist image by its file ID and updates when the artist changes', async () => {
        albums.set({
            'album-1': {
                id: 'album-1',
                title: 'Album',
                artistId: 'artist-1',
                artist: 'Artist Name',
                trackCount: 0,
                addedAt: '',
            },
        });
        artists.set({
            'artist-1': {
                id: 'artist-1',
                name: 'Artist Name',
                addedAt: '',
                dir: '',
                mbid: '',
                deezerId: 0,
                image: { id: 'image-1', v: 1, source: '' },
                albums: 1,
            },
        });

        fixture.detectChanges();
        await fixture.whenStable();
        expect(getUrl).toHaveBeenCalledWith('image-1');
        expect(fixture.nativeElement.querySelector('.album-artist img').getAttribute('src')).toBe(
            'blob:image-1',
        );

        artists.update((current) => ({
            ...current,
            'artist-1': { ...current['artist-1'], image: { id: 'image-2', v: 1, source: '' } },
        }));
        await fixture.whenStable();
        expect(getUrl).toHaveBeenCalledWith('image-2');
        expect(fixture.nativeElement.querySelector('.album-artist img').getAttribute('src')).toBe(
            'blob:image-2',
        );
    });

    it('does not sample the cover when the library provides its colour', async () => {
        albums.set({
            'album-1': {
                id: 'album-1',
                title: 'Album',
                artistId: 'missing',
                artist: 'Artist Name',
                cover: 'cover-1',
                coverColor: { hue: 300, chroma: 0.6 },
                trackCount: 0,
                addedAt: '',
            },
        });

        fixture.detectChanges();
        await fixture.whenStable();

        expect(getColor).not.toHaveBeenCalled();
    });

    it('does not request an artist cover when the artist is unavailable', async () => {
        albums.set({
            'album-1': {
                id: 'album-1',
                title: 'Album',
                artistId: 'missing',
                artist: 'Artist Name',
                trackCount: 0,
                addedAt: '',
            },
        });

        fixture.detectChanges();
        await fixture.whenStable();
        expect(getUrl).not.toHaveBeenCalled();
    });

    it('shows the total duration only when every album track has a valid duration', async () => {
        albums.set({
            'album-1': {
                id: 'album-1',
                title: 'Album',
                artistId: 'missing',
                artist: 'Artist Name',
                trackCount: 2,
                addedAt: '',
            },
        });
        const track: TrackRow = {
            id: 'track-1',
            title: 'Track',
            artist: 'Artist Name',
            artistId: 'missing',
            albumId: 'album-1',
            track: 1,
            disc: 1,
            duration: 125,
            syncedLyrics: false,
            flac: { id: 'flac-1', size: 0 },
            mobile: { id: 'mobile-1', size: 0, codec: '', bitrate: '' },
            addedAt: '',
        };
        tracks.set([track, { ...track, id: 'track-2', duration: 65 }]);

        fixture.detectChanges();
        await fixture.whenStable();
        expect(fixture.componentInstance.totalDuration()).toBe(190);
        expect(fixture.nativeElement.querySelector('.album-duration').textContent).toContain(
            '3:10',
        );
        expect(
            fixture.nativeElement.querySelector('app-track-card button').getAttribute('aria-label'),
        ).toBe('Play Track');
        expect(fixture.nativeElement.querySelector('.track-card').hasAttribute('aria-hidden')).toBe(
            false,
        );
        expect(fixture.nativeElement.querySelector('.track-card .track-artist')).toBeNull();
        expect(fixture.nativeElement.querySelector('.track-card .track-album')).toBeNull();
        expect(fixture.nativeElement.querySelector('.track-card .track-duration').textContent).toBe(
            '2:05',
        );

        tracks.set([track, { ...track, id: 'track-2', duration: undefined }]);
        await fixture.whenStable();
        expect(fixture.componentInstance.totalDuration()).toBeNull();
        expect(fixture.nativeElement.querySelector('.album-duration').textContent.trim()).toBe('');

        tracks.set([track]);
        await fixture.whenStable();
        expect(fixture.componentInstance.totalDuration()).toBeNull();
    });

    it('applies the album cover color to the shell atmosphere and clears it on leaving', async () => {
        vi.stubGlobal(
            'matchMedia',
            vi.fn(() => ({ matches: false, addEventListener: vi.fn() })),
        );
        const app = TestBed.createComponent(App);
        albums.set({
            'album-1': {
                id: 'album-1',
                title: 'Album',
                artistId: 'missing',
                artist: 'Artist Name',
                cover: 'cover-1',
                trackCount: 0,
                addedAt: '',
            },
        });

        app.detectChanges();
        fixture.detectChanges();
        await fixture.whenStable();
        app.detectChanges();
        const atmosphere = app.nativeElement.querySelector('app-atmosphere') as HTMLElement;
        expect(getColor).toHaveBeenCalledWith('cover-1');
        expect(atmosphere.style.getPropertyValue('--atmosphere-accent-hue')).toBe('120');
        expect(atmosphere.style.getPropertyValue('--atmosphere-accent-chroma')).toBe('0.8');

        albums.update((current) => ({
            ...current,
            'album-1': { ...current['album-1'], cover: 'cover-2' },
        }));
        await fixture.whenStable();
        app.detectChanges();
        expect(getColor).toHaveBeenCalledWith('cover-2');
        expect(atmosphere.style.getPropertyValue('--atmosphere-accent-hue')).toBe('240');
        expect(atmosphere.style.getPropertyValue('--atmosphere-accent-chroma')).toBe('0.4');

        fixture.destroy();
        app.detectChanges();
        expect(atmosphere.style.getPropertyValue('--atmosphere-accent-hue')).toBe('');
        expect(atmosphere.style.getPropertyValue('--atmosphere-accent-chroma')).toBe('');
    });

    afterEach(() => vi.unstubAllGlobals());

    it('orders tracks by disc and track number, with unnumbered tracks last', () => {
        const base: TrackRow = {
            id: 'base',
            title: 'Track',
            artist: 'Artist',
            artistId: 'artist',
            albumId: 'album-1',
            disc: 1,
            track: 1,
            syncedLyrics: false,
            flac: { id: 'flac', size: 1 },
            mobile: { id: 'mobile', size: 1, codec: '', bitrate: '' },
            addedAt: '',
        };

        tracks.set([
            { ...base, id: 'unnumbered', track: null },
            { ...base, id: 'second', track: 2 },
            { ...base, id: 'first', track: 1 },
        ]);

        fixture.componentRef.setInput('id', 'album-1');
        fixture.detectChanges();

        expect(fixture.componentInstance.tracks().map((track) => track.id)).toEqual([
            'first',
            'second',
            'unnumbered',
        ]);
    });

    it('starts an album queue in displayed order from the clicked track', async () => {
        albums.set({
            'album-1': {
                id: 'album-1',
                title: 'Album',
                artistId: 'artist',
                artist: 'Artist',
                trackCount: 2,
                addedAt: '',
            },
        });

        const base: TrackRow = {
            id: 'first',
            title: 'First',
            artist: 'Artist',
            artistId: 'artist',
            albumId: 'album-1',
            disc: 1,
            track: 1,
            syncedLyrics: false,
            flac: { id: 'flac', size: 1 },
            mobile: { id: 'mobile', size: 1, codec: '', bitrate: '' },
            addedAt: '',
        };

        // Deliberately provide the tracks out of order.
        tracks.set([{ ...base, id: 'second', title: 'Second', track: 2 }, base]);

        fixture.detectChanges();
        await fixture.whenStable();

        const buttons = fixture.nativeElement.querySelectorAll(
            '.track-list app-track-card .play-button',
        ) as NodeListOf<HTMLButtonElement>;
        buttons[1].click();

        expect(playQueue).toHaveBeenCalledWith(['first', 'second'], 1);
    });
});

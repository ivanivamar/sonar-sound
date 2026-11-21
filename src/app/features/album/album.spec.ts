import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { App } from '../../app';
import { AuthService } from '../../core/auth/auth.service';
import { CoverColorService } from '../../core/cover/cover-color.service';
import { CoverService } from '../../core/cover/cover.service';
import { AlbumFile, ArtistFile } from '../../core/library/library-file.model';
import { LibraryService } from '../../core/library/library.service';
import { Album } from './album';

describe('Album', () => {
    let fixture: ComponentFixture<Album>;
    const albums = signal<Record<string, AlbumFile>>({});
    const artists = signal<Record<string, ArtistFile>>({});
    const getUrl = vi.fn((id: string) => of(`blob:${id}`));
    const getColor = vi.fn((id: string) =>
        of(id === 'cover-1' ? { hue: 120, chroma: 0.8 } : { hue: 240, chroma: 0.4 }),
    );

    beforeEach(async () => {
        albums.set({});
        artists.set({});
        getUrl.mockClear();
        getColor.mockClear();

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
                        getAlbumTracks: () => [],
                        getArtistById: (id: string) => artists()[id],
                    },
                },
                { provide: CoverService, useValue: { getUrl } },
                { provide: CoverColorService, useValue: { getColor } },
            ],
        }).overrideComponent(App, { set: { template: '<app-atmosphere />' } }).compileComponents();

        fixture = TestBed.createComponent(Album);
        fixture.componentRef.setInput('id', 'album-1');
    });

    it('loads the artist image by its file ID and updates when the artist changes', async () => {
        albums.set({
            'album-1': {
                id: 'album-1', title: 'Album', artistId: 'artist-1', artist: 'Artist Name',
                trackCount: 0, addedAt: '',
            },
        });
        artists.set({
            'artist-1': {
                id: 'artist-1', name: 'Artist Name', addedAt: '', dir: '', mbid: '', deezerId: 0,
                image: { id: 'image-1', v: 1, source: '' }, albums: 1,
            },
        });

        fixture.detectChanges();
        await fixture.whenStable();
        expect(getUrl).toHaveBeenCalledWith('image-1');
        expect(fixture.nativeElement.querySelector('.album-artist img').getAttribute('src')).toBe('blob:image-1');

        artists.update(current => ({
            ...current,
            'artist-1': { ...current['artist-1'], image: { id: 'image-2', v: 1, source: '' } },
        }));
        await fixture.whenStable();
        expect(getUrl).toHaveBeenCalledWith('image-2');
        expect(fixture.nativeElement.querySelector('.album-artist img').getAttribute('src')).toBe('blob:image-2');
    });

    it('does not request an artist cover when the artist is unavailable', async () => {
        albums.set({
            'album-1': {
                id: 'album-1', title: 'Album', artistId: 'missing', artist: 'Artist Name',
                trackCount: 0, addedAt: '',
            },
        });

        fixture.detectChanges();
        await fixture.whenStable();
        expect(getUrl).not.toHaveBeenCalled();
    });

    it('applies the album cover color to the shell atmosphere and clears it on leaving', async () => {
        vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn() })));
        const app = TestBed.createComponent(App);
        albums.set({
            'album-1': {
                id: 'album-1', title: 'Album', artistId: 'missing', artist: 'Artist Name',
                cover: 'cover-1', trackCount: 0, addedAt: '',
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

        albums.update(current => ({
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
});

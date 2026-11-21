import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CoverColorService } from '../../core/cover/cover-color.service';
import { CoverService } from '../../core/cover/cover.service';
import { ArtistFile } from '../../core/library/library-file.model';
import { LibraryService } from '../../core/library/library.service';
import { Topbar } from '../../layout/topbar/topbar';
import { Artist } from './artist';

@Component({
    imports: [Artist, Topbar],
    template: '<app-topbar [scrolled]="scrolled()" /> @if (showArtist()) { <app-artist id="artist-1" /> }',
})
class ArtistTopbarHost {
    readonly scrolled = signal(false);
    readonly showArtist = signal(true);
}

describe('Artist', () => {
    let component: Artist;
    let fixture: ComponentFixture<Artist>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Artist],
        }).compileComponents();

        fixture = TestBed.createComponent(Artist);
        fixture.componentRef.setInput('id', 'artist-1');
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

describe('Artist scrolled topbar', () => {
    it('shows the current artist and removes the content when the page is destroyed', async () => {
        const artist = signal<ArtistFile>({
            id: 'artist-1', name: 'Artist', albums: 0, addedAt: '', dir: '', mbid: '', deezerId: 0,
            image: { id: 'image-1', v: 1, source: '' },
        });
        const getUrl = vi.fn((id: string) => of(`blob:${id}`));
        TestBed.configureTestingModule({
            imports: [ArtistTopbarHost],
            providers: [
                provideRouter([]),
                {
                    provide: LibraryService,
                    useValue: {
                        isLoading: signal(false),
                        getArtistById: () => artist(),
                        getArtistAlbums: () => [],
                        getArtistTracks: () => [],
                    },
                },
                { provide: CoverService, useValue: { getUrl } },
                { provide: CoverColorService, useValue: { getColor: vi.fn() } },
            ],
        });
        const fixture = TestBed.createComponent(ArtistTopbarHost);
        fixture.detectChanges();
        await fixture.whenStable();
        const topbar = fixture.nativeElement.querySelector('app-topbar') as HTMLElement;
        expect(topbar.querySelector('.artist-topbar')).toBeNull();

        fixture.componentInstance.scrolled.set(true);
        await fixture.whenStable();
        expect(topbar.querySelector('.artist-topbar')?.textContent).toContain('Artist');
        expect(topbar.querySelector('.artist-topbar app-cover')?.getAttribute('aria-hidden')).toBe('true');
        expect(getUrl).toHaveBeenCalledWith('image-1');

        artist.update(current => ({ ...current, name: 'Updated artist' }));
        await fixture.whenStable();
        expect(topbar.querySelector('.artist-topbar')?.textContent).toContain('Updated artist');

        fixture.componentInstance.showArtist.set(false);
        await fixture.whenStable();
        expect(topbar.querySelector('.artist-topbar')).toBeNull();
    });
});

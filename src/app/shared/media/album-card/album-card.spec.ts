import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlbumCard } from './album-card';

describe('AlbumCard', () => {
    let component: AlbumCard;
    let fixture: ComponentFixture<AlbumCard>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AlbumCard],
        }).compileComponents();

        fixture = TestBed.createComponent(AlbumCard);
        fixture.componentRef.setInput('album', {
            id: 'album-1',
            title: 'Album',
            artistId: 'artist-1',
            artist: 'Artist',
            trackCount: 0,
            addedAt: '',
        });
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

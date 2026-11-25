import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ArtistCard } from './artist-card';

describe('ArtistCard', () => {
    let component: ArtistCard;
    let fixture: ComponentFixture<ArtistCard>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ArtistCard],
        }).compileComponents();

        fixture = TestBed.createComponent(ArtistCard);
        fixture.componentRef.setInput('artist', {
            id: 'artist-1',
            name: 'Artist',
            addedAt: '',
            dir: '',
            mbid: '',
            deezerId: 0,
            image: { id: 'image-1', v: 1, source: '' },
            albums: 0,
        });
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

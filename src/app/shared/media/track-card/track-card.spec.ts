import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TrackRow } from '../../../core/library/library-file.model';
import { PlayerService } from '../../../core/player/player.service';
import { TrackCard } from './track-card';

function makeTrack(id: string): TrackRow {
    return {
        id,
        title: `Track ${id}`,
        artist: 'Artist',
        albumId: 'al',
        artistId: 'ar',
    } as TrackRow;
}

describe('TrackCard', () => {
    let fixture: ComponentFixture<TrackCard>;
    const currentTrack = signal<TrackRow | null>(null);
    const isPlaying = signal(false);
    const isBuffering = signal(false);
    const toggle = vi.fn();
    const playTrack = vi.fn();
    const playQueue = vi.fn();

    const button = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    beforeEach(async () => {
        currentTrack.set(null);
        isPlaying.set(false);
        isBuffering.set(false);
        toggle.mockReset();
        playTrack.mockReset();
        playQueue.mockReset().mockResolvedValue(undefined);

        await TestBed.configureTestingModule({
            imports: [TrackCard],
            providers: [
                provideRouter([]),
                {
                    provide: PlayerService,
                    useValue: {
                        currentTrack,
                        isPlaying,
                        isBuffering,
                        toggle,
                        playTrack,
                        playQueue,
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(TrackCard);
        fixture.componentRef.setInput('track', makeTrack('a'));
        await fixture.whenStable();
    });

    it('names the play button after the track and hides its icon from screen readers', () => {
        expect(button().getAttribute('aria-label')).toBe('Play Track a');
        expect(button().querySelector('i')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('independently controls the artist and album links', async () => {
        const element = fixture.nativeElement as HTMLElement;
        expect(element.querySelector('.track-artist')).not.toBeNull();
        expect(element.querySelector('.track-album')).not.toBeNull();

        fixture.componentRef.setInput('showArtist', false);
        await fixture.whenStable();
        expect(element.querySelector('.track-artist')).toBeNull();
        expect(element.querySelector('.track-album')).not.toBeNull();

        fixture.componentRef.setInput('showAlbum', false);
        await fixture.whenStable();
        expect(element.querySelector('.track-artist')).toBeNull();
        expect(element.querySelector('.track-album')).toBeNull();

        fixture.componentRef.setInput('showArtist', true);
        await fixture.whenStable();
        expect(element.querySelector('.track-artist')).not.toBeNull();
        expect(element.querySelector('.track-album')).toBeNull();
    });

    it('matches the current track by id rather than object identity', async () => {
        currentTrack.set({ ...makeTrack('a') });
        isPlaying.set(true);
        await fixture.whenStable();

        expect(button().getAttribute('aria-label')).toBe('Pause Track a');
        expect(fixture.nativeElement.querySelector('.current-playing')).not.toBeNull();
    });

    it('plays a different track and toggles the current one', async () => {
        button().click();
        expect(playTrack).toHaveBeenCalledTimes(1);

        currentTrack.set(makeTrack('a'));
        await fixture.whenStable();
        button().click();
        expect(toggle).toHaveBeenCalledTimes(1);
    });

    it('plays the row with Enter or Space without hijacking its links', () => {
        const row = fixture.nativeElement.querySelector('.track-card') as HTMLElement;
        const link = row.querySelector('.track-artist') as HTMLAnchorElement;
        vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

        row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        row.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        row.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
        link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

        expect(playTrack).toHaveBeenCalledTimes(2);
    });

    it('shows loading only on the current track', async () => {
        isBuffering.set(true);
        await fixture.whenStable();
        expect(button().querySelector('.loading')).toBeNull();

        currentTrack.set(makeTrack('a'));
        await fixture.whenStable();
        expect(button().querySelector('.loading')).not.toBeNull();
        expect(button().getAttribute('aria-busy')).toBe('true');
    });

    it('plays an album queue starting at the selected track', async () => {
        fixture.componentRef.setInput('queueTrackIds', ['x', 'a', 'y']);
        await fixture.whenStable();

        button().click();

        expect(playQueue).toHaveBeenCalledWith(['x', 'a', 'y'], 1);
        expect(playTrack).not.toHaveBeenCalled();
    });
});

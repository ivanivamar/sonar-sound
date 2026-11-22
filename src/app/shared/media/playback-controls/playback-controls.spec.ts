import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerService } from '../../../core/player/player.service';
import { TrackRow } from '../../../core/library/library-file.model';
import { PlaybackControls } from './playback-controls';

describe('PlaybackControls', () => {
    let fixture: ComponentFixture<PlaybackControls>;
    const currentTrack = signal<TrackRow | null>(null);
    const isPlaying = signal(false);
    const toggle = vi.fn();

    beforeEach(async () => {
        currentTrack.set(null);
        isPlaying.set(false);
        toggle.mockReset();

        await TestBed.configureTestingModule({
            imports: [PlaybackControls],
            providers: [
                {
                    provide: PlayerService,
                    useValue: { currentTrack, isPlaying, isBuffering: signal(false), toggle },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(PlaybackControls);
        await fixture.whenStable();
    });

    it('disables the unfinished controls', () => {
        const buttons = fixture.nativeElement.querySelectorAll('.control-secondary');
        expect(buttons.length).toBe(4);
        buttons.forEach((button: HTMLButtonElement) => expect(button.disabled).toBe(true));
    });

    it('toggles playback without letting the click reach the host', async () => {
        currentTrack.set({ id: 'a' } as TrackRow);
        await fixture.whenStable();

        const parentClick = vi.fn();
        fixture.nativeElement.addEventListener('click', parentClick);
        const play = fixture.nativeElement.querySelector('button[aria-label="Play"]');
        expect(play.disabled).toBe(false);
        play.click();

        expect(toggle).toHaveBeenCalledTimes(1);
        expect(parentClick).not.toHaveBeenCalled();
    });

    it('shows the pause button while playing', async () => {
        currentTrack.set({ id: 'a' } as TrackRow);
        isPlaying.set(true);
        await fixture.whenStable();

        expect(fixture.nativeElement.querySelector('button[aria-label="Pause"]')).toBeTruthy();
    });
});

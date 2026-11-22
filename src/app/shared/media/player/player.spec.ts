import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PlayerService } from '../../../core/player/player.service';
import { TrackRow } from '../../../core/library/library-file.model';
import { Player } from './player';

describe('Player', () => {
    let component: Player;
    let fixture: ComponentFixture<Player>;
    const currentTrack = signal<TrackRow | null>(null);
    const error = signal<string | null>(null);
    const toggle = vi.fn();

    beforeEach(async () => {
        currentTrack.set(null);
        error.set(null);
        toggle.mockReset();

        await TestBed.configureTestingModule({
            imports: [Player],
            providers: [
                provideRouter([]),
                {
                    provide: PlayerService,
                    useValue: {
                        currentTrack,
                        error,
                        isPlaying: signal(false),
                        isBuffering: signal(false),
                        position: signal(0),
                        duration: signal(0),
                        coverColor: signal(null),
                        cover: signal(null),
                        toggle,
                        seek: vi.fn(),
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(Player);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('shows playback errors and keeps the play button usable for a retry', async () => {
        currentTrack.set({ id: 'a', title: 'A', artist: 'B', albumId: 'c' } as TrackRow);
        error.set('Could not download the track.');
        await fixture.whenStable();

        const element: HTMLElement = fixture.nativeElement;
        expect(element.querySelector('[role="alert"]')?.textContent).toContain(
            'Could not download the track.',
        );

        const play = element.querySelector<HTMLButtonElement>('button[aria-label="Play"]');
        expect(play?.disabled).toBe(false);
        play?.click();
        expect(toggle).toHaveBeenCalledTimes(1);
    });
});

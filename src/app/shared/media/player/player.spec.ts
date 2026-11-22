import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { PlayerService } from '../../../core/player/player.service';
import { TrackRow } from '../../../core/library/library-file.model';
import { Player } from './player';
import { NowPlaying } from '../now-playing/now-playing';

describe('Player', () => {
    let component: Player;
    let fixture: ComponentFixture<Player>;
    const currentTrack = signal<TrackRow | null>(null);
    const error = signal<string | null>(null);
    const toggle = vi.fn();

    beforeEach(async () => {
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })));
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

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('toggles playback on Space without toggling now playing', () => {
        const footer = fixture.nativeElement.querySelector('footer') as HTMLElement;
        const nowPlaying = fixture.debugElement.query(By.directive(NowPlaying))
            .componentInstance as NowPlaying;
        const toggleNowPlaying = vi.spyOn(nowPlaying, 'toggle');
        const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });

        footer.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(true);
        expect(toggle).toHaveBeenCalledTimes(1);
        expect(toggleNowPlaying).not.toHaveBeenCalled();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        expect(toggle).toHaveBeenCalledTimes(2);
        expect(toggleNowPlaying).not.toHaveBeenCalled();

        footer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(toggleNowPlaying).toHaveBeenCalledTimes(1);
    });

    it('leaves Space to focused controls and previously handled events', () => {
        const element: HTMLElement = fixture.nativeElement;
        const button = element.querySelector('button')!;
        const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });

        button.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(false);
        expect(toggle).not.toHaveBeenCalled();

        const handled = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
        handled.preventDefault();
        document.dispatchEvent(handled);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', repeat: true }));
        expect(toggle).not.toHaveBeenCalled();
    });

    it('focuses the now-playing dialog so Space controls playback, and restores focus on close', async () => {
        currentTrack.set({ id: 'a', title: 'A', artist: 'B', albumId: 'c' } as TrackRow);
        await fixture.whenStable();

        const footer = fixture.nativeElement.querySelector('footer') as HTMLElement;
        const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
        const nowPlaying = fixture.debugElement.query(By.directive(NowPlaying))
            .componentInstance as NowPlaying;
        footer.focus();

        nowPlaying.open();
        await fixture.whenStable();
        expect(document.activeElement).toBe(dialog);

        dialog.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
        expect(toggle).toHaveBeenCalledTimes(1);
        expect(nowPlaying.isOpen()).toBe(true);

        nowPlaying.close();
        expect(document.activeElement).toBe(footer);
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

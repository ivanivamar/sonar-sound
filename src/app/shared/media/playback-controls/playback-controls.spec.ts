import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerService, RepeatMode } from '../../../core/player/player.service';
import { TrackRow } from '../../../core/library/library-file.model';
import { PlaybackControls } from './playback-controls';
import { QueueState } from '../../../core/player/queue/queue.model';

describe('PlaybackControls', () => {
    let fixture: ComponentFixture<PlaybackControls>;
    const currentTrack = signal<TrackRow | null>(null);
    const isPlaying = signal(false);
    const toggle = vi.fn();
    const previousTrack = vi.fn();
    const nextTrack = vi.fn();
    const repeat = signal(RepeatMode.Off);
    const toggleRepeat = vi.fn();
    const queueState = signal<QueueState>({
        entries: [],
        currentIndex: -1,
        shuffle: false,
        originalOrder: null,
    });
    const toggleShuffle = vi.fn();

    beforeEach(async () => {
        currentTrack.set(null);
        isPlaying.set(false);
        toggle.mockReset();
        previousTrack.mockReset().mockResolvedValue(undefined);
        nextTrack.mockReset().mockResolvedValue(undefined);
        toggleRepeat.mockReset();
        repeat.set(RepeatMode.Off);
        queueState.set({
            entries: [],
            currentIndex: -1,
            shuffle: false,
            originalOrder: null,
        });
        toggleShuffle.mockReset();

        await TestBed.configureTestingModule({
            imports: [PlaybackControls],
            providers: [
                {
                    provide: PlayerService,
                    useValue: {
                        currentTrack,
                        isPlaying,
                        isBuffering: signal(false),
                        toggle,
                        nextTrack,
                        previousTrack,
                        repeat,
                        toggleRepeat,
                        state: queueState,
                        toggleShuffle,
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(PlaybackControls);
        await fixture.whenStable();
    });

    it('disables secondary controls when no track is selected', () => {
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

    it('plays the next track without opening the full-screen player', async () => {
        currentTrack.set({ id: 'a' } as TrackRow);
        await fixture.whenStable();

        const parentClick = vi.fn();
        fixture.nativeElement.addEventListener('click', parentClick);

        const next = fixture.nativeElement.querySelector(
            'button[aria-label="Next track"]',
        ) as HTMLButtonElement;
        expect(next.disabled).toBe(false);
        next.click();

        expect(nextTrack).toHaveBeenCalledTimes(1);
        expect(parentClick).not.toHaveBeenCalled();
    });

    it('shows an error when the next track is unavailable', async () => {
        currentTrack.set({ id: 'a' } as TrackRow);
        nextTrack.mockRejectedValue(new Error('Track unavailable'));
        await fixture.whenStable();

        const next = fixture.nativeElement.querySelector(
            'button[aria-label="Next track"]',
        ) as HTMLButtonElement;
        next.click();
        await fixture.whenStable();

        expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
            'Track unavailable',
        );
    });

    it('plays the previous track without opening the full-screen player', async () => {
        currentTrack.set({ id: 'a' } as TrackRow);
        await fixture.whenStable();

        const parentClick = vi.fn();
        fixture.nativeElement.addEventListener('click', parentClick);

        const previous = fixture.nativeElement.querySelector(
            'button[aria-label="Previous track"]',
        ) as HTMLButtonElement;
        expect(previous.disabled).toBe(false);
        previous.click();

        expect(previousTrack).toHaveBeenCalledTimes(1);
        expect(parentClick).not.toHaveBeenCalled();
    });

    it('shows an error when the previous track is unavailable', async () => {
        currentTrack.set({ id: 'a' } as TrackRow);
        previousTrack.mockRejectedValue(new Error('Track unavailable'));
        await fixture.whenStable();

        const previous = fixture.nativeElement.querySelector(
            'button[aria-label="Previous track"]',
        ) as HTMLButtonElement;
        previous.click();
        await fixture.whenStable();

        expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
            'Track unavailable',
        );
    });

    it('announces and displays each repeat mode', async () => {
        currentTrack.set({ id: 'a' } as TrackRow);

        const modes = [
            { mode: RepeatMode.Off, label: 'Repeat off', icon: 'repeat', pressed: 'false' },
            { mode: RepeatMode.All, label: 'Repeat all', icon: 'repeat', pressed: 'true' },
            { mode: RepeatMode.One, label: 'Repeat one', icon: 'repeat_one', pressed: 'true' },
        ];

        for (const { mode, label, icon, pressed } of modes) {
            repeat.set(mode);
            await fixture.whenStable();

            const button = fixture.nativeElement.querySelector(
                `button[aria-label="${label}"]`,
            ) as HTMLButtonElement;
            expect(button.getAttribute('aria-pressed')).toBe(pressed);
            expect(button.querySelector('i')!.textContent.trim()).toBe(icon);
        }
    });
});

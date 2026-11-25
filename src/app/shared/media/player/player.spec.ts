import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { PlayerService, RepeatMode } from '../../../core/player/player.service';
import { TrackRow } from '../../../core/library/library-file.model';
import { LibraryService } from '../../../core/library/library.service';
import { createQueue } from '../../../core/player/queue/queue.model';
import { QueueService } from '../../../core/player/queue/queue.service';
import { ViewportService } from '../../../core/viewport/viewport.service';
import { Player } from './player';
import { NowPlaying } from '../now-playing/now-playing';

@Component({ template: '' })
class TestPage {}

describe('Player', () => {
    let component: Player;
    let fixture: ComponentFixture<Player>;
    const currentTrack = signal<TrackRow | null>(null);
    const error = signal<string | null>(null);
    const toggle = vi.fn();
    const playQueueEntry = vi.fn();
    const isPhone = signal(false);
    const queueState = signal(createQueue([], -1));

    beforeEach(async () => {
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })));
        currentTrack.set(null);
        error.set(null);
        toggle.mockReset();
        playQueueEntry.mockReset();
        isPhone.set(false);
        queueState.set(createQueue([], -1));

        await TestBed.configureTestingModule({
            imports: [Player],
            providers: [
                provideRouter([{ path: 'library/:type/:id', component: TestPage }]),
                { provide: ViewportService, useValue: { isPhone } },
                { provide: QueueService, useValue: { state: queueState } },
                {
                    provide: LibraryService,
                    useValue: { getTrackRowById: () => currentTrack() },
                },
                {
                    provide: PlayerService,
                    useValue: {
                        currentTrack,
                        error,
                        isPlaying: signal(false),
                        isBuffering: signal(false),
                        repeat: signal(RepeatMode.Off),
                        position: signal(0),
                        duration: signal(0),
                        coverColor: signal(null),
                        cover: signal(null),
                        toggle,
                        playQueueEntry,
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

    it('keeps now playing inert until opened from the player and after closing', async () => {
        currentTrack.set({ id: 'a', title: 'A', artist: 'B', albumId: 'c' } as TrackRow);
        await fixture.whenStable();

        const element: HTMLElement = fixture.nativeElement;
        const dialog = element.querySelector<HTMLElement>('[role="dialog"]')!;
        const footer = element.querySelector<HTMLElement>('footer')!;
        expect(dialog.hasAttribute('inert')).toBe(true);
        expect(dialog.classList.contains('open')).toBe(false);

        footer.click();
        await fixture.whenStable();
        expect(dialog.hasAttribute('inert')).toBe(false);
        expect(dialog.classList.contains('open')).toBe(true);

        dialog.querySelector<HTMLButtonElement>('.close-button')!.click();
        await fixture.whenStable();
        expect(dialog.hasAttribute('inert')).toBe(true);
        expect(dialog.classList.contains('open')).toBe(false);
    });

    it('focuses the now-playing dialog so Space controls playback, and restores focus on close', async () => {
        currentTrack.set({ id: 'a', title: 'A', artist: 'B', albumId: 'c' } as TrackRow);
        await fixture.whenStable();

        const footer = fixture.nativeElement.querySelector('footer') as HTMLElement;
        const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
        const nowPlaying = fixture.debugElement.query(By.directive(NowPlaying))
            .componentInstance as NowPlaying;
        const focusDialog = vi.spyOn(dialog, 'focus');
        footer.focus();

        nowPlaying.open();
        await fixture.whenStable();
        expect(document.activeElement).toBe(dialog);
        expect(focusDialog).toHaveBeenCalledWith({ preventScroll: true });

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

    it('closes now playing when the mini-player album link is clicked', async () => {
        currentTrack.set({ id: 'a', title: 'A', artist: 'B', albumId: 'c' } as TrackRow);
        await fixture.whenStable();
        const nowPlaying = fixture.debugElement.query(By.directive(NowPlaying))
            .componentInstance as NowPlaying;
        nowPlaying.open();
        await fixture.whenStable();

        const element = fixture.nativeElement as HTMLElement;
        element.querySelector<HTMLAnchorElement>('.track-album')!.click();

        expect(nowPlaying.isOpen()).toBe(false);
        await fixture.whenStable();
    });

    it.each(['artist', 'album'])(
        'closes now playing when a queue %s link is clicked without selecting the track',
        async (type) => {
            const track = { id: 'a', title: 'A', artist: 'B', artistId: 'b', albumId: 'c' } as TrackRow;
            currentTrack.set(track);
            queueState.set(createQueue([{ entryId: 'entry', trackId: 'a' }], 0));
            await fixture.whenStable();
            const nowPlaying = fixture.debugElement.query(By.directive(NowPlaying))
                .componentInstance as NowPlaying;
            nowPlaying.open();
            await fixture.whenStable();

            const element = fixture.nativeElement as HTMLElement;
            const link = element.querySelector<HTMLAnchorElement>(
                `.queue-sources a[href*="/library/${type}/"]`,
            )!;
            link.click();
            expect(nowPlaying.isOpen()).toBe(false);
            expect(playQueueEntry).not.toHaveBeenCalled();
            await fixture.whenStable();
        },
    );

    it('closes now playing when the phone album link is clicked', async () => {
        isPhone.set(true);
        currentTrack.set({ id: 'a', title: 'A', artist: 'B', albumId: 'c' } as TrackRow);
        await fixture.whenStable();
        const nowPlaying = fixture.debugElement.query(By.directive(NowPlaying))
            .componentInstance as NowPlaying;
        nowPlaying.open();
        await fixture.whenStable();

        const element = fixture.nativeElement as HTMLElement;
        element.querySelector<HTMLAnchorElement>('.track-artist-album a')!.click();
        expect(nowPlaying.isOpen()).toBe(false);
        await fixture.whenStable();
    });

    it('dismisses the phone queue sheet when navigating from a queue link', async () => {
        isPhone.set(true);
        currentTrack.set({ id: 'a', title: 'A', artist: 'B', artistId: 'b', albumId: 'c' } as TrackRow);
        queueState.set(createQueue([{ entryId: 'entry', trackId: 'a' }], 0));
        await fixture.whenStable();
        const nowPlaying = fixture.debugElement.query(By.directive(NowPlaying))
            .componentInstance as NowPlaying;
        nowPlaying.open();
        await fixture.whenStable();

        const element = fixture.nativeElement as HTMLElement;
        const sheet = element.querySelector<HTMLDialogElement>('dialog.sheet')!;
        sheet.showModal = () => sheet.setAttribute('open', '');
        sheet.close = () => sheet.removeAttribute('open');
        const queueButton = Array.from(
            element.querySelectorAll<HTMLButtonElement>('.track-shortcuts button'),
        ).find((button) => button.textContent?.includes('Queue'))!;
        queueButton.click();
        await fixture.whenStable();
        expect(sheet.open).toBe(true);

        sheet.querySelector<HTMLAnchorElement>('.queue-sources a')!.click();
        expect(nowPlaying.isOpen()).toBe(false);
        expect(sheet.open).toBe(false);
        await fixture.whenStable();

        nowPlaying.open();
        await fixture.whenStable();
        expect(sheet.open).toBe(false);
        expect(nowPlaying.isOpen()).toBe(true);
    });
});

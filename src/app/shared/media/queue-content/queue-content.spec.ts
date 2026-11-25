import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CoverColorService } from '../../../core/cover/cover-color.service';
import { CoverService } from '../../../core/cover/cover.service';
import { TrackRow } from '../../../core/library/library-file.model';
import { LibraryService } from '../../../core/library/library.service';
import { createQueue, moveEntry, toggleShuffle } from '../../../core/player/queue/queue.model';
import { PlayerService } from '../../../core/player/player.service';
import { QueueService } from '../../../core/player/queue/queue.service';
import { QueueContent } from './queue-content';
import { provideRouter } from '@angular/router';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { By } from '@angular/platform-browser';

function makeTrack(id: string): TrackRow {
    return {
        id,
        title: `Track ${id}`,
        artist: 'Artist',
        artistId: 'artist',
        albumId: 'album',
        disc: 1,
        track: 1,
        duration: 125,
        syncedLyrics: false,
        flac: { id: `flac-${id}`, size: 1 },
        mobile: { id: 'mobile', size: 1, codec: '', bitrate: '' },
        addedAt: '',
    };
}

describe('QueueContent', () => {
    let fixture: ComponentFixture<QueueContent>;

    const state = signal(createQueue([], -1));
    const playQueueEntry = vi.fn();
    const move = vi.fn((from: number, to: number) => {
        state.update((current) => moveEntry(current, from, to));
    });

    beforeEach(async () => {
        state.set(createQueue([], -1));
        playQueueEntry.mockReset().mockResolvedValue(undefined);
        move.mockClear();

        await TestBed.configureTestingModule({
            imports: [QueueContent],
            providers: [
                provideRouter([]),
                { provide: QueueService, useValue: { state, move } },
                {
                    provide: LibraryService,
                    useValue: {
                        getTrackRowById: (id: string) =>
                            id === 'missing' ? undefined : makeTrack(id),
                    },
                },
                { provide: PlayerService, useValue: { playQueueEntry } },
                { provide: CoverService, useValue: { getUrl: () => of('blob:cover') } },
                {
                    provide: CoverColorService,
                    useValue: { getColor: () => of({ hue: 0, chroma: 0 }) },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(QueueContent);
        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('shows an empty state when the queue is empty', () => {
        const element = fixture.nativeElement as HTMLElement;

        expect(element.querySelector('.queue-empty')?.textContent).toContain('The queue is empty.');
        expect(element.querySelectorAll('.queue-row')).toHaveLength(0);
    });

    it('shows played, current and upcoming occurrences, including duplicates', async () => {
        state.set(
            createQueue(
                [
                    { entryId: 'first', trackId: 'a' },
                    { entryId: 'second', trackId: 'a' },
                    { entryId: 'third', trackId: 'b' },
                ],
                1,
            ),
        );
        await fixture.whenStable();

        const element = fixture.nativeElement as HTMLElement;
        const rows = element.querySelectorAll<HTMLButtonElement>('.queue-row');
        const items = element.querySelectorAll<HTMLLIElement>('.queue-list li');

        expect(rows).toHaveLength(3);
        expect(rows[0].textContent).toContain('Track a');
        expect(rows[1].textContent).toContain('Track a');
        expect(rows[2].textContent).toContain('Track b');

        expect(Array.from(items, (item) => item.dataset['status'])).toEqual([
            'played',
            'current',
            'upcoming',
        ]);
        const sections = element.querySelectorAll<HTMLElement>('.queue-section');
        expect(Array.from(sections, (section) => section.textContent?.trim())).toEqual([
            'played',
            'upcoming',
        ]);
        expect(rows[1].textContent).toContain('Now Playing');

        expect(rows[0].getAttribute('aria-current')).toBeNull();
        expect(rows[1].getAttribute('aria-current')).toBe('true');
        expect(rows[2].getAttribute('aria-current')).toBeNull();
        expect(element.querySelector('.queue-header')?.textContent).toContain('1 upcoming');
    });

    it('shows previously played tracks as upcoming after enabling shuffle', async () => {
        state.set(
            toggleShuffle(
                createQueue(
                    [
                        { entryId: 'first', trackId: 'a' },
                        { entryId: 'current', trackId: 'b' },
                        { entryId: 'last', trackId: 'c' },
                    ],
                    1,
                ),
                () => 0,
            ),
        );
        await fixture.whenStable();

        const element = fixture.nativeElement as HTMLElement;
        const items = element.querySelectorAll<HTMLLIElement>('.queue-list li');
        expect(Array.from(items, (item) => item.dataset['entryId'])).toEqual([
            'current',
            'last',
            'first',
        ]);
        expect(Array.from(items, (item) => item.dataset['status'])).toEqual([
            'current',
            'upcoming',
            'upcoming',
        ]);
        expect(element.querySelector('.queue-header')?.textContent).toContain('2 upcoming');
    });

    it('plays the selected occurrence using its entry ID', async () => {
        state.set(
            createQueue(
                [
                    { entryId: 'first', trackId: 'a' },
                    { entryId: 'second', trackId: 'a' },
                ],
                0,
            ),
        );
        await fixture.whenStable();

        const rows = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
            '.queue-row',
        );

        rows[1].click();

        expect(playQueueEntry).toHaveBeenCalledOnce();
        expect(playQueueEntry).toHaveBeenCalledWith('second');
    });

    it('shows an error when selection fails', async () => {
        state.set(createQueue([{ entryId: 'missing-entry', trackId: 'missing' }], 0));
        playQueueEntry.mockRejectedValue(new Error('Track unavailable'));
        await fixture.whenStable();

        const element = fixture.nativeElement as HTMLElement;
        expect(element.textContent).toContain('Unavailable track');

        element.querySelector<HTMLButtonElement>('.queue-row')!.click();
        await fixture.whenStable();

        expect(element.querySelector('[role="alert"]')?.textContent).toContain('Track unavailable');
    });

    it('shows the destination and moves a played entry without restarting playback', async () => {
        state.set(
            createQueue(
                [
                    { entryId: 'first', trackId: 'a' },
                    { entryId: 'current', trackId: 'a' },
                    { entryId: 'last', trackId: 'b' },
                ],
                1,
            ),
        );
        await fixture.whenStable();

        const element = fixture.nativeElement as HTMLElement;
        const listElement = element.querySelector<HTMLOListElement>('.queue-list')!;
        const items = element.querySelectorAll<HTMLLIElement>('.queue-list li');

        vi.spyOn(listElement, 'getBoundingClientRect').mockReturnValue(
            DOMRect.fromRect({ x: 0, y: 0, width: 300, height: 220 }),
        );
        items.forEach((item, index) => {
            vi.spyOn(item, 'getBoundingClientRect').mockReturnValue(
                DOMRect.fromRect({ x: 0, y: index * 70, width: 300, height: 60 }),
            );
        });

        const draggedRow = fixture.debugElement.queryAll(By.directive(CdkDrag))[0];
        const list = fixture.debugElement.query(By.directive(CdkDropList));
        const point = { x: 50, y: 195 };

        draggedRow.triggerEventHandler('cdkDragStarted', {});
        draggedRow.triggerEventHandler('cdkDragMoved', { pointerPosition: point });
        await fixture.whenStable();

        expect(items[2].classList.contains('drop-after')).toBe(true);

        list.triggerEventHandler('cdkDropListDropped', {
            isPointerOverContainer: true,
            dropPoint: point,
        });
        await fixture.whenStable();

        expect(move).toHaveBeenCalledWith(0, 2);
        expect(state().entries.map((entry) => entry.entryId)).toEqual(['current', 'last', 'first']);
        expect(state().entries[state().currentIndex].entryId).toBe('current');
        expect(playQueueEntry).not.toHaveBeenCalled();
        expect(element.querySelector('.drop-after')).toBeNull();
    });

    it('keeps the manually edited order when shuffle is turned off', () => {
        const queue = createQueue(
            [
                { entryId: 'a', trackId: 'song-a' },
                { entryId: 'b', trackId: 'song-b' },
                { entryId: 'c', trackId: 'song-c' },
                { entryId: 'd', trackId: 'song-d' },
            ],
            1,
        );

        const shuffled = toggleShuffle(queue, () => 0);
        const moved = moveEntry(shuffled, 0, 3);
        const editedOrder = moved.entries.map((entry) => entry.entryId);

        const restored = toggleShuffle(moved);

        expect(restored.entries.map((entry) => entry.entryId)).toEqual(editedOrder);
        expect(restored.entries[restored.currentIndex].entryId).toBe('b');
        expect(restored.shuffle).toBe(false);
    });
});

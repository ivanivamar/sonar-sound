import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { TrackRow } from '../../../core/library/library-file.model';
import { QueueEntry } from '../../../core/player/queue.model';
import { LibraryService } from '../../../core/library/library.service';
import { PlayerService } from '../../../core/player/player.service';
import { QueueService } from '../../../core/player/queue.service';
import { Cover } from '../cover/cover';
import { DurationPipe } from '../../pipes/duration-pipe';
import { RouterLink } from '@angular/router';
import { CoverColor } from '../../../core/cover/cover-color';
import {
    CdkDrag,
    CdkDragDrop,
    CdkDragHandle,
    CdkDropList,
    CdkDragPreview,
    CdkDragMove,
} from '@angular/cdk/drag-drop';
import { PopupPosition } from '../../directives/popup-position';

type QueueRowStatus = 'played' | 'current' | 'upcoming';

interface QueueRow {
    entry: QueueEntry;
    index: number;
    track: TrackRow | undefined;
    status: QueueRowStatus;
}

@Component({
    imports: [
        Cover,
        DurationPipe,
        RouterLink,
        CdkDrag,
        CdkDragHandle,
        CdkDropList,
        CdkDragPreview,
        PopupPosition,
    ],
    selector: 'app-queue-content',
    styleUrl: './queue-content.scss',
    templateUrl: './queue-content.html',
})
export class QueueContent {
    private readonly queueService = inject(QueueService);
    private readonly libraryService = inject(LibraryService);
    private readonly playerService = inject(PlayerService);
    private readonly queueList = viewChild.required<ElementRef<HTMLOListElement>>('queueList');

    protected readonly error = signal<string | null>(null);

    protected readonly rows = computed<QueueRow[]>(() => {
        const state = this.queueService.state();

        return state.entries.map((entry, index) => ({
            entry,
            index,
            track: this.libraryService.getTrackRowById(entry.trackId),
            status:
                index === state.currentIndex
                    ? 'current'
                    : index < state.currentIndex
                      ? 'played'
                      : 'upcoming',
        }));
    });
    private draggedEntryId: string | null = null;
    private dragOrder: readonly string[] | null = null;
    protected readonly dropTarget = signal<{ entryId: string; after: boolean } | null>(null);

    protected readonly upcomingCount = computed(() => {
        const state = this.queueService.state();
        return Math.max(state.entries.length - state.currentIndex - 1, 0);
    });

    protected statusLabel(status: QueueRowStatus): string {
        switch (status) {
            case 'current':
                return 'Now playing';
            case 'played':
                return 'Played';
            case 'upcoming':
                return 'Up next';
        }
    }

    protected coverColor(coverColor?: CoverColor): void {
        if (coverColor) {
            this.currentColor.set(coverColor);
        }
    }
    protected readonly currentColor = signal<CoverColor | null>(null);

    protected select(entryId: string): void {
        this.error.set(null);

        void this.playerService.playQueueEntry(entryId).catch((error: unknown) => {
            this.error.set(
                error instanceof Error ? error.message : 'Could not play this queue entry.',
            );
        });
    }

    protected startDrag(entryId: string): void {
        this.draggedEntryId = entryId;
        this.dragOrder = this.queueService.state().entries.map((entry) => entry.entryId);
        this.dropTarget.set(null);
        this.error.set(null);
    }

    protected moveDrag(event: CdkDragMove): void {
        this.updateDropTarget(event.pointerPosition);
    }

    private updateDropTarget(point: { x: number; y: number }): void {
        const list = this.queueList().nativeElement;
        const bounds = list.getBoundingClientRect();

        if (
            point.x < bounds.left ||
            point.x > bounds.right ||
            point.y < bounds.top ||
            point.y > bounds.bottom
        ) {
            this.dropTarget.set(null);
            return;
        }

        const elements = Array.from(list.querySelectorAll<HTMLLIElement>('li[data-entry-id]'));
        if (!elements.length) {
            this.dropTarget.set(null);
            return;
        }

        let target = elements[elements.length - 1];
        let after = true;

        for (const element of elements) {
            const rect = element.getBoundingClientRect();
            if (point.y < rect.top + rect.height / 2) {
                target = element;
                after = false;
                break;
            }
        }

        const entryId = target.dataset['entryId'];
        if (!entryId || !this.dragOrder || !this.draggedEntryId) {
            this.dropTarget.set(null);
            return;
        }

        const from = this.dragOrder.indexOf(this.draggedEntryId);
        const targetIndex = this.dragOrder.indexOf(entryId);
        if (from < 0 || targetIndex < 0) {
            this.dropTarget.set(null);
            return;
        }

        const insertionIndex = targetIndex + (after ? 1 : 0);

        // Inserting immediately before or after the dragged row changes nothing.
        if (insertionIndex === from || insertionIndex === from + 1) {
            this.dropTarget.set(null);
            return;
        }

        this.dropTarget.set({ entryId, after });
    }

    protected drop(event: CdkDragDrop<QueueRow[]>): void {
        try {
            if (!event.isPointerOverContainer || !this.dragOrder || !this.draggedEntryId) {
                return;
            }

            const currentOrder = this.queueService.state().entries.map((entry) => entry.entryId);
            if (
                currentOrder.length !== this.dragOrder.length ||
                currentOrder.some((id, index) => id !== this.dragOrder![index])
            ) {
                this.error.set('The queue changed while dragging. Please try again.');
                return;
            }

            this.updateDropTarget(event.dropPoint);
            const target = this.dropTarget();
            if (!target) return;

            const from = this.dragOrder.indexOf(this.draggedEntryId);
            const targetIndex = this.dragOrder.indexOf(target.entryId);
            const insertionIndex = targetIndex + (target.after ? 1 : 0);
            const to = insertionIndex > from ? insertionIndex - 1 : insertionIndex;

            this.queueService.move(from, to);
        } finally {
            this.draggedEntryId = null;
            this.dragOrder = null;
            this.dropTarget.set(null);
        }
    }
}

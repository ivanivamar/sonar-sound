import { Service, signal } from '@angular/core';
import { QueueEntry, createQueue, moveEntry, selectEntry } from './queue.model';

@Service()
export class QueueService {
    private readonly _state = signal(createQueue([], -1));
    readonly state = this._state.asReadonly();

    replace(entries: readonly QueueEntry[], currentIndex: number): void {
        this._state.set(createQueue(entries, currentIndex));
    }

    select(entryId: string): void {
        this._state.update((state) => selectEntry(state, entryId));
    }

    move(from: number, to: number): void {
        this._state.update((state) => moveEntry(state, from, to));
    }
}

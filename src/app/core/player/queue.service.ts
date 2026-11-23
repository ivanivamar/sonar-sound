import { Service, signal } from '@angular/core';
import { QueueEntry, createQueue, moveEntry, selectEntry, toggleShuffle } from './queue.model';

@Service()
export class QueueService {
    private readonly _state = signal(createQueue([], -1));
    readonly state = this._state.asReadonly();

    replace(entries: readonly QueueEntry[], currentIndex: number): void {
        const shouldShuffle = this._state().shuffle;
        const nextState = createQueue(entries, currentIndex);

        this._state.set(shouldShuffle && entries.length > 0 ? toggleShuffle(nextState) : nextState);
    }

    select(entryId: string): void {
        this._state.update((state) => selectEntry(state, entryId));
    }

    move(from: number, to: number): void {
        this._state.update((state) => moveEntry(state, from, to));
    }

    toggleShuffle(): void {
        this._state.update((state) => toggleShuffle(state));
    }
}

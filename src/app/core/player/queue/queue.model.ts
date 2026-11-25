export interface QueueEntry {
    entryId: string; // unique occurrence in this queue
    trackId: string; // library track
}

export interface QueueState {
    entries: readonly QueueEntry[];
    currentIndex: number; // -1 when there is no current entry
    shuffle: boolean;
    originalOrder: readonly string[] | null; // entry IDs, only while shuffled
}

export function createQueue(entries: readonly QueueEntry[], currentIndex: number): QueueState {
    const validIndex =
        entries.length === 0
            ? currentIndex === -1
            : Number.isInteger(currentIndex) && currentIndex >= 0 && currentIndex < entries.length;

    if (!validIndex) {
        throw new RangeError('Invalid queue index.');
    }

    const ids = entries.map((entry) => entry.entryId);
    if (new Set(ids).size !== ids.length) {
        throw new Error('Queue entry IDs must be unique.');
    }

    return {
        entries: entries.map((entry) => ({ ...entry })),
        currentIndex,
        shuffle: false,
        originalOrder: null,
    };
}

export function selectEntry(state: QueueState, entryId: string): QueueState {
    const currentIndex = state.entries.findIndex((entry) => entry.entryId === entryId);

    if (currentIndex === -1) {
        throw new Error('Queue entry not found.');
    }

    return { ...state, currentIndex };
}

export function moveEntry(state: QueueState, from: number, to: number): QueueState {
    const validIndex = (index: number) =>
        Number.isInteger(index) && index >= 0 && index < state.entries.length;

    if (!validIndex(from) || !validIndex(to)) {
        throw new RangeError('Invalid queue index.');
    }

    const currentId = state.entries[state.currentIndex].entryId;
    const entries = [...state.entries];
    const [moved] = entries.splice(from, 1);
    entries.splice(to, 0, moved);

    return {
        ...state,
        entries,
        currentIndex: entries.findIndex((entry) => entry.entryId === currentId),
        // A manual reorder becomes the order restored when shuffle is turned off.
        originalOrder: state.shuffle ? entries.map((entry) => entry.entryId) : null,
    };
}

export function adjacentEntryIndex(
    state: QueueState,
    direction: 'next' | 'previous',
    wrap: boolean,
): number | null {
    if (state.currentIndex === -1) return null;

    const index = state.currentIndex + (direction === 'next' ? 1 : -1);

    if (index >= 0 && index < state.entries.length) {
        return index;
    }

    if (!wrap) return null;
    return direction === 'next' ? 0 : state.entries.length - 1;
}

export function toggleShuffle(state: QueueState, random: () => number = Math.random): QueueState {
    if (state.entries.length === 0) return state;

    const currentEntryId = state.entries[state.currentIndex].entryId;

    if (state.shuffle) {
        const originalOrder = state.originalOrder;
        if (
            !originalOrder ||
            originalOrder.length !== state.entries.length ||
            new Set(originalOrder).size !== state.entries.length
        ) {
            throw new Error('Shuffled queue has an invalid original order.');
        }

        const entriesById = new Map(state.entries.map((entry) => [entry.entryId, entry]));
        const entries: QueueEntry[] = [];

        for (const entryId of originalOrder) {
            const entry = entriesById.get(entryId);
            if (!entry) {
                throw new Error('Original queue entry not found.');
            }
            entries.push(entry);
        }

        return {
            entries,
            currentIndex: entries.findIndex((entry) => entry.entryId === currentEntryId),
            shuffle: false,
            originalOrder: null,
        };
    }

    const originalOrder = state.entries.map((entry) => entry.entryId);
    const entries = [
        state.entries[state.currentIndex],
        ...state.entries.slice(0, state.currentIndex),
        ...state.entries.slice(state.currentIndex + 1),
    ];

    // Shuffle every other occurrence while keeping the current one first.
    for (let index = entries.length - 1; index > 1; index--) {
        const value = random();
        if (!Number.isFinite(value) || value < 0 || value >= 1) {
            throw new RangeError('Random value must be between 0 and 1.');
        }

        const swapIndex = 1 + Math.floor(value * index);
        [entries[index], entries[swapIndex]] = [entries[swapIndex], entries[index]];
    }

    return {
        ...state,
        entries,
        currentIndex: 0,
        shuffle: true,
        originalOrder,
    };
}

import { QueueSnapshot } from './queue-snapshot';
import { QueueState } from './queue.model';

export interface RestoredQueue {
    state: QueueState;
    missingCount: number;
    // True when the saved current entry was removed, so its saved position must not be applied.
    currentChanged: boolean;
}

export function resolveSnapshot(
    snapshot: QueueSnapshot,
    hasTrack: (trackId: string) => boolean,
): RestoredQueue {
    const entries = snapshot.entries.filter((entry) => hasTrack(entry.trackId));
    const keptIds = new Set(entries.map((entry) => entry.entryId));
    const missingCount = snapshot.entries.length - entries.length;

    if (entries.length === 0) {
        return {
            state: { entries: [], currentIndex: -1, shuffle: false, originalOrder: null },
            missingCount,
            currentChanged: snapshot.currentIndex >= 0,
        };
    }

    let currentIndex = -1;
    let currentChanged = false;

    if (snapshot.currentIndex >= 0) {
        const saved = snapshot.entries[snapshot.currentIndex];
        currentIndex = entries.findIndex((entry) => entry.entryId === saved.entryId);

        if (currentIndex === -1) {
            currentChanged = true;
            const following = snapshot.entries
                .slice(snapshot.currentIndex + 1)
                .find((entry) => keptIds.has(entry.entryId));
            const previous = snapshot.entries
                .slice(0, snapshot.currentIndex)
                .reverse()
                .find((entry) => keptIds.has(entry.entryId));
            const fallback = following ?? previous;

            currentIndex = entries.findIndex((entry) => entry.entryId === fallback?.entryId);
        }
    }

    return {
        state: {
            entries,
            currentIndex,
            shuffle: snapshot.shuffle,
            originalOrder: snapshot.originalOrder
                ? snapshot.originalOrder.filter((id) => keptIds.has(id))
                : null,
        },
        missingCount,
        currentChanged,
    };
}

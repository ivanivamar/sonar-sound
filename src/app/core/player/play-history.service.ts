import { Service, signal } from '@angular/core';

export interface PlayHistoryEntry {
    readonly trackId: string;
    readonly playedAt: number;
}

@Service()
export class PlayHistoryService {
    private readonly _plays = signal<readonly PlayHistoryEntry[]>([]);
    readonly plays = this._plays.asReadonly();

    record(trackId: string, playedAt: number): void {
        this._plays.update((plays) => [...plays, { trackId, playedAt }]);
    }

    clear(): void {
        this._plays.set([]);
    }
}

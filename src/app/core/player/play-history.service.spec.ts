import { TestBed } from '@angular/core/testing';
import { PlayHistoryService } from './play-history.service';

describe('PlayHistoryService', () => {
    it('keeps each recorded play in order', () => {
        const history = TestBed.inject(PlayHistoryService);

        history.record('track-a', 1000);
        history.record('track-a', 2000);
        history.record('track-b', 3000);

        expect(history.plays()).toEqual([
            { trackId: 'track-a', playedAt: 1000 },
            { trackId: 'track-a', playedAt: 2000 },
            { trackId: 'track-b', playedAt: 3000 },
        ]);
    });
});

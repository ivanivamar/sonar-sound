import { TestBed } from '@angular/core/testing';
import { PlayTrackingService } from './play-tracking.service';
import { PlayHistoryService } from './play-history.service';

describe('PlayTrackingService', () => {
    it('records once per playback and starts fresh for the next one', () => {
        const tracking = TestBed.inject(PlayTrackingService);
        const history = TestBed.inject(PlayHistoryService);

        tracking.start('track-a', 1000, 120);
        tracking.addHeard(10);
        expect(history.plays()).toEqual([]);

        tracking.addHeard(20);
        tracking.addHeard(30);
        expect(history.plays()).toEqual([{ trackId: 'track-a', playedAt: 1000 }]);

        tracking.start('track-a', 2000, 40);
        tracking.addHeard(20);
        expect(history.plays()).toEqual([
            { trackId: 'track-a', playedAt: 1000 },
            { trackId: 'track-a', playedAt: 2000 },
        ]);
    });

    it('records if a newly known duration lowers the threshold', () => {
        const tracking = TestBed.inject(PlayTrackingService);
        const history = TestBed.inject(PlayHistoryService);

        tracking.start('track-a', 1000, NaN);
        tracking.addHeard(20);
        tracking.setDuration(40);

        expect(history.plays()).toEqual([{ trackId: 'track-a', playedAt: 1000 }]);
    });

    it('accumulates playback across a pause without counting the gap', () => {
        const tracking = TestBed.inject(PlayTrackingService);
        const history = TestBed.inject(PlayHistoryService);

        tracking.start('track-a', 1000, 120);
        tracking.resumeProgress(0, 1000, 1);
        tracking.sampleProgress(10, 11000, 1);

        tracking.stopProgress();
        tracking.sampleProgress(10, 71000, 1);

        tracking.resumeProgress(10, 71000, 1);
        tracking.sampleProgress(30, 91000, 1);

        expect(history.plays()).toEqual([{ trackId: 'track-a', playedAt: 1000 }]);
    });
});

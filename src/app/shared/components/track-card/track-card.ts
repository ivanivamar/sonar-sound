import { Component, input } from '@angular/core';
import { DurationPipe } from '../../pipes/duration-pipe';
import { TrackRow } from '../../../core/library/library-file.model';
import { Cover } from '../cover/cover';
import { RouterLink } from '@angular/router';

@Component({
    imports: [DurationPipe, Cover, RouterLink],
    selector: 'app-track-card',
    styleUrl: './track-card.scss',
    templateUrl: './track-card.html',
})
export class TrackCard {
    track = input.required<TrackRow>();
}

import { Component, input } from '@angular/core';
import { DurationPipe } from '../../pipes/duration-pipe';
import { TrackFile } from '../../../core/library/library-file.model';

@Component({
    imports: [DurationPipe],
    selector: 'app-track-card',
    styleUrl: './track-card.scss',
    templateUrl: './track-card.html',
})
export class TrackCard {
    track = input.required<TrackFile>();
}

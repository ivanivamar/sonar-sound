import { Component, computed, inject, output } from '@angular/core';
import { PlayerService } from '../../../core/player/player.service';
import { Cover } from '../cover/cover';
import { RouterLink } from '@angular/router';
import { Slider } from './slider/slider';
import { DurationPipe } from '../../pipes/duration-pipe';
import { NowPlaying } from '../now-playing/now-playing';
import { PlaybackControls } from '../playback-controls/playback-controls';

@Component({
    imports: [Cover, RouterLink, Slider, DurationPipe, NowPlaying, PlaybackControls],
    selector: 'app-player',
    styleUrl: './player.scss',
    templateUrl: './player.html',
})
export class Player {
    private readonly playerService = inject(PlayerService);
    toggleNowPlaying = output<void>();

    readonly currentTrack = computed(() => this.playerService.currentTrack());
    readonly position = computed(() => this.playerService.position());
    readonly duration = computed(() => this.playerService.duration());
    readonly error = computed(() => this.playerService.error());
    readonly coverColor = computed(() => this.playerService.coverColor());
    readonly cover = computed(() => this.playerService.cover());

    seek(position: number) {
        this.playerService.seek(position);
    }

    onToggleNowPlaying() {
        this.toggleNowPlaying.emit();
    }
}

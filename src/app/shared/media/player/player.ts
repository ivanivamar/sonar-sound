import { Component, computed, inject } from '@angular/core';
import { PlayerService } from '../../../core/player/player.service';
import { Cover } from '../cover/cover';
import { RouterLink } from '@angular/router';
import { Ripple } from '../../directives/ripple';
import { Slider } from './slider/slider';
import { DurationPipe } from '../../pipes/duration-pipe';

@Component({
    imports: [Cover, RouterLink, Ripple, Slider, DurationPipe],
    selector: 'app-player',
    styleUrl: './player.scss',
    templateUrl: './player.html',
})
export class Player {
    private readonly playerService = inject(PlayerService);

    readonly currentTrack = computed(() => this.playerService.currentTrack());
    readonly isPlaying = computed(() => this.playerService.isPlaying());
    readonly isBuffering = computed(() => this.playerService.isBuffering());
    readonly position = computed(() => this.playerService.position());
    readonly duration = computed(() => this.playerService.duration());
    readonly error = computed(() => this.playerService.error());
    readonly coverColor = computed(() => this.playerService.coverColor());
    readonly cover = computed(() => this.playerService.cover());

    toggleTrack() {
        this.playerService.toggle();
    }

    seek(position: number) {
        this.playerService.seek(position);
    }
}

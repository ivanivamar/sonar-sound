import { Component, computed, inject, output, viewChild } from '@angular/core';
import { PlayerService } from '../../../core/player/player.service';
import { Cover } from '../cover/cover';
import { RouterLink } from '@angular/router';
import { Slider } from './slider/slider';
import { DurationPipe } from '../../pipes/duration-pipe';
import { NowPlaying } from '../now-playing/now-playing';
import { PlaybackControls } from '../playback-controls/playback-controls';
import { Ripple } from '../../directives/ripple';

@Component({
    imports: [Cover, RouterLink, Slider, DurationPipe, NowPlaying, PlaybackControls, Ripple],
    selector: 'app-player',
    styleUrl: './player.scss',
    templateUrl: './player.html',
    host: {
        '(document:keydown.space)': 'onSpaceKeydown($event)',
    },
})
export class Player {
    private readonly playerService = inject(PlayerService);
    toggleNowPlaying = output<void>();
    private readonly nowPlaying = viewChild.required(NowPlaying);

    readonly currentTrack = computed(() => this.playerService.currentTrack());
    readonly position = computed(() => this.playerService.position());
    readonly duration = computed(() => this.playerService.duration());
    readonly error = computed(() => this.playerService.error());
    readonly coverColor = computed(() => this.playerService.coverColor());
    readonly cover = computed(() => this.playerService.cover());

    seek(position: number) {
        this.playerService.seek(position);
    }

    onSpaceKeydown(event: Event): void {
        if (!(event instanceof KeyboardEvent) || event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey ||
            event.metaKey || event.shiftKey) return;

        const target = event.target;
        if (target instanceof Element &&
            target.closest('button, a, input, select, textarea, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="slider"], [role="tab"], [role="checkbox"], [role="switch"], [role="radio"], [role="option"], [role^="menuitem"]')) {
            return;
        }

        event.preventDefault();
        this.playerService.toggle();
    }

    onFooterClick(event: MouseEvent): void {
        const target = event.target;
        if (target instanceof Element &&
            target.closest('button, a, input, select, textarea, [role="slider"]')) {
            return;
        }
        this.nowPlaying().toggle();
    }

    onFooterKeydown(event: KeyboardEvent): void {
        if (event.target !== event.currentTarget ||
            event.key !== 'Enter') return;

        event.preventDefault();
        this.nowPlaying().toggle();
    }
}

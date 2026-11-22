import {
    afterNextRender,
    Component,
    computed,
    ElementRef,
    inject,
    Injector,
    signal,
    viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PlayerService } from '../../../core/player/player.service';
import { ViewportService } from '../../../core/viewport/viewport.service';
import { Atmosphere } from '../../../layout/atmosphere/atmosphere';
import { Cover } from '../cover/cover';
import { TabItem, Tabs } from '../../ui/tabs/tabs';
import { Ripple } from '../../directives/ripple';
import { Slider } from '../player/slider/slider';
import { DurationPipe } from '../../pipes/duration-pipe';
import { PlaybackControls } from '../playback-controls/playback-controls';

const TABS: TabItem[] = [
    { title: 'Queue', id: 'queue' },
    { title: 'Lyrics', id: 'lyrics' },
];

@Component({
    imports: [Atmosphere, Cover, Tabs, Ripple, Slider, DurationPipe, RouterLink, PlaybackControls],
    selector: 'app-now-playing',
    styleUrl: './now-playing.scss',
    templateUrl: './now-playing.html',
    host: {
        '(document:keydown.escape)': 'close()',
    },
})
export class NowPlaying {
    protected readonly playerService = inject(PlayerService);
    protected readonly viewport = inject(ViewportService);
    private readonly document = inject(DOCUMENT);
    private readonly injector = inject(Injector);
    private readonly dialog = viewChild.required<ElementRef<HTMLElement>>('dialog');
    private returnFocusTo: HTMLElement | null = null;

    readonly isOpen = signal(false);
    protected readonly tabs = TABS;
    protected readonly shortcutIcons: Record<string, string> = {
        queue: 'queue_music',
        lyrics: 'lyrics',
    };
    protected readonly currentTab = signal('queue');
    protected readonly remaining = computed(() =>
        Math.max(this.playerService.duration() - this.playerService.position(), 0),
    );

    protected seek(position: number): void {
        this.playerService.seek(position);
    }

    toggle(): void {
        if (this.isOpen()) {
            this.close();
        } else {
            this.open();
        }
    }

    open(): void {
        if (!this.playerService.currentTrack() || this.isOpen()) return;
        this.returnFocusTo = this.document.activeElement as HTMLElement | null;
        this.isOpen.set(true);
        afterNextRender(() => {
            if (this.isOpen()) this.dialog().nativeElement.focus();
        }, {
            injector: this.injector,
        });
    }

    close(): void {
        if (!this.isOpen()) return;
        this.isOpen.set(false);
        this.returnFocusTo?.focus();
        this.returnFocusTo = null;
    }
}

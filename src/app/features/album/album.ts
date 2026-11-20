import { Component, computed, inject, input } from '@angular/core';
import { Location } from '@angular/common';
import { LibraryService } from '../../core/library/library.service';
import { Router } from '@angular/router';
import { AlbumFile, TrackFile } from '../../core/library/library-file.model';
import { TrackCard } from '../../shared/media/track-card/track-card';
import { Cover } from '../../shared/media/cover/cover';
import { rxResource } from '@angular/core/rxjs-interop';
import { atmosphere } from '../../layout/atmosphere/atmosphere.service';
import { CoverColorService } from '../../core/cover/cover-color.service';

export interface DiscGroup {
    disc: number;
    tracks: TrackFile[];
}

@Component({
    imports: [TrackCard, Cover],
    selector: 'app-album',
    styleUrl: './album.scss',
    templateUrl: './album.html',
})
export class Album {
    private readonly libraryService = inject(LibraryService);
    private readonly router = inject(Router);
    private readonly location = inject(Location);
    private readonly coverColorService = inject(CoverColorService);

    readonly id = input.required<string>();

    readonly album = computed<AlbumFile | undefined>(() => this.libraryService.getAlbumById(this.id()));
    readonly tracks = computed<TrackFile[]>(() => this.libraryService.getAlbumTracks(this.id()));
    readonly discGroups = computed<DiscGroup[]>(() => {
        const map = new Map<number, TrackFile[]>();
        for (const track of this.tracks()) {
            if (!map.has(track.disc)) {
                map.set(track.disc, []);
            }
            map.get(track.disc)?.push(track);
        }
        return Array.from(map.entries()).map(([disc, tracks]) => ({ disc, tracks }));
    });

    private readonly coverColor = rxResource({
        params: () => this.album()?.cover ?? undefined,
        stream: ({ params }) => this.coverColorService.getColor(params),
    });

    constructor() {
        atmosphere(() => {
            const color = this.coverColor.hasValue() ? this.coverColor.value() : null;
            return {
                x: '18%',
                y: '22%',
                hue: color ? String(color.hue) : null,       // null until read: the playing cover's colour
                chroma: color ? String(color.chroma) : null,
            };
        });
    }

    goBack() {
        const state = this.location.getState() as { navigationId?: number } | null;
        if ((state?.navigationId ?? 1) > 1) {
            this.location.back();                       // we came from somewhere in the app
        } else {
            this.router.navigate(['/library']);         // opened directly: go to the library
        }
    }
}

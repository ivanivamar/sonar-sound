import { Component, computed, inject, input } from '@angular/core';
import { LibraryService } from '../../core/library/library.service';
import { RouterLink } from '@angular/router';
import { AlbumFile, TrackFile } from '../../core/library/library-file.model';
import { TrackCard } from '../../shared/media/track-card/track-card';
import { Cover } from '../../shared/media/cover/cover';
import { rxResource } from '@angular/core/rxjs-interop';
import { atmosphere } from '../../layout/atmosphere/atmosphere.service';
import { CoverColorService } from '../../core/cover/cover-color.service';
import { Crumbs } from '../../shared/ui/crumbs/crumbs';
import { CoverService } from '../../core/cover/cover.service';

export interface DiscGroup {
    disc: number;
    tracks: TrackFile[];
}

@Component({
    imports: [TrackCard, Cover, Crumbs, RouterLink],
    selector: 'app-album',
    styleUrl: './album.scss',
    templateUrl: './album.html',
})
export class Album {
    private readonly libraryService = inject(LibraryService);
    private readonly coverColorService = inject(CoverColorService);
    private readonly coverService = inject(CoverService);

    readonly id = input.required<string>();
    readonly crumbs = computed(() => [
        { label: 'Library', url: '/library' },
        { label: 'Albums', url: '/library/albums' },
    ]);

    readonly album = computed<AlbumFile | undefined>(() => this.libraryService.getAlbumById(this.id()));
    readonly artist = computed(() => {
        const artistId = this.album()?.artistId;
        return artistId ? this.libraryService.getArtistById(artistId) : undefined;
    });
    readonly tracks = computed<TrackFile[]>(() => this.libraryService.getAlbumTracks(this.id()));

    private readonly coverColor = rxResource({
        params: () => this.album()?.cover ?? undefined,
        stream: ({ params }) => this.coverColorService.getColor(params),
    });
    protected readonly coverResource = rxResource({
        params: () => this.album()?.cover ?? undefined,
        stream: ({ params }) => this.coverService.getUrl(params),
    });

    protected readonly artistCoverResource = rxResource({
        params: () => this.artist()?.image?.id ?? undefined,
        stream: ({ params }) => this.coverService.getUrl(params),
    });

    constructor() {
        atmosphere(() => {
            const color = this.coverColor.hasValue() ? this.coverColor.value() : null;
            console.log('Cover color:', color);
            return {
                x: '15%',
                y: '35%',
                hue: color ? String(color.hue) : null,       // null until read: the playing cover's colour
                chroma: color ? String(color.chroma) : null,
            };
        });
    }
}

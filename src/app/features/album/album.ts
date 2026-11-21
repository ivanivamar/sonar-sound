import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { LibraryService } from '../../core/library/library.service';
import { RouterLink } from '@angular/router';
import { AlbumFile, TrackFile, TrackRow } from '../../core/library/library-file.model';
import { TrackCard } from '../../shared/media/track-card/track-card';
import { Cover } from '../../shared/media/cover/cover';
import { rxResource } from '@angular/core/rxjs-interop';
import { atmosphere } from '../../layout/atmosphere/atmosphere.service';
import { CoverColor } from '../../core/cover/cover-color';
import { Crumbs } from '../../shared/ui/crumbs/crumbs';
import { CoverService } from '../../core/cover/cover.service';
import { artistCoverId } from '../../core/cover/cover-id';
import { DurationPipe } from '../../shared/pipes/duration-pipe';

export interface DiscGroup {
    disc: number;
    tracks: TrackFile[];
}

@Component({
    imports: [TrackCard, Cover, Crumbs, RouterLink, DurationPipe],
    selector: 'app-album',
    styleUrl: './album.scss',
    templateUrl: './album.html',
})
export class Album {
    private readonly libraryService = inject(LibraryService);
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

    protected readonly extractedColor = signal<CoverColor | null>(null);
    // The library's precomputed colour wins; otherwise the cover is sampled.
    protected readonly coverColor = computed(() => this.album()?.coverColor ?? this.extractedColor());

    protected readonly artistCoverResource = rxResource({
        params: () => artistCoverId(this.artist()) ?? undefined,
        stream: ({ params }) => this.coverService.getUrl(params),
    });
    protected readonly artistCoverUrl = computed(() =>
        this.artistCoverResource.hasValue() ? this.artistCoverResource.value() : null,
    );
    readonly tracks = computed<TrackRow[]>(() => {
        const albumTracks: TrackRow[] = this.libraryService.getAlbumTracks(this.id());
        return albumTracks.map(track => ({
            ...track,
            albumTitle: this.album()?.title ?? '',
        }));
    });
    readonly totalDuration = computed(() => {
        const tracks = this.tracks();
        if (!tracks.length || tracks.length !== this.album()?.trackCount) {
            return null;
        }

        let total = 0;
        for (const track of tracks) {
            if (typeof track.duration !== 'number' || !Number.isFinite(track.duration) || track.duration < 0) {
                return null;
            }
            total += track.duration;
        }
        return total;
    });

    constructor() {
        atmosphere(() => {
            const color = this.coverColor();
            return {
                x: '15%',
                y: '35%',
                hue: color ? String(color.hue) : null,       // null until read: the playing cover's colour
                chroma: color ? String(color.chroma) : null,
            };
        });
    }
}

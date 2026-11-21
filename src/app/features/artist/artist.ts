import { Component, computed, inject, input } from '@angular/core';
import { CoverColorService } from '../../core/cover/cover-color.service';
import { Router } from '@angular/router';
import { LibraryService } from '../../core/library/library.service';
import { AlbumFile, ArtistFile, TrackFile } from '../../core/library/library-file.model';
import { Cover } from '../../shared/media/cover/cover';
import { CoverService } from '../../core/cover/cover.service';
import { artistCoverId } from '../../core/cover/cover-id';
import { rxResource } from '@angular/core/rxjs-interop';
import { Crumbs } from '../../shared/ui/crumbs/crumbs';
import { DurationPipe } from '../../shared/pipes/duration-pipe';
import { AlbumCard } from '../../shared/media/album-card/album-card';
import { TopbarLeft } from '../../layout/topbar/topbar-left';
import { glowColor } from '../../core/cover/cover-color';

@Component({
    imports: [Cover, Crumbs, DurationPipe, AlbumCard, TopbarLeft],
    selector: 'app-artist',
    styleUrl: './artist.scss',
    templateUrl: './artist.html',
})
export class Artist {
    private readonly libraryService = inject(LibraryService);
    private readonly coverService = inject(CoverService);
    private readonly coverColorService = inject(CoverColorService);
    private readonly router = inject(Router);

    readonly id = input.required<string>();
    readonly crumbs = computed(() => [
        { label: 'Library', url: '/library' },
        { label: 'Artists', url: '/library/artists' },
    ]);

    readonly artist = computed<ArtistFile | undefined>(() => this.libraryService.getArtistById(this.id()));
    readonly albums = computed<AlbumFile[]>(() => this.libraryService.getArtistAlbums(this.id()));
    readonly albumGroups = computed<AlbumTypeGroup[]>(() => {
        const groups: Record<string, AlbumFile[]> = {};
        // if album has 1 track is Single, otherwise use Album
        for (const album of this.albums()) {
            const type = album.trackCount > 1 ? 'Album' : 'Single';
            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type].push(album);
        }
        return ['Album', 'Single']
            .filter(type => groups[type]?.length)
            .map(type => ({ type, albums: groups[type] }));
    });
    readonly tracks = computed<TrackFile[]>(() => this.libraryService.getArtistTracks(this.id()));
    readonly totalDuration = computed(() => this.tracks().reduce((sum, track) => sum + (track.duration ?? 0), 0));

    protected readonly coverId = computed(() => artistCoverId(this.artist()));
    protected readonly coverResource = rxResource({
        params: () => this.coverId() ?? undefined,
        stream: ({ params }) => this.coverService.getUrl(params),
    });
    protected readonly colorResource = rxResource({
        params: () => this.coverId() ?? undefined,
        stream: ({ params }) => this.coverColorService.getColor(params),
    });
    protected readonly coverColor = computed(() =>
        this.colorResource.hasValue() ? this.colorResource.value() : null,
    );

    protected readonly coverUrl = computed(() =>
        this.coverResource.hasValue() ? this.coverResource.value() : null,
    );

    goToAlbum(albumId: string) {
        this.router.navigate(['/library/album', albumId]);
    }

}

export interface AlbumTypeGroup {
    type: string;
    albums: AlbumFile[];
}

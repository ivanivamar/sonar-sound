import { Component, computed, inject, input } from '@angular/core';
import { LibraryService } from '../../core/library/library.service';
import { Router } from '@angular/router';
import { AlbumFile, TrackFile } from '../../core/library/library-file.model';
import { TrackCard } from '../../shared/components/track-card/track-card';
import { Cover } from '../../shared/components/cover/cover';

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

    goBack() {
        this.router.navigate(['/library']);
    }
}

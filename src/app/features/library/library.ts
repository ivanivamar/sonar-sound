import { Component, computed, inject, input } from '@angular/core';
import { normalizeForSearch } from '../../shared/functions/texts';
import { LibraryService } from '../../core/library/library.service';
import { AlbumCard } from '../../shared/components/album-card/album-card';
import { Router } from '@angular/router';
import { Search } from '../../shared/components/search/search';

@Component({
    imports: [AlbumCard, Search],
    selector: 'app-library',
    styleUrl: './library.scss',
    templateUrl: './library.html',
})
export class Library {
    libraryService = inject(LibraryService);
    router = inject(Router);

    readonly q = input('', { transform: (v: string | undefined) => v ?? '' });
    filteredAlbums = computed(() => {
        const filter = this.q();
        if (!filter) {
            return this.libraryService.albums();
        }

        // normalize the filter string for case-insensitive comparison and accent-insensitive comparison if needed
        const normalizedFilter = normalizeForSearch(filter);

        // filter by album title, artist, or other criteria if needed
        return this.libraryService.albums().filter(album =>
            normalizeForSearch(album.title).includes(normalizedFilter) ||
            normalizeForSearch(album.artist).includes(normalizedFilter)
        );
    });

    onSearch(value: string) {
        this.router.navigate([], {
            queryParams: { q: value || null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    goToAlbum(albumId: string) {
        this.router.navigate(['/library/album', albumId]);
    }
}

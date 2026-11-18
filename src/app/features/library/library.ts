import { Component, computed, inject, input } from '@angular/core';
import { DriveService } from '../../core/drive/drive.service';
import { AuthService } from '../../core/auth/auth.service';
import { normalizeForSearch } from '../../shared/functions/texts';
import { LibraryService } from '../../core/library/library.service';
import { AlbumCard } from '../../shared/components/album-card/album-card';
import { Router } from '@angular/router';
import { Search } from '../../shared/components/search/search';
import { LibraryFile } from '../../core/library/library-file.model';

@Component({
    imports: [AlbumCard, Search],
    selector: 'app-library',
    styleUrl: './library.scss',
    templateUrl: './library.html',
})
export class Library {
    libraryService = inject(LibraryService);
    driveService = inject(DriveService);
    authService = inject(AuthService);
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

    getDriveFiles() {
        this.driveService.getFiles().subscribe(files => {
            console.log(files);
        });
    }

    getDriveFile(name = 'library.json') {
        this.driveService.findFile(name).subscribe(file => {
            if (file) {
                this.driveService.downloadJson<LibraryFile>(file.id).subscribe(libraryJson => {
                    // album count
                    console.log(Object.keys(libraryJson.albums).length);
                });
            }
        });
    }

    goToAlbum(albumId: string) {
        this.router.navigate(['/library/album', albumId]);
    }

    onLogout() {
        this.authService.signOut();
        this.router.navigate(['/auth']);
    }
}

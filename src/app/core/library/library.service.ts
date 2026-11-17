import { httpResource } from '@angular/common/http';
import { computed, Service } from '@angular/core';
import { LibraryFile } from './library-file.model';

@Service()
export class LibraryService {
    private readonly libraryFile = httpResource<LibraryFile>(() => `/library.json`);

    readonly isLoading = this.libraryFile.isLoading;
    readonly error = this.libraryFile.error;

    // Computed properties to access albums and tracks by their IDs
    private readonly albumsById = computed(() => this.libraryFile.value()?.albums ?? {});
    private readonly tracksById = computed(() => this.libraryFile.value()?.tracks ?? {});

    // Computed properties to get arrays of albums and tracks
    readonly albums = computed(() => Object.values(this.albumsById()));
    readonly tracks = computed(() => Object.values(this.tracksById()));

    /**
     * Get an album by its ID
     * @param albumId 
     * @returns The album object if found, otherwise undefined
     */
    getAlbumById(albumId: string) {
        return this.albumsById()[albumId];
    }

    /**
     * Get tracks for a specific album by its ID
     * @param albumId 
     * @returns An array of tracks belonging to the specified album
     */
    getAlbumTracks(albumId: string) {
        const album = this.getAlbumById(albumId);
        if (!album) {
            return [];
        }
        return Object.values(this.tracksById()).filter((track) => track.albumId === albumId);
    }
}

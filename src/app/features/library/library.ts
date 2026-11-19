import { Component, computed, inject, signal } from '@angular/core';
import { DriveService } from '../../core/drive/drive.service';
import { AuthService } from '../../core/auth/auth.service';
import { LibraryService } from '../../core/library/library.service';
import { Router } from '@angular/router';
import { TopbarLeft } from '../../shared/components/topbar/topbar-left';
import { TabItem, Tabs } from '../../shared/components/tabs/tabs';
import { Albums } from './albums/albums';
import { Artists } from './artists/artists';

@Component({
    imports: [TopbarLeft, Tabs, Albums, Artists],
    selector: 'app-library',
    styleUrl: './library.scss',
    templateUrl: './library.html',
})
export class Library {
    libraryService = inject(LibraryService);
    driveService = inject(DriveService);
    authService = inject(AuthService);
    router = inject(Router);

    tabs = computed<TabItem[]>(() => [
        {
            title: 'All',
            hint: this.libraryService.allCount().toString()
        },
        {
            title: 'Albums',
            hint: this.libraryService.albums().length.toString()
        },
        {
            title: 'Artists',
            hint: this.libraryService.artists().length.toString()
        },
        {
            title: 'Tracks',
            hint: this.libraryService.tracks().length.toString()
        }
    ]);
    currentTab = signal<string>('All');

    goToAlbum(albumId: string) {
        this.router.navigate(['/library/album', albumId]);
    }

    goToArtist(artistId: string) {
        this.router.navigate(['/library/artist', artistId]);
    }
}

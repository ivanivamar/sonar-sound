import { Component, computed, inject, signal } from '@angular/core';
import { DriveService } from '../../core/drive/drive.service';
import { AuthService } from '../../core/auth/auth.service';
import { LibraryService } from '../../core/library/library.service';
import { ActivatedRoute, Router } from '@angular/router';
import { TopbarLeft } from '../../shared/components/topbar/topbar-left';
import { TabItem, Tabs } from '../../shared/components/tabs/tabs';
import { Albums } from './albums/albums';
import { Artists } from './artists/artists';
import { toSignal } from '@angular/core/rxjs-interop';
import { Tracks } from './tracks/tracks';

@Component({
    imports: [TopbarLeft, Tabs, Albums, Artists, Tracks],
    selector: 'app-library',
    styleUrl: './library.scss',
    templateUrl: './library.html',
})
export class Library {
    libraryService = inject(LibraryService);
    driveService = inject(DriveService);
    authService = inject(AuthService);
    router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly routeData = toSignal(this.route.data, {
        initialValue: this.route.snapshot.data,
    });

    tabs = computed<TabItem[]>(() => [
        {
            id: 'all',
            title: 'All',
            hint: this.libraryService.allCount().toString()
        },
        {
            id: 'albums',
            title: 'Albums',
            hint: this.libraryService.albums().length.toString()
        },
        {
            id: 'artists',
            title: 'Artists',
            hint: this.libraryService.artists().length.toString()
        },
        {
            id: 'tracks',
            title: 'Tracks',
            hint: this.libraryService.tracks().length.toString()
        }
    ]);
    readonly currentTab = computed(() => {
        const tab = this.routeData()['tab'];
        if (typeof tab !== 'string') {
            return 'all';
        }
        return tab;
    });

    selectTab(tab: string) {
        const url = tab === 'all' ? '/library' : `/library/${tab.toLowerCase()}`;
        this.router.navigateByUrl(url);
    }

    goToAlbum(albumId: string) {
        this.router.navigate(['/library/album', albumId]);
    }

    goToArtist(artistId: string) {
        this.router.navigate(['/library/artist', artistId]);
    }
}

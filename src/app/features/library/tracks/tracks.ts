import { Component, computed, input, output, signal } from '@angular/core';
import { TrackRow } from '../../../core/library/library-file.model';
import { TrackCard } from '../../../shared/components/track-card/track-card';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { TabItem, Tabs } from '../../../shared/components/tabs/tabs';
import { Search } from '../../../shared/components/search/search';

@Component({
    imports: [TrackCard, ScrollingModule, Tabs, Search],
    selector: 'app-tracks',
    styleUrl: './tracks.scss',
    templateUrl: './tracks.html',
})
export class Tracks {
    readonly tracks = input.required<TrackRow[]>();
    trackClick = output<string>();

    readonly tabs: TabItem[] = [
        { id: 'az', title: 'A-Z' },
        { id: 'recently-added', title: 'Recently Added' }
    ];
    protected selectedTab = signal(this.tabs[1].id);
    private readonly searchFilter = signal('');
    protected readonly trackById = (_index: number, track: TrackRow) => track.id;

    readonly filteredTracks = computed(() => {
        const search = this.searchFilter().toLowerCase();
        const tracks = this.filterTracksBySearch(search);
        const selectedTab = this.selectedTab();

        switch (selectedTab) {
            case 'az':
                return [...tracks].sort((a, b) => a.title.localeCompare(b.title));
            case 'recently-added':
                return [...tracks].sort((a, b) => b.addedAt.localeCompare(a.addedAt) || a.disc - b.disc || (a.track ?? 0) - (b.track ?? 0));
            default:
                return tracks;
        }
    });

    filterTracksBySearch(searchFilter: string) {
        // filter tracks by title, artist, without accents and lowercase
        const normalize = (value: string) => value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
        const search = normalize(searchFilter);

        return this.tracks().filter(track => {
            const title = normalize(track.title);
            const artist = normalize(track.artist);
            const album = normalize(track.albumTitle ?? '');
            return title.includes(search) || artist.includes(search) || album.includes(search);
        });
    }

    searchTracks(searchFilter: string) {
        this.searchFilter.set(searchFilter);
    }

    filterTracks(tab: string) {
        this.selectedTab.set(tab);
    }
}

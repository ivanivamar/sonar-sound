import { Component, input, output } from '@angular/core';
import { Ripple } from '../../directives/ripple';

@Component({
    imports: [Ripple],
    selector: 'app-tabs',
    styleUrl: './tabs.scss',
    templateUrl: './tabs.html',
})
export class Tabs {
    readonly tabs = input<TabItem[]>();
    readonly currentTab = input<string>();
    readonly currentTabChange = output<string>();

    onTabClick(tab: TabItem) {
        this.currentTabChange.emit(tab.id);
    }
}

export interface TabItem {
    id: string;
    icon?: string;
    title: string;
    hint?: string;
}
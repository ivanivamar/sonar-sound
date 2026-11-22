import { Component, signal, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ClickOutside } from '../../shared/directives/click-outside';
import { Ripple } from '../../shared/directives/ripple';
import { AccountPopup } from './account-popup/account-popup';
import { UserService } from '../../core/user/user.service';
import { ViewportService } from '../../core/viewport/viewport.service';

@Component({
    imports: [RouterLink, RouterLinkActive, ClickOutside, Ripple, AccountPopup],
    selector: 'app-sidebar',
    styleUrl: './sidebar.scss',
    templateUrl: './sidebar.html',
})
export class Sidebar {
    private readonly userService = inject(UserService);
    isAccountPopupVisible = signal(false);
    private readonly isPhoneSize = inject(ViewportService).isPhone;

    private readonly desktopOnlyNavItems: SidebarNavItem[] = [
        {
            icon: 'home',
            label: 'Home',
            href: '/home'
        },
        {
            icon: 'library_music',
            label: 'Library',
            href: '/library'
        },
        {
            icon: 'explore',
            label: 'Releases',
            href: '/releases'
        }
    ];

    readonly navItems = computed<SidebarNavItem[]>(() => {
        const isPhone = this.isPhoneSize();
        if (isPhone) {
            return this.desktopOnlyNavItems;
        }
        return [...this.desktopOnlyNavItems, {
            icon: 'local_activity',
            label: 'Concerts',
            href: '/concerts'
        },
        {
            icon: 'upload',
            label: 'Upload',
            href: '/upload'
        },
        {
            icon: 'download',
            label: 'Download',
            href: '/download'
        }
        ];
    });

    toggleAccountPopup(): void {
        this.isAccountPopupVisible.update((isVisible) => !isVisible);
    }

    closeAccountPopup(): void {
        this.isAccountPopupVisible.set(false);
    }
}

export interface SidebarNavItem {
    icon: string;
    label: string;
    href: string;
}

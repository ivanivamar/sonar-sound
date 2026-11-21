import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from '../../app';
import { AuthService } from '../../core/auth/auth.service';
import { Atmosphere } from '../atmosphere/atmosphere';
import { Sidebar } from '../sidebar/sidebar';
import { Player } from '../../shared/media/player/player';
import { Topbar } from './topbar';
import { TopbarLeft } from './topbar-left';

@Component({
    imports: [Topbar, TopbarLeft],
    template: `
        <app-topbar />
        @if (showFirst()) {
            <ng-template appTopbarLeft>
                <button type="button" (click)="clicks = clicks + 1">{{ label() }}</button>
            </ng-template>
        }
        @if (showSecond()) {
            <ng-template appTopbarLeft><span>Second</span></ng-template>
        }
    `,
})
class TestHost {
    readonly showFirst = signal(true);
    readonly showSecond = signal(false);
    readonly label = signal('First');
    clicks = 0;
}

@Component({
    imports: [TopbarLeft],
    selector: 'app-test-page',
    template: '<ng-template appTopbarLeft><span>{{ title }}</span></ng-template>',
})
class TestPage {
    title = 'Page content';
}

@Component({
    imports: [Topbar, TestPage],
    template: '<app-topbar /> @if (showPage()) { <app-test-page /> }',
})
class PageHost {
    readonly showPage = signal(true);
}

@Component({
    imports: [Topbar, TopbarLeft],
    template: `
        <app-topbar [scrolled]="scrolled()" />
        <ng-template appTopbarLeft><span>Default</span></ng-template>
        @if (showScrolled()) {
            <ng-template appTopbarLeft topbarWhen="scrolled">
                <button type="button" (click)="clicks = clicks + 1">{{ label() }}</button>
            </ng-template>
        }
    `,
})
class ScrolledHost {
    readonly scrolled = signal(false);
    readonly showScrolled = signal(true);
    readonly label = signal('Artist');
    clicks = 0;
}

@Component({ selector: 'app-sidebar', template: '' })
class StubSidebar {}

@Component({ selector: 'app-atmosphere', template: '' })
class StubAtmosphere {}

@Component({ selector: 'app-player', template: '' })
class StubPlayer {}

describe('Topbar', () => {
    let component: Topbar;
    let fixture: ComponentFixture<Topbar>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Topbar],
            providers: [provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(Topbar);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

describe('Topbar left content', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
    });

    it("renders the declaring component's bindings and handles its events", async () => {
        const fixture = TestBed.createComponent(TestHost);
        fixture.detectChanges();
        await fixture.whenStable();

        const topbar = fixture.nativeElement.querySelector('header') as HTMLElement;
        const button = topbar.querySelector('button');
        expect(button?.textContent).toBe('First');
        expect(topbar.lastElementChild?.tagName).toBe('APP-SEARCH');

        button?.click();
        expect(fixture.componentInstance.clicks).toBe(1);
        fixture.componentInstance.label.set('Updated');
        await fixture.whenStable();
        expect(button?.textContent).toBe('Updated');
    });

    it('renders content from a sibling component and removes it when the component is destroyed', async () => {
        const fixture = TestBed.createComponent(PageHost);
        fixture.detectChanges();
        await fixture.whenStable();
        const topbar = fixture.nativeElement.querySelector('header') as HTMLElement;

        expect(topbar.querySelector('.topbar-left')?.textContent).toContain('Page content');
        fixture.componentInstance.showPage.set(false);
        await fixture.whenStable();
        expect(topbar.querySelector('.topbar-left')).toBeNull();
    });

    it('restores the previous template and removes content when its view is destroyed', async () => {
        const fixture = TestBed.createComponent(TestHost);
        fixture.detectChanges();
        await fixture.whenStable();
        const topbar = fixture.nativeElement.querySelector('header') as HTMLElement;

        fixture.componentInstance.showSecond.set(true);
        await fixture.whenStable();
        expect(topbar.querySelector('.topbar-left')?.textContent).toContain('Second');

        fixture.componentInstance.showSecond.set(false);
        await fixture.whenStable();
        expect(topbar.querySelector('button')?.textContent).toBe('First');

        fixture.componentInstance.showFirst.set(false);
        await fixture.whenStable();
        expect(topbar.querySelector('.topbar-left')).toBeNull();
        expect(topbar.querySelector('app-search')).not.toBeNull();
    });

    it('does not restore a template that was destroyed while another was active', async () => {
        const fixture = TestBed.createComponent(TestHost);
        fixture.detectChanges();
        await fixture.whenStable();
        const topbar = fixture.nativeElement.querySelector('header') as HTMLElement;

        fixture.componentInstance.showSecond.set(true);
        await fixture.whenStable();
        fixture.componentInstance.showFirst.set(false);
        await fixture.whenStable();
        expect(topbar.querySelector('.topbar-left')?.textContent).toContain('Second');

        fixture.componentInstance.showSecond.set(false);
        await fixture.whenStable();
        expect(topbar.querySelector('.topbar-left')).toBeNull();
    });

    it('shows scroll-specific content only while scrolled and restores the default', async () => {
        const fixture = TestBed.createComponent(ScrolledHost);
        fixture.detectChanges();
        await fixture.whenStable();
        const topbar = fixture.nativeElement.querySelector('header') as HTMLElement;

        expect(topbar.classList.contains('scrolled')).toBe(false);
        expect(topbar.querySelector('.topbar-left')?.textContent).toContain('Default');

        fixture.componentInstance.scrolled.set(true);
        await fixture.whenStable();
        expect(topbar.classList.contains('scrolled')).toBe(true);
        const button = topbar.querySelector('.topbar-left button') as HTMLButtonElement;
        expect(button.textContent).toBe('Artist');
        button.click();
        expect(fixture.componentInstance.clicks).toBe(1);
        fixture.componentInstance.label.set('Updated artist');
        await fixture.whenStable();
        expect(button.textContent).toBe('Updated artist');

        fixture.componentInstance.scrolled.set(false);
        await fixture.whenStable();
        expect(topbar.querySelector('.topbar-left')?.textContent).toContain('Default');
        expect(topbar.classList.contains('scrolled')).toBe(false);

        fixture.componentInstance.scrolled.set(true);
        fixture.componentInstance.showScrolled.set(false);
        await fixture.whenStable();
        expect(topbar.querySelector('.topbar-left')?.textContent).toContain('Default');
    });
});

describe('App topbar scroll state', () => {
    it('tracks the page scroll position and synchronizes it on route activation', async () => {
        TestBed.configureTestingModule({
            imports: [App],
            providers: [
                provideRouter([{ path: 'test', component: TestPage }]),
                { provide: AuthService, useValue: { isSignedIn: signal(true) } },
            ],
        }).overrideComponent(App, {
            remove: { imports: [Sidebar, Atmosphere, Player] },
            add: { imports: [StubSidebar, StubAtmosphere, StubPlayer] },
        });

        const fixture = TestBed.createComponent(App);
        fixture.detectChanges();
        await fixture.whenStable();
        const page = fixture.nativeElement.querySelector('.page-content') as HTMLElement;
        const topbar = fixture.nativeElement.querySelector('app-topbar header') as HTMLElement;

        page.scrollTop = 20;
        page.dispatchEvent(new Event('scroll'));
        await fixture.whenStable();
        expect(topbar.classList.contains('scrolled')).toBe(true);

        page.scrollTop = 0;
        await TestBed.inject(Router).navigateByUrl('/test');
        await fixture.whenStable();
        expect(topbar.classList.contains('scrolled')).toBe(false);
    });
});

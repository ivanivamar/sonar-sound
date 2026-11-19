import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
});

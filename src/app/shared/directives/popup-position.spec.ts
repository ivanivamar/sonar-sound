import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PopupPosition } from './popup-position';

@Component({
    imports: [PopupPosition],
    template: `
        <button #anchor>Anchor</button>
        <div
            [appPopupPosition]="anchor"
            [appPopupPositionOpen]="isOpen()"
        ></div>
    `,
})
class TestHost {
    isOpen = signal(true);
}

function bounds(left: number, top: number, width: number, height: number): DOMRect {
    return {
        bottom: top + height,
        height,
        left,
        right: left + width,
        top,
        width,
        x: left,
        y: top,
        toJSON: () => ({}),
    };
}

describe('PopupPosition', () => {
    it('positions above the anchor when there is more room above it', async () => {
        const fixture = TestBed.createComponent(TestHost);
        fixture.detectChanges();

        const anchor = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
        const popup = fixture.nativeElement.querySelector('div') as HTMLDivElement;
        const anchorTop = window.innerHeight - 80;
        vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(bounds(24, anchorTop, 40, 32));
        Object.defineProperties(popup, {
            offsetHeight: { configurable: true, value: 100 },
            offsetWidth: { configurable: true, value: 120 },
        });
        fixture.componentInstance.isOpen.set(false);
        fixture.detectChanges();
        fixture.componentInstance.isOpen.set(true);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(popup.style.top).toBe(`${anchorTop - 108}px`);
        expect(popup.style.left).toBe('24px');
        expect(popup.style.getPropertyValue('--mn-origin')).toBe('bottom left');
    });

    it('positions below the anchor when there is more room below it', async () => {
        const fixture = TestBed.createComponent(TestHost);
        fixture.detectChanges();

        const anchor = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
        const popup = fixture.nativeElement.querySelector('div') as HTMLDivElement;
        vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(bounds(24, 8, 40, 32));
        Object.defineProperties(popup, {
            offsetHeight: { configurable: true, value: 100 },
            offsetWidth: { configurable: true, value: 120 },
        });
        fixture.componentInstance.isOpen.set(false);
        fixture.detectChanges();
        fixture.componentInstance.isOpen.set(true);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(popup.style.top).toBe('48px');
        expect(popup.style.left).toBe('24px');
        expect(popup.style.getPropertyValue('--mn-origin')).toBe('top left');
    });
});

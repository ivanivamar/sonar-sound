import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ClickOutside } from './click-outside';

@Component({
    imports: [ClickOutside],
    template: '<div appClickOutside (clickOutside)="onOutsideClick()"><button>Inside</button></div>',
})
class TestHost {
    outsideClicks = 0;

    onOutsideClick(): void {
        this.outsideClicks++;
    }
}

describe('ClickOutside', () => {
    it('emits for outside clicks but not clicks inside its host', () => {
        const fixture = TestBed.createComponent(TestHost);
        fixture.detectChanges();

        fixture.nativeElement.querySelector('button').dispatchEvent(
            new MouseEvent('click', { bubbles: true }),
        );
        expect(fixture.componentInstance.outsideClicks).toBe(0);

        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(fixture.componentInstance.outsideClicks).toBe(1);
    });
});

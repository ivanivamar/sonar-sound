import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
    let component: Sidebar;
    let fixture: ComponentFixture<Sidebar>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Sidebar],
            providers: [provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(Sidebar);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should toggle the account popup and close it on outside clicks', () => {
        const accountButton = fixture.nativeElement.querySelector('.account-button') as HTMLButtonElement;
        const popup = fixture.nativeElement.querySelector('.popup') as HTMLElement;

        accountButton.click();
        fixture.detectChanges();
        expect(popup.classList).toContain('show');
        expect(accountButton.getAttribute('aria-expanded')).toBe('true');

        accountButton.click();
        fixture.detectChanges();
        expect(popup.classList).not.toContain('show');

        accountButton.click();
        fixture.detectChanges();
        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        fixture.detectChanges();
        expect(popup.classList).not.toContain('show');
    });
});

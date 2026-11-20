import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountPopup } from './account-popup';

describe('AccountPopup', () => {
    let component: AccountPopup;
    let fixture: ComponentFixture<AccountPopup>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AccountPopup],
        }).compileComponents();

        fixture = TestBed.createComponent(AccountPopup);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('anchor', document.createElement('button'));
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should reflect the visibility input', () => {
        fixture.componentRef.setInput('isVisible', true);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.popup').classList).toContain('show');
    });
});

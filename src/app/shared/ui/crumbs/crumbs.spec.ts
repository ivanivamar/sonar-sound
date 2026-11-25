import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Crumbs } from './crumbs';

describe('Crumbs', () => {
    let component: Crumbs;
    let fixture: ComponentFixture<Crumbs>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Crumbs],
            providers: [provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(Crumbs);
        fixture.componentRef.setInput('crumbs', []);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

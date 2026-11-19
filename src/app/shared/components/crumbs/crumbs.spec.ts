import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Crumbs } from './crumbs';

describe('Crumbs', () => {
    let component: Crumbs;
    let fixture: ComponentFixture<Crumbs>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Crumbs],
        }).compileComponents();

        fixture = TestBed.createComponent(Crumbs);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

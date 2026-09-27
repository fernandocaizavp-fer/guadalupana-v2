import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionDocentes } from './gestion-docentes';

describe('GestionDocentes', () => {
  let component: GestionDocentes;
  let fixture: ComponentFixture<GestionDocentes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionDocentes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionDocentes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

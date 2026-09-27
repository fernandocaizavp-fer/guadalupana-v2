import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleMateria } from './detalle-materia';

describe('DetalleMateria', () => {
  let component: DetalleMateria;
  let fixture: ComponentFixture<DetalleMateria>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleMateria]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetalleMateria);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IngresarExamenGrado } from './ingresar-examen-grado';

describe('IngresarExamenGrado', () => {
  let component: IngresarExamenGrado;
  let fixture: ComponentFixture<IngresarExamenGrado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngresarExamenGrado]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IngresarExamenGrado);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

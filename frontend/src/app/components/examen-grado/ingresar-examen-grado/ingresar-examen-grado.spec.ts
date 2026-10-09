import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { IngresarExamenGrado } from './ingresar-examen-grado';

describe('IngresarExamenGrado', () => {
  let component: IngresarExamenGrado;
  let fixture: ComponentFixture<IngresarExamenGrado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngresarExamenGrado],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
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

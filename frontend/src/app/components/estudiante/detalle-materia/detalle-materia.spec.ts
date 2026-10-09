import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { DetalleMateria } from './detalle-materia';

describe('DetalleMateria', () => {
  let component: DetalleMateria;
  let fixture: ComponentFixture<DetalleMateria>;

  beforeEach(async () => {
    // El componente lee el usuario de la sesión (localStorage) al iniciar.
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Prueba', apellido: 'Usuario' }));

    await TestBed.configureTestingModule({
      imports: [DetalleMateria],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetalleMateria);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => localStorage.removeItem('usuario'));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

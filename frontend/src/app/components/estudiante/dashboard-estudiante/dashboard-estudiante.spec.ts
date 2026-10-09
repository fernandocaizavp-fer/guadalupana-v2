import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { DashboardEstudiante } from './dashboard-estudiante';

describe('DashboardEstudiante', () => {
  let component: DashboardEstudiante;
  let fixture: ComponentFixture<DashboardEstudiante>;

  beforeEach(async () => {
    // El dashboard lee el usuario de la sesión (localStorage) al construirse.
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Prueba', apellido: 'Usuario' }));

    await TestBed.configureTestingModule({
      imports: [DashboardEstudiante],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardEstudiante);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => localStorage.removeItem('usuario'));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

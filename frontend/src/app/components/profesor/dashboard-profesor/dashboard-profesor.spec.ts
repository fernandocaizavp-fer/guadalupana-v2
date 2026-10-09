import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { DashboardProfesor } from './dashboard-profesor';

describe('DashboardProfesor', () => {
  let component: DashboardProfesor;
  let fixture: ComponentFixture<DashboardProfesor>;

  beforeEach(async () => {
    // El dashboard lee el usuario de la sesión (localStorage) al construirse.
    localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Prueba', apellido: 'Usuario' }));

    await TestBed.configureTestingModule({
      imports: [DashboardProfesor],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardProfesor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => localStorage.removeItem('usuario'));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

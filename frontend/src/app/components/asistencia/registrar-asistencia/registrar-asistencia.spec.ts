import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { RegistrarAsistencia } from './registrar-asistencia';

describe('RegistrarAsistencia', () => {
  let component: RegistrarAsistencia;
  let fixture: ComponentFixture<RegistrarAsistencia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistrarAsistencia],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegistrarAsistencia);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

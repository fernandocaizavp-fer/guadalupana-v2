import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { GestionarTareas } from './gestionar-tareas';

describe('GestionarTareas', () => {
  let component: GestionarTareas;
  let fixture: ComponentFixture<GestionarTareas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionarTareas],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionarTareas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

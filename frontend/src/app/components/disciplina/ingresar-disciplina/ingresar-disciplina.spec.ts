import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { IngresarDisciplina } from './ingresar-disciplina';

describe('IngresarDisciplina', () => {
  let component: IngresarDisciplina;
  let fixture: ComponentFixture<IngresarDisciplina>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngresarDisciplina],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IngresarDisciplina);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

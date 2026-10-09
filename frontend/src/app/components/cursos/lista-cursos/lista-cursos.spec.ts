import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ListaCursos } from './lista-cursos';

describe('ListaCursos', () => {
  let component: ListaCursos;
  let fixture: ComponentFixture<ListaCursos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaCursos],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListaCursos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

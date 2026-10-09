import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { NotasCurso } from './notas-curso';

describe('NotasCurso', () => {
  let component: NotasCurso;
  let fixture: ComponentFixture<NotasCurso>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotasCurso],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotasCurso);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

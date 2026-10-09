import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { NuevoCurso } from './nuevo-curso';

describe('NuevoCurso', () => {
  let component: NuevoCurso;
  let fixture: ComponentFixture<NuevoCurso>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevoCurso],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NuevoCurso);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

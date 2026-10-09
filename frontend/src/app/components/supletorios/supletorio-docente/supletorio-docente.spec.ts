import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { SupletorioDocente } from './supletorio-docente';

describe('SupletorioDocente', () => {
  let component: SupletorioDocente;
  let fixture: ComponentFixture<SupletorioDocente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupletorioDocente],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SupletorioDocente);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

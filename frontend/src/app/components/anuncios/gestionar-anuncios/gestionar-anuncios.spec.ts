import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { GestionarAnuncios } from './gestionar-anuncios';

describe('GestionarAnuncios', () => {
  let component: GestionarAnuncios;
  let fixture: ComponentFixture<GestionarAnuncios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionarAnuncios],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionarAnuncios);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

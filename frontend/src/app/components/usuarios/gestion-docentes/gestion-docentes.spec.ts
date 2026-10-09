import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { GestionDocentes } from './gestion-docentes';

describe('GestionDocentes', () => {
  let component: GestionDocentes;
  let fixture: ComponentFixture<GestionDocentes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionDocentes],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionDocentes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

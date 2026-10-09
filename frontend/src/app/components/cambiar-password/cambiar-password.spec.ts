import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { CambiarPassword } from './cambiar-password';

describe('CambiarPassword', () => {
  let component: CambiarPassword;
  let fixture: ComponentFixture<CambiarPassword>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CambiarPassword],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CambiarPassword);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

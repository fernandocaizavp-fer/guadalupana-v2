import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { IngresarSupletorios } from './ingresar-supletorios';

describe('IngresarSupletorios', () => {
  let component: IngresarSupletorios;
  let fixture: ComponentFixture<IngresarSupletorios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngresarSupletorios],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IngresarSupletorios);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

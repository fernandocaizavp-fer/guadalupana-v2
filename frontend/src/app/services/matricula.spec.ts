import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { MatriculaService } from './matricula';

describe('MatriculaService', () => {
  let service: MatriculaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(MatriculaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

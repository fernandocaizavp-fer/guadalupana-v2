import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { SuplетorioService } from './supletorio';

describe('SuplетorioService', () => {
  let service: SuplетorioService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(SuplетorioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

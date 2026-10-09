import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AnuncioService } from './anuncio';

describe('AnuncioService', () => {
  let service: AnuncioService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AnuncioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

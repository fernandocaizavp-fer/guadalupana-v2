import { TestBed } from '@angular/core/testing';

import { Nota } from './nota';

describe('Nota', () => {
  let service: Nota;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Nota);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

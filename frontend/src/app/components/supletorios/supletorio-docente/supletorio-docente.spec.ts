import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SupletorioDocente } from './supletorio-docente';

describe('SupletorioDocente', () => {
  let component: SupletorioDocente;
  let fixture: ComponentFixture<SupletorioDocente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupletorioDocente]
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

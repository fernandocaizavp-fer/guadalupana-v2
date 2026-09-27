import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmateriasMateria } from './submaterias-materia';

describe('SubmateriasMateria', () => {
  let component: SubmateriasMateria;
  let fixture: ComponentFixture<SubmateriasMateria>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmateriasMateria]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubmateriasMateria);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IngresarSupletorios } from './ingresar-supletorios';

describe('IngresarSupletorios', () => {
  let component: IngresarSupletorios;
  let fixture: ComponentFixture<IngresarSupletorios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngresarSupletorios]
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

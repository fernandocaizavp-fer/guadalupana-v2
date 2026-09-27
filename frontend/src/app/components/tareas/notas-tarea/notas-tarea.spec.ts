import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotasTarea } from './notas-tarea';

describe('NotasTarea', () => {
  let component: NotasTarea;
  let fixture: ComponentFixture<NotasTarea>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotasTarea]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotasTarea);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

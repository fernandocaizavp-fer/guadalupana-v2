import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionarTareas } from './gestionar-tareas';

describe('GestionarTareas', () => {
  let component: GestionarTareas;
  let fixture: ComponentFixture<GestionarTareas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionarTareas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionarTareas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

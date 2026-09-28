import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { NuevaMatricula } from './nueva-matricula';
import { MatriculaService } from '../../../services/matricula';

describe('NuevaMatricula: formulario reactivo y llenado inteligente', () => {
  let component: NuevaMatricula;
  let fixture: ComponentFixture<NuevaMatricula>;
  let service: { getCursos: ReturnType<typeof vi.fn>; getSiguienteMatricula: ReturnType<typeof vi.fn>; consultarCedula: ReturnType<typeof vi.fn>; crearMatricula: ReturnType<typeof vi.fn> };
  beforeEach(async () => {
    service = {
      getCursos: vi.fn(() => of([{ id: 8, ramaArtesanal: 'Belleza', anioFormativo: '2026' }])),
      getSiguienteMatricula: vi.fn(() => of({ matriculaNo: '003', tomo: '1', pagina: '5' })),
      consultarCedula: vi.fn(() => of({ cedula: '0012345678', nombres: 'Ana', apellidos: 'Pérez', instruccion: 'BACHILLER', correo: 'ana@example.com' })),
      crearMatricula: vi.fn(() => of({})),
    };
    await TestBed.configureTestingModule({
      imports: [NuevaMatricula],
      providers: [
        { provide: MatriculaService, useValue: service },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} } } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
        { provide: MatDialog, useValue: { open: vi.fn(() => ({ afterClosed: () => of(undefined) })) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(NuevaMatricula);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('conserva los 41 campos y vincula los inputs al FormGroup', () => {
    expect(Object.keys(component.form.controls)).toHaveLength(41);
    component.aplicarDatosExtraidos({ datos: { nombres: 'Ana', nombrepapa: 'Luis', nivelEstudio: 'a4', tipoBachiller: 'Bachiller' }, reemplazar: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[formControlName="nombres"]').value).toBe('Ana');
    expect(component.form.controls.nombrepapa.value).toBe('Luis');
    expect(fixture.nativeElement.querySelector('[formControlName="tipoBachiller"]')).toBeTruthy();
    expect(service.crearMatricula).not.toHaveBeenCalled();
  });

  it('preserva campos existentes y administrativos; sustituye solo al elegir reemplazar', () => {
    component.form.patchValue({ nombres: 'María', cursoId: 8, matriculaNo: '003', tomo: '1', pagina: '5' });
    component.aplicarDatosExtraidos({ datos: { nombres: 'Ana', telefono: '0990000000', cursoId: 99 } as any, reemplazar: false });
    expect(component.datos.nombres).toBe('María');
    expect(component.datos.telefono).toBe('0990000000');
    expect(component.datos.cursoId).toBe(8);
    component.aplicarDatosExtraidos({ datos: { nombres: 'Ana', apellidos: null } as any, reemplazar: true });
    expect(component.datos.nombres).toBe('Ana');
    expect(component.datos.matriculaNo).toBe('003');
    expect(component.datos.pagina).toBe('5');
  });

  it('no consulta cédula al aplicar IA ni pierde el nombre por el cambio de cédula', () => {
    component.ultimaCedulaConsultada = '0099999999';
    component.aplicarDatosExtraidos({ datos: { nombres: 'Ana', cedula: '0012345678' }, reemplazar: true });
    expect(component.datos.nombres).toBe('Ana');
    expect(component.ultimaCedulaConsultada).toBe('');
    expect(service.consultarCedula).not.toHaveBeenCalled();
  });

  it('mantiene la numeración y la consulta manual de cédula sin duplicar solicitudes', () => {
    component.form.controls.cursoId.setValue(8);
    component.onCursoChange();
    expect(component.datos.matriculaNo).toBe('003');
    component.form.controls.cedula.setValue('0012345678');
    component.buscarPorCedula();
    component.buscarPorCedula();
    expect(service.consultarCedula).toHaveBeenCalledTimes(1);
    expect(component.datos.nivelEstudio).toBe('a4');
    expect(component.datos.correoestudiante).toBe('ana@example.com');
    component.form.controls.cedula.setValue('0012345679');
    expect(component.datos.nombres).toBe('');
    expect(component.datos.matriculaNo).toBe('003');
  });

  it('conserva la copia del representante y el guardado manual del payload plano', () => {
    component.form.patchValue({ cursoId: 8, cedula: '0012345678', nombres: 'Ana', apellidos: 'Pérez', correoestudiante: 'ana@example.com', nombrepapa: 'Luis', ocupacionpapa: 'Docente' });
    component.usarRepresentante('padre');
    expect(component.datos.nombrerepresentante).toBe('Luis');
    expect(component.datos.ocupacionrepresentante).toBe('Docente');
    component.guardar();
    expect(service.crearMatricula).toHaveBeenCalledWith(expect.objectContaining({ cursoId: 8, nombres: 'Ana', correoestudiante: 'ana@example.com' }));
  });
});

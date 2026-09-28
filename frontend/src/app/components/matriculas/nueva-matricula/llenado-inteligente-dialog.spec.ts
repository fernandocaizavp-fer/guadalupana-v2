import { TestBed, ComponentFixture } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { LlenadoInteligenteDialog } from './llenado-inteligente-dialog';
import { MatriculaService } from '../../../services/matricula';

describe('LlenadoInteligenteDialog', () => {
  let fixture: ComponentFixture<LlenadoInteligenteDialog>;
  let component: LlenadoInteligenteDialog;
  let extraerDatos: ReturnType<typeof vi.fn>;
  let close: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    extraerDatos = vi.fn(() => of({ nombres: 'Ana', cedula: '0012345678' }));
    close = vi.fn();
    await TestBed.configureTestingModule({
      imports: [LlenadoInteligenteDialog],
      providers: [
        { provide: MatriculaService, useValue: { extraerDatos } },
        { provide: MatDialogRef, useValue: { close } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LlenadoInteligenteDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => { vi.unstubAllGlobals(); });

  it('permite escribir sin micrófono, revisar y aplicar sin guardar', () => {
    component.texto.setValue('La estudiante se llama Ana.');
    component.extraer();
    fixture.detectChanges();
    expect(extraerDatos).toHaveBeenCalledWith('La estudiante se llama Ana.');
    expect(component.vistaPrevia).toHaveLength(2);
    expect(close).not.toHaveBeenCalled();
    component.aplicar();
    expect(close).toHaveBeenCalledWith({ datos: { nombres: 'Ana', cedula: '0012345678' }, reemplazar: false });
  });

  it('descarta la vista previa al editar el texto y bloquea texto vacío', () => {
    component.texto.setValue('Ana');
    component.extraer();
    component.texto.setValue('Otra persona');
    expect(component.vistaPrevia).toHaveLength(0);
    component.aplicar();
    expect(close).not.toHaveBeenCalled();
    extraerDatos.mockClear();
    component.texto.setValue('   ');
    component.extraer();
    expect(extraerDatos).not.toHaveBeenCalled();
  });

  it('muestra el error del backend y conserva el texto para reintentar', () => {
    extraerDatos.mockReturnValue(throwError(() => ({ error: { error: 'Configura GEMINI_API_KEY' } })));
    component.texto.setValue('Datos ficticios de Ana');
    component.extraer();
    fixture.detectChanges();
    expect(component.procesando).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Configura GEMINI_API_KEY');
    expect(component.texto.value).toBe('Datos ficticios de Ana');
  });

  it('acumula dictado, detiene el micrófono al cerrar y conserva el respaldo de texto', () => {
    let reconocimiento: any;
    class FakeRecognition {
      start = vi.fn();
      stop = vi.fn();
      abort = vi.fn();
      constructor() { reconocimiento = this; }
    }
    vi.stubGlobal('SpeechRecognition', FakeRecognition);
    component.texto.setValue('Nombres:');
    component.iniciarDictado();
    reconocimiento.onresult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'Ana María' } }] });
    expect(component.texto.value).toBe('Nombres: Ana María');
    expect(reconocimiento.lang).toBe('es-EC');
    fixture.destroy();
    expect(reconocimiento.abort).toHaveBeenCalledOnce();
    expect(reconocimiento.onresult).toBeNull();
  });

  it('si se niega el permiso permite continuar con el texto', () => {
    let reconocimiento: any;
    class FakeRecognition {
      start() {}
      abort = vi.fn();
      constructor() { reconocimiento = this; }
    }
    vi.stubGlobal('SpeechRecognition', FakeRecognition);
    component.texto.setValue('Texto que no debe perderse');
    component.iniciarDictado();
    reconocimiento.onerror({ error: 'not-allowed' });
    expect(component.escuchando).toBe(false);
    expect(component.errorVoz).toContain('No se autorizó');
    expect(component.texto.value).toBe('Texto que no debe perderse');
    component.extraer();
    expect(extraerDatos).toHaveBeenCalled();
  });
});

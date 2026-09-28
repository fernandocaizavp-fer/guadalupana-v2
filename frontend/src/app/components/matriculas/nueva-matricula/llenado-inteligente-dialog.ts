import { ChangeDetectorRef, Component, DestroyRef, inject, NgZone, OnDestroy } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatriculaService } from '../../../services/matricula';
import { DatosExtraidosMatricula, ETIQUETAS_EXTRACCION, ResultadoLlenado } from '../../../services/matricula-datos';

interface ResultadoVoz {
  isFinal: boolean;
  [index: number]: { transcript: string };
}
interface ReconocimientoVoz {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: { length: number; [index: number]: ResultadoVoz } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type ConstructorVoz = new () => ReconocimientoVoz;
type VentanaVoz = Window & { SpeechRecognition?: ConstructorVoz; webkitSpeechRecognition?: ConstructorVoz };

@Component({
  selector: 'app-llenado-inteligente-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatCheckboxModule, MatProgressSpinnerModule],
  templateUrl: './llenado-inteligente-dialog.html',
  styleUrl: './llenado-inteligente-dialog.scss',
})
export class LlenadoInteligenteDialog implements OnDestroy {
  private readonly service = inject(MatriculaService);
  private readonly dialogRef = inject<MatDialogRef<LlenadoInteligenteDialog, ResultadoLlenado>>(MatDialogRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private recognition?: ReconocimientoVoz;
  readonly texto = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(12000)] });
  readonly reemplazar = new FormControl(false, { nonNullable: true });
  readonly soporteVoz = typeof window !== 'undefined' &&
    !!((window as VentanaVoz).SpeechRecognition || (window as VentanaVoz).webkitSpeechRecognition);
  escuchando = false;
  procesando = false;
  parcial = '';
  error = '';
  errorVoz = '';
  datosExtraidos?: DatosExtraidosMatricula;
  vistaPrevia: { campo: string; etiqueta: string; valor: string }[] = [];

  constructor() {
    this.texto.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.datosExtraidos = undefined;
      this.vistaPrevia = [];
      this.error = '';
    });
  }

  iniciarDictado(): void {
    if (this.escuchando || this.procesando) return;
    const ctor = (window as VentanaVoz).SpeechRecognition || (window as VentanaVoz).webkitSpeechRecognition;
    if (!ctor) {
      this.errorVoz = 'Este navegador no permite dictar. Puedes escribir o pegar los datos abajo.';
      return;
    }
    const recognition = new ctor();
    this.recognition = recognition;
    const textoInicial = this.texto.value.trim();
    const fragmentos = new Map<number, string>();
    recognition.lang = 'es-EC';
    recognition.continuous = true;
    recognition.interimResults = true;
    this.errorVoz = '';
    this.parcial = '';
    this.escuchando = true;
    this.datosExtraidos = undefined;
    this.vistaPrevia = [];
    recognition.onresult = (event) => this.zone.run(() => {
      if (this.recognition !== recognition) return;
      const parciales: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const resultado = event.results[i];
        if (resultado.isFinal) fragmentos.set(i, resultado[0].transcript);
        else parciales.push(resultado[0].transcript);
      }
      const finales = [...fragmentos.entries()].sort(([a], [b]) => a - b).map(([, texto]) => texto);
      this.texto.setValue([textoInicial, ...finales].filter(Boolean).join(' '));
      this.parcial = parciales.join(' ');
      this.cdr.markForCheck();
    });
    recognition.onerror = (event) => this.zone.run(() => {
      if (this.recognition !== recognition) return;
      const mensajes: Record<string, string> = {
        'not-allowed': 'No se autorizó el micrófono. Puedes habilitarlo en el navegador o escribir los datos.',
        'service-not-allowed': 'El reconocimiento de voz no está permitido. Escribe o pega los datos.',
        'audio-capture': 'No se encontró un micrófono disponible. Puedes escribir los datos.',
        'no-speech': 'No se detectó voz. Intenta dictar de nuevo o escribe los datos.',
        'network': 'Falló la conexión del reconocimiento de voz. El texto escrito sigue disponible.',
      };
      this.errorVoz = mensajes[event.error] || 'No se pudo completar el dictado. Puedes continuar escribiendo.';
      this.cancelarReconocimiento();
      this.cdr.markForCheck();
    });
    recognition.onend = () => this.zone.run(() => {
      if (this.recognition !== recognition) return;
      this.escuchando = false;
      this.parcial = '';
      this.recognition = undefined;
      this.cdr.markForCheck();
    });
    try { recognition.start(); }
    catch {
      this.cancelarReconocimiento();
      this.errorVoz = 'No se pudo iniciar el micrófono. Puedes escribir o pegar los datos.';
    }
  }

  detenerDictado(): void {
    try { this.recognition?.stop(); }
    catch { this.cancelarReconocimiento(); }
  }

  extraer(): void {
    if (this.procesando || this.escuchando || this.texto.invalid || !this.texto.value.trim()) return;
    this.procesando = true;
    this.error = '';
    this.datosExtraidos = undefined;
    this.vistaPrevia = [];
    this.service.extraerDatos(this.texto.value.trim()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (datos) => {
        this.procesando = false;
        this.datosExtraidos = datos;
        this.vistaPrevia = Object.entries(ETIQUETAS_EXTRACCION).flatMap(([campo, etiqueta]) => {
          const valor = datos[campo as keyof DatosExtraidosMatricula];
          return typeof valor === 'string' && valor.trim() ? [{ campo, etiqueta, valor }] : [];
        });
        if (!this.vistaPrevia.length) this.error = 'No se identificaron campos. Añade más información e intenta de nuevo.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.procesando = false;
        this.error = err.error?.error || 'No se pudo conectar con el servidor. Comprueba que el backend local esté iniciado.';
        this.cdr.markForCheck();
      },
    });
  }

  aplicar(): void {
    if (this.datosExtraidos && this.vistaPrevia.length && !this.procesando && !this.escuchando) {
      this.dialogRef.close({ datos: this.datosExtraidos, reemplazar: this.reemplazar.value });
    }
  }

  private cancelarReconocimiento(): void {
    const recognition = this.recognition;
    this.recognition = undefined;
    this.escuchando = false;
    this.parcial = '';
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.abort(); } catch { /* Ya estaba detenido. */ }
    }
  }

  ngOnDestroy(): void { this.cancelarReconocimiento(); }
}

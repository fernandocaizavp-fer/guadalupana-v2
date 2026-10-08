import { Overlay } from '@angular/cdk/overlay';
import { Component, OnInit, ChangeDetectorRef, inject, DestroyRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { LlenadoInteligenteDialog } from './llenado-inteligente-dialog';
import { DATOS_MATRICULA_INICIALES, ETIQUETAS_EXTRACCION, ResultadoLlenado } from '../../../services/matricula-datos';
import { Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatriculaService } from '../../../services/matricula';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-nueva-matricula',
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatCardModule, MatSelectModule, MatDividerModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatToolbarModule
  ],
  templateUrl: './nueva-matricula.html',
  styleUrl: './nueva-matricula.scss'
})
export class NuevaMatricula implements OnInit {
  loading = false;
  consultandoCedula = false;
  ultimaCedulaConsultada = '';
  cursos: any[] = [];

  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly overlay = inject(Overlay);
  private panelLlenado?: MatDialogRef<LlenadoInteligenteDialog, ResultadoLlenado>;
  private readonly destroyRef = inject(DestroyRef);
  readonly form = this.fb.nonNullable.group({
    ...DATOS_MATRICULA_INICIALES,
    cursoId: [DATOS_MATRICULA_INICIALES.cursoId, Validators.required],
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(100)]],
    cedula: ['', [Validators.required, Validators.maxLength(10)]],
    correoestudiante: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
  });

  get datos() { return this.form.getRawValue(); }

  abrirLlenadoInteligente(): void {
    if (this.panelLlenado) return;
    const panel = this.dialog.open<LlenadoInteligenteDialog, void, ResultadoLlenado>(LlenadoInteligenteDialog, {
      width: '420px',
      maxWidth: 'calc(100vw - 40px)',
      maxHeight: 'min(680px, calc(100dvh - 40px))',
      hasBackdrop: false,
      position: { top: '20px', right: '20px' },
      panelClass: 'llenado-inteligente-panel',
      scrollStrategy: this.overlay.scrollStrategies.noop(),
      autoFocus: false,
      restoreFocus: false,
      ariaModal: false,
    });
    this.panelLlenado = panel;
    panel.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((resultado) => {
      this.panelLlenado = undefined;
      if (resultado) this.aplicarDatosExtraidos(resultado);
    });
  }

  aplicarDatosExtraidos(resultado: ResultadoLlenado): void {
    const cambios: Record<string, string> = {};
    for (const campo of Object.keys(ETIQUETAS_EXTRACCION) as (keyof typeof ETIQUETAS_EXTRACCION)[]) {
      const valor = resultado.datos[campo];
      if (typeof valor !== 'string' || !valor.trim()) continue;
      const control = this.form.controls[campo];
      const esPredeterminado = !control.dirty && control.value === DATOS_MATRICULA_INICIALES[campo];
      if (resultado.reemplazar || !control.value.trim() || esPredeterminado) cambios[campo] = valor.trim();
    }
    if (!Object.keys(cambios).length) {
      this.snackBar.open('Los campos detectados ya están completos. Activa reemplazar si deseas cambiarlos.', 'OK', { duration: 4500 });
      return;
    }
    const cambiosNormalizados = this.normalizarDatosExtraidos(cambios);
    if (cambiosNormalizados['cedula'] && cambiosNormalizados['cedula'] !== this.datos.cedula) this.ultimaCedulaConsultada = '';
    // No dispara la consulta de cédula ni borra otros campos al aplicar una extracción.
    this.form.patchValue(cambiosNormalizados, { emitEvent: false });
    for (const campo of Object.keys(cambiosNormalizados)) this.form.get(campo)?.markAsDirty();
    this.form.markAsDirty();
    this.cdr.markForCheck();
    this.snackBar.open('Datos aplicados. Revísalos antes de guardar la matrícula.', 'OK', { duration: 4500 });
  }

  private normalizarDatosExtraidos(cambios: Record<string, string>): Record<string, string> {
    const nombresPropios = new Set([
      'nombres', 'apellidos', 'nombrepapa', 'nombremama', 'nombrerepresentante',
      'pais', 'provincia', 'canton', 'parroquia', 'ciudad',
    ]);
    const descriptivos = new Set([
      'profesionpapa', 'profesionmama',
      'ocupacionpapa', 'ocupacionmama', 'ocupacionrepresentante',
    ]);
    const enlaces = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e']);

    return Object.fromEntries(Object.entries(cambios).map(([campo, texto]) => {
      let valor = texto.replace(/\s+/gu, ' ').trim();
      if (nombresPropios.has(campo)) {
        valor = valor.toLocaleLowerCase('es').split(' ').map((palabra, indice) => {
          if (indice > 0 && enlaces.has(palabra)) return palabra;
          return palabra.replace(/(^|[-'’])\p{L}/gu, inicio => inicio.toLocaleUpperCase('es'));
        }).join(' ');
      } else if (descriptivos.has(campo)) {
        // Conserva las siglas y nombres propios que aparezcan en la descripción.
        valor = valor.replace(/^\p{L}/u, inicial => inicial.toLocaleUpperCase('es'));
      }
      return [campo, valor];
    }));
  }

  constructor(
    private matriculaService: MatriculaService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private titleService: Title,
    private cdr: ChangeDetectorRef
  ) {
    this.destroyRef.onDestroy(() => this.panelLlenado?.close());
  }

  ngOnInit() {
    this.titleService.setTitle('Matrícula');
    this.form.controls.cedula.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onCedulaChange());
    this.matriculaService.getCursos().subscribe({
      next: (cursos) => {
        this.cursos = cursos;
        this.cdr.markForCheck();
        const cursoId = this.route.snapshot.queryParams['cursoId'];
        if (cursoId) {
          this.form.controls.cursoId.setValue(Number(cursoId));
          this.onCursoChange();
        }
      },
      error: () => this.snackBar.open('Error al cargar cursos', 'OK', { duration: 3000 })
    });
  }

  // Al elegir un curso, autollenar Matrícula, Tomo y Página con el próximo
  // correlativo calculado por el backend (fuente única de verdad). El docente
  // solo verifica; no debe cambiar nada.
  onCursoChange() {
    if (!this.datos.cursoId) return;
    this.matriculaService.getSiguienteMatricula(Number(this.datos.cursoId)).subscribe({
      next: (p: any) => {
        this.form.controls.matriculaNo.setValue(p.matriculaNo);
        this.form.controls.tomo.setValue(p.tomo);
        this.form.controls.pagina.setValue(p.pagina);
        // App zoneless: forzar el refresco de la vista al llegar la respuesta.
        this.cdr.markForCheck();
      },
      error: () => this.snackBar.open('No se pudo calcular el número de matrícula', 'OK', { duration: 3000 })
    });
  }

  get prefijo(): string {
    return this.datos.sexo === 'Masculino' ? 'El' : 
          this.datos.sexo === 'Femenino' ? 'La' : '';
  }

  get tratamiento(): string {
    return this.datos.sexo === 'Masculino' ? 'Sr.' : 
          this.datos.sexo === 'Femenino' ? 'Srta.' : '';
  }

  guardar() {
    if (this.loading || this.consultandoCedula) return;
    if (!this.datos.cursoId) {
      this.snackBar.open('Selecciona un curso', 'OK', { duration: 3000 });
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Revisa los campos obligatorios: curso, nombres, apellidos, cédula y correo del estudiante.', 'OK', { duration: 4500 });
      return;
    }
    this.loading = true;
    this.matriculaService.crearMatricula(this.datos).subscribe({
      next: () => {
        this.loading = false;
        this.cdr.markForCheck();
        this.snackBar.open('Matrícula guardada exitosamente', 'OK', { duration: 3000 });
        // Vuelve al detalle del curso, donde ya aparece el nuevo estudiante.
        // La matrícula se puede descargar después desde ahí.
        this.router.navigate(['/cursos', this.datos.cursoId]);
      },
      error: (err) => {
        this.loading = false;
        this.cdr.markForCheck();
        this.snackBar.open(err.error?.error || 'Error al crear matrícula', 'OK', { duration: 4000 });
      }
    });
  }

  // Cada consulta cuesta $0.05, así que una acción del usuario debe producir
  // exactamente una petición: se bloquea mientras hay una en curso y se ignora
  // la misma cédula ya consultada. La consulta se dispara solo desde el botón
  // "Consultar" o con Enter; nunca de forma automática al escribir.
  buscarPorCedula() {
    if (this.consultandoCedula) return;
    if (!this.datos.cedula || this.datos.cedula.length !== 10) {
      this.snackBar.open('Ingrese una cédula de 10 dígitos', 'OK', { duration: 3000 });
      return;
    }
    if (this.datos.cedula === this.ultimaCedulaConsultada) {
      // Sin este aviso el clic parecería no hacer nada.
      this.snackBar.open('Esta cédula ya fue consultada', 'OK', { duration: 3000 });
      return;
    }

    this.ultimaCedulaConsultada = this.datos.cedula;
    this.consultandoCedula = true;
    // Se limpia ANTES de consultar: si la segunda persona no tiene un dato, no
    // debe quedar visible el de la primera.
    this.limpiarDatosConsultaCedula();

    this.matriculaService.consultarCedula(this.datos.cedula).subscribe({
      next: (d: any) => {
        const { nivelEstudio, tipoBachiller } = this.mapearInstruccion(d.instruccion);
        // Se asignan TODOS los campos, con '' cuando la respuesta no los trae.
        // Usar `d.x || this.datos.x` dejaría residuos de la cédula anterior.
        this.form.controls.cedula.setValue(d.cedula ?? this.datos.cedula);
        this.form.controls.apellidos.setValue(d.apellidos ?? '');
        this.form.controls.nombres.setValue(d.nombres ?? '');
        this.form.controls.sexo.setValue(d.sexo ?? '');
        this.form.controls.fechaNacimiento.setValue(d.fechaNacimiento ?? '');
        this.form.controls.pais.setValue(d.pais ?? 'ECUADOR');
        this.form.controls.nacionalidad.setValue(d.nacionalidad ?? '');
        this.form.controls.provincia.setValue(d.provincia ?? '');
        this.form.controls.canton.setValue(d.canton ?? '');
        this.form.controls.parroquia.setValue(d.parroquia ?? '');
        this.form.controls.ciudad.setValue(d.ciudad ?? '');
        this.form.controls.calle.setValue(d.calle ?? '');
        this.form.controls.num.setValue(d.num ?? '');
        this.form.controls.transversal.setValue(d.transversal ?? '');
        this.form.controls.telefono.setValue(d.telefono ?? '');
        this.form.controls.correoestudiante.setValue(d.correo ?? '');
        this.form.controls.nivelEstudio.setValue(nivelEstudio);
        this.form.controls.tipoBachiller.setValue(tipoBachiller);
        this.form.controls.nombrepapa.setValue(d.nombrepapa ?? '');
        this.form.controls.nombremama.setValue(d.nombremama ?? '');
        this.consultandoCedula = false;
        this.cdr.markForCheck();
        this.snackBar.open('Datos cargados desde el Registro Civil', 'OK', { duration: 3000 });
      },
      error: (err: any) => {
        this.consultandoCedula = false;
        this.ultimaCedulaConsultada = '';
        // Si la consulta falla, tampoco deben quedar datos viejos a la vista.
        this.limpiarDatosConsultaCedula();
        this.cdr.markForCheck();
        this.snackBar.open(err.error?.error || 'No se pudieron cargar los datos', 'OK', { duration: 3000 });
      }
    });
  }

  // Al editar la cédula tras una consulta previa, los datos mostrados dejan de
  // corresponder a esa persona: se borran para no mezclar dos identidades.
  onCedulaChange(): void {
    if (!this.ultimaCedulaConsultada) return;
    if (this.datos.cedula === this.ultimaCedulaConsultada) return;
    this.ultimaCedulaConsultada = '';
    this.limpiarDatosConsultaCedula();
    this.cdr.markForCheck();
  }

  // Limpia SOLO los campos que llena la consulta de cédula. No toca matrícula,
  // tomo, página, curso ni ningún otro dato administrativo, porque esos no
  // pertenecen a la persona consultada.
  private limpiarDatosConsultaCedula(): void {
    this.form.controls.apellidos.setValue('');
    this.form.controls.nombres.setValue('');
    this.form.controls.sexo.setValue('');
    this.form.controls.fechaNacimiento.setValue('');
    this.form.controls.pais.setValue('ECUADOR');
    this.form.controls.nacionalidad.setValue('');
    this.form.controls.provincia.setValue('');
    this.form.controls.canton.setValue('');
    this.form.controls.parroquia.setValue('');
    this.form.controls.ciudad.setValue('');
    this.form.controls.calle.setValue('');
    this.form.controls.num.setValue('');
    this.form.controls.transversal.setValue('');
    this.form.controls.telefono.setValue('');
    this.form.controls.correoestudiante.setValue('');
    this.form.controls.nivelEstudio.setValue('');
    this.form.controls.tipoBachiller.setValue('');
    this.form.controls.nombrepapa.setValue('');
    this.form.controls.nombremama.setValue('');
  }

  // Traduce el texto libre de instrucción del Registro Civil a los valores
  // reales del desplegable ('a1' | 'a2' | 'a4') y del tipo de título
  // ('Bachiller' | 'Superior' | 'Otro'). Si el valor no es identificable con
  // certeza no se selecciona nada: es preferible un campo vacío que un dato
  // inventado en un documento oficial.
  private mapearInstruccion(instruccion: string): { nivelEstudio: string; tipoBachiller: string } {
    const v = (instruccion || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, ''); // tolera tildes: "BÁSICA" → "BASICA"

    if (!v) return { nivelEstudio: '', tipoBachiller: '' };

    if (v.includes('PRIMARIA')) return { nivelEstudio: 'a1', tipoBachiller: '' };
    if (v.includes('CICLO BASICO') || v.includes('EDUCACION BASICA') || v.includes('BASICA')) {
      return { nivelEstudio: 'a2', tipoBachiller: '' };
    }
    if (v.includes('BACHILLER') || v.includes('SECUNDARIA COMPLETA')) {
      return { nivelEstudio: 'a4', tipoBachiller: 'Bachiller' };
    }
    if (v.includes('SUPERIOR') || v.includes('UNIVERSITARI') || v.includes('TERCER NIVEL')) {
      return { nivelEstudio: 'a4', tipoBachiller: 'Superior' };
    }
    if (v.includes('OTRO')) return { nivelEstudio: 'a4', tipoBachiller: 'Otro' };

    return { nivelEstudio: '', tipoBachiller: '' };
  }

  // Copia nombre y ocupación del padre o de la madre al representante.
  // El domicilio del representante no se toca (puede ser distinto).
  usarRepresentante(quien: 'padre' | 'madre'): void {
    if (quien === 'padre') {
      this.form.controls.nombrerepresentante.setValue(this.datos.nombrepapa || this.datos.nombrerepresentante);
      this.form.controls.ocupacionrepresentante.setValue(this.datos.ocupacionpapa || this.datos.ocupacionrepresentante);
    } else {
      this.form.controls.nombrerepresentante.setValue(this.datos.nombremama || this.datos.nombrerepresentante);
      this.form.controls.ocupacionrepresentante.setValue(this.datos.ocupacionmama || this.datos.ocupacionrepresentante);
    }
    this.cdr.markForCheck();
  }

  descargarDocumentos(id: number) {
    this.matriculaService.descargarMatricula(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `matricula_${this.datos.cedula}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
        this.snackBar.open('Error al descargar documento', 'OK', { duration: 3000 });
      }
    });
  }

  descargarCertificado(id: number) {
    this.matriculaService.descargarCertificado(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado_${this.datos.cedula}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.snackBar.open('Error al descargar certificado', 'OK', { duration: 3000 });
      }
    });
  }

  volver() {
    this.router.navigate(['/dashboard']);
  }
}
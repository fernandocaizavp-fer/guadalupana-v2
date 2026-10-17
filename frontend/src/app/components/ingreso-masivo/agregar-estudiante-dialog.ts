import { ChangeDetectorRef, Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs';
import { MatriculaService } from '../../services/matricula';
import { EstudianteRapido } from '../../services/ingreso-rapido';
import { lugarFechaHoy } from '../../shared/lugar-fecha/lugar-fecha';

export interface AgregarEstudianteData {
  cursoId: number;
  nombreCurso: string;
}

// Matrícula corta desde el Ingreso rápido: crea el usuario ESTUDIANTE y la matrícula
// con el mismo endpoint que la pantalla de Nueva matrícula (numeración correlativa,
// contraseña = cédula, conceptos de pago). Los datos familiares, domicilio, etc. se
// completan después desde el detalle del curso.
@Component({
  selector: 'app-agregar-estudiante-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <div class="ae">
      @if (!creado) {
        <h2 mat-dialog-title>Agregar estudiante</h2>
        <mat-dialog-content>
          <p class="ae-curso">Se matriculará en <strong>{{ data.nombreCurso }}</strong>.</p>
          <form [formGroup]="form" class="ae-form" (ngSubmit)="guardar()" id="form-agregar-estudiante">
            <mat-form-field appearance="outline">
              <mat-label>Apellidos</mat-label>
              <input matInput formControlName="apellidos" maxlength="100" autocomplete="off">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Nombres</mat-label>
              <input matInput formControlName="nombres" maxlength="100" autocomplete="off">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Cédula / pasaporte</mat-label>
              <input matInput formControlName="cedula" maxlength="10" autocomplete="off">
              <mat-hint>También será su contraseña inicial</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Sexo</mat-label>
              <mat-select formControlName="sexo">
                <mat-option value="Masculino">Masculino</mat-option>
                <mat-option value="Femenino">Femenino</mat-option>
                <mat-option value="Otro">Otro</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="ae-ancho">
              <mat-label>Correo del estudiante</mat-label>
              <input matInput type="email" formControlName="correo" maxlength="100" autocomplete="off">
              <mat-hint>Con este correo inicia sesión</mat-hint>
              @if (form.controls.correo.hasError('email')) {
                <mat-error>Correo no válido</mat-error>
              }
            </mat-form-field>
          </form>
          @if (error) {
            <p class="ae-error">{{ error }}</p>
          }
        </mat-dialog-content>
        <mat-dialog-actions align="end">
          <button mat-button type="button" (click)="dialogRef.close()" [disabled]="guardando">Cancelar</button>
          <button mat-flat-button type="submit" form="form-agregar-estudiante" [disabled]="form.invalid || guardando">
            <mat-icon>person_add</mat-icon>
            {{ guardando ? 'Guardando…' : 'Matricular' }}
          </button>
        </mat-dialog-actions>
      } @else {
        <h2 mat-dialog-title>Estudiante matriculado</h2>
        <mat-dialog-content>
          <p><strong>{{ creado.apellidos }} {{ creado.nombres }}</strong> ya aparece en las tablas de notas,
            exámenes de grado y asistencia.</p>
          <div class="ae-credenciales">
            <span>Usuario: <strong>{{ credenciales.correo }}</strong></span>
            <span>Contraseña: <strong>{{ credenciales.passwordDefault }}</strong></span>
          </div>
          <p class="ae-nota">Los demás datos de la ficha (familia, domicilio, estudios) se completan desde el detalle del curso.</p>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
          <button mat-flat-button type="button" (click)="dialogRef.close(creado)">Listo</button>
        </mat-dialog-actions>
      }
    </div>
  `,
  styles: [`
    .ae { max-width: 560px; }
    .ae-curso { margin: 0 0 12px; color: #4a5068; }
    .ae-form { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; }
    .ae-ancho { grid-column: 1 / -1; }
    .ae-error { margin: 4px 0 0; color: #c62828; font-weight: 600; }
    .ae-credenciales {
      display: flex; flex-direction: column; gap: 4px;
      padding: 12px 14px; margin: 12px 0; border-radius: 8px; background: #f5f7fc;
    }
    .ae-nota { margin: 0; font-size: 13px; color: #8a90a2; }
    @media (max-width: 520px) { .ae-form { grid-template-columns: 1fr; } }
  `]
})
export class AgregarEstudianteDialog {
  form = inject(FormBuilder).nonNullable.group({
    apellidos: ['', [Validators.required, Validators.maxLength(100)]],
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    cedula: ['', [Validators.required, Validators.maxLength(10)]],
    sexo: ['', Validators.required],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(100)]]
  });
  guardando = false;
  error = '';
  creado: EstudianteRapido | null = null;
  credenciales: { correo: string; passwordDefault: string } = { correo: '', passwordDefault: '' };

  constructor(
    public dialogRef: MatDialogRef<AgregarEstudianteDialog, EstudianteRapido>,
    @Inject(MAT_DIALOG_DATA) public data: AgregarEstudianteData,
    private matriculaService: MatriculaService,
    private cdr: ChangeDetectorRef
  ) {}

  guardar() {
    if (this.form.invalid || this.guardando) return;
    const v = this.form.getRawValue();
    this.guardando = true;
    this.error = '';
    this.dialogRef.disableClose = true;
    this.cdr.detectChanges();

    this.matriculaService.crearMatricula({
      cursoId: this.data.cursoId,
      apellidos: v.apellidos.trim(),
      nombres: v.nombres.trim(),
      cedula: v.cedula.trim(),
      sexo: v.sexo,
      correoestudiante: v.correo.trim(),
      lugarfechamatricula: lugarFechaHoy()
    }).pipe(finalize(() => {
      this.guardando = false;
      // Tras matricular solo se cierra con "Listo", que devuelve el estudiante a la
      // tabla (cerrar con el fondo o Esc lo dejaría fuera hasta recargar).
      this.dialogRef.disableClose = this.creado !== null;
      this.cdr.detectChanges();
    })).subscribe({
      next: (res) => {
        const m = res.matricula;
        this.creado = { id: m.id, apellidos: m.apellidos, nombres: m.nombres, cedula: m.cedula };
        this.credenciales = res.credenciales;
      },
      error: (e) => {
        this.error = e?.error?.error || 'No se pudo matricular al estudiante';
      }
    });
  }
}

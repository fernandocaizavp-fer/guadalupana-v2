import { Component, OnInit, ChangeDetectorRef, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { DatePipe } from '@angular/common';
import { CursoService } from '../../../services/curso';
import { MatriculaService } from '../../../services/matricula';

@Component({
  selector: 'app-editar-matricula-dialog',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatDialogModule, MatDividerModule, MatIconModule, MatSelectModule],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <div class="header-content">
          <mat-icon>person_edit</mat-icon>
          <h2>Editar Información del Estudiante</h2>
        </div>
        <button mat-icon-button (click)="dialogRef.close()" class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="custom-content">
        <div class="form-grid">

          <div class="section-header">
            <mat-icon>account_circle</mat-icon>
            <span>Datos Personales</span>
          </div>
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Apellidos</mat-label>
              <input matInput [(ngModel)]="datos.apellidos">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Nombres</mat-label>
              <input matInput [(ngModel)]="datos.nombres">
            </mat-form-field>
          </div>
          <div class="row row-3">
            <mat-form-field appearance="outline">
              <mat-label>Cédula</mat-label>
              <input matInput [(ngModel)]="datos.cedula">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Sexo</mat-label>
              <mat-select [(ngModel)]="datos.sexo">
                <mat-option value="Masculino">Masculino</mat-option>
                <mat-option value="Femenino">Femenino</mat-option>
                <mat-option value="Otro">Otro</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Fecha de Nacimiento</mat-label>
              <input matInput type="date" [(ngModel)]="datos.fechaNacimiento">
            </mat-form-field>
          </div>
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Correo Electrónico</mat-label>
              <input matInput [(ngModel)]="datos.correoestudiante">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Teléfono</mat-label>
              <input matInput [(ngModel)]="datos.telefono">
            </mat-form-field>
          </div>

          <div class="section-header">
            <mat-icon>location_on</mat-icon>
            <span>Ubicación y Domicilio</span>
          </div>
          <div class="row row-3">
            <mat-form-field appearance="outline">
              <mat-label>País</mat-label>
              <input matInput [(ngModel)]="datos.pais">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Provincia</mat-label>
              <input matInput [(ngModel)]="datos.provincia">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Cantón</mat-label>
              <input matInput [(ngModel)]="datos.canton">
            </mat-form-field>
          </div>
          <div class="row row-3">
            <mat-form-field appearance="outline">
              <mat-label>Calle Principal</mat-label>
              <input matInput [(ngModel)]="datos.calle">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Número</mat-label>
              <input matInput [(ngModel)]="datos.num">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Transversal</mat-label>
              <input matInput [(ngModel)]="datos.transversal">
            </mat-form-field>
          </div>

          <div class="section-header">
            <mat-icon>school</mat-icon>
            <span>Datos Académicos</span>
          </div>
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Nivel de Estudio</mat-label>
              <mat-select [(ngModel)]="datos.nivelEstudio" (ngModelChange)="onNivelChange()">
                <mat-option value="a1">A.1 — Primaria o 7mo Año Básico</mat-option>
                <mat-option value="a2">A.2 — Ciclo Básico o 10mo Año Básico</mat-option>
                <mat-option value="a4">A.4 — Título</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          @if (datos.nivelEstudio === 'a1') {
            <div class="row">
              <mat-form-field appearance="outline">
                <mat-label>Conferido por (Establecimiento A.1)</mat-label>
                <input matInput [(ngModel)]="datos.conferidoPorA1">
              </mat-form-field>
            </div>
          }

          @if (datos.nivelEstudio === 'a2') {
            <div class="row">
              <mat-form-field appearance="outline">
                <mat-label>Conferido por (Establecimiento A.2)</mat-label>
                <input matInput [(ngModel)]="datos.conferidoPorA2">
              </mat-form-field>
            </div>
          }

          @if (datos.nivelEstudio === 'a4') {
            <div class="row row-3">
              <mat-form-field appearance="outline">
                <mat-label>Tipo de Título</mat-label>
                <mat-select [(ngModel)]="datos.tipoBachiller">
                  <mat-option value="Bachiller">Bachiller</mat-option>
                  <mat-option value="Superior">Superior</mat-option>
                  <mat-option value="Otro">Otro</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Especialidad</mat-label>
                <input matInput [(ngModel)]="datos.especialidad">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Unidad Educativa (Conferido por)</mat-label>
                <input matInput [(ngModel)]="datos.unidadeducativa">
              </mat-form-field>
            </div>
          }

          <div class="section-header">
            <mat-icon>family_restroom</mat-icon>
            <span>Datos Familiares y Representante</span>
          </div>
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Nombre del Padre</mat-label>
              <input matInput [(ngModel)]="datos.nombrepapa">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Nombre de la Madre</mat-label>
              <input matInput [(ngModel)]="datos.nombremama">
            </mat-form-field>
          </div>
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Representante Legal</mat-label>
              <input matInput [(ngModel)]="datos.nombrerepresentante">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Teléfono Representante</mat-label>
              <input matInput [(ngModel)]="datos.telefonorepresentante">
            </mat-form-field>
          </div>
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Domicilio Representante</mat-label>
              <input matInput [(ngModel)]="datos.domiciliorepresentante">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Lugar y Fecha Certificado</mat-label>
              <input matInput [(ngModel)]="datos.lugarfechacertificado">
            </mat-form-field>
          </div>

        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="dialogRef.close()" class="btn-cancelar">CANCELAR</button>
        <button mat-raised-button (click)="dialogRef.close(datos)" class="btn-guardar">
          <mat-icon>save</mat-icon> GUARDAR CAMBIOS
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      overflow: hidden;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: linear-gradient(135deg, #1a2a5e, #0d1a3e);
      color: white;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 12px;

      mat-icon { color: #c8a84b; }
      h2 { margin: 0; font-size: 17px; font-weight: 700; }
    }

    .close-btn { color: rgba(255,255,255,0.7); }

    .custom-content {
      padding: 24px !important;
      overflow-x: hidden;
    }

    .form-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 20px 0 10px;
      color: #1a2a5e;
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 2px solid #f0f2f8;
      padding-bottom: 6px;

      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #c8a84b; }
    }

    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      width: 100%;
    }

    .row-3 { grid-template-columns: 1fr 1fr 1fr; }

    mat-form-field { width: 100%; }

    mat-dialog-actions {
      padding: 16px 24px !important;
      background: #f8f9fc;
      border-top: 1px solid #eee;
      gap: 12px;
    }

    .btn-guardar {
      background: linear-gradient(135deg, #1a2a5e, #2a4f9f) !important;
      color: white !important;
      padding: 0 24px !important;
    }

    .btn-cancelar { color: #666 !important; }
  `]
})
export class EditarMatriculaDialog {
  datos: any;

  constructor(
    public dialogRef: MatDialogRef<EditarMatriculaDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.datos = { ...data };
  }

  onNivelChange() {
    this.datos.tipoBachiller = '';
    this.datos.conferidoPorA1 = '';
    this.datos.conferidoPorA2 = '';
    this.datos.unidadeducativa = '';
    this.datos.especialidad = '';
  }
}

// ===== COMPONENTE PRINCIPAL =====
@Component({
  selector: 'app-detalle-curso',
  imports: [FormsModule, MatToolbarModule, MatButtonModule, MatIconModule, MatCardModule,
    MatTableModule, MatProgressSpinnerModule, MatSnackBarModule, MatDialogModule, 
    MatFormFieldModule, MatInputModule, DatePipe],

  templateUrl: './detalle-curso.html',
  styleUrl: './detalle-curso.scss'
})
export class DetalleCurso implements OnInit {
  curso: any = null;
  loading = true;
  descargando: number | null = null;
  columnas = ['nombres', 'apellidos', 'cedula', 'telefono', 'acciones'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cursoService: CursoService,
    private matriculaService: MatriculaService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cursoService.obtenerCurso(id).subscribe({
      next: (curso) => {
        this.curso = curso;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  irAMatricular() {
    this.router.navigate(['/matriculas/nueva'], { queryParams: { cursoId: this.curso.id } });
  }

  irANotas() {
    this.router.navigate(['/cursos', this.curso.id, 'notas']);
  }

  irACuadroFinal() {
    this.router.navigate(['/supletorios', this.curso.id]);
  }

  editarMatricula(matricula: any) {
    const dialogRef = this.dialog.open(EditarMatriculaDialog, {
      width: '1000px',
      maxHeight: '90vh',
      data: { ...matricula }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.matriculaService.actualizarMatricula(matricula.id, result).subscribe({
          next: () => {
            this.snackBar.open('Estudiante actualizado', 'OK', { duration: 3000 });
            this.ngOnInit();
          },
          error: () => this.snackBar.open('Error al actualizar', 'OK', { duration: 3000 })
        });
      }
    });
  }

  eliminarEstudiante(matricula: any) {
    if (confirm(`¿Eliminar a ${matricula.nombres} ${matricula.apellidos}?`)) {
      this.matriculaService.eliminarMatricula(matricula.id).subscribe({
        next: () => {
          this.snackBar.open('Estudiante eliminado', 'OK', { duration: 3000 });
          this.ngOnInit();
        },
        error: () => this.snackBar.open('Error al eliminar', 'OK', { duration: 3000 })
      });
    }
  }

  descargarMatricula(matricula: any) {
    this.descargando = matricula.id;
    this.matriculaService.descargarMatricula(matricula.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `matricula_${matricula.cedula}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.descargando = null;
      },
      error: () => {
        this.descargando = null;
        this.snackBar.open('Error al descargar matrícula', 'OK', { duration: 3000 });
      }
    });
  }

  descargarCertificado(matricula: any) {
    this.descargando = matricula.id;
    this.matriculaService.descargarCertificado(matricula.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado_${matricula.cedula}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.descargando = null;
      },
      error: () => {
        this.descargando = null;
        this.snackBar.open('Error al descargar certificado', 'OK', { duration: 3000 });
      }
    });
  }


nuevaSubmateriaUnica = '';

getSubmateriasUnicas(): any[] {
  const subs = this.curso?.materias?.filter((m: any) => m.esSubmateria && m.materiaParent === 'Práctica') || [];
  return subs;
}

// ── Vista organizada de materias del curso ──
expandido: { [parent: string]: boolean } = { 'disciplina': false };

toggleParent(parent: string) {
  this.expandido[parent] = !this.expandido[parent];
}

// Submaterias de un parent ('Práctica' | 'Teoría'), ordenadas por nombre
getSubmateriasDe(parent: string): any[] {
  return (this.curso?.materias?.filter((m: any) => m.esSubmateria && m.materiaParent === parent) || [])
    .sort((a: any, b: any) => (a.nombre || '').localeCompare(b.nombre || ''));
}

// Materias normales (ni Práctica/Teoría principales ni submaterias)
getMateriasNormales(): any[] {
  return (this.curso?.materias?.filter((m: any) =>
    !m.esSubmateria && m.nombre !== 'Práctica' && m.nombre !== 'Teoría') || [])
    .sort((a: any, b: any) => (a.nombre || '').localeCompare(b.nombre || ''));
}

// Nombre del docente encargado de una materia (o 'Sin asignar')
docenteDe(materia: any): string {
  const d = materia?.profesor;
  return d ? `${d.nombre} ${d.apellido}` : 'Sin asignar';
}

agregarSubmateriaDoble() {
  const nombre = this.nuevaSubmateriaUnica?.trim();
  if (!nombre) {
    this.snackBar.open('Ingresa el nombre de la submateria', 'OK', { duration: 3000 });
    return;
  }
  this.cursoService.agregarSubmateria(this.curso.id, nombre).subscribe({
    next: () => {
      this.snackBar.open('Submateria agregada en Práctica y Teoría', 'OK', { duration: 3000 });
      this.nuevaSubmateriaUnica = '';
      this.ngOnInit();
    },
    error: () => this.snackBar.open('Error al agregar submateria', 'OK', { duration: 3000 })
  });
}

eliminarSubmateriaDoble(nombre: string) {
  if (confirm(`¿Eliminar "${nombre}" de Práctica y Teoría?`)) {
    const subs = this.curso?.materias?.filter((m: any) => m.esSubmateria && m.nombre === nombre) || [];
    const deletes = subs.map((s: any) => this.cursoService.eliminarSubmateria(s.id));
    let completados = 0;
    deletes.forEach((d: any) => d.subscribe({
      next: () => {
        completados++;
        if (completados === deletes.length) {
          this.snackBar.open('Submateria eliminada', 'OK', { duration: 3000 });
          this.ngOnInit();
        }
      },
      error: () => this.snackBar.open('Error al eliminar', 'OK', { duration: 3000 })
    }));
  }
}

  volver() {
    this.router.navigate(['/cursos']);
  }
}
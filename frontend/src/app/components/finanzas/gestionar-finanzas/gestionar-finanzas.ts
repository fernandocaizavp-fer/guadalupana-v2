import { Component, OnInit, ChangeDetectorRef, TemplateRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, finalize } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CursoService } from '../../../services/curso';
import { LoadingService } from '../../../services/loading';
import {
  FinanzasService, ComprobantePendiente, EstudianteFinanzas, EstadoCuenta, Deuda, Comprobante,
  ETIQUETA_ESTADO, estadoVisible, dinero, MetodoManual, NOMBRE_METODO
} from '../../../services/finanzas';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { FotoPerfil } from '../../../shared/foto-perfil/foto-perfil';

@Component({
  selector: 'app-gestionar-finanzas',
  imports: [FormsModule, MatToolbarModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatSnackBarModule, DatePipe, FotoPerfil],
  templateUrl: './gestionar-finanzas.html',
  styleUrl: './gestionar-finanzas.scss'
})
export class GestionarFinanzas implements OnInit {
  @ViewChild('modalRechazo') modalRechazo!: TemplateRef<unknown>;
  @ViewChild('modalPago') modalPago!: TemplateRef<unknown>;
  @ViewChild('modalEditarPago') modalEditarPago!: TemplateRef<unknown>;

  etiquetas = ETIQUETA_ESTADO;
  estado = estadoVisible;
  dinero = dinero;

  // Bandeja: comprobantes en revisión de todos los cursos.
  pendientes: ComprobantePendiente[] = [];

  // Consulta por curso → estudiante.
  cursos: any[] = [];
  cursoId: number | null = null;
  estudiantes: EstudianteFinanzas[] = [];
  estudiantesCargados = false;
  seleccionado: EstudianteFinanzas | null = null;
  cuenta: EstadoCuenta | null = null;

  motivoRechazo = '';

  // Modales de pago manual: método elegido y datos del concepto en curso.
  nombreMetodo = NOMBRE_METODO;
  metodoPago: MetodoManual = 'EFECTIVO';
  pagoEnCurso: { concepto: string; monto: number; esManual: boolean; fecha?: string } | null = null;
  // En el modal de edición, el motivo de anulación solo aparece tras pulsar "Anular pago".
  anulando = false;
  motivoAnulacion = '';

  constructor(
    private finanzasService: FinanzasService,
    private cursoService: CursoService,
    private loadingService: LoadingService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarPendientes(true);
    this.cursoService.listarCursos().subscribe({
      next: (cursos) => {
        this.cursos = cursos;
        this.cdr.detectChanges();
      },
      error: () => this.snackBar.open('Error al cargar los cursos', 'OK', { duration: 3000 })
    });
  }

  // Ejecuta una petición con el indicador de carga global.
  private conCarga<T>(peticion: Observable<T>): Observable<T> {
    this.loadingService.mostrar();
    return peticion.pipe(finalize(() => this.loadingService.ocultar()));
  }

  private avisarError(e: any, porDefecto: string) {
    this.snackBar.open(e?.error?.error || porDefecto, 'OK', { duration: 4000 });
    this.cdr.detectChanges();
  }

  cargarPendientes(conIndicador = false) {
    const peticion = this.finanzasService.comprobantesPendientes();
    (conIndicador ? this.conCarga(peticion) : peticion).subscribe({
      next: (pendientes) => {
        this.pendientes = pendientes;
        this.cdr.detectChanges();
      },
      error: (e) => this.avisarError(e, 'Error al cargar los comprobantes por revisar')
    });
  }

  nombreCurso(c: ComprobantePendiente): string {
    return c.deuda.estudiante.matricula?.curso.ramaArtesanal || 'Sin curso';
  }

  onCurso() {
    this.seleccionado = null;
    this.cuenta = null;
    this.estudiantes = [];
    this.estudiantesCargados = false;
    if (this.cursoId === null) return;
    this.cargarEstudiantes(true);
  }

  private cargarEstudiantes(conIndicador = false) {
    if (this.cursoId === null) return;
    const peticion = this.finanzasService.estudiantesCurso(this.cursoId);
    (conIndicador ? this.conCarga(peticion) : peticion).subscribe({
      next: (estudiantes) => {
        this.estudiantes = estudiantes;
        this.estudiantesCargados = true;
        // Mantiene abierto al estudiante seleccionado con sus totales al día.
        if (this.seleccionado) {
          this.seleccionado = estudiantes.find((e) => e.usuarioId === this.seleccionado!.usuarioId) || null;
        }
        this.cdr.detectChanges();
      },
      error: (e) => this.avisarError(e, 'Error al cargar los estudiantes')
    });
  }

  abrirEstudiante(estudiante: EstudianteFinanzas) {
    if (this.seleccionado?.usuarioId === estudiante.usuarioId) {
      this.seleccionado = null;
      this.cuenta = null;
      return;
    }
    this.seleccionado = estudiante;
    this.cuenta = null;
    this.cargarCuenta(true);
  }

  private cargarCuenta(conIndicador = false) {
    if (!this.seleccionado) return;
    const peticion = this.finanzasService.estadoCuenta(this.seleccionado.usuarioId);
    (conIndicador ? this.conCarga(peticion) : peticion).subscribe({
      next: (cuenta) => {
        this.cuenta = cuenta;
        this.cdr.detectChanges();
      },
      error: (e) => this.avisarError(e, 'Error al cargar el estado de cuenta')
    });
  }

  // Tras cualquier cambio se refresca todo lo visible para no mostrar datos viejos.
  private refrescar() {
    this.cargarPendientes();
    this.cargarEstudiantes();
    this.cargarCuenta();
  }

  enRevision(deuda: Deuda): Comprobante | null {
    return deuda.comprobantes.find((c) => c.estado === 'EN_REVISION') || null;
  }

  // Último pago aprobado (para mostrar cómo se pagó un concepto ya cancelado).
  aprobado(deuda: Deuda): Comprobante | null {
    return deuda.comprobantes.find((c) => c.estado === 'APROBADO') || null;
  }

  aprobar(comprobanteId: number, concepto: string, estudiante: string) {
    this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        titulo: 'Aprobar comprobante',
        mensaje: `¿Confirmas que el comprobante de "${concepto}" de ${estudiante} es válido? El concepto quedará pagado.`,
        confirmText: 'Aprobar',
        cancelText: 'Cancelar',
        icon: 'check_circle'
      }
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.conCarga(this.finanzasService.aprobarComprobante(comprobanteId)).subscribe({
        next: () => {
          this.snackBar.open('Comprobante aprobado', 'OK', { duration: 3000 });
          this.refrescar();
        },
        error: (e) => {
          this.avisarError(e, 'Error al aprobar el comprobante');
          this.refrescar();
        }
      });
    });
  }

  rechazar(comprobanteId: number) {
    this.motivoRechazo = '';
    this.dialog.open(this.modalRechazo, { width: '440px', maxWidth: '95vw' })
      .afterClosed().subscribe((confirmado) => {
        if (!confirmado) return;
        this.conCarga(this.finanzasService.rechazarComprobante(comprobanteId, this.motivoRechazo.trim())).subscribe({
          next: () => {
            this.snackBar.open('Comprobante rechazado', 'OK', { duration: 3000 });
            this.refrescar();
          },
          error: (e) => {
            this.avisarError(e, 'Error al rechazar el comprobante');
            this.refrescar();
          }
        });
      });
  }

  // Pago recibido fuera del sistema: el administrador elige efectivo o transferencia.
  registrarPago(deuda: Deuda) {
    this.metodoPago = 'EFECTIVO';
    this.pagoEnCurso = { concepto: deuda.concepto, monto: deuda.saldo, esManual: true };
    this.dialog.open(this.modalPago, { width: '440px', maxWidth: '95vw' })
      .afterClosed().subscribe((ok) => {
        if (!ok) return;
        this.conCarga(this.finanzasService.registrarPago(deuda.id, this.metodoPago)).subscribe({
          next: (res) => {
            this.snackBar.open(res?.message || 'Pago registrado', 'OK', { duration: 3000 });
            this.refrescar();
          },
          error: (e) => {
            this.avisarError(e, 'Error al registrar el pago');
            this.refrescar();
          }
        });
      });
  }

  // Editar un pago ya procesado: cambiar el método (solo pagos manuales) o
  // anularlo para que el concepto vuelva a quedar pendiente.
  editarPago(deuda: Deuda, pago: Comprobante) {
    const esManual = pago.metodo === 'EFECTIVO' || pago.metodo === 'TRANSFERENCIA';
    this.metodoPago = pago.metodo === 'TRANSFERENCIA' ? 'TRANSFERENCIA' : 'EFECTIVO';
    this.motivoAnulacion = '';
    this.anulando = false;
    this.pagoEnCurso = { concepto: deuda.concepto, monto: pago.montoAbonado, esManual, fecha: pago.fechaSubida };
    this.dialog.open(this.modalEditarPago, { width: '460px', maxWidth: '95vw' })
      .afterClosed().subscribe((accion: 'guardar' | 'anular' | undefined) => {
        if (accion === 'guardar') {
          if (pago.metodo === this.metodoPago) return;
          this.conCarga(this.finanzasService.cambiarMetodo(pago.id, this.metodoPago)).subscribe({
            next: (res) => {
              this.snackBar.open(res?.message || 'Método actualizado', 'OK', { duration: 3000 });
              this.refrescar();
            },
            error: (e) => {
              this.avisarError(e, 'Error al cambiar el método de pago');
              this.refrescar();
            }
          });
        } else if (accion === 'anular') {
          // La confirmación ya ocurrió dentro del modal ("Anular pago" → "Confirmar anulación").
          this.anularPago(pago);
        }
      });
  }

  private anularPago(pago: Comprobante) {
    this.conCarga(this.finanzasService.anularPago(pago.id, this.motivoAnulacion.trim())).subscribe({
      next: () => {
        this.snackBar.open('Pago anulado: el concepto vuelve a estar pendiente', 'OK', { duration: 3500 });
        this.refrescar();
      },
      error: (e) => {
        this.avisarError(e, 'Error al anular el pago');
        this.refrescar();
      }
    });
  }

  irAConceptos() {
    this.router.navigate(['/configuracion'], { fragment: 'finanzas' });
  }

  volver() {
    this.router.navigate(['/dashboard']);
  }
}

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../services/auth';
import { FinanzasService } from '../../services/finanzas';
import { PortalService } from '../../services/portal';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-dashboard',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatCardModule, MatDialogModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  usuario: any;

  // Comprobantes de pago en revisión (globo rojo de la tarjeta de Finanzas).
  comprobantesPendientes = 0;
  // Prospectos de la landing sin contactar (globo de la tarjeta de Prospectos).
  prospectosPendientes = 0;

  constructor(
    private authService: AuthService,
    private finanzasService: FinanzasService,
    private portalService: PortalService,
    private router: Router,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {
    this.usuario = this.authService.getUsuario();
  }

  ngOnInit() {
    // Se consulta al cargar el panel. Si falla, simplemente no se muestra el globo.
    if (this.usuario?.rol !== 'ADMIN') return;
    this.finanzasService.contarPendientes().subscribe({
      next: (total) => {
        this.comprobantesPendientes = total;
        this.cdr.detectChanges();
      },
      error: () => { /* silencioso */ }
    });
    this.portalService.contarProspectosPendientes().subscribe({
      next: (total) => {
        this.prospectosPendientes = total;
        this.cdr.detectChanges();
      },
      error: () => { /* silencioso */ }
    });
  }

  irANuevaMatricula() {
    this.router.navigate(['/matriculas/nueva']);
  }

  irAReportes() {
    this.router.navigate(['/reportes']);
  }

  irAFinanzas() {
    this.router.navigate(['/finanzas']);
  }

  // Gestión del Portal Web: cada tarjeta abre directamente su pantalla.
  irAProspectos() {
    this.router.navigate(['/portal-web/prospectos']);
  }

  irAAnunciosPublicos() {
    this.router.navigate(['/portal-web/anuncios']);
  }

  irAGaleriaWeb() {
    this.router.navigate(['/portal-web/galeria']);
  }

  irACalendarioPublico() {
    this.router.navigate(['/portal-web/calendario']);
  }

  irAConfiguracion() {
    this.router.navigate(['/configuracion']);
  }

  irAIngresoMasivo() {
    this.router.navigate(['/ingreso-masivo']);
  }

  irACursos() {
    this.router.navigate(['/cursos']);
  }

  irADocentes() {
    this.router.navigate(['/docentes']);
  }

  irAAnuncios() {
    this.router.navigate(['/anuncios']);
  }

  irADocumentos() {
    this.router.navigate(['/documentos']);
  }

  logout() {
    this.dialog.open(ConfirmDialog, {
      width: '380px',
      data: {
        titulo: 'Cerrar sesión',
        mensaje: '¿Estás seguro de que deseas cerrar sesión?',
        confirmText: 'Cerrar sesión',
        cancelText: 'Cancelar',
        icon: 'logout'
      }
    }).afterClosed().subscribe(ok => {
      if (ok) {
        this.authService.logout();
        this.router.navigate(['/login']);
      }
    });
  }
}
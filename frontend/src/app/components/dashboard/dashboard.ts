import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../services/auth';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-dashboard',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatCardModule, MatDialogModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard {
  usuario: any;

  constructor(
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog
  ) {
    this.usuario = this.authService.getUsuario();
  }

  irANuevaMatricula() {
    this.router.navigate(['/matriculas/nueva']);
  }

  irAReportes() {
    this.router.navigate(['/reportes']);
  }

  irAConfiguracion() {
    this.router.navigate(['/configuracion']);
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
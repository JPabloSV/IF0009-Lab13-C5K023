import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { RecetaService } from '../../services/receta.service';
import { EstadoReceta, FiltroEstado, Receta } from '../../models/receta.models';

@Component({
  selector: 'app-recetas-list',
  imports: [DatePipe, RouterLink],
  templateUrl: './recetas-list.component.html',
  styleUrl: './recetas-list.component.css'
})
export class RecetasListComponent implements OnInit {
  private readonly recetaService = inject(RecetaService);

  readonly filtros: FiltroEstado[] = ['TODAS', 'PENDIENTE', 'DESPACHADA', 'CANCELADA'];

  // Estado del componente con signals
  readonly recetas = signal<Receta[]>([]);
  readonly filtro = signal<FiltroEstado>('TODAS');
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  readonly procesandoId = signal<number | null>(null);

  // Se recalcula automáticamente cuando cambia `recetas` o `filtro`
  readonly recetasFiltradas = computed(() => {
    const filtro = this.filtro();
    const lista = this.recetas();
    return filtro === 'TODAS' ? lista : lista.filter(r => r.estado === filtro);
  });

  // Contadores para cada pestaña del filtro
  readonly contadores = computed(() => {
    const lista = this.recetas();
    return {
      TODAS: lista.length,
      PENDIENTE: lista.filter(r => r.estado === 'PENDIENTE').length,
      DESPACHADA: lista.filter(r => r.estado === 'DESPACHADA').length,
      CANCELADA: lista.filter(r => r.estado === 'CANCELADA').length
    } satisfies Record<FiltroEstado, number>;
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.recetaService.listar().subscribe({
      next: data => {
        this.recetas.set(data);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.mensajeError(err));
        this.cargando.set(false);
      }
    });
  }

  cambiarEstado(receta: Receta, estado: EstadoReceta): void {
    const accion = estado === 'DESPACHADA' ? 'despachar' : 'cancelar';
    if (!confirm(`¿Desea ${accion} la receta ${receta.codigoReceta}?`)) return;

    this.procesandoId.set(receta.id);
    this.error.set(null);
    this.mensaje.set(null);

    this.recetaService.cambiarEstado(receta.id, estado).subscribe({
      next: actualizada => {
        // Reemplaza solo la receta modificada; computed() actualiza la tabla solo
        this.recetas.update(lista => lista.map(r => (r.id === actualizada.id ? actualizada : r)));
        this.mensaje.set(`Receta ${actualizada.codigoReceta} marcada como ${actualizada.estado}.`);
        this.procesandoId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.mensajeError(err));
        this.procesandoId.set(null);
      }
    });
  }

  claseBadge(estado: EstadoReceta): string {
    return `badge badge-${estado.toLowerCase()}`;
  }

  private mensajeError(err: HttpErrorResponse): string {
    if (err.status === 0) return 'No se pudo conectar con el servidor.';
    return err.error?.detail ?? `Error ${err.status}`;
  }
}
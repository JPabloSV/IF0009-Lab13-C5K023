import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormArray, FormGroup, FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MedicamentoService } from '../../services/medicamento.service';
import { RecetaService } from '../../services/receta.service';
import { Medicamento, RecetaRequest } from '../../models/receta.models';
import { positivoValidator } from '../../validators/positivo.validator';

type DetalleForm = FormGroup<{
  medicamentoId: FormControl<number | null>;
  cantidad: FormControl<number | null>;
  dosisIndicada: FormControl<string>;
}>;

@Component({
  selector: 'app-receta-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './receta-form.component.html',
  styleUrl: './receta-form.component.css'
})
export class RecetaFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly recetaService = inject(RecetaService);
  private readonly medicamentoService = inject(MedicamentoService);
  private readonly router = inject(Router);

  readonly medicamentos = signal<Medicamento[]>([]);
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);
  readonly erroresServidor = signal<string[]>([]);

  readonly form = this.fb.group({
    pacienteNombre: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(120)]],
    detalles: this.fb.array<DetalleForm>([this.crearDetalle()])
  });

  get pacienteNombre() { return this.form.controls.pacienteNombre; }
  get detalles(): FormArray<DetalleForm> { return this.form.controls.detalles; }

  ngOnInit(): void {
    this.medicamentoService.listar().subscribe({
      next: data => this.medicamentos.set(data),
      error: () => this.error.set('No se pudo cargar el catálogo de medicamentos.')
    });
  }

  private crearDetalle(): DetalleForm {
    return this.fb.group({
      medicamentoId: this.fb.control<number | null>(null, Validators.required),
      cantidad: this.fb.control<number | null>(1, [Validators.required, positivoValidator]),
      dosisIndicada: this.fb.control('', [Validators.required, Validators.maxLength(255)])
    });
  }

  agregarDetalle(): void {
    this.detalles.push(this.crearDetalle());
  }

  quitarDetalle(index: number): void {
    if (this.detalles.length > 1) {
      this.detalles.removeAt(index);
    }
  }

  // Muestra el error solo después de que el usuario tocó el campo
  invalido(control: FormControl<unknown>): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  stockDe(medicamentoId: number | null): number | null {
    return this.medicamentos().find(m => m.id === medicamentoId)?.stock ?? null;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue();
    const request: RecetaRequest = {
      pacienteNombre: valor.pacienteNombre.trim(),
      detalles: valor.detalles.map(d => ({
        medicamentoId: d.medicamentoId!,
        cantidad: Number(d.cantidad),
        dosisIndicada: d.dosisIndicada.trim()
      }))
    };

    this.enviando.set(true);
    this.error.set(null);
    this.erroresServidor.set([]);

    this.recetaService.crear(request).subscribe({
      next: () => this.router.navigate(['/recetas']),
      error: (err: HttpErrorResponse) => {
        this.enviando.set(false);
        this.error.set(err.status === 0
          ? 'No se pudo conectar con el servidor.'
          : err.error?.detail ?? `Error ${err.status}`);
        // Errores de validación por campo que devuelve el GlobalExceptionHandler
        const errores = err.error?.errores as Record<string, string> | undefined;
        if (errores) {
          this.erroresServidor.set(Object.entries(errores).map(([campo, msg]) => `${campo}: ${msg}`));
        }
      }
    });
  }
}
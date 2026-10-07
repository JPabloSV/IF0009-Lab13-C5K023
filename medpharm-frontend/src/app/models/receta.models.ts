export type EstadoReceta = 'PENDIENTE' | 'DESPACHADA' | 'CANCELADA';
export type FiltroEstado = 'TODAS' | EstadoReceta;

export interface Medicamento {
  id: number;
  codigo: string;
  nombre: string;
  stock: number;
  precioUnitario: number;
}

export interface DetalleReceta {
  id: number;
  medicamentoId: number;
  medicamentoCodigo: string;
  medicamentoNombre: string;
  cantidad: number;
  dosisIndicada: string;
}

export interface Receta {
  id: number;
  codigoReceta: string;
  pacienteNombre: string;
  medicoNombre: string;
  estado: EstadoReceta;
  fechaEmision: string;
  detalles: DetalleReceta[];
}

export interface DetalleRecetaRequest {
  medicamentoId: number;
  cantidad: number;
  dosisIndicada: string;
}

export interface RecetaRequest {
  pacienteNombre: string;
  detalles: DetalleRecetaRequest[];
}
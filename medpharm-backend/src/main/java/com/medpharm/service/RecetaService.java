package com.medpharm.service;

import com.medpharm.dto.*;
import com.medpharm.exception.RecursoNoEncontradoException;
import com.medpharm.exception.ReglaNegocioException;
import com.medpharm.model.DetalleReceta;
import com.medpharm.model.Medicamento;
import com.medpharm.model.RecetaMedica;
import com.medpharm.model.Usuario;
import com.medpharm.repository.MedicamentoRepository;
import com.medpharm.repository.RecetaMedicaRepository;
import com.medpharm.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Year;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecetaService {

    private static final Set<String> ESTADOS = Set.of("PENDIENTE", "DESPACHADA", "CANCELADA");

    private final RecetaMedicaRepository recetaRepository;
    private final MedicamentoRepository medicamentoRepository;
    private final UsuarioRepository usuarioRepository;

    public List<RecetaResponseDTO> listar() {
        return recetaRepository.findAllByOrderByFechaEmisionDesc().stream()
                .map(this::toDTO)
                .toList();
    }

    public List<RecetaResponseDTO> listarPorEstado(String estado) {
        return recetaRepository.findByEstado(normalizarEstado(estado)).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional
    public RecetaResponseDTO crear(RecetaRequestDTO request, String username) {
        Usuario medico = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado: " + username));

        // Suma la cantidad por medicamento, por si aparece en varios renglones
        Map<Long, Integer> totales = new HashMap<>();
        request.detalles().forEach(d -> totales.merge(d.medicamentoId(), d.cantidad(), Integer::sum));

        // Valida existencia y stock de cada medicamento
        Map<Long, Medicamento> medicamentos = new HashMap<>();
        totales.forEach((id, total) -> {
            Medicamento m = medicamentoRepository.findById(id)
                    .orElseThrow(() -> new RecursoNoEncontradoException("Medicamento no encontrado: " + id));
            if (m.getStock() < total) {
                throw new ReglaNegocioException("Stock insuficiente para %s: disponible %d, solicitado %d"
                        .formatted(m.getNombre(), m.getStock(), total));
            }
            medicamentos.put(id, m);
        });

        RecetaMedica receta = new RecetaMedica();
        receta.setCodigoReceta(generarCodigo());
        receta.setPacienteNombre(request.pacienteNombre().trim());
        receta.setMedico(medico);
        receta.setEstado("PENDIENTE");
        receta.setFechaEmision(LocalDateTime.now());

        for (DetalleRecetaRequestDTO d : request.detalles()) {
            DetalleReceta detalle = new DetalleReceta();
            detalle.setMedicamento(medicamentos.get(d.medicamentoId()));
            detalle.setCantidad(d.cantidad());
            detalle.setDosisIndicada(d.dosisIndicada().trim());
            receta.agregarDetalle(detalle);
        }

        return toDTO(recetaRepository.save(receta)); // los detalles se guardan en cascada
    }

    @Transactional
    public RecetaResponseDTO cambiarEstado(Long id, String nuevoEstado) {
        String estado = normalizarEstado(nuevoEstado);
        if (estado.equals("PENDIENTE")) {
            throw new IllegalArgumentException("Solo se permite cambiar a DESPACHADA o CANCELADA");
        }

        RecetaMedica receta = recetaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Receta no encontrada: " + id));

        if (!receta.getEstado().equals("PENDIENTE")) {
            throw new ReglaNegocioException("La receta %s ya está %s y no puede modificarse"
                    .formatted(receta.getCodigoReceta(), receta.getEstado()));
        }

        if (estado.equals("DESPACHADA")) {
            for (DetalleReceta d : receta.getDetalles()) {
                Medicamento m = d.getMedicamento();
                if (m.getStock() < d.getCantidad()) {
                    // La excepción hace rollback de cualquier descuento previo
                    throw new ReglaNegocioException("Stock insuficiente para despachar %s: disponible %d, requerido %d"
                            .formatted(m.getNombre(), m.getStock(), d.getCantidad()));
                }
                m.setStock(m.getStock() - d.getCantidad());
            }
        }

        receta.setEstado(estado);
        return toDTO(receta); // no hace falta save(): la entidad está gestionada por la transacción
    }

    private String normalizarEstado(String estado) {
        String e = estado == null ? "" : estado.trim().toUpperCase();
        if (!ESTADOS.contains(e)) {
            throw new IllegalArgumentException("Estado inválido: '%s'. Valores permitidos: %s".formatted(estado, ESTADOS));
        }
        return e;
    }

    private String generarCodigo() {
        return "REC-%d-%03d".formatted(Year.now().getValue(), recetaRepository.count() + 1);
    }

    private RecetaResponseDTO toDTO(RecetaMedica r) {
        List<DetalleRecetaResponseDTO> detalles = r.getDetalles().stream()
                .map(d -> new DetalleRecetaResponseDTO(
                        d.getId(),
                        d.getMedicamento().getId(),
                        d.getMedicamento().getCodigo(),
                        d.getMedicamento().getNombre(),
                        d.getCantidad(),
                        d.getDosisIndicada()))
                .toList();

        return new RecetaResponseDTO(r.getId(), r.getCodigoReceta(), r.getPacienteNombre(),
                r.getMedico().getNombreCompleto(), r.getEstado(), r.getFechaEmision(), detalles);
    }
}
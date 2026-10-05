package com.medpharm.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RecetaRequestDTO(
        @NotBlank(message = "El nombre del paciente es requerido")
        @Size(min = 5, max = 120, message = "El nombre del paciente debe tener entre 5 y 120 caracteres")
        String pacienteNombre,

        @NotEmpty(message = "La receta debe tener al menos un medicamento")
        List<@Valid DetalleRecetaRequestDTO> detalles
) {}
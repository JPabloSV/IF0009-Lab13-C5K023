package com.medpharm.dto;

import jakarta.validation.constraints.NotBlank;

public record CambioEstadoDTO(@NotBlank(message = "El estado es requerido") String estado) {}
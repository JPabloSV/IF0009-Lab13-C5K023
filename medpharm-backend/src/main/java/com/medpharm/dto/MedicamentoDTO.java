package com.medpharm.dto;

import java.math.BigDecimal;

public record MedicamentoDTO(Long id, String codigo, String nombre, Integer stock, BigDecimal precioUnitario) {}
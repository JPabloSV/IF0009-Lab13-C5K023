package com.medpharm.controller;

import com.medpharm.dto.CambioEstadoDTO;
import com.medpharm.dto.RecetaRequestDTO;
import com.medpharm.dto.RecetaResponseDTO;
import com.medpharm.service.RecetaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/recetas")
@RequiredArgsConstructor
public class RecetaController {

    private final RecetaService recetaService;

    @GetMapping
    public List<RecetaResponseDTO> listar() {
        return recetaService.listar();
    }

    @GetMapping("/estado/{estado}")
    public List<RecetaResponseDTO> listarPorEstado(@PathVariable String estado) {
        return recetaService.listarPorEstado(estado);
    }

    @PostMapping
    public ResponseEntity<RecetaResponseDTO> crear(@Valid @RequestBody RecetaRequestDTO request,
                                                   Authentication authentication) {
        // authentication.getName() = username que el AuthTokenFilter sacó del JWT
        RecetaResponseDTO creada = recetaService.crear(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(creada);
    }

    @PatchMapping("/{id}/estado")
    public RecetaResponseDTO cambiarEstado(@PathVariable Long id,
                                           @Valid @RequestBody CambioEstadoDTO request) {
        return recetaService.cambiarEstado(id, request.estado());
    }
}
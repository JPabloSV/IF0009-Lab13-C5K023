package com.medpharm.controller;

import com.medpharm.dto.MedicamentoDTO;
import com.medpharm.service.MedicamentoService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/medicamentos")
@RequiredArgsConstructor
public class MedicamentoController {

    private final MedicamentoService medicamentoService;

    @GetMapping
    public List<MedicamentoDTO> listar() {
        return medicamentoService.listar();
    }
}
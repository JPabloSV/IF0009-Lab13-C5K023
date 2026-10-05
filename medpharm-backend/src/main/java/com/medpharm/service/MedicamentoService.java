package com.medpharm.service;

import com.medpharm.dto.MedicamentoDTO;
import com.medpharm.repository.MedicamentoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MedicamentoService {

    private final MedicamentoRepository medicamentoRepository;

    public List<MedicamentoDTO> listar() {
        return medicamentoRepository.findAll(Sort.by("nombre")).stream()
                .map(m -> new MedicamentoDTO(m.getId(), m.getCodigo(), m.getNombre(),
                        m.getStock(), m.getPrecioUnitario()))
                .toList();
    }
}
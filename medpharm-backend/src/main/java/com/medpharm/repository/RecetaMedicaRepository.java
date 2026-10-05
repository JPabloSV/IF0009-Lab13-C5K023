package com.medpharm.repository;

import com.medpharm.model.RecetaMedica;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecetaMedicaRepository extends JpaRepository<RecetaMedica, Long> {
    List<RecetaMedica> findByEstado(String estado);
    List<RecetaMedica> findAllByOrderByFechaEmisionDesc();
}
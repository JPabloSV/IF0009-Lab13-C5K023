package com.medpharm.controller;

import com.medpharm.dto.AuthResponseDTO;
import com.medpharm.dto.LoginRequestDTO;
import com.medpharm.model.Usuario;
import com.medpharm.repository.UsuarioRepository;
import com.medpharm.security.JwtUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UsuarioRepository usuarioRepository;

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));

        Usuario usuario = usuarioRepository.findByUsername(request.username()).orElseThrow();
        String token = jwtUtils.generarToken(usuario.getUsername(), usuario.getRol());

        return ResponseEntity.ok(new AuthResponseDTO(token, usuario.getUsername(), usuario.getRol()));
    }
}
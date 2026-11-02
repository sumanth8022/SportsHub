package com.sportshub.exception;

import com.sportshub.dto.ApiDtos.ErrorResponse;
import com.sportshub.service.BookingService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import java.time.LocalDateTime;
import java.util.NoSuchElementException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private ResponseEntity<ErrorResponse> e(HttpStatus s, String m, HttpServletRequest r) {
        return ResponseEntity.status(s).body(new ErrorResponse(LocalDateTime.now(), s.value(), s.getReasonPhrase(), m, r.getRequestURI()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorResponse> v(MethodArgumentNotValidException x, HttpServletRequest r) {
        return e(HttpStatus.BAD_REQUEST, x.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(f -> f.getField() + ": " + f.getDefaultMessage())
            .orElse("Invalid request."), r);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ErrorResponse> b(IllegalArgumentException x, HttpServletRequest r) {
        return e(HttpStatus.BAD_REQUEST, x.getMessage(), r);
    }

    @ExceptionHandler(BookingService.SlotTakenException.class)
    ResponseEntity<ErrorResponse> c(BookingService.SlotTakenException x, HttpServletRequest r) {
        return e(HttpStatus.CONFLICT, x.getMessage(), r);
    }

    @ExceptionHandler(BookingService.CapacityExceededException.class)
    ResponseEntity<ErrorResponse> ce(BookingService.CapacityExceededException x, HttpServletRequest r) {
        return e(HttpStatus.CONFLICT, x.getMessage(), r);
    }

    @ExceptionHandler(NoSuchElementException.class)
    ResponseEntity<ErrorResponse> n(NoSuchElementException x, HttpServletRequest r) {
        return e(HttpStatus.NOT_FOUND, x.getMessage(), r);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ErrorResponse> nr(NoResourceFoundException x, HttpServletRequest r) {
        return e(HttpStatus.NOT_FOUND, x.getMessage(), r);
    }

    @ExceptionHandler(IllegalStateException.class)
    ResponseEntity<ErrorResponse> s(IllegalStateException x, HttpServletRequest r) {
        return e(HttpStatus.CONFLICT, x.getMessage(), r);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> o(Exception x, HttpServletRequest r) {
        x.printStackTrace();
        return e(HttpStatus.INTERNAL_SERVER_ERROR, x.getClass().getName() + ": " + x.getMessage(), r);
    }
}

<?php

/*
|--------------------------------------------------------------------------
| Modo demo
|--------------------------------------------------------------------------
| Con DEMO_MODE=true el sistema muestra un aviso con las credenciales de
| prueba, protege al usuario demo y permite reiniciar los datos con
| `php artisan demo:reset` (pensado para una tarea programada cada hora).
| En producción deja DEMO_MODE=false (o sin definir) y nada de esto se activa.
*/

return [
    'enabled' => (bool) env('DEMO_MODE', false),

    // Credenciales visibles para quien prueba el demo.
    'login' => env('DEMO_LOGIN', 'demo@wolftek.com.mx'),
    'password' => env('DEMO_PASSWORD', 'demo1234'),

    // Página de login a la que lleva el botón "Rellenar login" fuera del login.
    'login_url' => env('DEMO_LOGIN_URL', '/login'),

    // Campo con el que se inicia sesión (email o username).
    'login_field' => env('DEMO_LOGIN_FIELD', 'email'),

    // Cada cuántos minutos se reinician los datos (solo para el texto del aviso).
    'reset_minutes' => (int) env('DEMO_RESET_MINUTES', 60),

    // Seeder que carga los datos de ejemplo.
    'seeder' => env('DEMO_SEEDER', 'Database\\Seeders\\DemoModeSeeder'),

    // Comandos artisan extra a correr después de sembrar (p. ej. permisos de Shield).
    'after_reset' => array_filter(explode(';', (string) env('DEMO_AFTER_RESET', ''))),
];

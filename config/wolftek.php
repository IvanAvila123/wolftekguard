<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Registro público
    |--------------------------------------------------------------------------
    |
    | Si es false, nadie puede crear su propia cuenta desde /register; los
    | usuarios los crea un administrador con: php artisan wolftek:crear-usuario
    |
    */

    'registro_abierto' => (bool) env('WOLFTEK_REGISTRO_ABIERTO', false),

    /*
    |--------------------------------------------------------------------------
    | Límite de peticiones
    |--------------------------------------------------------------------------
    |
    | Peticiones por minuto que puede hacer cada usuario dentro de la app.
    | Alcanza de sobra para trabajar normal; frena scripts o bucles.
    |
    */

    'limite_por_minuto' => (int) env('WOLFTEK_LIMITE_POR_MINUTO', 240),

    /*
    |--------------------------------------------------------------------------
    | Respaldos
    |--------------------------------------------------------------------------
    |
    | php artisan wolftek:respaldo guarda la base de datos y los expedientes en
    | un .zip dentro de storage/app/respaldos y borra los de más de N días.
    | Se programa a diario en routes/console.php. Copia esa carpeta fuera del
    | servidor: un respaldo que vive en el mismo disco no sobrevive a perderlo.
    |
    */

    'respaldos' => [
        'carpeta' => env('WOLFTEK_RESPALDOS_CARPETA', storage_path('app/respaldos')),
        'conservar_dias' => (int) env('WOLFTEK_RESPALDOS_DIAS', 14),
        'hora' => env('WOLFTEK_RESPALDOS_HORA', '02:30'),
        // auto: mysqldump when PHP can start programs (proc_open), otherwise a plain-PHP dump
        // (shared hosting such as Hostinger). Force one with "mysqldump" or "php".
        'metodo' => env('WOLFTEK_RESPALDOS_METODO', 'auto'),
        // Path to mysqldump if it's not on the PATH (e.g. C:\xampp\mysql\bin\mysqldump.exe).
        'mysqldump' => env('WOLFTEK_MYSQLDUMP', 'mysqldump'),
    ],

];

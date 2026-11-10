<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InventarioImportController;
use App\Http\Controllers\MachoteController;
use App\Http\Controllers\MachoteUsoController;
use App\Http\Controllers\VentaController;
use App\Http\Controllers\VentaDocumentoController;
use App\Http\Controllers\VentaNotaController;
use App\Http\Controllers\VentaStatusController;
use Illuminate\Support\Facades\Route;

// The app has no public landing page: go straight to the dashboard (the auth middleware sends guests to the login).
Route::redirect('/', '/dashboard')->name('home');

Route::middleware(['auth', 'throttle:app'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    // Every screen of the app has its own URL so links can be shared and survive a reload.
    Route::get('ventas', DashboardController::class)->name('ventas.index');
    Route::get('ventas/nueva', DashboardController::class)->name('ventas.create');
    Route::get('ventas/{venta}', DashboardController::class)->whereNumber('venta')->name('ventas.show');
    Route::get('ventas/{venta}/editar', DashboardController::class)->whereNumber('venta')->name('ventas.edit');
    Route::get('ventas/{venta}/creada', DashboardController::class)->whereNumber('venta')->name('ventas.created');
    Route::get('inventario', DashboardController::class)->name('inventario');
    Route::get('machotes', DashboardController::class)->name('machotes');

    Route::post('ventas', [VentaController::class, 'store'])->name('ventas.store');
    Route::put('ventas/{venta}', [VentaController::class, 'update'])->name('ventas.update');
    Route::delete('ventas/{venta}', [VentaController::class, 'destroy'])->name('ventas.destroy');
    Route::post('ventas/{venta}/restaurar', [VentaController::class, 'restore'])->withTrashed()->name('ventas.restore');
    Route::patch('ventas/{venta}/status', VentaStatusController::class)->name('ventas.status');
    Route::post('ventas/{venta}/notas', [VentaNotaController::class, 'store'])->name('ventas.notas.store');

    Route::scopeBindings()->group(function () {
        Route::post('ventas/{venta}/documentos', [VentaDocumentoController::class, 'store'])->name('ventas.documentos.store');
        Route::get('ventas/{venta}/documentos/{documento}', [VentaDocumentoController::class, 'show'])->name('ventas.documentos.show');
        Route::delete('ventas/{venta}/documentos/{documento}', [VentaDocumentoController::class, 'destroy'])->name('ventas.documentos.destroy');
    });

    Route::get('inventario/plantilla', [InventarioImportController::class, 'plantilla'])->name('inventario.plantilla');
    Route::post('inventario/importar/vista-previa', [InventarioImportController::class, 'vistaPrevia'])->name('inventario.importar.preview');
    Route::post('inventario/importar', [InventarioImportController::class, 'store'])->name('inventario.importar');

    Route::post('machotes', [MachoteController::class, 'store'])->name('machotes.store');
    Route::put('machotes/{machote}', [MachoteController::class, 'update'])->name('machotes.update');
    Route::delete('machotes/{machote}', [MachoteController::class, 'destroy'])->name('machotes.destroy');
    Route::post('machotes/{machote}/usos', MachoteUsoController::class)->name('machotes.usos');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';

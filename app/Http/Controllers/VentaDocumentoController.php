<?php

namespace App\Http\Controllers;

use App\Http\Requests\VentaDocumentoRequest;
use App\Models\Venta;
use App\Models\VentaDocumento;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class VentaDocumentoController extends Controller
{
    /**
     * Upload one required document, or several "otros" attachments, to a sale's expediente.
     */
    public function store(VentaDocumentoRequest $request, Venta $venta): RedirectResponse
    {
        $tipo = $request->validated('tipo');
        $archivos = $request->file('archivos');

        foreach ($archivos as $archivo) {
            $venta->adjuntar($archivo, $tipo, $request->user());
        }

        $label = Venta::DOCUMENTOS[$tipo] ?? (count($archivos) === 1 ? $archivos[0]->getClientOriginalName() : count($archivos).' archivos adicionales');
        $venta->registrar('Se subió '.$label, $request->user());

        return back();
    }

    /**
     * Show an expediente file inline.
     */
    public function show(Venta $venta, VentaDocumento $documento): StreamedResponse
    {
        abort_unless($documento->path && Storage::disk(VentaDocumento::DISK)->exists($documento->path), 404);

        return Storage::disk(VentaDocumento::DISK)->response($documento->path, $documento->nombre);
    }

    /**
     * Remove a file from the expediente.
     */
    public function destroy(Request $request, Venta $venta, VentaDocumento $documento): RedirectResponse
    {
        $documento->delete();
        $venta->registrar('Se quitó '.$documento->etiqueta(), $request->user());

        return back();
    }
}

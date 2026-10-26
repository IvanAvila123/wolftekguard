<?php

namespace App\Http\Requests;

use App\Models\Venta;
use App\Models\VentaDocumento;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class VentaDocumentoRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $isOtros = $this->input('tipo') === Venta::DOCUMENTO_OTROS;

        return [
            'tipo' => ['required', Rule::in([...array_keys(Venta::DOCUMENTOS), Venta::DOCUMENTO_OTROS])],
            'archivos' => ['required', 'array', 'min:1', $isOtros ? 'max:20' : 'max:1'],
            'archivos.*' => ['required', 'file', 'max:20480', 'mimes:'.($isOtros ? VentaDocumento::MIMES_OTROS : VentaDocumento::MIMES_EXPEDIENTE)],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'archivos.*.mimes' => $this->input('tipo') === Venta::DOCUMENTO_OTROS
                ? 'Ese tipo de archivo no se acepta. Sube PDF, imágenes, Word, Excel o correos guardados.'
                : 'Solo se aceptan PDF o fotos (JPG, PNG o WEBP).',
            'archivos.*.max' => 'Cada archivo puede pesar hasta 20 MB.',
        ];
    }
}

<?php

namespace App\Http\Requests;

use App\Models\Venta;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MachoteRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'cat' => ['required', 'string', 'max:100'],
            'preset_status' => ['required', Rule::in(Venta::STATUSES)],
            'preset_prioridad' => ['required', Rule::in(Venta::PRIORIDADES)],
            'text' => ['required', 'string', 'max:10000'],
        ];
    }
}

<?php

namespace App\Http\Requests;

use App\Models\InventarioItem;
use App\Models\Venta;
use App\Models\VentaDocumento;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class VentaRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:255'],
            'razon' => ['required', 'string', 'max:255'],
            'cuenta' => ['required', 'digits:9'],
            'idcte' => ['required', 'digits:9'],
            'rfc' => ['nullable', 'string', 'min:12', 'max:13'],
            'rl' => ['nullable', 'string', 'max:255'],
            'acuerdo' => ['nullable', 'string', 'max:255'],
            'fp' => ['nullable', 'string', 'max:255'],
            'domicilio' => ['nullable', 'string', 'max:1000'],
            'encargada' => ['nullable', 'string', 'max:255'],
            'telefono' => ['nullable', 'digits:10'],
            'horario' => ['nullable', 'string', 'max:255'],
            'tipo' => ['required', 'string', 'max:255'],
            'status' => ['required', Rule::in(Venta::STATUSES)],
            'prioridad' => ['required', Rule::in(Venta::PRIORIDADES)],
            'cierre' => ['nullable', 'string', 'max:50'],
            'notas' => ['nullable', 'string', 'max:5000'],
            'meses' => ['nullable', 'array'],
            'meses.*' => ['integer', 'between:1,24'],

            'bots' => ['required', 'array', 'min:1'],
            'bots.*.costo' => ['required', 'boolean'],
            'bots.*.equipo' => ['nullable', 'string', 'max:255'],
            'bots.*.sku' => ['required', 'string', 'max:255'],
            'bots.*.plan' => ['nullable', 'string', 'max:255'],
            'bots.*.plazo' => ['nullable', 'string', 'max:50'],
            'bots.*.proteccion' => ['required', 'boolean'],
            'bots.*.dmr' => ['nullable', 'string', 'max:50'],
            'bots.*.redes' => ['nullable', 'string', 'max:255'],
            'bots.*.dns' => ['nullable', 'array'],
            'bots.*.dns.*' => ['digits:10', 'distinct'],

            'documentos' => ['nullable', 'array'],
            'documentos.*.tipo' => ['required', Rule::in([...array_keys(Venta::DOCUMENTOS), Venta::DOCUMENTO_OTROS])],
            'documentos.*.archivo' => ['required', 'file', 'max:20480', 'mimes:'.VentaDocumento::MIMES_OTROS],
            'documentos_quitar' => ['nullable', 'array'],
            'documentos_quitar.*' => ['integer'],
            'client_uuid' => ['nullable', 'uuid'],
            'version' => ['nullable', 'integer', 'min:1'],
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
            'documentos.*.archivo.mimes' => 'Uno de los documentos no es de un tipo permitido. Sube PDF, imágenes, Word, Excel o correos guardados.',
            'bots.*.dns.*.digits' => 'El DN :input debe tener 10 dígitos.',
            'bots.*.dns.*.distinct' => 'El DN :input está repetido en esta venta.',
        ];
    }

    /**
     * Get the "after" validation callables for the request.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $lineCount = collect($this->input('bots', []))->sum(fn (mixed $bot) => count((array) ($bot['dns'] ?? [])));

                if ($lineCount === 0) {
                    $validator->errors()->add('bots', 'Agrega al menos un DN.');
                }
            },
            function (Validator $validator): void {
                if ($this->botsTienenErrores($validator)) {
                    return;
                }

                $this->validarSkus($validator);
                $this->validarDnsLibres($validator);
            },
        ];
    }

    /**
     * Whether the BOTs already failed a basic rule, so the database checks are skipped.
     */
    private function botsTienenErrores(Validator $validator): bool
    {
        return collect($validator->errors()->keys())->contains(fn (string $key) => str_starts_with($key, 'bots'));
    }

    /**
     * Every BOT's SKU must be in the inventory. When editing, the SKUs the sale
     * already had are still accepted even if a later Excel import removed them.
     */
    private function validarSkus(Validator $validator): void
    {
        $skus = collect($this->input('bots'))->pluck('sku')->unique();
        $conocidos = InventarioItem::whereIn('sku', $skus)->pluck('sku');

        if ($venta = $this->ventaYaGuardada()) {
            $conocidos = $conocidos->merge($venta->bots()->pluck('sku'));
        }

        foreach ($this->input('bots') as $i => $bot) {
            if (! $conocidos->contains($bot['sku'])) {
                $validator->errors()->add("bots.{$i}.sku", "El equipo {$bot['sku']} no está en el inventario.");
            }
        }
    }

    /**
     * An open sale can't use a DN that another open sale already has, so a line is never sold twice.
     * A sale saved as rejected, cancelled or finished does not block anything.
     */
    private function validarDnsLibres(Validator $validator): void
    {
        if (in_array($this->input('status'), Venta::STATUSES_CERRADOS, true)) {
            return;
        }

        $dns = collect($this->input('bots'))->flatMap(fn (array $bot) => $bot['dns'] ?? []);

        $ocupados = Venta::dnsEnOtraVentaAbierta($dns, $this->ventaYaGuardada()?->id);

        foreach ($this->input('bots') as $i => $bot) {
            foreach ($bot['dns'] ?? [] as $k => $dn) {
                if ($otra = $ocupados->get($dn)) {
                    $validator->errors()->add("bots.{$i}.dns.{$k}", "El DN {$dn} ya está en otra venta abierta: {$otra->razon} ({$otra->status}).");
                }
            }
        }
    }

    /**
     * The sale these DNs already belong to: the one being edited, or a resend
     * of a sale that already arrived (offline outbox retry). Null for a new sale.
     */
    private function ventaYaGuardada(): ?Venta
    {
        $venta = $this->route('venta');

        if ($venta instanceof Venta) {
            return $venta;
        }

        $clientUuid = $this->input('client_uuid');

        return is_string($clientUuid) && $clientUuid !== '' ? Venta::withTrashed()->where('client_uuid', $clientUuid)->first() : null;
    }

    /**
     * The sale version the edit was made on, or null for an edit queued before versions existed.
     */
    public function versionVista(): ?int
    {
        $version = $this->validated('version');

        return $version === null ? null : (int) $version;
    }

    /**
     * Sale attributes, with blank optional fields stored as empty strings.
     *
     * @return array<string, mixed>
     */
    public function ventaAttributes(): array
    {
        $attributes = $this->safe()->except(['bots', 'documentos', 'documentos_quitar', 'client_uuid', 'version']);

        foreach (['rfc', 'rl', 'acuerdo', 'fp', 'encargada', 'telefono', 'horario', 'cierre'] as $field) {
            $attributes[$field] = (string) ($attributes[$field] ?? '');
        }

        $attributes['meses'] = array_map('intval', $attributes['meses'] ?? []);

        return $attributes;
    }

    /**
     * BOTs as submitted, each with its DN list.
     *
     * @return list<array{costo: bool, equipo: string, sku: string, plan: string, plazo: string, proteccion: bool, dmr: string, redes: string, dns: list<string>}>
     */
    public function bots(): array
    {
        return collect($this->validated('bots'))->map(fn (array $bot) => [
            'costo' => (bool) $bot['costo'],
            'equipo' => (string) ($bot['equipo'] ?? ''),
            'sku' => (string) $bot['sku'],
            'plan' => (string) ($bot['plan'] ?? ''),
            'plazo' => (string) ($bot['plazo'] ?? ''),
            'proteccion' => (bool) $bot['proteccion'],
            'dmr' => (string) ($bot['dmr'] ?? ''),
            'redes' => (string) ($bot['redes'] ?? ''),
            'dns' => array_values(array_map('strval', $bot['dns'] ?? [])),
        ])->values()->all();
    }
}

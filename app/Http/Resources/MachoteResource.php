<?php

namespace App\Http\Resources;

use App\Models\Machote;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Machote
 */
class MachoteResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'cat' => $this->cat,
            'uses' => $this->uses,
            'preset' => ['status' => $this->preset_status, 'prioridad' => $this->preset_prioridad],
            'text' => $this->text,
        ];
    }
}

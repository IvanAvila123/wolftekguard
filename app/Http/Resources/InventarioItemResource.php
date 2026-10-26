<?php

namespace App\Http\Resources;

use App\Models\InventarioItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin InventarioItem
 */
class InventarioItemResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'oem' => $this->oem,
            'sku' => $this->sku,
            'nombre' => $this->nombre,
            'modelo' => $this->modelo,
            'color' => $this->color,
            'mex' => $this->stockEn('EBS_MEX'),
            'gdl' => $this->stockEn('EBS_GDL'),
            'mty' => $this->stockEn('EBS_MTY'),
        ];
    }
}

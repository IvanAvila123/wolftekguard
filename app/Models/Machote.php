<?php

namespace App\Models;

use Database\Factories\MachoteFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Machote extends Model
{
    /** @use HasFactory<MachoteFactory> */
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'cat',
        'uses',
        'preset_status',
        'preset_prioridad',
        'text',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'uses' => 'integer',
        ];
    }
}

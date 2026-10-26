<?php

namespace App\Http\Controllers;

use App\Models\Machote;
use Illuminate\Http\Response;

class MachoteUsoController extends Controller
{
    /**
     * Count one use of a machote (its message was copied filled with a sale's data).
     *
     * increment() runs `uses = uses + 1` in the database, so two copies at the same time both count.
     * There is nothing to show, so it answers 204 instead of reloading the page.
     */
    public function __invoke(Machote $machote): Response
    {
        $machote->increment('uses');

        return response()->noContent();
    }
}

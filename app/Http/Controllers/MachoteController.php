<?php

namespace App\Http\Controllers;

use App\Http\Requests\MachoteRequest;
use App\Models\Machote;
use Illuminate\Http\RedirectResponse;

class MachoteController extends Controller
{
    /**
     * Store a new machote.
     */
    public function store(MachoteRequest $request): RedirectResponse
    {
        Machote::create($request->validated());

        return back();
    }

    /**
     * Update a machote's text and presets.
     */
    public function update(MachoteRequest $request, Machote $machote): RedirectResponse
    {
        $machote->update($request->validated());

        return back();
    }
}

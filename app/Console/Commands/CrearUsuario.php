<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class CrearUsuario extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'wolftek:crear-usuario
                            {email : Correo con el que va a iniciar sesión}
                            {nombre : Nombre completo (entre comillas si lleva espacios)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Crea un usuario de WolftekGuard (el registro público está cerrado)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $password = $this->secret('Contraseña (mínimo 8 caracteres)');

        $validator = Validator::make(
            ['email' => $this->argument('email'), 'name' => $this->argument('nombre'), 'password' => $password],
            [
                'email' => ['required', 'email', 'max:255', 'unique:users,email'],
                'name' => ['required', 'string', 'max:255'],
                'password' => ['required', Password::defaults()],
            ],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $user = User::create($validator->validated());
        $user->markEmailAsVerified();

        $this->info("Usuario creado: {$user->name} <{$user->email}>");

        return self::SUCCESS;
    }
}

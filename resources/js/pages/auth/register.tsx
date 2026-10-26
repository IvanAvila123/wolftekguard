import { Alert, AuthLayout, Button, Field, Icon, Input, PasswordInput, PasswordStrength, SocialLogin, TextLink } from '@/components/nocturne';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

type RegisterForm = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
};

export default function Register() {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm<RegisterForm>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    const error = errors.name || errors.email || errors.password || errors.password_confirmation;
    const mismatch = !!data.password_confirmation && data.password_confirmation !== data.password;

    return (
        <AuthLayout
            pageTitle="Crear cuenta"
            title="Crear cuenta"
            subtitle="Regístrate con tu correo de trabajo. Te toma menos de un minuto."
            onSubmit={submit}
        >
            {error && <Alert>{error}</Alert>}

            <Field label="Nombre completo">
                <Input
                    name="name"
                    autoComplete="name"
                    autoFocus
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder="Ej. María Fernanda Robles"
                    invalid={!!errors.name}
                    style={{ minHeight: 40 }}
                />
            </Field>

            <Field label="Correo">
                <Input
                    type="email"
                    name="email"
                    autoComplete="username"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    placeholder="tu@empresa.com"
                    invalid={!!errors.email}
                    style={{ minHeight: 40 }}
                />
            </Field>

            <Field label="Crea una contraseña" asDiv>
                <PasswordInput
                    name="password"
                    autoComplete="new-password"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    aria-label="Crea una contraseña"
                    invalid={!!errors.password}
                    visible={showPassword}
                    onToggleVisible={() => setShowPassword((v) => !v)}
                />
            </Field>
            <PasswordStrength password={data.password} highlightMissing={!!errors.password} />

            <Field label="Confirma la contraseña">
                <Input
                    type={showPassword ? 'text' : 'password'}
                    name="password_confirmation"
                    autoComplete="new-password"
                    value={data.password_confirmation}
                    onChange={(e) => setData('password_confirmation', e.target.value)}
                    placeholder="Escríbela otra vez"
                    invalid={mismatch || !!errors.password_confirmation}
                    style={{ minHeight: 40 }}
                />
                {data.password_confirmation && (
                    <span
                        style={{
                            fontSize: 11,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            color: mismatch ? 'var(--color-accent-200)' : 'var(--color-neutral-300)',
                        }}
                    >
                        <Icon name={mismatch ? 'x-circle' : 'check-circle'} />
                        {mismatch ? 'No coinciden' : 'Coinciden'}
                    </span>
                )}
            </Field>

            <Button type="submit" variant="primary" block loading={processing} icon="user-plus" style={{ minHeight: 44 }}>
                {processing ? 'Creando cuenta…' : 'Crear cuenta'}
            </Button>

            <SocialLogin label="o regístrate con" />

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    flexWrap: 'wrap',
                    paddingTop: 'var(--space-4)',
                    borderTop: '1px solid var(--color-neutral-800)',
                    fontSize: 13,
                    color: 'var(--color-neutral-300)',
                }}
            >
                ¿Ya tienes cuenta?
                <TextLink href={route('login')}>Inicia sesión</TextLink>
            </div>
        </AuthLayout>
    );
}

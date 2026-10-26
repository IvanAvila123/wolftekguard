import { Alert, AuthLayout, Button, Field, Icon, Input, PasswordInput, PasswordStrength } from '@/components/nocturne';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface ResetPasswordProps {
    token: string;
    email: string;
}

type ResetPasswordForm = {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
};

export default function ResetPassword({ token, email }: ResetPasswordProps) {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm<ResetPasswordForm>({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    const error = errors.email || errors.password || errors.password_confirmation;
    const mismatch = !!data.password_confirmation && data.password_confirmation !== data.password;

    return (
        <AuthLayout
            pageTitle="Nueva contraseña"
            title="Crea una nueva contraseña"
            subtitle="Elige una contraseña que no hayas usado antes."
            onSubmit={submit}
        >
            {error && <Alert>{error}</Alert>}

            <Field label="Correo">
                <Input type="email" name="email" autoComplete="username" value={data.email} readOnly style={{ minHeight: 40, opacity: 0.8 }} />
            </Field>

            <Field label="Nueva contraseña" asDiv>
                <PasswordInput
                    name="password"
                    autoComplete="new-password"
                    autoFocus
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    aria-label="Nueva contraseña"
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

            <Button type="submit" variant="primary" block loading={processing} icon="check" style={{ minHeight: 44 }}>
                {processing ? 'Guardando…' : 'Guardar contraseña'}
            </Button>
        </AuthLayout>
    );
}

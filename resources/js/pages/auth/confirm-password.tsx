import { Alert, AuthLayout, Button, Field, PasswordInput } from '@/components/nocturne';
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthLayout
            pageTitle="Confirma tu contraseña"
            title="Confirma tu contraseña"
            subtitle="Esta es una sección protegida. Escribe tu contraseña para continuar."
            onSubmit={submit}
        >
            {errors.password && <Alert>{errors.password}</Alert>}

            <Field label="Contraseña" asDiv>
                <PasswordInput
                    name="password"
                    autoComplete="current-password"
                    autoFocus
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    placeholder="Tu contraseña"
                    aria-label="Contraseña"
                    invalid={!!errors.password}
                />
            </Field>

            <Button type="submit" variant="primary" block loading={processing} icon="lock-key-open" style={{ minHeight: 44 }}>
                {processing ? 'Confirmando…' : 'Confirmar'}
            </Button>
        </AuthLayout>
    );
}

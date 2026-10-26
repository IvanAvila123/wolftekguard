import { Alert, AuthLayout, Button, Field, Icon, Input } from '@/components/nocturne';
import { Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <AuthLayout
            pageTitle="Recuperar contraseña"
            title="Recuperar contraseña"
            subtitle="Escribe tu correo y te enviamos un enlace para crear una nueva."
            onSubmit={submit}
        >
            {errors.email && <Alert>{errors.email}</Alert>}
            {status && <Alert variant="info">{status}</Alert>}

            <Field label="Correo">
                <Input
                    type="email"
                    name="email"
                    autoComplete="username"
                    autoFocus
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    placeholder="tu@empresa.com"
                    invalid={!!errors.email}
                    style={{ minHeight: 40 }}
                />
            </Field>

            <Button type="submit" variant="primary" block loading={processing} icon="paper-plane-tilt" style={{ minHeight: 44 }}>
                {processing ? 'Enviando…' : 'Enviar enlace'}
            </Button>

            <Link href={route('login')} className="btn btn-ghost" style={{ alignSelf: 'flex-start' }}>
                <Icon name="arrow-left" /> Volver a iniciar sesión
            </Link>
        </AuthLayout>
    );
}

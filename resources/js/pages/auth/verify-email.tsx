import { Alert, AuthLayout, Button } from '@/components/nocturne';
import { router, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('verification.send'));
    };

    return (
        <AuthLayout
            pageTitle="Verifica tu correo"
            title="Verifica tu correo"
            subtitle="Te enviamos un enlace a tu correo. Ábrelo para activar tu cuenta."
            onSubmit={submit}
        >
            {status === 'verification-link-sent' && (
                <Alert variant="info">Te enviamos un nuevo enlace al correo con el que te registraste. Revisa también spam.</Alert>
            )}

            <Button type="submit" variant="primary" block loading={processing} icon="envelope-simple" style={{ minHeight: 44 }}>
                {processing ? 'Enviando…' : 'Reenviar el correo'}
            </Button>

            <Button variant="ghost" icon="sign-out" onClick={() => router.post(route('logout'))} style={{ alignSelf: 'flex-start' }}>
                Cerrar sesión
            </Button>
        </AuthLayout>
    );
}

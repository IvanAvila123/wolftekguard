import { Alert, Button, Dialog, Field, Input, PasswordInput } from '@/components/nocturne';
import { type SharedData } from '@/types';
import AccountLayout, { AccountSection, SavedNote } from '@/wolftek/account-layout';
import { router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useRef, useState } from 'react';

function DeleteAccount() {
    const [open, setOpen] = useState(false);
    const passwordInput = useRef<HTMLInputElement>(null);
    const { data, setData, delete: destroy, processing, reset, errors, clearErrors } = useForm({ password: '' });

    const close = () => {
        setOpen(false);
        clearErrors();
        reset();
    };

    const deleteUser: FormEventHandler = (e) => {
        e.preventDefault();
        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => close(),
            onError: () => passwordInput.current?.focus(),
            onFinish: () => reset(),
        });
    };

    return (
        <AccountSection danger title="Eliminar cuenta" description="Borra tu cuenta y todo lo que contiene. No se puede deshacer.">
            <Button icon="trash" onClick={() => setOpen(true)} style={{ alignSelf: 'flex-start' }}>
                Eliminar mi cuenta
            </Button>

            <Dialog
                open={open}
                onClose={close}
                title="¿Seguro que quieres eliminar tu cuenta?"
                icon="warning"
                actions={
                    <>
                        <Button variant="ghost" onClick={close}>
                            Cancelar
                        </Button>
                        <Button variant="primary" icon="trash" loading={processing} onClick={deleteUser}>
                            Eliminar cuenta
                        </Button>
                    </>
                }
            >
                <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-neutral-200)' }}>
                    Se borrarán tu cuenta y tus datos de forma permanente. Escribe tu contraseña para confirmar.
                </span>
                <form onSubmit={deleteUser} noValidate>
                    <Field label="Contraseña" asDiv error={errors.password}>
                        <PasswordInput
                            ref={passwordInput}
                            name="password"
                            autoComplete="current-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="Tu contraseña"
                            aria-label="Contraseña"
                            invalid={!!errors.password}
                        />
                    </Field>
                </form>
            </Dialog>
        </AccountSection>
    );
}

export default function Profile({ mustVerifyEmail, status }: { mustVerifyEmail: boolean; status?: string }) {
    const { auth } = usePage<SharedData>().props;

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: auth.user.name,
        email: auth.user.email,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('profile.update'));
    };

    return (
        <AccountLayout title="Perfil">
            <AccountSection title="Tus datos" description="Tu nombre aparece en la barra lateral y en el historial de las ventas.">
                <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 420 }}>
                    <Field label="Nombre completo" error={errors.name}>
                        <Input
                            name="name"
                            autoComplete="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Ej. María Fernanda Robles"
                            invalid={!!errors.name}
                            style={{ minHeight: 40 }}
                        />
                    </Field>

                    <Field label="Correo" error={errors.email}>
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

                    {mustVerifyEmail && auth.user.email_verified_at === null && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            <Alert variant="info">Tu correo todavía no está verificado.</Alert>
                            <Button
                                variant="ghost"
                                icon="envelope-simple"
                                onClick={() => router.post(route('verification.send'))}
                                style={{ alignSelf: 'flex-start' }}
                            >
                                Reenviar el correo de verificación
                            </Button>
                            {status === 'verification-link-sent' && <Alert variant="info">Te enviamos un nuevo enlace de verificación.</Alert>}
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                        <Button type="submit" variant="primary" icon="check" loading={processing}>
                            Guardar
                        </Button>
                        <SavedNote show={recentlySuccessful} />
                    </div>
                </form>
            </AccountSection>

            <DeleteAccount />
        </AccountLayout>
    );
}

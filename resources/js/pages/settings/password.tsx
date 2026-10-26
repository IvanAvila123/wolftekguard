import { Button, Field, PasswordInput, PasswordStrength } from '@/components/nocturne';
import AccountLayout, { AccountSection, SavedNote } from '@/wolftek/account-layout';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef, useState } from 'react';

export default function Password() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);
    const [showNew, setShowNew] = useState(false);

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <AccountLayout title="Contraseña">
            <AccountSection title="Cambiar contraseña" description="Usa una contraseña larga que no uses en otros sitios.">
                <form onSubmit={updatePassword} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 420 }}>
                    <Field label="Contraseña actual" asDiv error={errors.current_password}>
                        <PasswordInput
                            ref={currentPasswordInput}
                            name="current_password"
                            autoComplete="current-password"
                            value={data.current_password}
                            onChange={(e) => setData('current_password', e.target.value)}
                            placeholder="Tu contraseña actual"
                            aria-label="Contraseña actual"
                            invalid={!!errors.current_password}
                        />
                    </Field>

                    <Field label="Nueva contraseña" asDiv error={errors.password}>
                        <PasswordInput
                            ref={passwordInput}
                            name="password"
                            autoComplete="new-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="Mínimo 8 caracteres"
                            aria-label="Nueva contraseña"
                            invalid={!!errors.password}
                            visible={showNew}
                            onToggleVisible={() => setShowNew((v) => !v)}
                        />
                    </Field>
                    <PasswordStrength password={data.password} highlightMissing={!!errors.password} />

                    <Field label="Confirma la nueva contraseña" asDiv error={errors.password_confirmation}>
                        <PasswordInput
                            name="password_confirmation"
                            autoComplete="new-password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            placeholder="Escríbela otra vez"
                            aria-label="Confirma la nueva contraseña"
                            invalid={!!errors.password_confirmation}
                            visible={showNew}
                            onToggleVisible={() => setShowNew((v) => !v)}
                        />
                    </Field>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                        <Button type="submit" variant="primary" icon="check" loading={processing}>
                            Guardar contraseña
                        </Button>
                        <SavedNote show={recentlySuccessful} />
                    </div>
                </form>
            </AccountSection>
        </AccountLayout>
    );
}

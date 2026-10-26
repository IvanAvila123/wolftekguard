import { Alert, AuthLayout, Button, Checkbox, Field, Input, PasswordInput, SocialLogin, TextLink } from '@/components/nocturne';
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
};

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
    /** Social providers configured on the server (google, microsoft, facebook). */
    socialProviders: string[];
}

export default function Login({ status, canResetPassword, canRegister, socialProviders }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    const error = errors.email || errors.password;

    return (
        <AuthLayout pageTitle="Iniciar sesión" title="Iniciar sesión" subtitle="Entra con tu correo de trabajo." onSubmit={submit}>
            {error && <Alert>{error}</Alert>}
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

            <Field
                label={
                    <span style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                        Contraseña
                        {canResetPassword && (
                            <TextLink href={route('password.request')} size={12}>
                                ¿La olvidaste?
                            </TextLink>
                        )}
                    </span>
                }
                asDiv
            >
                <PasswordInput
                    name="password"
                    autoComplete="current-password"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    placeholder="Tu contraseña"
                    aria-label="Contraseña"
                    invalid={!!errors.password}
                />
            </Field>

            <Checkbox checked={data.remember} onChange={(checked) => setData('remember', checked)} label="Mantener sesión iniciada en este equipo" />

            <Button type="submit" variant="primary" block loading={processing} icon="sign-in" style={{ minHeight: 44 }}>
                {processing ? 'Entrando…' : 'Entrar'}
            </Button>

            <SocialLogin enabled={socialProviders} />

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
                ¿No tienes cuenta?
                {canRegister ? <TextLink href={route('register')}>Crear cuenta</TextLink> : <span>Pídela a tu administrador.</span>}
            </div>
        </AuthLayout>
    );
}

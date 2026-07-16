import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Car } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ApiError, login } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

const schema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(1, 'Requerido'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const navigate = useNavigate()
  const location = useLocation()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  // already logged in (e.g. typed /login by hand)
  if (accessToken) return <Navigate to="/" replace />

  const from = (location.state as { from?: { pathname: string; search: string } } | null)?.from

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null)
    try {
      await login(values.email, values.password)
      navigate(from ? `${from.pathname}${from.search}` : '/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setServerError('Email o contraseña incorrectos')
      } else if (err instanceof ApiError && err.status === 429) {
        setServerError('Demasiados intentos. Esperá unos minutos.')
      } else {
        setServerError('No se pudo conectar con el servidor')
      }
    }
  })

  const { errors } = form.formState

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center gap-2 font-semibold">
            <Car className="size-5" />
            <span className="text-lg">Uber</span>
          </div>
          <CardTitle className="mt-2">Iniciar sesión</CardTitle>
          <CardDescription>Ingresá con tu cuenta de administrador</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" autoComplete="email" autoFocus {...form.register('email')} />
                {errors.email && <FieldError>{errors.email.message}</FieldError>}
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...form.register('password')}
                />
                {errors.password && <FieldError>{errors.password.message}</FieldError>}
              </Field>
              {serverError && <p className="text-sm text-destructive">{serverError}</p>}
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Ingresando…' : 'Ingresar'}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

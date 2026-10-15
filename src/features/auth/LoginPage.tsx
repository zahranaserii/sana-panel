import { yupResolver } from '@hookform/resolvers/yup'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Form } from 'antd'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import * as yup from 'yup'
import { DEMO_ENABLED } from '@/api/seed'
import { authApi } from '@/api/users.api'
import { RHFInput, RHFPassword } from '@/components/form'
import { useAuthStore } from '@/store/auth'

const schema = yup.object({
  username: yup.string().trim().required('نام کاربری را وارد کنید'),
  password: yup.string().required('رمز عبور را وارد کنید'),
})

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.userId)
  const setSession = useAuthStore((s) => s.setSession)
  const { control, handleSubmit } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { username: '', password: '' },
  })
  const login = useMutation({
    mutationFn: (v: yup.InferType<typeof schema>) => authApi.login(v.username, v.password),
    onSuccess: (user) => {
      qc.clear()
      setSession(user.id)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : '/', { replace: true })
    },
  })

  if (userId) return <Navigate to="/" replace />

  return (
    <div className="login-screen">
      <div className="login-box">
        <img src="/img/sana-logo.png" alt="سانا" />
        <h2>ورود به سامانه</h2>
        <div className="login-sub">سامانه اعتباری نوید امید (سانا)</div>
        <form onSubmit={handleSubmit((v) => login.mutate(v))} noValidate>
          <Form layout="vertical" component={false}>
            <RHFInput control={control} name="username" label="نام کاربری" inputProps={{ autoFocus: true, autoComplete: 'username' }} />
            <RHFPassword control={control} name="password" label="رمز عبور" inputProps={{ autoComplete: 'current-password' }} />
          </Form>
          {login.isError && <Alert type="error" showIcon title={login.error.message} style={{ marginBottom: 12 }} />}
          <Button type="primary" htmlType="submit" block size="large" loading={login.isPending}>
            ورود
          </Button>
        </form>
        {DEMO_ENABLED && (
          <div className="hint" style={{ marginTop: 14, textAlign: 'center' }}>
            دمو: admin/admin — manager، hr، credit، digital با رمز 123456
          </div>
        )}
      </div>
    </div>
  )
}

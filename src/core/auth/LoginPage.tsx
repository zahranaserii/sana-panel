import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { yupResolver } from '@hookform/resolvers/yup'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, Button } from 'antd'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import * as yup from 'yup'
import { appConfig } from '../config'
import { authApi } from '../data/identity'
import { FormLayout } from '../form/containers'
import { PasswordField, TextField } from '../form/fields'
import { useSession } from './session'
import './login.css'

const schema = yup.object({
  username: yup.string().trim().required('نام کاربری را وارد کنید'),
  password: yup.string().required('رمز عبور را وارد کنید'),
})
type Values = yup.InferType<typeof schema>

export function LoginPage() {
  const cfg = appConfig()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const userId = useSession((s) => s.userId)
  const setSession = useSession((s) => s.setSession)
  const form = useForm<Values>({ resolver: yupResolver(schema), defaultValues: { username: '', password: '' } })
  const login = useMutation({
    mutationFn: (v: Values) => authApi.login(v.username, v.password),
    meta: { silent: true },
    onSuccess: (user) => {
      qc.clear()
      setSession(user.id)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : '/', { replace: true })
    },
  })

  if (userId) return <Navigate to="/" replace />

  const quick = cfg.demo.enabled ? [cfg.initialAdmin, ...cfg.demo.users] : []

  return (
    <div className="login">
      <aside className="login-brand">
        <div className="login-brand-inner">
          <span className="login-logo">
            <img src={cfg.logo} alt="" />
          </span>
          <h1>{cfg.appName}</h1>
          {cfg.subtitle && <p>{cfg.subtitle}</p>}
        </div>
        {cfg.partnerLogo && <img className="login-partner" src={cfg.partnerLogo} alt="" />}
      </aside>
      <main className="login-main">
        <div className="login-card">
          <h2>ورود به سامانه</h2>
          <p className="muted">برای ادامه، نام کاربری و رمز عبور خود را وارد کنید.</p>
          <form onSubmit={form.handleSubmit((v) => login.mutate(v))} noValidate>
            <FormLayout>
              <TextField
                control={form.control}
                name="username"
                label="نام کاربری"
                required
                inputProps={{ autoFocus: true, autoComplete: 'username', prefix: <UserOutlined className="faint" />, size: 'large', dir: 'ltr' }}
              />
              <PasswordField
                control={form.control}
                name="password"
                label="رمز عبور"
                required
                inputProps={{ autoComplete: 'current-password', prefix: <LockOutlined className="faint" />, size: 'large', dir: 'ltr' }}
              />
            </FormLayout>
            {login.isError && <Alert type="error" showIcon title={login.error.message} style={{ marginBottom: 14 }} />}
            <Button type="primary" htmlType="submit" block size="large" loading={login.isPending}>
              ورود
            </Button>
          </form>
          {quick.length > 0 && (
            <div className="login-demo">
              <div className="hint" style={{ marginBottom: 8 }}>ورود سریع با کاربران نمونه:</div>
              <div className="login-demo-list">
                {quick.map((u) => (
                  <button
                    key={u.username}
                    type="button"
                    className="login-demo-chip"
                    onClick={() => {
                      form.reset({ username: u.username, password: u.password })
                      login.mutate({ username: u.username, password: u.password })
                    }}
                  >
                    <b>{cfg.roles.find((r) => r.value === u.role)?.label}</b>
                    <span dir="ltr">{u.username}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

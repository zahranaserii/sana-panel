import { DownOutlined, LogoutOutlined, MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { Breadcrumb, Button, Drawer, Dropdown, Grid, Layout, Menu } from 'antd'
import type { MenuProps } from 'antd'
import { Suspense, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { appConfig } from '../config'
import { roleLabel, useCurrentUser, usePermissions } from '../auth/hooks'
import { prefixedStorage, useSession } from '../auth/session'
import { resetAllStores } from '../data/store'
import { faDigits } from '../lib/digits'
import { formatJalali, todayISO } from '../lib/jalali'
import { menuGroups } from '../module/registry'
import { Avatar } from '../ui/display'
import { confirm } from '../ui/feedback'
import { PageSkeleton } from '../ui/misc'
import './shell.css'

const COLLAPSE_KEY = 'sider-collapsed'

export function AppShell() {
  const cfg = appConfig()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const qc = useQueryClient()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.lg
  const { user } = useCurrentUser()
  const { pages, isAdmin } = usePermissions()
  const logout = useSession((s) => s.logout)
  const [collapsed, setCollapsed] = useState(() => prefixedStorage(() => localStorage).getItem(COLLAPSE_KEY) === '1')
  const [drawer, setDrawer] = useState(false)

  const current = pages.find((p) => pathname === `/${p.path}` || pathname.startsWith(`/${p.path}/`))
  const groups = menuGroups(pages)

  const items: MenuProps['items'] = groups.map((g) => ({
    type: 'group' as const,
    label: collapsed && !isMobile ? null : g.label,
    children: g.pages.map((p) => ({ key: p.path, icon: p.icon, label: p.title })),
  }))

  const toggle = () => {
    if (isMobile) return setDrawer(true)
    setCollapsed((c) => {
      prefixedStorage(() => localStorage).setItem(COLLAPSE_KEY, c ? '0' : '1')
      return !c
    })
  }

  const onLogout = () => {
    logout()
    qc.clear()
    navigate('/login', { replace: true })
  }

  const onResetDemo = async () => {
    if (await confirm({ title: 'بازنشانی داده‌های نمونه؟', content: 'همه تغییرات پاک می‌شود و داده‌های نمونه از نو ساخته می‌شوند.', okText: 'بازنشانی', danger: true })) {
      resetAllStores()
      window.location.reload()
    }
  }

  const brand = (compact: boolean) => (
    <div className={`shell-brand${compact ? ' compact' : ''}`}>
      <span className="shell-logo">
        <img src={cfg.logo} alt="" />
      </span>
      {!compact && (
        <div>
          <div className="shell-brand-name">{cfg.appName}</div>
          {cfg.subtitle && <div className="shell-brand-sub">{cfg.subtitle}</div>}
        </div>
      )}
    </div>
  )

  const menu = (compact: boolean) => (
    <Menu
      theme="dark"
      mode="inline"
      inlineCollapsed={compact}
      selectedKeys={current ? [current.path] : []}
      items={items}
      onClick={({ key }) => {
        navigate(`/${key}`)
        setDrawer(false)
      }}
    />
  )

  const userMenu: MenuProps['items'] = [
    {
      key: 'info',
      disabled: true,
      label: user && (
        <div style={{ padding: '4px 0', color: 'var(--c-ink)' }}>
          <div style={{ fontWeight: 700 }}>{user.fullName}</div>
          <div className="hint">
            {roleLabel(user.role)} — {user.unitName} ({faDigits(user.unitCode)})
          </div>
        </div>
      ),
    },
    { type: 'divider' },
    ...(cfg.demo.enabled && isAdmin ? [{ key: 'reset', icon: <ReloadOutlined />, label: 'بازنشانی داده‌های نمونه' }] : []),
    { key: 'logout', icon: <LogoutOutlined />, label: 'خروج از حساب', danger: true },
  ]

  return (
    <Layout className="shell">
      {!isMobile && (
        <Layout.Sider width={264} collapsedWidth={76} collapsed={collapsed} trigger={null} className="shell-sider">
          <div className="shell-sider-inner">
            {brand(collapsed)}
            <nav className="shell-menu" aria-label="منوی اصلی">{menu(collapsed)}</nav>
          </div>
        </Layout.Sider>
      )}
      <Drawer
        open={isMobile && drawer}
        onClose={() => setDrawer(false)}
        placement="right"
        size={280}
        closable={false}
        styles={{ body: { padding: 0, background: 'var(--sider-gradient)' } }}
      >
        <div className="shell-sider-inner">
          {brand(false)}
          <nav className="shell-menu">{menu(false)}</nav>
        </div>
      </Drawer>
      <Layout>
        <header className="shell-header">
          <Button
            type="text"
            icon={isMobile ? <MenuOutlined /> : collapsed ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
            onClick={toggle}
            aria-label="باز/بسته کردن منو"
          />
          <Breadcrumb
            className="shell-crumb"
            items={[{ title: current?.group ?? cfg.appName }, ...(current ? [{ title: current.title }] : [])]}
          />
          <span style={{ flex: 1 }} />
          {screens.md && <span className="shell-date">{formatJalali(todayISO())}</span>}
          {cfg.partnerLogo && screens.md && <img className="shell-partner" src={cfg.partnerLogo} alt="" />}
          {user && (
            <Dropdown
              trigger={['click']}
              menu={{ items: userMenu, onClick: ({ key }) => (key === 'logout' ? onLogout() : key === 'reset' ? onResetDemo() : undefined) }}
            >
              <button className="shell-user" aria-label="منوی کاربر">
                <Avatar name={user.fullName} size={34} />
                {screens.sm && (
                  <span className="shell-user-text">
                    <span className="shell-user-name">{user.fullName}</span>
                    <span className="shell-user-role">{roleLabel(user.role)}</span>
                  </span>
                )}
                <DownOutlined style={{ fontSize: 10, color: 'var(--c-ink-faint)' }} />
              </button>
            </Dropdown>
          )}
        </header>
        <Layout.Content className="shell-content">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </Layout.Content>
        {cfg.footer && <footer className="shell-footer">{cfg.footer}</footer>}
      </Layout>
    </Layout>
  )
}

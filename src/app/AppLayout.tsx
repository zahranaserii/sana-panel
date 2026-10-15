import {
  AuditOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
  LogoutOutlined,
  SafetyOutlined,
  SettingOutlined,
  ShopOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Layout, Menu, Tag } from 'antd'
import type { MenuProps } from 'antd'
import { useState, type ReactNode } from 'react'
import { Outlet, useLocation, useMatches, useNavigate } from 'react-router-dom'
import { roleLabel } from '@/domain/constants'
import type { TabKey } from '@/domain/permissions'
import { faDigits } from '@/lib/digits'
import { formatJalali, todayISO } from '@/lib/jalali'
import { useCurrentUser, usePermissions } from '@/queries/auth'
import { useAuthStore } from '@/store/auth'
import { ROUTES } from './routes'

const ICONS: Record<TabKey, ReactNode> = {
  base: <SettingOutlined />,
  companies: <ShopOutlined />,
  staff: <TeamOutlined />,
  credit: <CreditCardOutlined />,
  mgrApprove: <UserSwitchOutlined />,
  approve: <CheckCircleOutlined />,
  dash: <BarChartOutlined />,
  users: <SafetyOutlined />,
  log: <AuditOutlined />,
}

const GROUPS: { label: string; tabs: TabKey[] }[] = [
  { label: 'تنظیمات', tabs: ['base'] },
  { label: 'مدیریت', tabs: ['companies', 'staff'] },
  { label: 'عملیات اعتباری', tabs: ['credit', 'mgrApprove', 'approve'] },
  { label: 'گزارش و کنترل', tabs: ['dash', 'users', 'log'] },
]

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const matches = useMatches()
  const qc = useQueryClient()
  const { user } = useCurrentUser()
  const { allowedTabs } = usePermissions()
  const logout = useAuthStore((s) => s.logout)
  const [collapsed, setCollapsed] = useState(false)

  const title = (matches.at(-1)?.handle as { title?: string } | undefined)?.title ?? ''
  const selected = ROUTES.find((r) => location.pathname.startsWith(`/${r.path}`))?.path

  const items: MenuProps['items'] = GROUPS.map((g) => ({
    type: 'group' as const,
    label: g.label,
    children: ROUTES.filter((r) => g.tabs.includes(r.tab) && allowedTabs.includes(r.tab)).map((r) => ({
      key: r.path,
      icon: ICONS[r.tab],
      label: r.title,
    })),
  })).filter((g) => g.children.length)

  const onLogout = () => {
    logout()
    qc.clear()
    navigate('/login', { replace: true })
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Sider
        width={268}
        breakpoint="lg"
        collapsedWidth={0}
        collapsed={collapsed}
        onCollapse={setCollapsed}
        className="app-sider"
      >
        <div className="sider-inner">
          <div className="brand">
            <span className="logo-box">
              <img src="/img/sana-logo.png" alt="سانا" />
            </span>
            <div className="brand-title">سامانه اعتباری نوید امید (سانا)</div>
            <div className="brand-sub">طرح نگین میثاق</div>
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={selected ? [selected] : []}
            items={items}
            onClick={({ key }) => {
              navigate(`/${key}`)
              if (window.innerWidth < 992) setCollapsed(true)
            }}
          />
          {user && (
            <div className="user-box">
              <div className="user-name">{user.fullName}</div>
              <div className="user-meta">
                {user.branchName} — کد {faDigits(user.branchCode)}
              </div>
              <Tag color="gold" style={{ marginInlineEnd: 0, alignSelf: 'flex-start' }}>
                {roleLabel(user.role)}
              </Tag>
              <Button icon={<LogoutOutlined />} onClick={onLogout} block>
                خروج از حساب
              </Button>
            </div>
          )}
        </div>
      </Layout.Sider>
      <Layout>
        <Layout.Header className="topbar">
          <div>
            <h1>{title}</h1>
            <div className="crumb">سامانه اعتباری نوید امید (سانا) / {title}</div>
          </div>
          <div className="topbar-left">
            <span className="date-chip">امروز: {formatJalali(todayISO())}</span>
            <img className="omid" src="/img/omid-boom.png" alt="امید بوم" />
          </div>
        </Layout.Header>
        <Layout.Content className="content">
          <Outlet />
        </Layout.Content>
        <Layout.Footer className="site-footer">
          توسعه‌دهنده این سامانه شرکت <b>امید بوم بانک سپه</b> است و کلیه حقوق مادی و معنوی آن متعلق به این شرکت می‌باشد.
        </Layout.Footer>
      </Layout>
    </Layout>
  )
}

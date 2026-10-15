import { Button, Checkbox, Skeleton } from 'antd'
import { useState } from 'react'
import { usersApi } from '@/api/users.api'
import { Section } from '@/components/common'
import { roleLabel } from '@/domain/constants'
import { ROLE_KEYS, SERVICES, TABS } from '@/domain/permissions'
import { qk, useApiMutation, useRolePerms } from '@/queries'
import { usePermissions } from '@/queries/auth'
import type { RolePerms } from '@/types'

export function RolePermissionsTable() {
  const { data } = useRolePerms()
  const { can } = usePermissions()
  const editable = can('users.roles')
  // تا وقتی کاربر چیزی تغییر نداده، draft همان داده سرور است
  const [edited, setEdited] = useState<RolePerms | null>(null)
  const draft = edited ?? data ?? null

  const save = useApiMutation((p: RolePerms) => usersApi.updateRolePerms(p), {
    invalidate: [qk.rolePerms],
    successMessage: 'دسترسی نقش‌ها ذخیره شد.',
  })
  const onSave = () => draft && save.mutate(draft, { onSuccess: () => setEdited(null) })

  if (!draft) return <Skeleton active />
  const dirty = !!edited && JSON.stringify(edited) !== JSON.stringify(data)

  const toggle = (role: keyof RolePerms, key: string, on: boolean) =>
    setEdited({ ...draft, [role]: on ? [...draft[role], key] : draft[role].filter((k) => k !== key) })

  return (
    <Section
      title="مدیریت دسترسی نقش‌ها به تب‌ها و سرویس‌ها"
      sub="با تیک‌زدن هر خانه مشخص کنید کاربران هر نقش به کدام تب/عملیات دسترسی داشته باشند. فعال بودن هر سرویس، «مشاهده» همان تب را هم فعال می‌کند."
    >
      <div style={{ overflowX: 'auto' }}>
        <table className="plain-table perms-table">
          <thead>
            <tr>
              <th rowSpan={2}>نقش</th>
              {TABS.map((t) => (
                <th key={t.key} colSpan={SERVICES[t.key].length} className="group-start">
                  {t.label}
                </th>
              ))}
            </tr>
            <tr>
              {TABS.flatMap((t) =>
                SERVICES[t.key].map(([s, label], i) => (
                  <th key={`${t.key}.${s}`} className={i === 0 ? 'group-start' : ''} style={{ fontSize: 11 }}>
                    {label}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {ROLE_KEYS.map((role) => (
              <tr key={role}>
                <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{roleLabel(role)}</td>
                {TABS.flatMap((t) =>
                  SERVICES[t.key].map(([s], i) => {
                    const key = `${t.key}.${s}`
                    return (
                      <td key={key} className={i === 0 ? 'group-start' : ''} style={{ textAlign: 'center' }}>
                        <Checkbox
                          disabled={!editable}
                          checked={draft[role].includes(key)}
                          onChange={(e) => toggle(role, key, e.target.checked)}
                        />
                      </td>
                    )
                  }),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editable && (
        <Button type="primary" style={{ marginTop: 12 }} disabled={!dirty} loading={save.isPending} onClick={onSave}>
          ذخیره دسترسی نقش‌ها
        </Button>
      )}
    </Section>
  )
}

import { CheckCircleFilled } from '@ant-design/icons'
import { Checkbox, Tag, Tooltip } from 'antd'
import { useState } from 'react'
import { allPermissionGroups, appConfig, coreKeys, type RolePerms, rolesApi, useApiMutation, usePermissions, useRolePerms } from '@/core'
import { SaveBar, SectionCard } from '@/core/ui'

/** ماتریس نقش × سرویس؛ ستون‌ها از permissionهای ماژول‌های ثبت‌شده ساخته می‌شوند */
export function RolePermissionsMatrix() {
  const { data } = useRolePerms()
  const { can } = usePermissions()
  const editable = can('users.roles')
  const [edited, setEdited] = useState<RolePerms | null>(null)
  const draft = edited ?? data
  const groups = allPermissionGroups()
  const { roles, adminRole } = appConfig()

  const save = useApiMutation((p: RolePerms) => rolesApi.update(p), {
    invalidate: [coreKeys.roles],
    successMessage: 'دسترسی نقش‌ها ذخیره شد.',
  })

  const dirty = !!edited && JSON.stringify(edited) !== JSON.stringify(data)
  const toggle = (role: string, key: string, on: boolean) =>
    draft && setEdited({ ...draft, [role]: on ? [...(draft[role] ?? []), key] : (draft[role] ?? []).filter((k) => k !== key) })

  return (
    <div className="stack">
      <SectionCard
        title="دسترسی نقش‌ها به صفحات و عملیات"
        description="فعال بودن هر عملیات، «مشاهده» همان صفحه را هم فعال می‌کند."
        loading={!draft}
        flush
      >
        {draft && (
          <div style={{ overflowX: 'auto', paddingBottom: 6 }}>
            <table className="plain-table perms-table">
              <thead>
                <tr>
                  <th rowSpan={2} style={{ position: 'sticky', insetInlineStart: 0, zIndex: 3 }}>نقش</th>
                  {groups.map((g) => (
                    <th key={g.key} colSpan={g.services.length} className="group-start" style={{ textAlign: 'center' }}>
                      {g.label}
                    </th>
                  ))}
                </tr>
                <tr>
                  {groups.flatMap((g) =>
                    g.services.map(([s, label], i) => (
                      <th key={`${g.key}.${s}`} className={i === 0 ? 'group-start' : ''} style={{ fontSize: 11, textAlign: 'center', fontWeight: 600 }}>
                        {label}
                      </th>
                    )),
                  )}
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => {
                  const locked = r.value === adminRole
                  return (
                    <tr key={r.value}>
                      <td style={{ position: 'sticky', insetInlineStart: 0, zIndex: 2, background: '#fff', whiteSpace: 'nowrap', fontWeight: 700, boxShadow: '-6px 0 8px -6px rgba(16,24,40,.12)' }}>
                        <Tag color={r.color}>{r.label}</Tag>
                        {locked && (
                          <Tooltip title="این نقش همیشه همه دسترسی‌ها را دارد تا سامانه قفل نشود">
                            <CheckCircleFilled style={{ color: 'var(--c-success)' }} />
                          </Tooltip>
                        )}
                      </td>
                      {groups.flatMap((g) =>
                        g.services.map(([s, label], i) => {
                          const key = `${g.key}.${s}`
                          return (
                            <td key={key} className={i === 0 ? 'group-start' : ''} style={{ textAlign: 'center' }}>
                              <Checkbox
                                disabled={locked || !editable}
                                checked={locked || !!draft[r.value]?.includes(key)}
                                onChange={(e) => toggle(r.value, key, e.target.checked)}
                                aria-label={`${r.label} — ${g.label} — ${label}`}
                              />
                            </td>
                          )
                        }),
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
      {editable && (
        <SaveBar visible={dirty} saving={save.isPending} onReset={() => setEdited(null)} onSave={() => draft && save.mutate(draft, { onSuccess: () => setEdited(null) })} />
      )}
    </div>
  )
}

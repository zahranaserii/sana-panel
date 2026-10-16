import { RollbackOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Select, Tag } from 'antd'
import { useState } from 'react'
import { type AuditEntry, auditApi, auditCategories, auditCategory, coreKeys, useApiMutation, usePermissions } from '@/core'
import { Avatar, DataTable, Page, SectionCard } from '@/core/ui'

export default function AuditLogPage() {
  const { can } = usePermissions()
  const { data, isLoading } = useQuery({ queryKey: coreKeys.audit, queryFn: auditApi.list })
  const [category, setCategory] = useState<string>()
  const rows = (data ?? []).filter((l) => !category || l.category === category)

  // بازگردانی ممکن است هر داده‌ای را تغییر دهد → کل کش باطل می‌شود
  const rollback = useApiMutation((id: string) => auditApi.rollback(id), { invalidate: [[]], successMessage: 'بازگردانی انجام شد.' })

  return (
    <Page>
      <SectionCard>
        <DataTable<AuditEntry>
          rowKey="id"
          loading={isLoading}
          data={rows}
          searchText={(l) => `${l.user} ${l.details} ${l.at}`}
          searchPlaceholder="جستجو در جزئیات، کاربر، تاریخ…"
          filters={
            <Select
              allowClear
              placeholder="همه انواع عملیات"
              style={{ minWidth: 170 }}
              value={category}
              onChange={setCategory}
              options={auditCategories().map((c) => ({ value: c.value, label: c.label }))}
            />
          }
          exportAs={{
            filename: 'گزارش-تغییرات',
            headers: ['تاریخ و ساعت', 'کاربر', 'نوع عملیات', 'جزئیات'],
            row: (l) => [l.at, l.user, auditCategory(l.category).label, l.details],
          }}
          empty={{ title: 'هنوز رویدادی ثبت نشده است', description: 'هر ثبت، ویرایش، لغو یا حذف در سامانه اینجا ثبت می‌شود.' }}
          columns={[
            { title: 'زمان', dataIndex: 'at', width: 150, render: (v) => <span className="num nowrap">{v}</span> },
            {
              title: 'کاربر',
              dataIndex: 'user',
              width: 220,
              render: (u: string) => (
                <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                  <Avatar name={u} size={26} />
                  <span className="nowrap">{u}</span>
                </span>
              ),
            },
            {
              title: 'نوع',
              dataIndex: 'category',
              width: 110,
              render: (c: string) => (
                <Tag color={auditCategory(c).color} variant="filled">
                  {auditCategory(c).label}
                </Tag>
              ),
            },
            {
              title: 'جزئیات',
              dataIndex: 'details',
              render: (d: string, l) => (
                <span style={{ opacity: l.rolledBack ? 0.55 : 1 }}>
                  {d} {l.rolledBack && <Tag color="orange">بازگردانی‌شده</Tag>}
                </span>
              ),
            },
          ]}
          rowActions={(l) => [
            {
              key: 'rb',
              label: 'بازگردانی',
              icon: <RollbackOutlined />,
              confirm: 'این تغییر به حالت قبل برگردد؟',
              onClick: () => rollback.mutate(l.id),
              hidden: !l.snapshot || l.rolledBack || !can('log.rollback'),
            },
          ]}
        />
      </SectionCard>
    </Page>
  )
}

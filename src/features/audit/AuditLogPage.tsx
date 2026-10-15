import { DownloadOutlined } from '@ant-design/icons'
import { App, Button, Select, Space, Table, Tag } from 'antd'
import { useState } from 'react'
import { auditApi } from '@/api/audit.api'
import { Section } from '@/components/common'
import { AUDIT_CATEGORIES, auditCategoryLabel } from '@/domain/constants'
import { exportXlsx } from '@/lib/excel'
import { qk, useApiMutation, useAuditLog } from '@/queries'
import { usePermissions } from '@/queries/auth'
import type { AuditCategory, AuditEntry } from '@/types'

export default function AuditLogPage() {
  const { modal } = App.useApp()
  const { data = [], isLoading } = useAuditLog()
  const { can } = usePermissions()
  const [filter, setFilter] = useState<AuditCategory | 'all'>('all')
  const rows = data.filter((l) => filter === 'all' || l.category === filter)

  // بازگردانی می‌تواند روی هر موجودیتی اثر بگذارد → همه کش‌ها invalidate می‌شوند
  const rollback = useApiMutation((id: string) => auditApi.rollback(id), {
    invalidate: [qk.settings, qk.companies, qk.staffRoot, qk.requestsRoot, qk.users, qk.rolePerms],
    successMessage: 'بازگردانی با موفقیت انجام شد.',
  })

  return (
    <Section
      title="گزارش تغییرات سامانه"
      sub="هر ثبت، ویرایش، لغو یا حذف در سامانه همراه با نام کاربر و زمان در این فهرست ثبت می‌شود."
      extra={
        <Space wrap>
          <Select
            value={filter}
            onChange={setFilter}
            style={{ minWidth: 180 }}
            options={[{ value: 'all', label: 'همه انواع عملیات' }, ...AUDIT_CATEGORIES]}
          />
          <Button
            icon={<DownloadOutlined />}
            onClick={() =>
              exportXlsx('گزارش-تغییرات', ['تاریخ و ساعت', 'کاربر', 'نوع عملیات', 'جزئیات'], rows.map((l) => [l.at, l.user, auditCategoryLabel(l.category), l.details]))
            }
          >
            خروجی اکسل
          </Button>
        </Space>
      }
    >
      <Table<AuditEntry>
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={rows}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        scroll={{ x: 900 }}
        locale={{ emptyText: 'هنوز رویدادی ثبت نشده است.' }}
        columns={[
          { title: 'تاریخ و ساعت', dataIndex: 'at', width: 150 },
          { title: 'کاربر', dataIndex: 'user', width: 200 },
          { title: 'نوع', dataIndex: 'category', width: 100, render: (c) => <Tag>{auditCategoryLabel(c)}</Tag> },
          { title: 'جزئیات', dataIndex: 'details' },
          {
            title: 'بازگردانی',
            width: 120,
            render: (_, l) =>
              l.rolledBack ? (
                <Tag color="orange">بازگردانی‌شده</Tag>
              ) : l.snapshot && can('log.rollback') ? (
                <Button
                  size="small"
                  onClick={() =>
                    modal.confirm({
                      title: 'بازگردانی به حالت قبل؟',
                      content: l.details,
                      okText: 'بازگردانی',
                      onOk: () => rollback.mutateAsync(l.id),
                    })
                  }
                >
                  بازگردانی
                </Button>
              ) : '—',
          },
        ]}
      />
    </Section>
  )
}

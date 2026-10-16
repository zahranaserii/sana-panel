import { DeleteOutlined, EditOutlined, PlusOutlined, SafetyOutlined, TeamOutlined } from '@ant-design/icons'
import { yupResolver } from '@hookform/resolvers/yup'
import { Badge, Button, Select, Tabs, Tag } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import {
  appConfig,
  coreKeys,
  type PublicUser,
  roleDef,
  roleLabel,
  useApiMutation,
  useCurrentUser,
  usePermissions,
  type UserInput,
  useUsers,
  usersApi,
} from '@/core'
import { faString, FormDrawer, FormGrid, FormSection, PasswordField, requiredMsg, SelectField, TextField } from '@/core/form'
import { faDigits } from '@/core/lib/digits'
import { Avatar, DataTable, Page, SectionCard, useDisclosure } from '@/core/ui'
import { RolePermissionsMatrix } from './RolePermissionsMatrix'

const makeSchema = (editing: boolean, taken: string[]) =>
  yup.object({
    username: yup
      .string()
      .trim()
      .required(requiredMsg)
      .matches(/^[a-zA-Z0-9._-]{3,30}$/, 'فقط حروف لاتین، عدد و . _ - (۳ تا ۳۰ کاراکتر)')
      .notOneOf(taken, 'این نام کاربری قبلاً ثبت شده است'),
    password: editing
      ? yup.string().default('').test('len', 'حداقل ۶ کاراکتر', (v) => !v || v.length >= 6)
      : yup.string().required(requiredMsg).min(6, 'حداقل ۶ کاراکتر'),
    fullName: yup.string().trim().required(requiredMsg),
    userCode: faString().required(requiredMsg),
    unitName: yup.string().trim().required(requiredMsg),
    unitCode: faString().required(requiredMsg),
    role: yup.string().required(requiredMsg),
  })
type Values = yup.InferType<ReturnType<typeof makeSchema>>

export default function UsersPage() {
  const { can } = usePermissions()
  const { data: users, isLoading } = useUsers()
  const { user: me } = useCurrentUser()
  const drawer = useDisclosure<PublicUser>()
  const [role, setRole] = useState<string>()
  const unit = appConfig().orgUnitLabel

  const remove = useApiMutation((id: string) => usersApi.remove(id), { invalidate: [coreKeys.users], successMessage: 'کاربر حذف شد.' })
  const rows = useMemo(() => (users ?? []).filter((u) => !role || u.role === role), [users, role])

  return (
    <Page
      actions={
        can('users.edit') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => drawer.open()}>
            کاربر جدید
          </Button>
        )
      }
    >
      <Tabs
        items={[
          {
            key: 'users',
            label: (
              <span>
                <TeamOutlined /> کاربران <Badge count={users?.length} color="#98A2B3" size="small" />
              </span>
            ),
            children: (
              <SectionCard>
                <DataTable<PublicUser>
                  rowKey="id"
                  loading={isLoading}
                  data={rows}
                  searchText={(u) => [u.username, u.fullName, u.unitName, u.userCode].join(' ')}
                  searchPlaceholder="جستجوی نام، نام کاربری، واحد…"
                  filters={
                    <Select allowClear placeholder="همه نقش‌ها" style={{ minWidth: 170 }} value={role} onChange={setRole} options={appConfig().roles} />
                  }
                  columns={[
                    {
                      title: 'کاربر',
                      render: (_, u) => (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <Avatar name={u.fullName} size={32} />
                          <div>
                            <div style={{ fontWeight: 700 }}>
                              {u.fullName} {u.id === me?.id && <Tag color="gold">شما</Tag>}
                            </div>
                            <div className="hint" dir="ltr" style={{ textAlign: 'right' }}>{u.username}</div>
                          </div>
                        </div>
                      ),
                    },
                    { title: 'کد کاربر', dataIndex: 'userCode', render: faDigits },
                    { title: unit, render: (_, u) => <>{u.unitName} <span className="faint">({faDigits(u.unitCode)})</span></> },
                    { title: 'نقش', dataIndex: 'role', render: (r: string) => <Tag color={roleDef(r)?.color}>{roleLabel(r)}</Tag> },
                  ]}
                  rowActions={(u) => [
                    { key: 'edit', label: 'ویرایش', icon: <EditOutlined />, onClick: () => drawer.open(u), hidden: !can('users.edit') },
                    {
                      key: 'del',
                      label: 'حذف',
                      icon: <DeleteOutlined />,
                      danger: true,
                      confirm: `کاربر «${u.fullName}» حذف شود؟`,
                      onClick: () => remove.mutate(u.id),
                      hidden: !can('users.edit'),
                      disabled: u.id === me?.id,
                    },
                  ]}
                />
              </SectionCard>
            ),
          },
          {
            key: 'roles',
            label: (
              <span>
                <SafetyOutlined /> دسترسی نقش‌ها
              </span>
            ),
            children: <RolePermissionsMatrix />,
          },
        ]}
      />
      <UserDrawer open={drawer.isOpen} user={drawer.data} users={users ?? []} onClose={drawer.close} />
    </Page>
  )
}

function UserDrawer({ open, user, users, onClose }: { open: boolean; user: PublicUser | null; users: PublicUser[]; onClose: () => void }) {
  const taken = users.filter((u) => u.id !== user?.id).map((u) => u.username)
  const form = useForm<Values>({ resolver: yupResolver(makeSchema(!!user, taken)) })
  useEffect(() => {
    if (open)
      form.reset(
        user
          ? { ...user, password: '' }
          : { username: '', password: '', fullName: '', userCode: '', unitName: '', unitCode: '', role: appConfig().roles.at(-1)!.value },
      )
  }, [open, user, form])
  const save = useApiMutation((input: UserInput) => (user ? usersApi.update(user.id, input) : usersApi.create(input)), {
    invalidate: [coreKeys.users],
    successMessage: user ? 'کاربر ویرایش شد.' : 'کاربر ثبت شد.',
  })
  const unit = appConfig().orgUnitLabel
  const c = form.control
  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={user ? `ویرایش ${user.fullName}` : 'کاربر جدید'}
      form={form}
      loading={save.isPending}
      submitText={user ? 'ذخیره تغییرات' : 'ثبت کاربر'}
      width={620}
      onSubmit={(v) => save.mutate(v, { onSuccess: onClose })}
    >
      <FormSection title="مشخصات">
        <FormGrid>
          <TextField control={c} name="fullName" label="نام و نام خانوادگی" required />
          <TextField control={c} name="userCode" label="کد کاربر" required />
        </FormGrid>
      </FormSection>
      <FormSection title="حساب کاربری">
        <FormGrid>
          <TextField control={c} name="username" label="نام کاربری" required inputProps={{ dir: 'ltr', autoComplete: 'off' }} />
          <PasswordField
            control={c}
            name="password"
            label="رمز عبور"
            required={!user}
            extra={user ? 'برای عدم تغییر، خالی بگذارید' : undefined}
            inputProps={{ autoComplete: 'new-password', dir: 'ltr' }}
          />
          <SelectField control={c} name="role" label="نقش" required options={appConfig().roles} />
        </FormGrid>
      </FormSection>
      <FormSection title={unit}>
        <FormGrid>
          <TextField control={c} name="unitName" label={`نام ${unit}`} required />
          <TextField control={c} name="unitCode" label={`کد ${unit}`} required />
        </FormGrid>
      </FormSection>
    </FormDrawer>
  )
}


import { yupResolver } from '@hookform/resolvers/yup'
import { App, Button, Form, Space, Table, Tag } from 'antd'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import { usersApi, type UserInput } from '@/api/users.api'
import { Can, Section } from '@/components/common'
import { RHFInput, RHFPassword, RHFSelect } from '@/components/form'
import { roleLabel, ROLES } from '@/domain/constants'
import { faDigits } from '@/lib/digits'
import { faString, requiredMsg } from '@/lib/validators'
import { qk, useApiMutation, useUsers } from '@/queries'
import { useCurrentUser, usePermissions } from '@/queries/auth'
import type { PublicUser, Role } from '@/types'
import { RolePermissionsTable } from './RolePermissionsTable'

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
    branchName: yup.string().trim().required(requiredMsg),
    branchCode: faString().required(requiredMsg),
    role: yup.mixed<Role>().oneOf(ROLES.map((r) => r.value)).required(requiredMsg),
  })
type Values = yup.InferType<ReturnType<typeof makeSchema>>

const empty: Values = { username: '', password: '', fullName: '', userCode: '', branchName: '', branchCode: '', role: 'DIGITAL_BRANCH' }

export default function UsersPage() {
  const { modal } = App.useApp()
  const { data: users = [], isLoading } = useUsers()
  const { user: me } = useCurrentUser()
  const { can } = usePermissions()
  const [editing, setEditing] = useState<PublicUser | null>(null)

  const taken = useMemo(() => users.filter((u) => u.id !== editing?.id).map((u) => u.username), [users, editing])
  const schema = useMemo(() => makeSchema(!!editing, taken), [editing, taken])
  const { control, handleSubmit, reset } = useForm<Values>({ resolver: yupResolver(schema), defaultValues: empty })

  const startEdit = (u: PublicUser | null) => {
    setEditing(u)
    reset(u ? { ...u, password: '' } : empty)
  }

  const save = useApiMutation(
    (input: UserInput) => (editing ? usersApi.update(editing.id, input) : usersApi.create(input)),
    { invalidate: [qk.users], successMessage: editing ? 'کاربر ویرایش شد.' : 'کاربر ثبت شد.' },
  )
  const remove = useApiMutation((id: string) => usersApi.remove(id), { invalidate: [qk.users], successMessage: 'کاربر حذف شد.' })

  return (
    <>
      <Can perm="users.edit">
        <Section
          title={editing ? `ویرایش کاربر ${editing.username}` : 'افزودن کاربر'}
          sub="برای هر شعبه یک کاربر با نام کاربری و رمز عبور مجزا تعریف کنید. نام و کد شعبه هنگام ثبت شرکت به‌عنوان «ثبت‌کننده» ذخیره می‌شود."
        >
          <form onSubmit={handleSubmit((v) => save.mutate(v, { onSuccess: () => startEdit(null) }))} noValidate>
            <Form layout="vertical" component={false}>
              <div className="form-grid">
                <RHFInput control={control} name="username" label="نام کاربری" required inputProps={{ dir: 'ltr', autoComplete: 'off' }} />
                <RHFPassword
                  control={control}
                  name="password"
                  label="رمز عبور"
                  required={!editing}
                  extra={editing ? 'برای عدم تغییر، خالی بگذارید' : undefined}
                  inputProps={{ autoComplete: 'new-password' }}
                />
                <RHFInput control={control} name="fullName" label="نام و نام خانوادگی" required />
                <RHFInput control={control} name="userCode" label="کد کاربر" required />
                <RHFInput control={control} name="branchName" label="نام شعبه" required />
                <RHFInput control={control} name="branchCode" label="کد شعبه" required />
                <RHFSelect control={control} name="role" label="نقش" required options={ROLES} />
              </div>
            </Form>
            <Space>
              <Button type="primary" htmlType="submit" loading={save.isPending}>
                {editing ? 'ذخیره تغییرات' : 'ثبت کاربر'}
              </Button>
              <Button onClick={() => startEdit(null)}>انصراف</Button>
            </Space>
          </form>
        </Section>
      </Can>

      <Section title="فهرست کاربران">
        <Table<PublicUser>
          rowKey="id"
          loading={isLoading}
          dataSource={users}
          scroll={{ x: 800 }}
          columns={[
            { title: 'نام کاربری', dataIndex: 'username' },
            { title: 'نام و نام خانوادگی', dataIndex: 'fullName' },
            { title: 'کد کاربر', dataIndex: 'userCode', render: faDigits },
            { title: 'شعبه', dataIndex: 'branchName' },
            { title: 'کد شعبه', dataIndex: 'branchCode', render: faDigits },
            { title: 'نقش', dataIndex: 'role', render: (r: Role) => <Tag>{roleLabel(r)}</Tag> },
            {
              title: 'عملیات',
              render: (_, u) =>
                can('users.edit') && (
                  <Space size={4}>
                    <Button size="small" onClick={() => startEdit(u)}>ویرایش</Button>
                    <Button
                      size="small"
                      danger
                      disabled={u.id === me?.id}
                      onClick={() =>
                        modal.confirm({ title: `کاربر ${u.username} حذف شود؟`, okButtonProps: { danger: true }, onOk: () => remove.mutateAsync(u.id) })
                      }
                    >
                      حذف
                    </Button>
                  </Space>
                ),
            },
          ]}
        />
      </Section>

      <RolePermissionsTable />
    </>
  )
}

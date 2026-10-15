import { useQuery } from '@tanstack/react-query'
import { auditApi } from '@/api/audit.api'
import { companiesApi } from '@/api/companies.api'
import { requestsApi } from '@/api/requests.api'
import { settingsApi } from '@/api/settings.api'
import { staffApi } from '@/api/staff.api'
import { usersApi } from '@/api/users.api'
import { qk } from './keys'

export { qk } from './keys'
export { useApiMutation } from './useApiMutation'

export const useSettings = () => useQuery({ queryKey: qk.settings, queryFn: settingsApi.get, staleTime: Infinity })
export const useCompanies = () => useQuery({ queryKey: qk.companies, queryFn: companiesApi.list })
export const useStaff = (companyId?: string | null, opts: { all?: boolean } = {}) =>
  useQuery({
    queryKey: qk.staff(companyId ?? undefined),
    queryFn: () => staffApi.list(companyId ?? undefined),
    enabled: !!companyId || !!opts.all,
  })
export const useRequests = (companyId?: string | null, opts: { all?: boolean } = {}) =>
  useQuery({
    queryKey: qk.requests(companyId ?? undefined),
    queryFn: () => requestsApi.list(companyId ?? undefined),
    enabled: !!companyId || !!opts.all,
  })
export const useUsers = () => useQuery({ queryKey: qk.users, queryFn: usersApi.list })
export const useRolePerms = () => useQuery({ queryKey: qk.rolePerms, queryFn: usersApi.getRolePerms })
export const useAuditLog = () => useQuery({ queryKey: qk.audit, queryFn: auditApi.list })

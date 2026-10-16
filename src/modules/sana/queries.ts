import { useQuery } from '@tanstack/react-query'
import { companiesApi } from './api/companies.api'
import { requestsApi } from './api/requests.api'
import { settingsApi } from './api/settings.api'
import { staffApi } from './api/staff.api'

/** Query Key Factory ماژول سانا */
export const sanaKeys = {
  settings: ['sana', 'settings'] as const,
  companies: ['sana', 'companies'] as const,
  staffRoot: ['sana', 'staff'] as const,
  staff: (companyId?: string) => ['sana', 'staff', companyId ?? 'all'] as const,
  requestsRoot: ['sana', 'requests'] as const,
  requests: (companyId?: string) => ['sana', 'requests', companyId ?? 'all'] as const,
}

export const useSettings = () => useQuery({ queryKey: sanaKeys.settings, queryFn: settingsApi.get, staleTime: Infinity })
export const useCompanies = () => useQuery({ queryKey: sanaKeys.companies, queryFn: companiesApi.list })
export const useStaff = (companyId?: string | null, opts: { all?: boolean } = {}) =>
  useQuery({
    queryKey: sanaKeys.staff(companyId ?? undefined),
    queryFn: () => staffApi.list(companyId ?? undefined),
    enabled: !!companyId || !!opts.all,
  })
export const useRequests = (companyId?: string | null, opts: { all?: boolean } = {}) =>
  useQuery({
    queryKey: sanaKeys.requests(companyId ?? undefined),
    queryFn: () => requestsApi.list(companyId ?? undefined),
    enabled: !!companyId || !!opts.all,
  })

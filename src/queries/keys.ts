/** Query Key Factory — یک منبع واحد برای کلیدها تا invalidate دقیق باشد */
export const qk = {
  settings: ['settings'] as const,
  companies: ['companies'] as const,
  staffRoot: ['staff'] as const,
  staff: (companyId?: string) => ['staff', companyId ?? 'all'] as const,
  requestsRoot: ['requests'] as const,
  requests: (companyId?: string) => ['requests', companyId ?? 'all'] as const,
  users: ['users'] as const,
  rolePerms: ['rolePerms'] as const,
  audit: ['audit'] as const,
}

/**
 * API عمومی هسته. ماژول‌ها فقط از این مسیرها import می‌کنند:
 *   '@/core'        پیکربندی، ماژول، داده، احراز هویت، کوئری
 *   '@/core/ui'     کامپوننت‌های نمایشی عمومی
 *   '@/core/form'   فیلدها و فرم‌های RHF + yup
 *   '@/core/lib/*'  ابزارها (تاریخ شمسی، اعداد، مبلغ، اکسل، اعتبارسنجی)
 */
export { configureApp, appConfig, onConfigured } from './config'
export type { AppConfig, RoleDef, SeedUser } from './config'
export type { AppModule, PageDef, PermissionGroup, AuditCategoryDef } from './module/types'
export { auditCategory, auditCategories, allPermissionGroups } from './module/registry'
export { createMockStore, ApiError, findOr404, resetAllStores } from './data/store'
export type { MockStore, MutationCtx, Actor } from './data/store'
export { usersApi, rolesApi, auditApi, appendAuditHistory } from './data/identity'
export type { User, PublicUser, RolePerms, AuditEntry, UserInput } from './data/identity'
export { useCurrentUser, usePermissions, useUsers, useRolePerms, roleLabel, roleDef } from './auth/hooks'
export { useApiMutation, coreKeys } from './query'
export { applyCssVars } from './theme'
export { CoreApp } from './CoreApp'
export { uid } from './lib/id'

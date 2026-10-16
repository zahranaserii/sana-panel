import { appConfig } from '@/core/config'
import { appendAuditHistory } from '@/core/data/identity'
import { createMockStore } from '@/core/data/store'
import { DEFAULT_SETTINGS } from '../domain/constants'
import type { Company, LoanRequest, Settings, Staff } from '../types'
import { buildDemoData } from './seed'

export interface SanaState extends Record<string, unknown> {
  settings: Settings
  companies: Company[]
  staff: Staff[]
  requests: LoanRequest[]
}

/** دیتابیس Mock ماژول سانا (کلید: <prefix>:sana) */
export const sana = createMockStore<SanaState>('sana', () => {
  const s: SanaState = { settings: structuredClone(DEFAULT_SETTINGS), companies: [], staff: [], requests: [] }
  if (appConfig().demo.enabled) appendAuditHistory(buildDemoData(s))
  return s
})

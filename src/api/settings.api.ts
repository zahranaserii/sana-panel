import type { Settings } from '@/types'
import { mutate, query } from './db'

export const settingsApi = {
  get: () => query((db) => db.settings),

  update: (next: Settings, changeSummary: string[]) =>
    mutate((db, { log }) => {
      const before = db.settings
      db.settings = next
      log('SETTINGS', `ویرایش اطلاعات پایه — ${changeSummary.length} مورد: ${changeSummary.join('؛ ')}`, {
        entity: 'settings',
        before,
      })
      return db.settings
    }),
}

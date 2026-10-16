import type { Settings } from '../types'
import { sana } from './store'

export const settingsApi = {
  get: () => sana.query((db) => db.settings),

  update: (next: Settings, changeSummary: string[]) =>
    sana.mutate((db, { log }) => {
      const before = db.settings
      db.settings = next
      log('SETTINGS', `ویرایش اطلاعات پایه — ${changeSummary.length} مورد: ${changeSummary.join('؛ ')}`, {
        collection: 'settings',
        before,
      })
      return db.settings
    }),
}

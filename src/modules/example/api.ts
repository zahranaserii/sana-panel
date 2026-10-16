/**
 * لایه داده ماژول نمونه.
 * برای اتصال به بک‌اند واقعی فقط بدنه همین توابع را با fetch/axios جایگزین کنید.
 */
import { createMockStore, findOr404 } from '@/core/data/store'
import { uid } from '@/core/lib/id'
import { todayISO } from '@/core/lib/jalali'

export interface Announcement {
  id: string
  title: string
  body: string
  priority: 'low' | 'normal' | 'high'
  publishDate: string
  pinned: boolean
  author: string
}
export type AnnouncementInput = Omit<Announcement, 'id' | 'author'>

const store = createMockStore('example', () => ({
  announcements: [
    { id: uid(), title: 'به‌روزرسانی سامانه', body: 'نسخه جدید پنل با منوی تازه منتشر شد.', priority: 'normal', publishDate: todayISO(), pinned: true, author: 'مدیر سامانه' },
  ] as Announcement[],
}))

export const announcementsApi = {
  list: () => store.query((s) => s.announcements),
  create: (input: AnnouncementInput) =>
    store.mutate((s, { actor, log }) => {
      const a = { ...input, id: uid(), author: actor.fullName }
      s.announcements.unshift(a)
      log('NOTICE', `انتشار اطلاعیه: ${a.title}`)
      return a
    }),
  update: (id: string, input: AnnouncementInput) =>
    store.mutate((s, { log }) => {
      const a = findOr404(s.announcements, id, 'اطلاعیه')
      const before = structuredClone(a)
      Object.assign(a, input)
      // snapshot → در «گزارش تغییرات» قابل بازگردانی است
      log('NOTICE', `ویرایش اطلاعیه: ${a.title}`, { collection: 'announcements', id, before })
      return a
    }),
  remove: (id: string) =>
    store.mutate((s, { log }) => {
      const a = findOr404(s.announcements, id, 'اطلاعیه')
      s.announcements = s.announcements.filter((x) => x.id !== id)
      log('NOTICE', `حذف اطلاعیه: ${a.title}`)
    }),
}

import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { appConfig, onConfigured } from '../config'

/** storage با پیشوند پروژه (پیشوند در زمان استفاده خوانده می‌شود، نه هنگام import) */
export const prefixedStorage = (backend: () => Storage): StateStorage => ({
  getItem: (n) => backend().getItem(`${appConfig().storagePrefix}:${n}`),
  setItem: (n, v) => backend().setItem(`${appConfig().storagePrefix}:${n}`, v),
  removeItem: (n) => backend().removeItem(`${appConfig().storagePrefix}:${n}`),
})

interface SessionState {
  /** در بک‌اند واقعی: توکن در کوکی httpOnly؛ اینجا فقط شناسه کاربر */
  userId: string | null
  setSession: (userId: string) => void
  logout: () => void
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      userId: null,
      setSession: (userId) => set({ userId }),
      logout: () => set({ userId: null }),
    }),
    // hydrate بعد از configureApp (پیشوند storage از config خوانده می‌شود)
    { name: 'session', storage: createJSONStorage(() => prefixedStorage(() => sessionStorage)), skipHydration: true },
  ),
)
onConfigured(() => void useSession.persist.rehydrate())

export const sessionUserId = () => useSession.getState().userId

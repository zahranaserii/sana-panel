import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface AuthState {
  userId: string | null
  /** در بک‌اند واقعی: access token (ترجیحاً در کوکی httpOnly، نه در storage) */
  setSession: (userId: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      setSession: (userId) => set({ userId }),
      logout: () => set({ userId: null }),
    }),
    { name: 'sana-session', storage: createJSONStorage(() => sessionStorage) },
  ),
)

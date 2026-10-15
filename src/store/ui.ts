import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** شرکتِ انتخاب‌شده بین تب‌ها مشترک است (مثل نسخه HTML) */
interface UiState {
  selectedCompanyId: string | null
  setSelectedCompanyId: (id: string | null) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      selectedCompanyId: null,
      setSelectedCompanyId: (selectedCompanyId) => set({ selectedCompanyId }),
    }),
    { name: 'sana-ui' },
  ),
)

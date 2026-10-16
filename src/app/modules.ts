/**
 * 🧩 ماژول‌های فعال این پروژه — ترتیب این فهرست = ترتیب گروه‌های منو.
 * افزودن فلوی جدید: یک پوشه در src/modules بسازید (الگو: src/modules/example) و اینجا اضافه کنید.
 */
import type { AppModule } from '@/core'
import { adminModule } from '@/modules/admin'
import { exampleModule } from '@/modules/example'
import { sanaModule } from '@/modules/sana'

export const modules: AppModule[] = [
  sanaModule,
  adminModule,
  ...(import.meta.env.VITE_EXAMPLE_MODULE === 'true' ? [exampleModule] : []),
]

/**
 * قواعد معماری (تا قالب قابل استفاده مجدد بماند):
 *  1. core هیچ وابستگی به modules یا app ندارد.
 *  2. هر ماژول فقط از core و خودش import می‌کند (نه از ماژول دیگر یا app).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = resolve(__dirname, '../..')

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : []
  })
}

function imports(file: string): string[] {
  const src = readFileSync(file, 'utf8')
  return [...src.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => {
    const spec = m[1]
    if (spec.startsWith('@/')) return spec.slice(2)
    if (spec.startsWith('.')) return relative(SRC, resolve(file, '..', spec))
    return '' // پکیج خارجی
  })
}

describe('architecture boundaries', () => {
  it('core does not depend on modules or app', () => {
    const bad = files(join(SRC, 'core')).flatMap((f) =>
      imports(f)
        .filter((i) => i.startsWith('modules') || i.startsWith('app'))
        .map((i) => `${relative(SRC, f)} → ${i}`),
    )
    expect(bad).toEqual([])
  })

  it('modules only depend on core and themselves', () => {
    const mods = readdirSync(join(SRC, 'modules'))
    const bad = mods.flatMap((m) =>
      files(join(SRC, 'modules', m)).flatMap((f) =>
        imports(f)
          .filter((i) => i.startsWith('app') || (i.startsWith('modules/') && !i.startsWith(`modules/${m}`)))
          .map((i) => `${relative(SRC, f)} → ${i}`),
      ),
    )
    expect(bad).toEqual([])
  })
})

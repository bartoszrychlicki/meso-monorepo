import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { Tables } from '@/lib/table-mapping'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const srcRoot = path.resolve(currentDir, '../..')
const excludedDirs = new Set(['__tests__', 'node_modules', '.next'])
const forbiddenTables = Object.values(Tables)
const fromPattern = new RegExp(`\\.from\\((['"])(?:${forbiddenTables.join('|')})\\1\\)`, 'g')

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir)
  const files: string[] = []

  for (const entry of entries) {
    if (excludedDirs.has(entry)) {
      continue
    }

    const fullPath = path.join(dir, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      files.push(...collectSourceFiles(fullPath))
      continue
    }

    if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      files.push(fullPath)
    }
  }

  return files
}

describe('delivery table usage', () => {
  it('uses Tables.* instead of raw Supabase table literals in .from() calls', () => {
    const offenders = collectSourceFiles(srcRoot)
      .map((filePath) => {
        const content = readFileSync(filePath, 'utf8')
        const matches = content.match(fromPattern)
        return matches?.length ? `${path.relative(srcRoot, filePath)}: ${matches.join(', ')}` : null
      })
      .filter((value): value is string => value !== null)

    expect(offenders).toEqual([])
  })
})

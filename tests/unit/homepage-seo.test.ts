import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = join(__dirname, '..', '..')

function readProjectFile(path: string) {
  return readFileSync(join(projectRoot, path), 'utf8')
}

describe('homepage SEO shell', () => {
  it('keeps the homepage as a static server component without an extra SEO footer', () => {
    const pageSource = readProjectFile('app/page.tsx')

    expect(pageSource.trimStart().startsWith('"use client"')).toBe(false)
    expect(pageSource).toContain('匕首之心车卡器')
    expect(pageSource).toContain('HomeClientApp')
    expect(pageSource).not.toContain('<footer')
  })

  it('exposes the about page through the existing watermark and sitemap', () => {
    const layoutSource = readProjectFile('app/layout.tsx')
    const aboutSource = readProjectFile('app/about/page.tsx')
    const sitemapSource = readProjectFile('public/sitemap.xml')

    expect(layoutSource).toContain('href="/about"')
    expect(layoutSource).toContain('关于本站')
    expect(aboutSource).toContain('匕首之心车卡器')
    expect(sitemapSource).toContain('https://dhsheet.site/about')
  })
})

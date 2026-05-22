import { describe, expect, it } from 'vitest'

import { getUmamiAnalyticsConfig } from '@/lib/analytics'

describe('Umami analytics config', () => {
  it('uses the production Umami Cloud website id by default', () => {
    expect(getUmamiAnalyticsConfig({})).toEqual({
      scriptSrc: 'https://cloud.umami.is/script.js',
      websiteId: '83439719-8911-42e4-b87c-9a108cebf1b7',
      domains: 'dhsheet.site,www.dhsheet.site',
    })
  })

  it('allows the website id to be overridden by environment variable', () => {
    expect(
      getUmamiAnalyticsConfig({
        NEXT_PUBLIC_UMAMI_WEBSITE_ID: 'test-website-id',
      })
    ).toEqual({
      scriptSrc: 'https://cloud.umami.is/script.js',
      websiteId: 'test-website-id',
      domains: 'dhsheet.site,www.dhsheet.site',
    })
  })
})

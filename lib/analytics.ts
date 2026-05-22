type AnalyticsEnv = Record<string, string | undefined>

const DEFAULT_UMAMI_WEBSITE_ID = '83439719-8911-42e4-b87c-9a108cebf1b7'

export type UmamiAnalyticsConfig = {
  scriptSrc: string
  websiteId: string
  domains: string
}

export function getUmamiAnalyticsConfig(env: AnalyticsEnv): UmamiAnalyticsConfig {
  const websiteId = env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim() || DEFAULT_UMAMI_WEBSITE_ID

  return {
    scriptSrc: 'https://cloud.umami.is/script.js',
    websiteId,
    domains: 'dhsheet.site,www.dhsheet.site',
  }
}

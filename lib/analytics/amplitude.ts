import * as amplitude from '@amplitude/analytics-browser'

/*
 * Privacy contract:
 * Only anonymised merchant identifiers and approved event-level metadata
 * are transmitted to Amplitude.
 * Never send PII, merchant business names, order-volume bands, or free-text concerns.
 * `identify()` may set only:
 * - merchantId (as the Amplitude user ID)
 * - optional accountTier
 */

let initialised = false

type IdentifyProperties = {
  accountTier?: string
}

export function initAmplitude() {
  if (typeof window === 'undefined') return
  if (initialised) return
  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY
  if (!apiKey) return
  amplitude.init(apiKey, { defaultTracking: false })
  initialised = true
}

export function identify(merchantId: string, properties?: IdentifyProperties) {
  if (typeof window === 'undefined') return
  amplitude.setUserId(merchantId)
  if (properties) {
    const identifyEvent = new amplitude.Identify()
    Object.entries(properties).forEach(([key, value]) => {
      if (value) identifyEvent.set(key, value)
    })
    amplitude.identify(identifyEvent)
  }
}

export function track(
  event: AnalyticsEvent,
  properties?: Record<string, string | number | boolean | null>
) {
  if (typeof window === 'undefined') return
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics]', event, properties ?? '')
    return
  }
  amplitude.track(event, properties ?? {})
}

export type AnalyticsEvent =
  // Activation
  | 'Onboarding Completed'
  | 'First CSV Uploaded'
  | 'First Audit Viewed'
  | 'First Customer Profile Viewed'
  | 'First Evidence Package Generated'
  | 'First Lookup Performed'
  // Core workflow
  | 'CSV Uploaded'
  | 'Audit Viewed'
  | 'Customer Profile Viewed'
  | 'Customer Drawer Opened'
  | 'Investigation Status Changed'
  | 'Note Added'
  | 'Watchlist Customer Added'
  | 'Evidence Package Generated'
  | 'Evidence PDF Downloaded'
  | 'Lookup Performed'
  | 'Quick Score Performed'
  | 'Feedback Submitted'
  | 'Transaction Dismissed'
  // Retention signals
  | 'Dashboard Viewed'
  | 'Inbox Viewed'
  | 'Watchlist Viewed'
  | 'History Viewed'
  // Demo
  | 'Demo Loaded'
  | 'Demo Sign Up Clicked'

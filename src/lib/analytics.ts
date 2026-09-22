// Centralized analytics event names + a no-op-safe tracking call.
//
// No analytics service is configured yet (no GA/Plausible/Fathom script is loaded
// anywhere in the site). track() only pushes to window.dataLayer if something has
// already defined it — otherwise it does nothing and sends no data anywhere.
// When a real analytics service is chosen, initialize it in BaseLayout.astro and
// these calls will start working without touching any component.

export const AnalyticsEvent = {
  MainCtaClick: 'cta_click_main',
  InterestFormOpen: 'interest_form_open',
  InterestFormSubmitSuccess: 'interest_form_submit_success',
  InterestFormSubmitError: 'interest_form_submit_error',
  VideoPlay: 'video_play_invitation_cindy',
  DemoRecapClick: 'demo_recap_click',
  ContactClick: 'contact_click',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function track(event: AnalyticsEventName, payload: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined' || !Array.isArray(window.dataLayer)) {
    return;
  }
  window.dataLayer.push({ event, ...payload });
}

// Shared submission helper for every form on the site (interest form, newsletter,
// contact, reservation). One Formspree endpoint handles all of them — each submission
// carries a `form_name` field so responses can be told apart in the Formspree inbox.
//
// Configure by setting PUBLIC_FORM_ENDPOINT in a .env file (see docs/EMAIL_SERVICE_PLAN.md).
// Until it's set, submitForm() never contacts anything and callers must show the
// "not configured" state — never a fake success.

export interface SubmitResult {
  ok: boolean;
  reason?: 'not-configured' | 'network-error' | 'rejected';
}

export function isFormConfigured(): boolean {
  const endpoint = import.meta.env.PUBLIC_FORM_ENDPOINT as string | undefined;
  return typeof endpoint === 'string' && endpoint.trim().length > 0;
}

export async function submitForm(formName: string, data: Record<string, string>): Promise<SubmitResult> {
  const endpoint = import.meta.env.PUBLIC_FORM_ENDPOINT as string | undefined;

  if (!endpoint) {
    return { ok: false, reason: 'not-configured' };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ form_name: formName, ...data }),
    });

    if (!response.ok) {
      return { ok: false, reason: 'rejected' };
    }

    return { ok: true };
  } catch {
    return { ok: false, reason: 'network-error' };
  }
}

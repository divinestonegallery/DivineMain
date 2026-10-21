const storagePrefix = "dsg-enquiry-submission:";
const utmPattern = /^[\w.\- ]+$/;

function storageKey(formKey: string) {
  return `${storagePrefix}${formKey}`;
}

export function currentSubmissionId(formKey: string) {
  if (typeof window === "undefined") return undefined;
  const key = storageKey(formKey);
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const next = window.crypto?.randomUUID?.() || `enquiry-${Date.now()}`;
  window.sessionStorage.setItem(key, next);
  return next;
}

export function rotateSubmissionId(formKey: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(storageKey(formKey));
}

function campaignValue(params: URLSearchParams, name: string) {
  const value = (params.get(name) || "").trim().slice(0, 120);
  if (!value || !utmPattern.test(value)) return undefined;
  return value;
}

export function websiteAttribution(formKey: string) {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname.startsWith("/") ? window.location.pathname.slice(0, 200) : undefined;
  return {
    submission_id: currentSubmissionId(formKey),
    landing_path: path,
    utm_source: campaignValue(params, "utm_source"),
    utm_medium: campaignValue(params, "utm_medium"),
    utm_campaign: campaignValue(params, "utm_campaign"),
    utm_term: campaignValue(params, "utm_term"),
    utm_content: campaignValue(params, "utm_content"),
  };
}

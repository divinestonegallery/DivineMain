// @ts-nocheck
type BodyRequest = {
  headers: Headers;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export function declaredBodyExceeds(request: Pick<BodyRequest, "headers">, maxBytes: number) {
  const value = request.headers.get("content-length");
  if (!value) return false;
  const length = Number(value);
  return !Number.isSafeInteger(length) || length < 0 || length > maxBytes;
}

export async function readTextWithinLimit(request: BodyRequest, maxBytes: number) {
  if (declaredBodyExceeds(request, maxBytes)) return null;
  const body = await request.text();
  return new TextEncoder().encode(body).byteLength <= maxBytes ? body : null;
}

export async function readBytesWithinLimit(request: BodyRequest, maxBytes: number) {
  if (declaredBodyExceeds(request, maxBytes)) return null;
  const body = await request.arrayBuffer();
  return body.byteLength <= maxBytes ? body : null;
}

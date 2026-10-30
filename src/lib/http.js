import "server-only";

export class RequestError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function jsonResponse(body, status = 200) {
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (status === 429) headers["Retry-After"] = "3600";
  return Response.json(body, { status, headers });
}

export async function readOrderJson(request) {
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(process.env.APP_ORIGIN || request.url).origin;
  if (origin && origin !== expectedOrigin) {
    throw new RequestError(403, "ORIGIN_REJECTED", "This request origin is not allowed.");
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new RequestError(415, "JSON_REQUIRED", "Use application/json.");
  }
  const limit = 16384;
  if (Number(request.headers.get("content-length")) > limit) {
    throw new RequestError(413, "BODY_TOO_LARGE", "The order request is too large.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400, "INVALID_JSON", "A JSON body is required.");
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new RequestError(413, "BODY_TOO_LARGE", "The order request is too large.");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError(400, "INVALID_JSON", "The request body is not valid JSON.");
  } finally {
    reader.releaseLock();
  }
}

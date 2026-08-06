// Server-only Square API client. Never import from client components —
// tokens live in env vars and must not reach the browser bundle.
//
// SQUARE_ENV=production uses the live account; anything else uses sandbox.
// Tokens: SQUARE_PROD_ACCESS_TOKEN / SQUARE_SANDBOX_ACCESS_TOKEN (.env.local).

const IS_PRODUCTION = process.env.SQUARE_ENV === "production";

const BASE_URL = IS_PRODUCTION
  ? "https://connect.squareup.com"
  : "https://connect.squareupsandbox.com";

export class SquareApiError extends Error {
  constructor(
    public status: number,
    public errors: Array<{ category: string; code: string; detail?: string }>
  ) {
    super(
      `Square API ${status}: ${errors.map((e) => `${e.code} ${e.detail ?? ""}`).join("; ")}`
    );
    this.name = "SquareApiError";
  }
}

function accessToken(): string {
  const token = IS_PRODUCTION
    ? process.env.SQUARE_PROD_ACCESS_TOKEN
    : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      `Missing ${IS_PRODUCTION ? "SQUARE_PROD_ACCESS_TOKEN" : "SQUARE_SANDBOX_ACCESS_TOKEN"} env var`
    );
  }
  return token;
}

export async function square<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as T & {
    errors?: Array<{ category: string; code: string; detail?: string }>;
  };
  if (!res.ok) {
    throw new SquareApiError(res.status, json.errors ?? []);
  }
  return json;
}

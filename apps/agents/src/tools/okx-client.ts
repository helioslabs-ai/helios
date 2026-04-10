const OKX_BASE = "https://web3.okx.com";
export const CHAIN_INDEX = "196"; // X Layer

function sign(ts: string, method: string, path: string, body: string): string {
  const prehash = `${ts}${method.toUpperCase()}${path}${body}`;
  const key = new TextEncoder().encode(process.env.OKX_SECRET_KEY ?? "");
  const msg = new TextEncoder().encode(prehash);
  const hmac = new Bun.CryptoHasher("sha256", key);
  hmac.update(msg);
  return btoa(String.fromCharCode(...new Uint8Array(hmac.digest())));
}

interface OkxOpts {
  method?: "GET" | "POST";
  body?: unknown;
  params?: Record<string, string | undefined>;
}

export async function okxFetch<T = unknown>(path: string, opts: OkxOpts = {}): Promise<T> {
  const { method = "GET", body, params } = opts;

  let fullPath = path;
  if (params) {
    const defined = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][];
    if (defined.length > 0) {
      fullPath = `${path}?${new URLSearchParams(defined)}`;
    }
  }

  const ts = new Date().toISOString();
  const bodyStr = body !== undefined ? JSON.stringify(body) : "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "OK-ACCESS-KEY": process.env.OKX_API_KEY ?? "",
    "OK-ACCESS-SIGN": sign(ts, method, fullPath, bodyStr),
    "OK-ACCESS-TIMESTAMP": ts,
    "OK-ACCESS-PASSPHRASE": process.env.OKX_PASSPHRASE ?? "",
  };

  if (process.env.OKX_PROJECT_ID) {
    headers["OK-ACCESS-PROJECT"] = process.env.OKX_PROJECT_ID;
  }

  const res = await fetch(`${OKX_BASE}${fullPath}`, {
    method,
    headers,
    body: bodyStr || undefined,
  });

  const json = (await res.json()) as { code?: string | number; msg?: string };

  if (json.code !== undefined && json.code !== "0" && json.code !== 0) {
    throw new Error(`OKX ${method} ${path} [${json.code}]: ${json.msg}`);
  }

  return json as T;
}

export function firstItem<T>(json: { data?: T[] }): T {
  const item = (json as { data?: T[] }).data?.[0];
  if (!item) throw new Error("OKX returned empty data array");
  return item;
}

export function allItems<T>(json: { data?: T[] }): T[] {
  return (json as { data?: T[] }).data ?? [];
}

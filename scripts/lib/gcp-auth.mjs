// Lấy access token Google Cloud từ service account JSON (biến môi trường GCP_SA_KEY), không cần thư viện ngoài.
import crypto from "node:crypto";

let cached = null;

export function gcpProjectId() {
  const sa = readKey();
  return sa?.project_id || null;
}

function readKey() {
  const raw = process.env.GCP_SA_KEY;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("GCP_SA_KEY không phải JSON hợp lệ. Dán toàn bộ nội dung file khoá service account.");
  }
}

export async function gcpAccessToken() {
  if (cached && cached.exp > Date.now() / 1000 + 60) return cached.token;
  const sa = readKey();
  if (!sa) throw new Error("Thiếu secret GCP_SA_KEY.");
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = crypto.createSign("RSA-SHA256").update(unsigned).sign(sa.private_key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${sig}` }),
  });
  if (!res.ok) throw new Error(`Không lấy được access token Google Cloud: ${res.status} ${await res.text()}`);
  const j = await res.json();
  cached = { token: j.access_token, exp: now + (j.expires_in || 3600) };
  return cached.token;
}

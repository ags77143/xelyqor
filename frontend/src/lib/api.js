const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiGet(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API error");
  }
  return res.json();
}

export async function apiPost(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API error");
  }
  return res.json();
}

export async function apiPostForm(path, formData) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API error");
  }
  return res.json();
}

export async function apiDelete(path) {
  const res = await fetch(`${BASE}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error("API error");
  return res.json();
}

export async function apiPatch(path, params) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}${path}?${query}`, { method: "PATCH" });
  if (!res.ok) throw new Error("API error");
  return res.json();
}


const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");

// Common request function: JSON aur FormData (image ke saath) dono handle karta hai
const request = async (path, { method = "GET", body } = {}) => {
  const isFormData = body instanceof FormData;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body && !isFormData ? { "Content-Type": "application/json" } : undefined,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || json.success === false) {
    throw new Error(json.message || "Something went wrong.");
  }

  return json;
};

// GET /vocabulary?language=&level=&status=&search=&page=&limit=
export const getWords = async (params = {}) => {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "")
  ).toString();

  const json = await request(`/vocabulary${query ? `?${query}` : ""}`);
  return json.data; // { vocabularies, pagination }
};

// GET /vocabulary/:id
export const getWord = async (id) => {
  const json = await request(`/vocabulary/${id}`);
  return json.data.vocabulary;
};

// POST /vocabulary  (body: object ya FormData)
export const createWord = async (body) => {
  const json = await request("/vocabulary", { method: "POST", body });
  return json.data.vocabulary;
};

// PUT /vocabulary/:id  (body: object ya FormData)
export const updateWord = async (id, body) => {
  const json = await request(`/vocabulary/${id}`, { method: "PUT", body });
  return json.data.vocabulary;
};

// DELETE /vocabulary/:id
export const deleteWord = async (id) => {
  await request(`/vocabulary/${id}`, { method: "DELETE" });
};

// GET /vocabulary/stats
export const getStats = async () => {
  const json = await request("/vocabulary/stats");
  return json.data; // { overall, languages, levels }
};
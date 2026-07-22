export interface ApiObject {
  _id: string;
  title: string;
  description: string;
  imageUrl: string;
  createdAt: string;
}

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * The API may return either an absolute image URL (e.g. a real R2 URL) or a
 * relative path. Until real storage credentials are configured, normalize
 * either shape to something a browser can load.
 */
export function resolveImageUrl(imageUrl: string): string {
  if (!imageUrl) return "";
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${API_URL}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
}

function capitalize(text: string): string {
  return text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/**
 * class-validator's default error shape is `{ message: string | string[], error, statusCode }`.
 * `message` is a string array when multiple validation rules fail, or a plain
 * string for other errors (e.g. thrown HttpExceptions). Turn either shape into
 * a single readable sentence for display in the UI.
 */
function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("message" in body)) return null;

  const { message } = body as { message: unknown };
  if (Array.isArray(message)) {
    const messages = message.filter((entry): entry is string => typeof entry === "string");
    if (messages.length === 0) return null;
    return messages.map((entry) => capitalize(entry)).join("; ");
  }
  if (typeof message === "string" && message.length > 0) {
    return message;
  }
  return null;
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    let message: string | null = null;
    try {
      const body = await res.json();
      message = extractErrorMessage(body);
    } catch {
      message = (await res.text().catch(() => "")) || null;
    }
    throw new Error(
      message || `Request failed with status ${res.status} ${res.statusText}`
    );
  }
}

export interface FetchObjectsParams {
  page?: number;
  limit?: number;
}

export interface FetchObjectsResult {
  items: ApiObject[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export async function fetchObjects(
  params: FetchObjectsParams = {}
): Promise<FetchObjectsResult> {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set("page", String(params.page));
  if (params.limit !== undefined) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  const res = await fetch(`${API_URL}/objects${query ? `?${query}` : ""}`, {
    cache: "no-store",
  });
  await throwIfNotOk(res);
  const { items, total, page, limit } = (await res.json()) as {
    items: ApiObject[];
    total: number;
    page: number;
    limit: number;
  };

  return { items, total, page, limit, hasMore: page * limit < total };
}

export async function fetchObject(id: string): Promise<ApiObject> {
  const res = await fetch(`${API_URL}/objects/${id}`, { cache: "no-store" });
  await throwIfNotOk(res);
  return res.json();
}

export interface CreateObjectInput {
  title: string;
  description: string;
  file: File;
}

export async function createObject(
  input: CreateObjectInput
): Promise<ApiObject> {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("description", input.description);
  formData.append("file", input.file);

  const res = await fetch(`${API_URL}/objects`, {
    method: "POST",
    body: formData,
  });
  await throwIfNotOk(res);
  return res.json();
}

export async function deleteObject(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/objects/${id}`, { method: "DELETE" });
  await throwIfNotOk(res);
}

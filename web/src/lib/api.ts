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

async function throwIfNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(
      message || `Request failed with status ${res.status} ${res.statusText}`
    );
  }
}

export async function fetchObjects(): Promise<ApiObject[]> {
  const res = await fetch(`${API_URL}/objects`, { cache: "no-store" });
  await throwIfNotOk(res);
  return res.json();
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

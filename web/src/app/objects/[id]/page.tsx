"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ObjectImage } from "@/components/objects/object-image";
import { type ApiObject, deleteObject, fetchObject, resolveImageUrl } from "@/lib/api";
import { formatFullDateTime } from "@/lib/format-date";

export default function ObjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [object, setObject] = useState<ApiObject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchObject(id)
      .then((data) => {
        if (!cancelled) setObject(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load this object.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteObject(id);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete this object.");
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 border-b px-6 py-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to list
        </Link>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-8">
        {isLoading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
        ) : error && !object ? (
          <p className="py-16 text-center text-sm text-destructive">{error}</p>
        ) : object ? (
          <>
            <ObjectImage
              src={resolveImageUrl(object.imageUrl)}
              alt={object.title}
              className="mb-5 aspect-video w-full rounded-xl"
            />
            <h2 className="mb-1.5 text-xl font-semibold">{object.title}</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Created {formatFullDateTime(object.createdAt)}
            </p>
            <p className="mb-6 text-sm leading-relaxed whitespace-pre-wrap">
              {object.description}
            </p>

            {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting…" : "Delete Object"}
              </Button>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

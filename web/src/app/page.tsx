"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ObjectImage } from "@/components/objects/object-image";
import { type ApiObject, fetchObjects, resolveImageUrl } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format-date";
import { useObjectsSocket } from "@/lib/use-objects-socket";

export default function ObjectsListPage() {
  const [objects, setObjects] = useState<ApiObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchObjects({ page: 1 })
      .then((result) => {
        if (!cancelled) {
          setObjects(result.items);
          setPage(result.page);
          setHasMore(result.hasMore);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load objects.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    fetchObjects({ page: page + 1 })
      .then((result) => {
        setObjects((current) => [...current, ...result.items]);
        setPage(result.page);
        setHasMore(result.hasMore);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load objects.");
      })
      .finally(() => {
        setIsLoadingMore(false);
      });
  };

  const isConnected = useObjectsSocket({
    onCreated: (object) => {
      setObjects((current) => [
        object,
        ...current.filter((existing) => existing._id !== object._id),
      ]);
    },
    onDeleted: (id) => {
      setObjects((current) => current.filter((object) => object._id !== id));
    },
  });

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-base font-semibold">Objects</h1>
        <div className="flex items-center gap-4">
          <span className="flex items-center text-xs text-muted-foreground">
            <span
              className={`mr-1.5 inline-block size-1.5 rounded-full ${
                isConnected ? "bg-green-500" : "bg-zinc-400 dark:bg-zinc-600"
              }`}
            />
            {isConnected ? "Live" : "Offline"}
          </span>
          <Button size="sm" nativeButton={false} render={<Link href="/new" />}>
            + New Object
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-6">
        {isLoading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Loading objects…
          </p>
        ) : error ? (
          <p className="py-16 text-center text-sm text-destructive">{error}</p>
        ) : objects.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No objects yet. Create your first one.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
              {objects.map((object) => (
                <Link
                  key={object._id}
                  href={`/objects/${object._id}`}
                  className="group overflow-hidden rounded-xl border bg-card ring-1 ring-foreground/10 transition-colors hover:ring-foreground/20"
                >
                  <ObjectImage
                    src={resolveImageUrl(object.imageUrl)}
                    alt={object.title}
                    className="aspect-4/3 w-full"
                  />
                  <div className="p-3.5">
                    <p className="mb-1 text-sm font-semibold">{object.title}</p>
                    <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
                      {object.description}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Added {formatRelativeTime(object.createdAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

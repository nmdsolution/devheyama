"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createObject } from "@/lib/api";

export default function NewObjectPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && file !== null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit || !file) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await createObject({ title: title.trim(), description: description.trim(), file });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create object.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 border-b px-6 py-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back
        </Link>
        <h1 className="text-base font-semibold">New Object</h1>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-6 py-8">
        <form className="flex flex-col gap-4.5" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              type="text"
              placeholder="e.g. Vintage Camera"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="A short description of this object..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="image">Image</Label>
            <input
              ref={fileInputRef}
              id="image"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-input px-6 py-6 text-center text-xs text-muted-foreground transition-colors hover:border-ring"
            >
              <span>{file ? file.name : "Click to choose an image from your device"}</span>
              <span className="text-[11px]">PNG or JPG</span>
            </button>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Creating…" : "Create Object"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

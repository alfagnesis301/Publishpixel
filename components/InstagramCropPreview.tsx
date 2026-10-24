"use client";

import { useState } from "react";

type Placement = "feed" | "grid" | "story";

const placements: { id: Placement; label: string; ratio: string; note: string }[] = [
  { id: "feed", label: "Feed 4:5", ratio: "4 / 5", note: "Preview of a traditional 4:5 portrait feed placement." },
  { id: "grid", label: "Profile grid 3:4", ratio: "3 / 4", note: "A centred 3:4 crop, approximating the Instagram profile grid." },
  { id: "story", label: "Story 9:16", ratio: "9 / 16", note: "A 9:16 crop. Keep important content away from the top and bottom interface areas." }
];

export default function InstagramCropPreview({ imageUrl }: { imageUrl: string }) {
  const [placement, setPlacement] = useState<Placement>("grid");
  const selected = placements.find((item) => item.id === placement)!;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" aria-label="Instagram crop preview">
      <h3 className="text-lg font-bold text-slate-950 dark:text-white">Instagram crop preview</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Compare how a centred crop may look before exporting. This preview does not edit your original image.
      </p>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Preview placement">
        {placements.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPlacement(item.id)}
            aria-pressed={placement === item.id}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              placement === item.id
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-300 text-slate-700 hover:border-blue-500 dark:border-slate-700 dark:text-slate-200"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-4 flex justify-center rounded-lg bg-slate-100 p-4 dark:bg-slate-950">
        <div
          className="relative w-full max-w-[240px] overflow-hidden rounded-md bg-slate-200 dark:bg-slate-800"
          style={{ aspectRatio: selected.ratio }}
        >
          {/* A centred object-fit crop previews the placement without modifying the file. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={`${selected.label} crop of your uploaded image`} className="h-full w-full object-cover object-center" />
          {placement === "story" ? (
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[14%] bg-gradient-to-b from-black/40 to-transparent" aria-hidden="true" />
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-400" role="status">{selected.note} Actual Instagram crops may vary.</p>
    </section>
  );
}

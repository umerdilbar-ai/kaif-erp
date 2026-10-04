"use client";

import { Volume2 } from "lucide-react";

/** Small round play button for a saved voice memo. Stops click from bubbling to the row. */
export function PlayButton({ url }: { url: string }) {
  return (
    <span role="button" tabIndex={0} aria-label="Play voice"
      onClick={(e) => { e.stopPropagation(); new Audio(url).play(); }}
      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); new Audio(url).play(); } }}
      className="flex size-12 shrink-0 items-center justify-center rounded-full bg-money-in text-white active:scale-95">
      <Volume2 className="size-6" />
    </span>
  );
}

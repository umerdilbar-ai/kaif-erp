"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Play, Square, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { L } from "./labels";

/** Hold-to-record voice memo. Gives back a Blob (or null when cleared). `existingUrl` plays the saved one. */
export function VoiceRecorder({
  blob,
  onBlob,
  existingUrl,
}: {
  blob: Blob | null;
  onBlob: (b: Blob | null) => void;
  existingUrl?: string | null;
}) {
  const [rec, setRec] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  async function start(e: React.PointerEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (ev) => ev.data.size && chunks.current.push(ev.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunks.current.length) onBlob(new Blob(chunks.current, { type: r.mimeType || "audio/webm" }));
      };
      r.start();
      mr.current = r;
      setRec(true);
    } catch {
      setErr("Mic nahi mila / Mic not available");
    }
  }

  function stop() {
    if (mr.current?.state === "recording") mr.current.stop();
    mr.current = null;
    setRec(false);
  }

  const blobUrl = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => { if (blobUrl) URL.revokeObjectURL(blobUrl); }, [blobUrl]);
  const playUrl = blobUrl ?? existingUrl;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          "flex min-h-16 select-none items-center gap-3 rounded-2xl px-6 text-xl font-bold text-white touch-none",
          rec ? "animate-pulse bg-money-out" : "bg-brand"
        )}
      >
        {rec ? <Square className="size-7" /> : <Mic className="size-7" />}
        <span className="flex flex-col items-start leading-tight">
          <span>{rec ? L.recording.roman : L.holdToRecord.roman}</span>
          <span className="font-urdu text-base font-normal">{rec ? L.recording.ur : L.holdToRecord.ur}</span>
        </span>
      </button>
      {playUrl && !rec && (
        <>
          <button type="button" aria-label="Play" onClick={() => new Audio(playUrl).play()}
            className="flex size-16 items-center justify-center rounded-2xl bg-money-in text-white">
            <Play className="size-8" />
          </button>
          {blob && (
            <button type="button" aria-label="Delete" onClick={() => onBlob(null)}
              className="flex size-16 items-center justify-center rounded-2xl bg-red-100 text-money-out">
              <Trash2 className="size-7" />
            </button>
          )}
        </>
      )}
      {err && <p className="w-full text-lg text-money-out">{err}</p>}
    </div>
  );
}

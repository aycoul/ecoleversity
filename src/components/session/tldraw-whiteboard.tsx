"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRoomContext } from "@livekit/components-react";
import {
  RoomEvent,
  type DataPublishOptions,
  type RemoteParticipant,
} from "livekit-client";
import "tldraw/tldraw.css";
import { Loader2, X } from "lucide-react";

// Tldraw mounts a complex DOM tree synchronously and keeps a global
// editor instance — Next.js App Router SSR'ing the page would crash
// before hydration. `next/dynamic({ ssr: false })` ensures it only
// renders client-side. The 'use client' directive on this file alone
// is not sufficient; the parent page can still SSR the wrapper.
const Tldraw = dynamic(async () => (await import("tldraw")).Tldraw, {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-white">
      <Loader2 className="size-6 animate-spin text-slate-400" />
    </div>
  ),
});

// Editor type imported lazily — we only need it for the onMount typing.
// Using `unknown` keeps the static bundle from pulling in the type
// graph just for one annotation.
type AnyEditor = {
  store: {
    listen: (
      cb: (entry: {
        source: string;
        changes: unknown;
      }) => void,
      opts?: { source?: string; scope?: string }
    ) => () => void;
    mergeRemoteChanges: (cb: () => void) => void;
    applyDiff: (changes: unknown) => void;
    getStoreSnapshot: () => unknown;
    loadStoreSnapshot: (snapshot: unknown) => void;
    schema: { serialize: () => unknown };
  };
};

/**
 * tldraw whiteboard with LiveKit-data-channel sync.
 *
 * Sync is best-effort: if the broadcast fails or a peer sends a diff
 * we can't apply, we log + continue rather than break the local board.
 * That way a sync regression never blocks the user from drawing.
 *
 * Protocol over the room data channel:
 *   { type: "tld_diff", changes }    local user edit
 *   { type: "tld_request" }          new joiner asks for current state
 *   { type: "tld_snapshot", store }  any peer answers (jittered 0-250ms)
 */
export function TldrawWhiteboard({ onClose }: { onClose: () => void }) {
  const room = useRoomContext();
  const [editor, setEditor] = useState<AnyEditor | null>(null);
  const editorRef = useRef<AnyEditor | null>(null);
  const ready = useRef(false);
  const snapshotPending = useRef(false);

  // Outgoing — broadcast local user edits.
  useEffect(() => {
    if (!editor) return;
    let off: (() => void) | undefined;
    try {
      off = editor.store.listen(
        (entry) => {
          if (entry.source !== "user") return;
          if (!ready.current) return;
          try {
            const payload = new TextEncoder().encode(
              JSON.stringify({ type: "tld_diff", changes: entry.changes })
            );
            void room.localParticipant.publishData(payload, {
              reliable: true,
            } as DataPublishOptions);
          } catch (err) {
            console.warn("[tldraw] publish diff failed:", err);
          }
        },
        { source: "user", scope: "document" }
      );
    } catch (err) {
      console.warn("[tldraw] store.listen failed:", err);
    }
    return () => {
      try { off?.(); } catch { /* noop */ }
    };
  }, [editor, room]);

  // Incoming — apply diffs / handle handshake.
  useEffect(() => {
    if (!editor) return;
    const send = (payload: object) => {
      try {
        const data = new TextEncoder().encode(JSON.stringify(payload));
        void room.localParticipant.publishData(data, {
          reliable: true,
        } as DataPublishOptions);
      } catch (err) {
        console.warn("[tldraw] publish failed:", err);
      }
    };

    const onData = (
      payload: Uint8Array,
      _participant?: RemoteParticipant
    ) => {
      let msg: { type?: string; changes?: unknown; store?: unknown };
      try {
        msg = JSON.parse(new TextDecoder().decode(payload));
      } catch {
        return;
      }
      if (!msg.type || !String(msg.type).startsWith("tld_")) return;

      try {
        if (msg.type === "tld_diff" && msg.changes) {
          editor.store.mergeRemoteChanges(() => {
            editor.store.applyDiff(msg.changes);
          });
          ready.current = true;
          return;
        }
        if (msg.type === "tld_request") {
          if (snapshotPending.current) return;
          snapshotPending.current = true;
          setTimeout(() => {
            try {
              if (editorRef.current) {
                const snap = editorRef.current.store.getStoreSnapshot();
                send({ type: "tld_snapshot", store: snap });
              }
            } catch (err) {
              console.warn("[tldraw] snapshot reply failed:", err);
            } finally {
              snapshotPending.current = false;
            }
          }, Math.floor(Math.random() * 250));
          return;
        }
        if (msg.type === "tld_snapshot" && msg.store) {
          editor.store.mergeRemoteChanges(() => {
            editor.store.loadStoreSnapshot(msg.store);
          });
          ready.current = true;
          return;
        }
      } catch (err) {
        console.warn("[tldraw] apply incoming failed:", err);
      }
    };

    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [editor, room]);

  // Handshake on mount: ask for state, fall back after 1.2s if no reply.
  useEffect(() => {
    if (!editor) return;
    editorRef.current = editor;
    try {
      const data = new TextEncoder().encode(JSON.stringify({ type: "tld_request" }));
      void room.localParticipant.publishData(data, {
        reliable: true,
      } as DataPublishOptions);
    } catch {
      /* noop */
    }
    const fallback = setTimeout(() => {
      ready.current = true;
    }, 1200);
    return () => clearTimeout(fallback);
  }, [editor, room]);

  // tldraw v4 onMount provides the Editor instance.
  const onMount = useCallback((ed: unknown) => {
    setEditor(ed as AnyEditor);
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
        <span className="text-sm font-semibold text-slate-700">Tableau blanc</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
          aria-label="Fermer le tableau"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="relative flex-1">
        <Tldraw onMount={onMount} />
      </div>
    </div>
  );
}

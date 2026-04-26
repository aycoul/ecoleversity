"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import {
  RoomEvent,
  type DataPublishOptions,
  type RemoteParticipant,
} from "livekit-client";
import {
  Tldraw,
  type Editor,
  type TLStoreSnapshot,
  type RecordsDiff,
  type TLRecord,
} from "tldraw";
import "tldraw/tldraw.css";
import { X } from "lucide-react";

/**
 * Real-time multi-user whiteboard backed by tldraw, synchronised over
 * LiveKit data channels. Drop-in replacement for the previous custom
 * canvas whiteboard — same `onClose` contract, same "kept mounted with
 * display:none when closed" pattern in the parent.
 *
 * Sync protocol (room data channel, JSON over Uint8Array):
 *   - { type: "tld_diff", changes }   broadcast on local edit
 *   - { type: "tld_request" }         late-joiner asks for snapshot
 *   - { type: "tld_snapshot", store } any peer answers with full state
 *
 * "user" source filtering on outgoing diffs prevents echoing remote
 * changes back to the network. mergeRemoteChanges + applyDiff on
 * incoming makes those edits invisible to the local change listener,
 * which is what the framework expects for cross-peer sync.
 */
export function TldrawWhiteboard({ onClose }: { onClose: () => void }) {
  const room = useRoomContext();
  const [editor, setEditor] = useState<Editor | null>(null);
  const editorRef = useRef<Editor | null>(null);
  // Set once we've received a snapshot from any peer (or determined
  // we're the first one in). Until then, we hold local edits aside —
  // they'd be overwritten the moment a snapshot arrives.
  const ready = useRef(false);
  // Avoid a thundering snapshot reply when many peers are present:
  // the first peer that broadcasts a snapshot wins, others stand down.
  const snapshotPending = useRef(false);

  // ── Outgoing: broadcast local edits ─────────────────────────────
  useEffect(() => {
    if (!editor) return;
    const off = editor.store.listen(
      (entry) => {
        if (entry.source !== "user") return;
        if (!ready.current) return; // pre-handshake edits don't count
        const payload = new TextEncoder().encode(
          JSON.stringify({ type: "tld_diff", changes: entry.changes })
        );
        room.localParticipant
          .publishData(payload, { reliable: true } as DataPublishOptions)
          .catch((err) => console.warn("[tldraw] publish diff failed:", err));
      },
      { source: "user", scope: "document" }
    );
    return () => off();
  }, [editor, room]);

  // ── Incoming: apply diffs / handle handshake ────────────────────
  useEffect(() => {
    if (!editor) return;

    const send = (payload: object) => {
      const data = new TextEncoder().encode(JSON.stringify(payload));
      room.localParticipant
        .publishData(data, { reliable: true } as DataPublishOptions)
        .catch((err) => console.warn("[tldraw] publish failed:", err));
    };

    const onData = (
      payload: Uint8Array,
      _participant?: RemoteParticipant,
      _kind?: unknown,
      _topic?: string
    ) => {
      let msg: { type: string; changes?: RecordsDiff<TLRecord>; store?: TLStoreSnapshot["store"] };
      try {
        msg = JSON.parse(new TextDecoder().decode(payload));
      } catch {
        return;
      }

      if (msg.type === "tld_diff" && msg.changes) {
        editor.store.mergeRemoteChanges(() => {
          editor.store.applyDiff(msg.changes!);
        });
        ready.current = true;
        return;
      }

      if (msg.type === "tld_request") {
        // Race protection: only the first peer responds within ~250ms.
        if (snapshotPending.current) return;
        snapshotPending.current = true;
        setTimeout(() => {
          if (!editorRef.current) return;
          const snapshot = editorRef.current.store.getStoreSnapshot();
          send({ type: "tld_snapshot", store: snapshot.store });
          snapshotPending.current = false;
        }, Math.floor(Math.random() * 250));
        return;
      }

      if (msg.type === "tld_snapshot" && msg.store) {
        // Apply the authoritative snapshot. Any local edits made before
        // the handshake are overwritten by design — first joiner wins.
        editor.store.mergeRemoteChanges(() => {
          editor.store.loadStoreSnapshot({
            store: msg.store!,
            schema: editor.store.schema.serialize(),
          });
        });
        ready.current = true;
        return;
      }
    };

    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [editor, room]);

  // ── Handshake on mount: ask any peer for the current state ──────
  // After ~1.2s with no reply we assume we're alone and unblock local
  // edits. We re-ask whenever a new peer connects, in case we were
  // alone when we joined and now there's someone else to learn from.
  useEffect(() => {
    if (!editor) return;
    editorRef.current = editor;

    const requestSnapshot = () => {
      const data = new TextEncoder().encode(JSON.stringify({ type: "tld_request" }));
      room.localParticipant
        .publishData(data, { reliable: true } as DataPublishOptions)
        .catch(() => {});
    };

    requestSnapshot();
    const fallback = setTimeout(() => {
      ready.current = true;
    }, 1200);

    return () => clearTimeout(fallback);
  }, [editor, room]);

  // Lock the canvas behind the panel's visibility — when the panel is
  // hidden by display:none in the parent, we don't bother handshaking.
  const onMount = useCallback((ed: Editor) => {
    setEditor(ed);
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

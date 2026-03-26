/**
 * Client-side map UI state (notes, contacts, deletions, tags) — Realtime Database only.
 * Path: `map_app_state/*`
 */
import { getDatabase, ref, update, onValue, type Unsubscribe } from "firebase/database";
import { app } from "./client";
import type { NoteRow } from "../../types/nodes";

export type LocalContactRowPersisted = {
  name: string;
  cargo?: string;
  email?: string;
  fbId?: string;
  isPrimary?: boolean;
};

export type MapAppStateV1 = {
  notes?: Record<string, NoteRow[]>;
  contacts?: Record<string, LocalContactRowPersisted[]>;
  deleted_nodes?: string[];
  user_tags?: Record<string, string[]>;
  hidden_main_contacts?: string[];
};

const stateRef = ref(getDatabase(app), "map_app_state");

export async function patchMapAppState(partial: Partial<MapAppStateV1>): Promise<void> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(partial)) {
    if (v !== undefined) out[k] = v;
  }
  if (Object.keys(out).length === 0) return;
  await update(stateRef, out);
}

export type MapAppStateListeners = {
  onNotes?: (v: Record<string, NoteRow[]>) => void;
  onContacts?: (v: Record<string, LocalContactRowPersisted[]>) => void;
  onDeletedNodes?: (v: string[]) => void;
  onUserTags?: (v: Record<string, string[]>) => void;
  onHiddenMainContacts?: (v: string[]) => void;
};

export function subscribeMapAppState(
  listeners: MapAppStateListeners,
  onErr?: (e: unknown) => void
): Unsubscribe {
  return onValue(
    stateRef,
    (snap) => {
      try {
        if (!snap.exists()) return;
        const v = snap.val() as MapAppStateV1;
        if (v.notes != null && typeof v.notes === "object" && !Array.isArray(v.notes)) {
          listeners.onNotes?.(v.notes as Record<string, NoteRow[]>);
        }
        if (v.contacts != null && typeof v.contacts === "object" && !Array.isArray(v.contacts)) {
          listeners.onContacts?.(v.contacts as Record<string, LocalContactRowPersisted[]>);
        }
        if (Array.isArray(v.deleted_nodes)) {
          listeners.onDeletedNodes?.(v.deleted_nodes);
        }
        if (v.user_tags != null && typeof v.user_tags === "object" && !Array.isArray(v.user_tags)) {
          listeners.onUserTags?.(v.user_tags as Record<string, string[]>);
        }
        if (Array.isArray(v.hidden_main_contacts)) {
          listeners.onHiddenMainContacts?.(v.hidden_main_contacts);
        }
      } catch (e) {
        onErr?.(e);
      }
    },
    (err) => onErr?.(err)
  );
}

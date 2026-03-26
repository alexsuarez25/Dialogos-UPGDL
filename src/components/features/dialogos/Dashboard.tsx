// @ts-nocheck — large legacy surface; feature modules are fully typed
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  subscribeContactos,
  removeContactosLinkedToNode,
  appendContactoForNieto,
  appendContactoForParent,
  updateContacto,
  deleteContacto,
  setPrimaryContactForParent,
} from "../../../lib/firebase/contactosRealtime";
import ContactosFirebasePanel from "./ContactosFirebasePanel";
import TagMapFirebasePanel from "./TagMapFirebasePanel";
import { TAGS, TAG_MAP_DEFAULT } from "../../../tagMapDefault.js";
import {
  subscribeTagMap,
  setTagMapEntry,
  deleteTagMapEntry,
  seedTagMapFromObject,
} from "../../../lib/firebase/tagMapRealtime";
import {
  patchMapAppState,
  subscribeMapAppState,
} from "../../../lib/firebase/mapAppStateRealtime";
import {
  ensureMapCatalogSeeded,
  subscribeMapCatalog,
} from "../../../lib/firebase/mapCatalogRealtime";
import { isValidMapCatalog } from "../../../lib/mapCatalogTypes";
import { createMapLayoutFromCatalog } from "../../../lib/mapLayoutFromCatalog";
import {
  appendNotaNieto,
  updateNotaNieto,
  deleteNotaNieto,
  removeAllNotasForNieto,
  subscribeNotasNieto,
} from "../../../lib/firebase/notasNietoRealtime";
import {
  setCustomNietos,
  normalizeCustomNietos,
  customNietosForChildKey,
} from "../../../lib/firebase/mapCustomNodesRealtime";
import { C } from "../../../lib/designTokens";
import { LOGO, CENTRAL, CT } from "../../../lib/mapStatic";
import { tagMapLive, getTags } from "../../../lib/tagMapStore";
import {
  fbContactosRef,
  mergeItemPopContacts,
  resolveGc,
  displayPrimaryContactLabel,
} from "../../../lib/contactHelpers";
import { smartSearch } from "../../../lib/mapSearch";
import {
  pol,
  fan,
  RP,
  WW,
  HH,
  CX,
  CY,
  R1,
  R2,
  itemPos,
  camBB,
  camN,
  CAM_HOME,
  NR0,
  NR1,
  NR2,
  NR3,
} from "../../../lib/mapGeometry";
import type { CatalogProject } from "../../../lib/mapLayoutFromCatalog";
import type { CustomNietosState } from "../../../lib/firebase/mapCustomNodesRealtime";
import { isNietoNodeName, getNietoParentKeyForName } from "../../../lib/nietoHelpers";
import { useCamera } from "../../../hooks/useCamera";
import { useIsMobile } from "../../../hooks/useIsMobile";
import { MapText } from "./MapText";
import { CentralPanel } from "./CentralPanel";
import { ItemPopover } from "./ItemPopover";
import { MobileTree } from "./MobileTree";
import { NodesAdminPanel } from "./NodesAdminPanel";
import { cn } from "../../../lib/cn";

function mergedTemaPositions(
  proj: CatalogProject,
  cNietos: CustomNietosState,
  temaPos: (p: CatalogProject) => {
    name: string;
    x: number;
    y: number;
    angle: number;
  }[],
  projPos: () => Array<CatalogProject & { x: number; y: number; angle: number }>
) {
  const base = temaPos(proj);
  const extraNames = customNietosForChildKey(cNietos, proj.key).map((r) => r.name);
  const existing = new Set(proj.tematicas || []);
  const toAdd = extraNames.filter((n) => !existing.has(n));
  if (toAdd.length === 0) return base;
  const pp = projPos().find((p) => p.key === proj.key);
  if (!pp) return base;
  const outA = (Math.atan2(pp.y - CY, pp.x - CX) * 180) / Math.PI;
  const allNames = [...(proj.tematicas || []), ...toAdd];
  const n = allNames.length;
  const a = fan(n, outA, 34, 180);
  return allNames.map((t, i) => {
    const nm = t;
    const [x, y] = pol(pp.x, pp.y, RP, a[i]);
    return { name: nm, x, y, angle: a[i] };
  });
}

function searchMetaForChildKey(
  pk: string,
  PROJECTS: CatalogProject[],
  CINOV_SUBS: { key: string; name: string }[],
  ALIADOS_SUBS: { key: string; name: string }[],
  INVEST_SUBS: { key: string; name: string }[]
):
  | { branch: string; projKey?: string; subKey?: string; parent: string }
  | null {
  const proj = PROJECTS.find((p) => p.key === pk);
  if (proj)
    return { branch: "proyectos", projKey: pk, parent: proj.short };
  const cin = CINOV_SUBS.find((s) => s.key === pk);
  if (cin)
    return {
      branch: "cinov",
      subKey: pk,
      parent: cin.name.split("\n")[0],
    };
  const ali = ALIADOS_SUBS.find((s) => s.key === pk);
  if (ali)
    return {
      branch: "aliados",
      subKey: pk,
      parent: ali.name.split("\n")[0],
    };
  const inv = INVEST_SUBS.find((s) => s.key === pk);
  if (inv)
    return {
      branch: "investigacion",
      subKey: pk,
      parent: inv.name.split("\n")[0],
    };
  return null;
}

/* ═══ DASHBOARD ═══ */
export default function Dashboard() {
  const isMob = useIsMobile();
  const [sM, setSM] = useState(null); const [searchTag, setSearchTag] = useState(null); const [searchOpen, setSearchOpen] = useState(false); const [searchText, setSearchText] = useState(''); const [searchMode, setSearchMode] = useState('text'); const [sSub, setSSub] = useState(null);
  const [sProj, setSProj] = useState(null); const [sTema, setSTema] = useState(null);
  const [sItem, setSItem] = useState(null); const [panel, setPanel] = useState(false);
  const [cPanel, setCPanel] = useState(false); const [notes, setNotes] = useState({}); const [contacts, setContacts] = useState({});
  const [nt, setNt] = useState(''); const [hov, setHov] = useState(null); const [cNietos, setCNietos] = useState({});
  const [showAdmin, setShowAdmin] = useState(false); const [showContactosFb, setShowContactosFb] = useState(false); const [showTagMapFb, setShowTagMapFb] = useState(false);
  const [tagMapUi, setTagMapUi] = useState(() => ({})); const [tagMapRemoteEmpty, setTagMapRemoteEmpty] = useState(true);
  const tagMapSeedInFlight = useRef(false);
  const [fbContactos, setFbContactos] = useState([]);
  const [userTags, setUserTags] = useState({}); const [hiddenCT, setHiddenCT] = useState([]); const [deletedNodes, setDeletedNodes] = useState([]); const [ms, setMs] = useState({ x: 0, y: 0 });
  const [mapCatalog, setMapCatalog] = useState(null);
  const svgR = useRef(null); const dr = useRef({ a: false, sx: 0, sy: 0, m: false });
  const { vb, flyTo, zoomAt, panBy } = useCamera(CAM_HOME);

  const layout = useMemo(
    () =>
      mapCatalog != null && isValidMapCatalog(mapCatalog)
        ? createMapLayoutFromCatalog(mapCatalog)
        : null,
    [mapCatalog]
  );

  const gc = (n: string) => resolveGc(n, fbContactosRef.current, CT);


  useEffect(() => {
    return subscribeMapAppState(
      {
        onNotes: (v) => setNotes(v),
        onContacts: (v) => setContacts(v),
        onDeletedNodes: (v) => setDeletedNodes(v),
        onUserTags: (v) => setUserTags(v),
        onHiddenMainContacts: (v) => setHiddenCT(v),
      },
      (e) => console.error("map_app_state RTDB:", e)
    );
  }, []);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        await ensureMapCatalogSeeded();
      } catch (e) {
        console.error("map_catalog seed:", e);
      }
      unsub = subscribeMapCatalog((raw) => {
        if (raw != null && isValidMapCatalog(raw)) {
          setMapCatalog(raw);
          setCNietos(normalizeCustomNietos(raw.custom_nietos));
        } else {
          setMapCatalog(null);
          if (raw == null) {
            setCNietos({});
          } else {
            setCNietos(normalizeCustomNietos(raw.custom_nietos));
          }
        }
      }, (e) => console.error("map_catalog RTDB:", e));
    })();
    return () => unsub();
  }, []);

  useEffect(() => {
    return subscribeContactos(
      (data) => {
        const list = !data
          ? []
          : Object.entries(data).map(([id, val]) => {
              const o = val && typeof val === "object" ? val : {};
              return {
                id,
                parentKey: o.parentKey != null ? String(o.parentKey) : "",
                patron: String(o.patron ?? ""),
                nombre: String(o.nombre ?? ""),
                cargo: o.cargo != null ? String(o.cargo) : "",
                email: o.email != null ? String(o.email) : "",
                notas: o.notas != null ? String(o.notas) : "",
                primary: o.primary === true,
              };
            });
        fbContactosRef.current = list;
        setFbContactos(list);
      },
      (err) => console.error("contactos RTDB:", err)
    );
  }, []);

  useEffect(() => {
    return subscribeTagMap(
      (data, remoteHasRows) => {
        if (!remoteHasRows && !tagMapSeedInFlight.current) {
          tagMapSeedInFlight.current = true;
          void seedTagMapFromObject(TAG_MAP_DEFAULT)
            .catch((e) => console.error("tag_map seed:", e))
            .finally(() => {
              tagMapSeedInFlight.current = false;
            });
        }
        const next = {};
        const hasUseful = data && typeof data === "object" && Object.keys(data).length > 0;
        if (hasUseful) {
          for (const [k, v] of Object.entries(data)) {
            if (Array.isArray(v)) next[k] = [...v];
          }
        }
        tagMapLive.map = next;
        setTagMapUi(next);
        setTagMapRemoteEmpty(!remoteHasRows);
      },
      (err) => console.error("tag_map RTDB:", err)
    );
  }, []);

  useEffect(() => {
    const nm = String(sItem?.name || "").trim();
    const pk = String(sItem?._parentKey || "").trim() || getNietoParentKeyForName(nm, cNietos);
    if (!nm || !pk) return;
    return subscribeNotasNieto(
      pk,
      nm,
      (rows) => {
        const dbRows = (rows || []).map((r) => ({
          fbId: String(r.id || ""),
          text: String(r.text || ""),
          date: String(r.date || ""),
          edited: String(r.edited || ""),
        }));
        setNotes((prev) => {
          const local = Array.isArray(prev[nm]) ? prev[nm] : [];
          const localOnly = local.filter((n) => !n?.fbId);
          const merged = [...dbRows, ...localOnly];
          const next = { ...prev, [nm]: merged };
          void patchMapAppState({ notes: next }).catch((e) => console.error(e));
          return next;
        });
      },
      (err) => console.error("RTDB subscribe nota nieto:", err)
    );
  }, [sItem?.name, sItem?._parentKey, cNietos]);

  const saveN = useCallback(async (k, t, parentKey = "") => {
    const stripped = t.replace(/<[^>]*>/g, '').trim(); if (!stripped) return;
    const existing = Array.isArray(notes[k]) ? notes[k] : [];
    const entry = { text: t.trim(), date: new Date().toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) };
    const pk = String(parentKey || "").trim() || getNietoParentKeyForName(k, cNietos);
    if (pk) {
      try {
        const fbId = await appendNotaNieto(pk, k, { text: entry.text, date: entry.date });
        entry.fbId = fbId;
      } catch (e) {
        console.error("RTDB nota nieto:", e);
      }
    }
    const nx = { ...notes, [k]: [entry, ...existing] };
    setNotes(nx); setNt('');
    try { await patchMapAppState({ notes: nx }); } catch (e) { console.error(e); }
  }, [notes, cNietos]);
  const editNote = useCallback(async (k, idx, newText, parentKey = "") => {
    const existing = Array.isArray(notes[k]) ? [...notes[k]] : [];
    if (!existing[idx]) return;
    const edited = new Date().toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const row = existing[idx];
    const pk = String(parentKey || "").trim() || getNietoParentKeyForName(k, cNietos);
    if (row.fbId && pk) {
      try {
        await updateNotaNieto(pk, k, String(row.fbId), { text: newText, edited });
      } catch (e) {
        console.error("RTDB update nota nieto:", e);
      }
    }
    existing[idx] = { ...row, text: newText, edited };
    const nx = { ...notes, [k]: existing }; setNotes(nx);
    try { await patchMapAppState({ notes: nx }); } catch (e) { console.error(e); }
  }, [notes, cNietos]);
  const delNote = useCallback(async (k, idx, parentKey = "") => {
    const existing = Array.isArray(notes[k]) ? [...notes[k]] : [];
    const row = existing[idx];
    existing.splice(idx, 1);
    const pk = String(parentKey || "").trim() || getNietoParentKeyForName(k, cNietos);
    if (row?.fbId && pk) {
      try {
        await deleteNotaNieto(pk, k, String(row.fbId));
      } catch (e) {
        console.error("RTDB delete nota nieto:", e);
      }
    }
    const nx = { ...notes, [k]: existing };
    setNotes(nx);
    try { await patchMapAppState({ notes: nx }); } catch (e) { console.error(e); }
  }, [notes, cNietos]);

  const hideMainContact = useCallback(async (name) => {
    if (!name) return; const nx = [...hiddenCT, name]; setHiddenCT(nx);
    try { await patchMapAppState({ hidden_main_contacts: nx }); } catch (e) { console.error(e); }
  }, [hiddenCT]);
  const restoreMainContact = useCallback(async (name) => {
    if (!name) return; const nx = hiddenCT.filter(n => n !== name); setHiddenCT(nx);
    try { await patchMapAppState({ hidden_main_contacts: nx }); } catch (e) { console.error(e); }
  }, [hiddenCT]);

  const saveUT = useCallback(async (nx) => {
    try {
      setUserTags(nx);
      await patchMapAppState({ user_tags: nx });
    } catch (e) {
      console.error(e);
    }
  }, []);
  const getAllTags = useCallback(nm => { if (!nm) return []; try { return [...new Set([...(getTags(nm) || []), ...(userTags[nm] || [])])]; } catch (e) { return []; } }, [userTags, tagMapUi]);
  const getTagsForItem = useCallback((nm) => {
    if (!nm) return [];
    try {
      if (isNietoNodeName(nm, cNietos)) return [...(getTags(nm) || [])];
      return getAllTags(nm);
    } catch (e) {
      return [];
    }
  }, [cNietos, getAllTags, tagMapUi]);
  const addFirebaseTag = useCallback(async (nm, tg) => {
    if (!nm || !tg) return;
    const idx = TAGS.indexOf(tg);
    if (idx < 0) return;
    const cur = [...(tagMapLive.map[nm] || [])];
    if (cur.includes(idx)) return;
    cur.push(idx);
    cur.sort((a, b) => a - b);
    try {
      await setTagMapEntry(nm, cur);
    } catch (e) {
      console.error("RTDB tag map:", e);
    }
    if (userTags[nm]?.includes(tg)) {
      const nx = { ...userTags, [nm]: userTags[nm].filter((t) => t !== tg) };
      saveUT(nx);
    }
  }, [userTags, saveUT]);
  const rmFirebaseTag = useCallback(async (nm, tg) => {
    if (!nm || !tg) return;
    const idx = TAGS.indexOf(tg);
    if (idx < 0) return;
    const cur = (tagMapLive.map[nm] || []).filter((i) => i !== idx);
    try {
      if (cur.length === 0) await deleteTagMapEntry(nm);
      else await setTagMapEntry(nm, cur);
    } catch (e) {
      console.error("RTDB tag map:", e);
    }
    if (userTags[nm]?.includes(tg)) {
      const nx = { ...userTags, [nm]: userTags[nm].filter((t) => t !== tg) };
      saveUT(nx);
    }
  }, [userTags, saveUT]);

  const deleteBuiltIn = useCallback((name) => {
    if (!name) return;
    const nxDel = [...deletedNodes, name];
    const ut3 = { ...userTags }; delete ut3[name];
    const nn = { ...notes }; delete nn[name];
    const nc = { ...contacts }; delete nc[name];
    setDeletedNodes(nxDel);
    setUserTags(ut3);
    setNotes(nn);
    setContacts(nc);
    void patchMapAppState({
      deleted_nodes: nxDel,
      user_tags: ut3,
      notes: nn,
      contacts: nc,
    }).catch((e) => console.error(e));
    (async () => {
      try { await removeContactosLinkedToNode(name); } catch (e) { console.error("RTDB del nodo:", e); }
    })();
    setSItem(null);
  }, [deletedNodes, userTags, notes, contacts]);

  /* ─── CUSTOM MICRO-NODES (custom_nietos) ─── */
  const saveCN = useCallback(async (nx) => {
    const cleaned = normalizeCustomNietos(nx);
    try {
      setCNietos(cleaned);
    } catch (e) {
      console.error(e);
    }
    try {
      await setCustomNietos(cleaned);
    } catch (e) {
      console.error("RTDB set custom nietos:", e);
    }
  }, []);
  const addNieto = useCallback((hk, nd) => {
    if (!nd?.name?.trim()) return;
    const base = normalizeCustomNietos(cNietos);
    const nx = { ...base };
    const cur = customNietosForChildKey(nx, hk);
    const nm = nd.name.trim(); if (cur.some(n => n.name === nm)) return;
    nx[hk] = [...cur, { name: nm, contact: nd.contact || '' }]; saveCN(nx);
    const ct = (nd.contact || "").trim();
    if (ct) {
      (async () => {
        try { await appendContactoForNieto(nm, ct); } catch (e) { console.error("RTDB nieto contacto:", e); }
      })();
    }
  }, [cNietos, saveCN]);
  const delNieto = useCallback((hk, nm) => {
    try {
      const base = normalizeCustomNietos(cNietos);
      const nx = { ...base };
      const cur = customNietosForChildKey(nx, hk);
      if (cur.length === 0) return;
      nx[hk] = cur.filter(n => n.name !== nm); saveCN(nx);
      (async () => {
        try { await removeContactosLinkedToNode(nm); } catch (e) { console.error("RTDB del nieto contacto:", e); }
      })();
    } catch (e) { console.error(e); }
  }, [cNietos, saveCN]);

  const goHome = useCallback(() => { setSM(null); setSSub(null); setSProj(null); setSTema(null); setSItem(null); setPanel(false); setCPanel(false); flyTo(CAM_HOME, 800); }, [flyTo]);
  const goMain = useCallback(m => {
    if (!layout) return;
    const { mPos, projPos, subPos, CINOV_SUBS, ALIADOS_SUBS, INVEST_SUBS } = layout;
    setSM(m); setSSub(null); setSProj(null); setSTema(null); setSItem(null); setPanel(false); setCPanel(false);
    const o = mPos[m.key]; const ch = m.key === "proyectos" ? projPos() : (m.key === "cinov" ? [...subPos("cinov", CINOV_SUBS)] : (m.key === "aliados" ? [...subPos("aliados", ALIADOS_SUBS)] : (m.key === "investigacion" ? [...subPos("investigacion", INVEST_SUBS)] : [])));
    flyTo(camBB([{ x: o.x, y: o.y }, ...ch], 300), 900);
  }, [flyTo, layout]);
  const goSub = useCallback(s => {
    setSSub(s); setSProj(null); setSTema(null); setSItem(null);
    if (s.listMode) {
      /* List mode: open panel, zoom to sub node only */
      setPanel(true);
      flyTo(camBB([s], 200), 850);
    } else {
      setPanel(false);
      const merged = [...(s.items || []), ...customNietosForChildKey(cNietos, s.key).map((n) => n.name)];
      const its = itemPos(s, merged, gc); flyTo(camBB([s, ...its], 340), 850);
    }
  }, [flyTo, gc, cNietos]);
  const goProj = useCallback(p => {
    if (!layout) return;
    const { projPos, temaPos } = layout;
    setSProj(p); setSSub(null); setSTema(null); setSItem(null); setPanel(true);
    const pp = projPos().find(pr => pr.key === p.key);
    const ts = mergedTemaPositions(p, cNietos, temaPos, projPos);
    flyTo(camBB([pp, ...ts], 280), 900);
  }, [flyTo, layout, cNietos]);
  const goTema = useCallback(t => { setSTema(t); setSItem(null); setPanel(false); flyTo(camN(t.x, t.y), 800); }, [flyTo]);
  const saveContacts = useCallback(async (nx) => {
    setContacts(nx);
    try {
      await patchMapAppState({ contacts: nx });
    } catch (e) {
      console.error(e);
    }
  }, []);
  const addContact = useCallback(
    async (key, c) => {
      const name = String(c.name || "").trim();
      if (!name) return;
      const merged = mergeItemPopContacts(key, contacts, fbContactos);
      const hasPrimary = merged.some((x) => x.isPrimary);
      const isPrimary =
        c.isPrimary === true || (c.isPrimary !== false && !hasPrimary);
      const row = {
        name,
        cargo: String(c.cargo || "").trim(),
        email: String(c.email || "").trim(),
        isPrimary,
      };
      try {
        await appendContactoForParent(key, {
          name: row.name,
          cargo: row.cargo,
          email: row.email,
          primary: isPrimary,
        });
      } catch (e) {
        console.error("RTDB append contacto:", e);
        const pending = Array.isArray(contacts[key]) ? [...contacts[key]] : [];
        const cleared = pending.map((p) => ({ ...p, isPrimary: false }));
        await saveContacts({
          ...contacts,
          [key]: [...cleared, row],
        });
      }
    },
    [contacts, fbContactos, saveContacts]
  );
  const editContact = useCallback(
    async (key, idx, c) => {
      const merged = mergeItemPopContacts(key, contacts, fbContactos);
      const target = merged[idx];
      if (!target) return;
      const wantPrimary = c.isPrimary === true;
      const nextRow = {
        name: String(c.name || "").trim(),
        cargo: String(c.cargo || "").trim(),
        email: String(c.email || "").trim(),
        isPrimary: wantPrimary,
      };
      if (!nextRow.name) return;
      if (target.fbId) {
        try {
          await updateContacto(String(target.fbId), {
            nombre: nextRow.name,
            cargo: nextRow.cargo,
            email: nextRow.email,
            updatedAt: Date.now(),
          });
          if (wantPrimary) {
            await setPrimaryContactForParent(key, String(target.fbId));
          } else if (target.isPrimary) {
            await updateContacto(String(target.fbId), {
              primary: false,
              updatedAt: Date.now(),
            });
          }
        } catch (e) {
          console.error("RTDB update contacto:", e);
        }
      } else {
        try {
          await appendContactoForParent(key, {
            name: nextRow.name,
            cargo: nextRow.cargo,
            email: nextRow.email,
            primary: wantPrimary,
          });
          const list = Array.isArray(contacts[key]) ? [...contacts[key]] : [];
          const j = list.findIndex(
            (x) =>
              !x.fbId &&
              x.name === target.name &&
              (x.email || "") === (target.email || "") &&
              (x.cargo || "") === (target.cargo || "")
          );
          if (j >= 0) {
            list.splice(j, 1);
            await saveContacts({ ...contacts, [key]: list });
          }
        } catch (e) {
          console.error("RTDB append contacto (edit):", e);
          const list = Array.isArray(contacts[key]) ? [...contacts[key]] : [];
          const j = list.findIndex(
            (x) =>
              !x.fbId &&
              x.name === target.name &&
              (x.email || "") === (target.email || "") &&
              (x.cargo || "") === (target.cargo || "")
          );
          if (j >= 0) {
            const next = list.map((row, ii) => {
              if (ii !== j) return { ...row, isPrimary: false };
              return { ...nextRow, isPrimary: wantPrimary };
            });
            await saveContacts({ ...contacts, [key]: next });
          }
        }
      }
    },
    [contacts, fbContactos, saveContacts]
  );
  const setPrimaryContact = useCallback(
    async (key: string, idx: number) => {
      const merged = mergeItemPopContacts(key, contacts, fbContactos);
      const target = merged[idx];
      if (!target) return;
      if (target.fbId) {
        try {
          await setPrimaryContactForParent(key, String(target.fbId));
        } catch (e) {
          console.error("RTDB primary contacto:", e);
        }
      } else {
        const list = Array.isArray(contacts[key]) ? contacts[key] : [];
        const next = list.map((row) => {
          if (row.fbId) return row;
          const same =
            row.name === target.name &&
            (row.email || "") === (target.email || "") &&
            (row.cargo || "") === (target.cargo || "");
          return { ...row, isPrimary: same };
        });
        await saveContacts({ ...contacts, [key]: next });
      }
    },
    [contacts, fbContactos, saveContacts]
  );
  const delContact = useCallback(async (key, idx) => {
    const merged = mergeItemPopContacts(key, contacts, fbContactos);
    const target = merged[idx];
    if (!target) return;
    if (target.fbId) {
      try {
        await deleteContacto(String(target.fbId));
      } catch (e) {
        console.error("RTDB delete contacto:", e);
      }
    } else {
      const list = Array.isArray(contacts[key]) ? [...contacts[key]] : [];
      const j = list.findIndex(
        (x) => !x.fbId
          && x.name === target.name
          && (x.email || "") === (target.email || "")
          && (x.cargo || "") === (target.cargo || "")
      );
      if (j >= 0) {
        list.splice(j, 1);
        await saveContacts({ ...contacts, [key]: list });
      }
    }
  }, [contacts, fbContactos, saveContacts]);
  /* Check if node has any contact (built-in OR user-added) */
  const hasContact = useCallback((name) => {
    if (!name) return false;
    if (gc(name) && !(hiddenCT || []).includes(name)) return true;
    if (fbContactos.some((r) => r.parentKey === name)) return true;
    const uc = contacts[name];
    return Array.isArray(uc) && uc.length > 0;
  }, [contacts, hiddenCT, fbContactos]);

  const openItem = useCallback(it => { if (!it || !it.name) return; setSItem(it); setNt(''); }, []);

  const goBack = useCallback(() => {
    try {
      if (sItem) { setSItem(null); return; }
      if (sTema) {
        setSTema(null);
        if (sProj && layout) {
          const { projPos, temaPos } = layout;
          setPanel(true);
          const pp = projPos().find(p => p.key === sProj.key);
          flyTo(camBB([pp, ...mergedTemaPositions(sProj, cNietos, temaPos, projPos)], 280), 750);
        }
        return;
      }
      if (sProj) { setSProj(null); setPanel(false); if (sM) goMain(sM); return; }
      if (sSub) { setSSub(null); if (sM) goMain(sM); return; }
      if (sM) { goHome(); return; }
    } catch (e) { console.error(e); goHome(); }
  }, [sItem, sTema, sProj, sSub, sM, flyTo, goHome, goMain, layout, cNietos]);
  const cBg = useCallback(() => { if (sItem) { setSItem(null); return; } if (cPanel) { setCPanel(false); return; } goBack(); }, [sItem, cPanel, goBack]);

  const onW = useCallback(e => { e.preventDefault(); if (svgR.current) zoomAt(e.clientX, e.clientY, svgR.current, e.deltaY > 0 ? 1.15 : 0.87); }, [zoomAt]);
  const onD = useCallback(e => { if (e.button === 0) dr.current = { a: true, sx: e.clientX, sy: e.clientY, m: false }; }, []);
  const onM2 = useCallback(e => { setMs({ x: e.clientX, y: e.clientY }); if (dr.current.a && svgR.current) { const dx = e.clientX - dr.current.sx, dy = e.clientY - dr.current.sy; if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dr.current.m = true; dr.current.sx = e.clientX; dr.current.sy = e.clientY; panBy(dx, dy, svgR.current); } }, [panBy]);
  const onU = useCallback(() => { dr.current.a = false; }, []);
  useEffect(() => { const el = svgR.current; if (!el) return; el.addEventListener('wheel', onW, { passive: false }); return () => el.removeEventListener('wheel', onW); }, [onW]);

  if (!layout) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-bg font-sans text-base text-text-dk">
        Cargando mapa…
      </div>
    );
  }

  const { MAIN, PROJECTS, CINOV_SUBS, ALIADOS_SUBS, INVEST_SUBS, mPos, projPos, subPos, temaPos, NODE_INDEX, findInIndex } = layout;

  const pN = sM?.key === "proyectos" ? projPos() : [];
  const cS = sM?.key === "cinov" ? subPos("cinov", CINOV_SUBS) : [];
  const aS = sM?.key === "aliados" ? subPos("aliados", ALIADOS_SUBS) : [];
  const iSub = sM?.key === "investigacion" ? subPos("investigacion", INVEST_SUBS) : [];
  const allS = [...cS, ...aS, ...iSub];
  const _baseIt = (sSub?.items && !sSub.listMode) ? sSub.items : [];
  const _custIt = sSub ? customNietosForChildKey(cNietos, sSub.key).map(n => n.name) : [];
  const _allIt = [..._baseIt, ..._custIt].filter(n => !deletedNodes.includes(typeof n === 'string' ? n : n));
  const sItems = (sSub && !sSub.listMode && _allIt.length > 0) ? itemPos(sSub, _allIt, gc) : [];
  const tN = sProj ? mergedTemaPositions(sProj, cNietos, temaPos, projPos) : [];
  const vS = vb.map(v => Math.round(v)).join(" ");

  /* Visibility: hide unrelated */
  const vis = m => !sM || sM.key === m.key;


  if (isMob) {
    return (
      <MobileTree
        hasContact={hasContact}
        gc={gc}
        getTagsForItem={getTagsForItem}
        cNietos={cNietos}
        deletedNodes={deletedNodes}
        notes={notes}
        treeCatalog={{ MAIN, PROJECTS, CINOV_SUBS, ALIADOS_SUBS, INVEST_SUBS }}
      />
    );
  }

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-surface-bg font-sans antialiased">
      {/* HEADER */}
      <div className="z-40 flex shrink-0 items-center gap-3 border-b border-brand-gold/25 bg-brand-white px-[22px] py-2">
        <div onClick={e => { e.stopPropagation(); sM ? goHome() : setCPanel(p => !p); }} className="flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-brand-gold">
          <span className="font-impact text-xs font-black text-brand-white">UP</span></div>
        <div><div className="font-display text-sm font-extrabold text-text-dk">Diálogos con el Entorno</div>
          <div className="text-[9.5px] text-text-lt">Universidad Panamericana Guadalajara</div></div>
        <div className="ml-auto flex items-center gap-1.5 text-[11px]">
          <span className={cn("cursor-pointer", !sM ? "font-bold text-brand-gold" : "font-normal text-text-lt")} onClick={e => { e.stopPropagation(); goHome(); }}>Inicio</span>
          {sM && <><span className="text-brand-gold/60">›</span><span className="cursor-pointer font-bold" style={{ color: sM.color }} onClick={e => { e.stopPropagation(); goMain(sM); }}>{sM.name.split("\n")[0]}</span></>}
          {sProj && <><span className="text-brand-gold/60">›</span><span className="font-bold" style={{ color: sProj.color }}>{sProj.short}</span></>}
          {sSub && <><span className="text-brand-gold/60">›</span><span className="font-bold" style={{ color: sSub.color }}>{sSub.name.split("\n")[0]}</span></>}
          {sTema && <><span className="text-brand-gold/60">›</span><span className="font-bold text-text-dk">{sTema.name.split("\n")[0]}</span></>}
        </div>
        <button type="button" onClick={e => {
          e.stopPropagation();
          setShowAdmin(a => {
            const n = !a; if (n) { setShowContactosFb(false); setShowTagMapFb(false); } return n;
          });
        }}
          className={cn(
            "ml-2 shrink-0 cursor-pointer rounded-lg border border-brand-gold/30 px-3.5 py-1.5 text-[10px] font-bold",
            showAdmin ? "bg-brand-gold text-brand-white" : "bg-brand-gold/15 text-brand-gold"
          )}>
          ⚙ Nodos</button>
        {/* <button type="button" onClick={e => {
          e.stopPropagation();
          setShowContactosFb(a => {
            const n = !a; if (n) { setShowAdmin(false); setShowTagMapFb(false); } return n;
          });
        }}
          style={{
            fontSize: 10, padding: "6px 14px", background: showContactosFb ? C.green : C.green + "18", border: `1px solid ${C.green}45`,
            borderRadius: 8, cursor: "pointer", color: showContactosFb ? C.white : C.green, fontWeight: 700, marginLeft: 6, flexShrink: 0
          }}>
          ☁ Contactos</button>
        <button type="button" onClick={e => {
          e.stopPropagation();
          setShowTagMapFb(a => {
            const n = !a; if (n) { setShowAdmin(false); setShowContactosFb(false); } return n;
          });
        }}
          style={{
            fontSize: 10, padding: "6px 14px", background: showTagMapFb ? C.gold : C.gold + "15", border: `1px solid ${C.gold}40`,
            borderRadius: 8, cursor: "pointer", color: showTagMapFb ? C.white : C.goldDk, fontWeight: 700, marginLeft: 6, flexShrink: 0
          }}>
          🏷 Etiquetas</button> */}
      </div>

      <div className="relative flex-1 overflow-hidden">
        {/* ADMIN */}
        {showContactosFb && (
          <ContactosFirebasePanel
            open={showContactosFb}
            onClose={() => setShowContactosFb(false)}
            records={fbContactos.filter((r) => !r.parentKey)}
          />
        )}
        {showTagMapFb && (
          <TagMapFirebasePanel
            open={showTagMapFb}
            onClose={() => setShowTagMapFb(false)}
            tagMap={tagMapUi}
            usingFallback={tagMapRemoteEmpty}
          />
        )}
        {showAdmin && (
          <NodesAdminPanel
            open={showAdmin}
            onClose={() => setShowAdmin(false)}
            treeCatalog={{ MAIN, PROJECTS, CINOV_SUBS, ALIADOS_SUBS, INVEST_SUBS }}
            cNietos={cNietos}
            deletedNodes={deletedNodes}
            addNieto={addNieto}
            delNieto={delNieto}
            gc={gc}
            hasContact={hasContact}
          />
        )}

        {/* BACK */}
        {/* Volver button moved to stacked search area */}

        {/* MENU */}
        {sM && !panel && !cPanel && (
          <div className="absolute left-3.5 top-[60px] z-25 flex max-h-[calc(100%-80px)] w-[260px] flex-col overflow-hidden rounded-[14px] border border-brand-gold/25 bg-brand-white/95 shadow-card">
            <div className="border-b border-brand-gold/15 px-[18px] pb-2.5 pt-3.5">
              <div className="text-[13px] font-extrabold uppercase tracking-wide" style={{ color: sM.color }}>{sM.name.split("\n")[0]}</div></div>
            <div className="flex-1 overflow-y-auto py-1">
              {sM.key === "proyectos" && pN.map((p, i) => (<div key={i} onClick={e => { e.stopPropagation(); goProj(p); }}
                className="cursor-pointer border-b border-brand-gold/8 px-[18px] py-2.5 hover:bg-brand-gold/10">
                <span className="text-[13px] font-bold text-text-dk">{p.short}</span></div>))}
              {["cinov", "aliados", "investigacion"].includes(sM.key) && (sM.key === "cinov" ? cS : sM.key === "aliados" ? aS : iSub).map((s, i) => (<div key={i}
                onClick={e => { e.stopPropagation(); goSub(s); }}
                className="flex cursor-pointer items-center gap-2.5 border-b border-brand-gold/8 px-[18px] py-2.5 hover:bg-brand-gold/10">
                <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="text-[13px] font-bold text-text-dk">{s.name.split("\n")[0]}</span>{s.listMode && <span className="ml-1.5 text-[9px] font-bold text-brand-gold">📋 Lista</span>}</div>))}
            </div>
          </div>)}


        {/* SEARCH + VOLVER — stacked top-right */}
        <div className={cn("absolute right-3.5 top-3.5 z-26 flex flex-col items-end gap-2", isMob && "hidden")}>
          {/* SMART SEARCH */}
          <div className="relative w-[420px]">
            <div
              className={cn(
                "flex overflow-hidden rounded-xl bg-brand-white shadow-search",
                (searchText || searchTag) ? "border-2 border-brand-gold" : "border-2 border-brand-gold/60"
              )}
              style={{ boxShadow: "0 3px 14px rgba(0,0,0,0.07)" }}
            >
              <div className="flex items-center px-3.5 text-xl">🔍</div>
              {searchMode === "text" ? (
                <input value={searchText} onChange={e => { setSearchText(e.target.value); setSearchTag(null); }}
                  placeholder="Buscar actor, tema o institución..."
                  className="min-w-0 flex-1 border-none bg-transparent py-3 font-sans text-[15px] font-semibold text-text-dk outline-none" />
              ) : (
                <button type="button" onClick={() => setSearchOpen(o => !o)}
                  className={cn(
                    "flex-1 cursor-pointer border-none bg-transparent py-3 text-left font-sans text-[15px] font-semibold",
                    searchTag ? "text-brand-gold" : "text-text-md"
                  )}>
                  {searchTag || "Seleccionar temática..."}</button>
              )}
              {(searchText || searchTag) && <button type="button" onClick={() => { setSearchText(''); setSearchTag(null); }}
                className="cursor-pointer border-none bg-transparent px-3.5 text-base font-bold text-text-lt">✕</button>}
              <div className="flex border-l border-brand-gold/20">
                <button type="button" onClick={() => { setSearchMode("text"); setSearchTag(null); setSearchOpen(false); }}
                  className={cn(
                    "cursor-pointer border-none px-3 py-2 text-[10px] font-bold",
                    searchMode === "text" ? "bg-brand-gold/15 text-brand-gold" : "bg-transparent text-text-lt"
                  )}>
                  Texto</button>
                <button type="button" onClick={() => { setSearchMode("tag"); setSearchText(''); }}
                  className={cn(
                    "cursor-pointer border-none px-3 py-2 text-[10px] font-bold",
                    searchMode === "tag" ? "bg-brand-gold/15 text-brand-gold" : "bg-transparent text-text-lt"
                  )}>
                  Temática</button>
              </div>
            </div>
            {searchMode === "tag" && searchOpen && (
              <div
                className="absolute right-0 z-30 mt-1.5 max-h-[400px] w-[420px] overflow-y-auto rounded-2xl border border-brand-gold/30 bg-brand-white"
                style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.12)" }}
              >
                {TAGS.slice().sort((a, b) => a.localeCompare(b, 'es')).map((tag, i) => (
                  <div key={i} onClick={e => { e.stopPropagation(); setSearchTag(tag); setSearchOpen(false); }}
                    className={cn(
                      "cursor-pointer border-b border-brand-gold/8 px-5 py-[11px] text-sm font-semibold text-text-dk hover:bg-brand-gold/10",
                      searchTag === tag && "bg-brand-gold/15"
                    )}>
                    {tag}</div>))}
              </div>
            )}
          </div>
          {/* UNIFIED RESULTS — works for both text and tag search */}
          {(searchText.length >= 2 || searchTag) && !searchOpen && (() => {
            try {
              /* Get results based on mode */
              let resultNodes = []; let relatedTags = [];
              if (searchText.length >= 2) {
                const sr = smartSearch(searchText, tagMapLive.map, PROJECTS, NODE_INDEX, findInIndex);
                resultNodes = sr.nodes || []; relatedTags = sr.tags || [];
                /* Add custom nodes search (state is available here) */
                const q = searchText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const seen = new Set(resultNodes.map(n => n.name));
                Object.keys(cNietos || {}).forEach((pk) => {
                  customNietosForChildKey(cNietos, pk).forEach(n => {
                    const nn = (n.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    if (nn.includes(q) && !seen.has(n.name)) {
                      seen.add(n.name);
                      const meta = searchMetaForChildKey(pk, PROJECTS, CINOV_SUBS, ALIADOS_SUBS, INVEST_SUBS);
                      if (meta) {
                        resultNodes.push({
                          name: n.name,
                          type: "Personalizado",
                          parent: meta.parent,
                          branch: meta.branch,
                          projKey: meta.projKey,
                          subKey: meta.subKey,
                          matchType: "direct",
                        });
                      } else {
                        resultNodes.push({ name: n.name, type: "Personalizado", parent: pk, branch: "custom", matchType: "direct" });
                      }
                    }
                  });
                });
              } else if (searchTag) {
                /* Dynamic scan: check ALL nodes (built-in + custom) for this tag */
                const seen = new Set();
                /* 1. Scan all built-in nodes via NODE_INDEX */
                NODE_INDEX.forEach(n => {
                  if (!n || !n.name || deletedNodes.includes(n.name)) return;
                  const at = getAllTags(n.name);
                  if (at.includes(searchTag) && !seen.has(n.name)) { seen.add(n.name); resultNodes.push({ ...n, matchType: "tag" }); }
                });
                /* 2. Scan all project tematicas */
                PROJECTS.forEach(p => {
                  (p.tematicas || []).forEach(t => {
                    if (deletedNodes.includes(t)) return;
                    const at = getAllTags(t);
                    if (at.includes(searchTag) && !seen.has(t)) {
                      seen.add(t);
                      resultNodes.push({ name: t, type: "Proyecto", parent: p.short, branch: "proyectos", projKey: p.key, matchType: "tag" });
                    }
                  });
                });
                /* 3. Scan custom nietos */
                Object.keys(cNietos || {}).forEach((pk) => {
                  customNietosForChildKey(cNietos, pk).forEach(n => {
                    if (!n.name || deletedNodes.includes(n.name) || seen.has(n.name)) return;
                    const at = getTagsForItem(n.name);
                    if (at.includes(searchTag)) {
                      seen.add(n.name);
                      const meta = searchMetaForChildKey(pk, PROJECTS, CINOV_SUBS, ALIADOS_SUBS, INVEST_SUBS);
                      if (meta) {
                        resultNodes.push({
                          name: n.name,
                          type: "Personalizado",
                          parent: meta.parent,
                          branch: meta.branch,
                          projKey: meta.projKey,
                          subKey: meta.subKey,
                          matchType: "tag",
                        });
                      } else {
                        resultNodes.push({ name: n.name, type: "Personalizado", parent: pk, branch: "custom", matchType: "tag" });
                      }
                    }
                  });
                });
                /* 4. Catch any node with userTags that wasn't scanned above */
                Object.entries(userTags || {}).forEach(([name, tags]) => {
                  if (!name || deletedNodes.includes(name) || seen.has(name)) return;
                  if (Array.isArray(tags) && tags.includes(searchTag)) {
                    seen.add(name);
                    resultNodes.push({ name, type: "Personalizado", parent: "", branch: "custom", matchType: "tag" });
                  }
                });
                relatedTags = [searchTag];
              }
              /* Filter deleted nodes */
              const _tp = { Proyecto: 0, Aliado: 1, 'Investigación': 2, CINOV: 3, Personalizado: 4 };
              resultNodes = (resultNodes || []).filter(n => n && n.name && !deletedNodes.includes(n.name)).sort((a, b) => { const pa = _tp[a.type] ?? 5, pb = _tp[b.type] ?? 5; return pa !== pb ? pa - pb : String(a.name).localeCompare(String(b.name), 'es'); }).slice(0, 25);
              if (resultNodes.length === 0 && (!relatedTags || relatedTags.length === 0)) return null;
              const typeColors = { Proyecto: C.gold, CINOV: C.blue, Aliado: C.green, Investigación: C.red, "—": C.textLt };
              /* doZoom helper */
              const doZoom = (e0, name) => {
                try {
                  const mainNode = MAIN.find(m => m.key === e0.branch);
                  if (!mainNode) return;
                  if (!sM || sM.key !== e0.branch) goMain(mainNode);
                  const allSubs2 = e0.branch === "cinov" ? CINOV_SUBS : (e0.branch === "aliados" ? ALIADOS_SUBS : (e0.branch === "investigacion" ? INVEST_SUBS : []));
                  const targetSub = allSubs2.find(s => s.key === e0.subKey);
                  if (targetSub) {
                    const swp = subPos(e0.branch, allSubs2).find(s => s.key === e0.subKey);
                    if (swp) {
                      const d1 = (!sM || sM.key !== e0.branch) ? 500 : 0;
                      setTimeout(() => {
                        goSub(swp);
                        const rawItems = targetSub.items || [];
                        const extra = customNietosForChildKey(cNietos, e0.subKey).map(r => r.name);
                        const mergedItems = [...rawItems, ...extra];
                        const its = itemPos(swp, mergedItems, gc);
                        const ti = its.find(it => it.name === name);
                        if (ti) {
                          setTimeout(() => {
                            flyTo(camN(ti.x, ti.y), 800);
                            openItem({
                              ...ti,
                              _parentKey: e0.subKey || null,
                              _isCustom: customNietosForChildKey(cNietos, e0.subKey).some(n => n.name === name),
                            });
                          }, 500);
                        }
                      }, d1);
                    }
                  } else if (e0.branch === "proyectos" && e0.projKey) {
                    const proj = PROJECTS.find(p => p.key === e0.projKey);
                    if (proj) {
                      const d1 = (!sM || sM.key !== "proyectos") ? 500 : 0;
                      setTimeout(() => {
                        goProj(proj);
                        const temas = mergedTemaPositions(proj, cNietos, temaPos, projPos);
                        const t = temas.find((te) => te.name === name);
                        if (t) {
                          setTimeout(() => {
                            flyTo(camN(t.x, t.y), 800);
                            openItem({
                              name: t.name,
                              x: t.x,
                              y: t.y,
                              _parentKey: proj.key,
                              _isCustom: customNietosForChildKey(cNietos, proj.key).some((n) => n.name === name),
                            });
                          }, 500);
                        }
                      }, d1);
                    }
                  }
                } catch (e) { console.error("doZoom error:", e); }
              };
              return (
                <div
                  className="flex max-h-[420px] w-[420px] flex-col overflow-y-auto rounded-2xl border border-brand-gold/25 bg-brand-white"
                  style={{ boxShadow: "0 6px 30px rgba(0,0,0,0.1)" }}
                >
                  {relatedTags.length > 0 && (
                    <div className="sticky top-0 z-1 shrink-0 border-b border-brand-gold/15 bg-brand-white px-[18px] py-3">
                      <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-brand-gold">
                        {searchText ? "¿De qué puedes hablar?" : "Temática"} · {resultNodes.length} resultados</div>
                      <div className="flex flex-wrap gap-1">
                        {relatedTags.slice(0, 6).map((t, i) => (
                          <span key={i} className="rounded-[10px] border border-brand-gold/20 bg-brand-gold/15 px-2 py-0.5 text-[9px] font-bold text-brand-gold">
                            {t}</span>))}
                      </div>
                    </div>
                  )}
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {resultNodes.map((n, i) => {
                      const tc = typeColors[n.type] || C.textLt;
                      return (
                        <div key={i} onClick={e => { e.stopPropagation(); doZoom(n, n.name); }}
                          className="flex cursor-pointer items-center gap-2 border-b border-brand-gold/6 px-[18px] py-2.5 hover:bg-brand-gold/10">
                          <span className="shrink-0 whitespace-nowrap rounded-[5px] border px-[7px] py-0.5 text-[8px] font-extrabold uppercase tracking-wide"
                            style={{
                            color: tc,
                            background: `${tc}24`,
                            borderColor: `${tc}4d`,
                          }}>{n.type}</span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-bold text-text-dk">{n.name}</div>
                            <div className="mt-px text-[10px] text-text-lt">
                              {n.parent || ""}{n.matchType === "direct" ? " · coincidencia directa" : ""}</div>
                          </div>
                          {(() => {
                            try {
                              const hc = hasContact(n.name); return hc
                                ? <span className="h-2 w-2 shrink-0 rounded-full bg-brand-green" title="Con contacto" />
                                : <span className="h-2 w-2 shrink-0 rounded-full bg-danger" title="Sin contacto" />;
                            } catch (e) { return null; }
                          })()}
                          <span className="shrink-0 text-base text-brand-gold">›</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            } catch (e) { console.error("Search error:", e); return null; }
          })()}
          {/* VOLVER */}
          {(sM || cPanel) && (
            <button type="button" onClick={e => { e.stopPropagation(); cPanel ? setCPanel(false) : goBack(); }}
              className="flex cursor-pointer items-center gap-2 rounded-[10px] border-[1.5px] border-brand-gold/50 bg-brand-white px-6 py-2.5"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <span className="text-xl text-brand-gold">←</span>
              <span className="text-lg font-black text-text-dk">Volver</span>
            </button>
          )}
        </div>

        <div ref={svgR} className="absolute inset-0 cursor-grab active:cursor-grabbing"
          onClick={e => { if (!dr.current.m) cBg(); }} onMouseDown={onD} onMouseMove={onM2} onMouseUp={onU} onMouseLeave={onU}>
          <svg viewBox={vS} preserveAspectRatio="xMidYMid meet"
            className="block h-full w-full select-none"
            style={{ imageRendering: "optimizeQuality" }}
            textRendering="optimizeLegibility" shapeRendering="geometricPrecision">
            <defs><radialGradient id="bgR" cx="50%" cy="50%" r="55%"><stop offset="0%" stopColor="#F5F2EB" /><stop offset="100%" stopColor="#EBE6DA" /></radialGradient></defs>
            <rect x="0" y="0" width={WW} height={HH} fill="url(#bgR)" />
            <circle cx={CX} cy={CY} r={R1} fill="none" stroke={C.gold + "25"} strokeWidth="3" strokeDasharray="12,20" />
            <text x={CX} y={CY - 220} textAnchor="middle" fontSize={42} fontWeight={700} fill={C.goldDk} fontFamily="'Cormorant Garamond',serif" letterSpacing="2" style={{ pointerEvents: "none" }}>Diálogos con el Entorno</text>

            {/* LINES center→main */}
            {MAIN.map(m => {
              const o = mPos[m.key]; if (!vis(m)) return null; const isA = sM?.key === m.key;
              return <line key={`l${m.key}`} x1={CX} y1={CY} x2={o.x} y2={o.y} stroke={C.gold} strokeWidth={isA ? 5 : 3} opacity={isA ? 0.5 : 0.2} />;
            })}
            {/* Lines main→subs */}
            {sM?.key === "proyectos" && pN.map((p, i) => {
              const o = mPos.proyectos; if (sProj && sProj.key !== p.key) return null;
              return <line key={`lp${i}`} x1={o.x} y1={o.y} x2={p.x} y2={p.y} stroke={C.gold} strokeWidth={sProj?.key === p.key ? 3 : 2} opacity={sProj?.key === p.key ? 0.5 : 0.25} />;
            })}
            {allS.map((s, i) => {
              const mk = sM?.key; const o = mPos[mk]; if (!o) return null; if (sSub && sSub.key !== s.key) return null;
              return <line key={`ls${i}`} x1={o.x} y1={o.y} x2={s.x} y2={s.y} stroke={s.color} strokeWidth={sSub?.key === s.key ? 3 : 1.8} opacity={sSub?.key === s.key ? 0.5 : 0.25} />;
            })}
            {/* Lines sub→items */}
            {sItems.map((it, i) => (<line key={`li${i}`} x1={sSub.x} y1={sSub.y} x2={it.x} y2={it.y} stroke={sSub.color} strokeWidth={2} opacity={0.25} />))}
            {/* Lines proj→temas */}
            {sProj && tN.map((t, i) => {
              const pp = pN.find(p => p.key === sProj.key); if (!pp) return null; if (sTema && sTema.name !== t.name) return null;
              return <line key={`lt${i}`} x1={pp.x} y1={pp.y} x2={t.x} y2={t.y} stroke={C.gold} strokeWidth={sTema?.name === t.name ? 3 : 2} opacity={sTema?.name === t.name ? 0.5 : 0.25} />;
            })}

            {/* ITEMS (micro nodos) */}
            {sItems.map((it, i) => {
              const isH = hov === `it${i}`; const noC = !hasContact(it.name); const matchesSearch = searchTag && getTagsForItem(it.name).includes(searchTag);
              return (<g key={`it${i}`} onClick={e => { e.stopPropagation(); dr.current.m = false; try { if (it && it.x != null && it.y != null) { const sk = sSub?.key || ""; openItem({ ...it, _parentKey: sk || null, _isCustom: customNietosForChildKey(cNietos, sk).some(n => n.name === it.name) }); flyTo(camN(it.x, it.y), 700); } } catch (er) { console.error(er); } }}
                onMouseEnter={() => setHov(`it${i}`)} onMouseLeave={() => setHov(null)} style={{ cursor: "pointer" }}>
                {noC && <circle cx={it.x} cy={it.y} r={36} fill={C.pulseRed} opacity={0.5}
                  style={{ animation: "redPulse 2s ease-in-out infinite", transformOrigin: `${it.x}px ${it.y}px` }} />}
                <circle cx={it.x} cy={it.y} r={isH ? NR3 + 6 : NR3} fill={isH ? sSub.color : (matchesSearch ? C.gold + "20" : C.white)} stroke={matchesSearch ? C.gold : sSub.color} strokeWidth={isH ? 3 : 2} opacity={0.9}
                  style={{ filter: isH ? `drop-shadow(0 2px 10px ${sSub.color}40)` : "none" }} />
                <text x={it.x} y={it.y + NR3 + 20} textAnchor="middle" fontSize={12} fontWeight={800} fill={isH ? sSub.color : C.textDk}
                  fontFamily="'Source Sans 3',sans-serif" style={{ pointerEvents: "none" }}>{it.name.length > 38 ? it.name.substring(0, 37) + "…" : it.name}</text>
                {it.contact && <text x={it.x} y={it.y + NR3 + 34} textAnchor="middle" fontSize={9} fontWeight={700} fill={C.textLt}
                  style={{ pointerEvents: "none" }}>👤 {it.contact}</text>}
                {/* Tag chips */}
                {getTagsForItem(it.name).slice(0, 2).map((tg, ti) => (
                  <text key={`tg${ti}`} x={it.x} y={it.y + NR3 + (it.contact ? 50 : 38) + ti * 14} textAnchor="middle"
                    fontSize={7.5} fontWeight={600} fill={searchTag === tg ? C.gold : C.textLt + "90"}
                    fontFamily="'Source Sans 3',sans-serif" style={{ pointerEvents: "none" }}>
                    {"● " + tg}
                  </text>
                ))}
              </g>);
            })}

            {/* TEMÁTICAS */}
            {tN.map((t, i) => {
              if (sTema && sTema.name !== t.name) return null; const isA = sTema?.name === t.name;
              return (<g key={`t${i}`} onClick={e => { e.stopPropagation(); dr.current.m = false; goTema(t); }} style={{ cursor: "pointer" }}>
                {isA && <circle cx={t.x} cy={t.y} r={NR2 + 18} fill={C.gold} opacity={0.08} />}
                <circle cx={t.x} cy={t.y} r={NR2} fill={isA ? C.gold : C.white} stroke={C.gold} strokeWidth={isA ? 4 : 2.5}
                  style={{ filter: isA ? `drop-shadow(0 3px 14px ${C.gold}30)` : "drop-shadow(0 1px 5px rgba(0,0,0,0.06))" }} />
                <MapText text={t.name} x={t.x} y={t.y} size={14} fill={isA ? C.white : C.textDk} lh={17} /></g>);
            })}

            {/* SUBS */}
            {allS.map((s, i) => {
              if (sSub && sSub.key !== s.key) return null; const isA = sSub?.key === s.key;
              return (<g key={`s${i}`} onClick={e => { e.stopPropagation(); dr.current.m = false; goSub(s); }} style={{ cursor: "pointer" }}>
                {isA && <circle cx={s.x} cy={s.y} r={NR2 + 16} fill={s.color} opacity={0.08} />}
                <circle cx={s.x} cy={s.y} r={NR2} fill={isA ? s.color : C.white} stroke={s.color} strokeWidth={isA ? 4 : 2.5}
                  style={{ filter: isA ? `drop-shadow(0 3px 14px ${s.color}30)` : "drop-shadow(0 1px 5px rgba(0,0,0,0.06))" }} />
                <MapText text={s.name} x={s.x} y={s.y} size={14} fill={isA ? C.white : s.color} lh={17} /></g>);
            })}

            {/* PROJECTS */}
            {pN.map((p, i) => {
              if (sProj && sProj.key !== p.key) return null; const isA = sProj?.key === p.key;
              return (<g key={`p${i}`} onClick={e => { e.stopPropagation(); dr.current.m = false; goProj(p); }} style={{ cursor: "pointer" }}>
                {isA && <circle cx={p.x} cy={p.y} r={NR2 + 18} fill="none" stroke={C.gold} strokeWidth={1.5} strokeDasharray="6,5" opacity={0.35}>
                  <animateTransform attributeName="transform" type="rotate" from={`0 ${p.x} ${p.y}`} to={`360 ${p.x} ${p.y}`} dur="18s" repeatCount="indefinite" /></circle>}
                <circle cx={p.x} cy={p.y} r={NR2} fill={isA ? C.gold : C.white} stroke={C.gold} strokeWidth={isA ? 4 : 2.5}
                  style={{ filter: isA ? `drop-shadow(0 4px 18px ${C.gold}50)` : "drop-shadow(0 2px 8px rgba(0,0,0,0.07))" }} />
                <MapText text={p.name} x={p.x} y={p.y} size={13} fill={isA ? C.white : C.textDk} lh={16} />
                {/* Project tag chips (max 2, below node) */}
                {!isA && getTags(p.short).slice(0, 2).map((tg, ti) => (
                  <text key={`pt${ti}`} x={p.x} y={p.y + NR2 + 14 + ti * 13} textAnchor="middle"
                    fontSize={8} fontWeight={600} fill={C.textLt + "90"}
                    fontFamily="'Source Sans 3',sans-serif" style={{ pointerEvents: "none" }}>
                    {"● " + tg}</text>
                ))}
              </g>);
            })}

            {/* MAIN NODES */}
            {MAIN.map(m => {
              if (!vis(m)) return null; const o = mPos[m.key]; const isA = sM?.key === m.key;
              return (<g key={`m${m.key}`} onClick={e => { e.stopPropagation(); dr.current.m = false; goMain(m); }} style={{ cursor: "pointer" }}>
                {/* Outer glow ring */}
                <circle cx={o.x} cy={o.y} r={NR1 + 24} fill={m.color} opacity={isA ? 0.08 : 0.04} />
                {isA && <circle cx={o.x} cy={o.y} r={NR1 + 30} fill="none" stroke={m.color} strokeWidth={2.5} strokeDasharray="8,6" opacity={0.3}>
                  <animateTransform attributeName="transform" type="rotate" from={`0 ${o.x} ${o.y}`} to={`360 ${o.x} ${o.y}`} dur="20s" repeatCount="indefinite" /></circle>}
                {/* Main circle — always filled */}
                <circle cx={o.x} cy={o.y} r={NR1} fill={m.color} stroke={isA ? C.goldDk : m.color + "90"} strokeWidth={isA ? 6 : 3}
                  style={{ filter: `drop-shadow(0 6px 28px ${m.color}${isA ? "70" : "35"})` }} />
                {/* Inner ring accent */}
                <circle cx={o.x} cy={o.y} r={NR1 - 12} fill="none" stroke={C.white + "20"} strokeWidth={1.2} />
                {/* Text — large, bold, white for contrast */}
                <MapText text={m.name} x={o.x} y={o.y} size={28} fill={C.white} lh={33} /></g>);
            })}

            {/* CENTRAL */}
            <g onClick={e => { e.stopPropagation(); dr.current.m = false; sM ? goHome() : setCPanel(p => !p); }} style={{ cursor: "pointer" }}>
              <circle cx={CX} cy={CY} r={NR0} fill={C.gold} stroke={C.goldDk} strokeWidth={5} style={{ filter: `drop-shadow(0 4px 24px ${C.gold}50)` }} />
              <circle cx={CX} cy={CY} r={NR0 - 14} fill="none" stroke={C.white + "25"} strokeWidth={1} />
              <image href={LOGO} x={CX - 100} y={CY - 100} width={200} height={200} preserveAspectRatio="xMidYMid meet" style={{ pointerEvents: "none" }} /></g>

            {!sM && !cPanel && <text x={CX} y={CY + 200} textAnchor="middle" fontSize={18} fill={C.textLt + "80"} fontFamily="'Source Sans 3',sans-serif">Clic en un nodo · Scroll = zoom · Arrastra = mover</text>}
          </svg>
        </div>

        {panel && sProj && <CentralPanel data={sProj.desc} accent={sProj.color} onClose={() => setPanel(false)} isCentral={false} resolveTags={(t) => getTags(t)} />}
        {/* GENERIC LIST PANEL — for any listMode sub */}
        {panel && sSub?.listMode && (
          <div
            className="animate-[slI_0.45s_cubic-bezier(0.22,1,0.36,1)] absolute right-0 top-0 z-30 flex h-full w-[450px] flex-col border-l-2 bg-surface-panel"
            style={{
              borderLeftColor: `${sSub.color}66`,
              boxShadow: "-6px 0 36px rgba(0,0,0,0.08)",
            }}
          >
            <div className="flex shrink-0 items-start justify-between border-b border-brand-gold/25 px-6 pb-4 pt-[22px]">
              <div className="min-w-0 flex-1 pr-3">
                <div
                  className="mb-1.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: sSub.color }}
                >{sM?.name?.split("\n")[0] || ""}</div>
                <div className="font-display text-[22px] font-black leading-snug text-text-dk">{sSub.name.split("\n").join(" ")}</div>
                <div className="mt-1 text-xs text-text-lt">{sSub.items.length} elementos</div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button type="button" onClick={e => { e.stopPropagation(); if (sSub) { openItem({ name: (sSub.name || '').replace(/\n/g, ' '), _level: 'hijo', _mainKey: sM?.key || null }); } }}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-brand-gold/40 bg-transparent text-[13px] text-brand-gold">ⓘ</button>
                <button type="button" onClick={() => { setPanel(false); setSSub(null); if (sM) goMain(sM); }}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-brand-gold/40 bg-transparent text-[15px] text-text-lt"> ✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {[...(sSub.items || []), ...(sSub.key ? customNietosForChildKey(cNietos, sSub.key).map(n => n.name) : [])].filter(it => !deletedNodes.includes(typeof it === 'string' ? it : it)).sort((a, b) => String(a).localeCompare(String(b), 'es')).map((item, i) => {
                const itemName = typeof item === "string" ? item : item.name;
                const sk = sSub?.key || "";
                const contact = displayPrimaryContactLabel(
                  itemName,
                  fbContactos,
                  contacts,
                  CT
                );
                const tags = getTagsForItem(itemName);
                return (
                  <div key={i} onClick={() => { openItem({ name: itemName, contact: contact, _parentKey: sSub?.key || null, _isCustom: customNietosForChildKey(cNietos, sk).some(n => n.name === itemName) }); }}
                    className="cursor-pointer border-b border-brand-gold/8 px-6 py-3.5 transition-colors hover:bg-brand-gold/8">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "h-2.5 w-2.5 shrink-0 rounded-full",
                          (contact || hasContact(itemName))
                            ? "bg-brand-green"
                            : "bg-danger"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-[15px] font-extrabold leading-snug text-text-dk">{itemName}</div>
                        {contact && (
                          <div className="mt-0.5 text-xs font-semibold text-brand-gold">
                            👤 {contact}</div>
                        )}
                        {tags.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {tags.slice(0, 3).map((tg, ti) => (
                              <span key={ti} className="rounded-[10px] border border-brand-gold/20 bg-brand-gold/15 px-2 py-px text-[9px] font-bold text-brand-gold">{tg}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 text-base text-brand-gold">›</span>

                    </div>
                  </div>
                );
              })}
            </div>
            <div className="h-[3px] shrink-0" style={{ background: `linear-gradient(90deg,${sSub.color},var(--color-brand-gold))` }} />
          </div>
        )}

        {cPanel && !sM && <CentralPanel data={CENTRAL} accent={C.gold} onClose={() => setCPanel(false)} isCentral={true} resolveTags={(t) => getTags(t)} />}
      </div>

      {/* TOOLTIP */}
      {hov && hov.startsWith("it") && !sItem && (() => {
        const idx = parseInt(hov.slice(2)); const it = sItems[idx]; if (!it) return null;
        return (<div className="pointer-events-none fixed z-80 max-w-[360px] rounded-[10px] border border-brand-gold/30 bg-brand-white px-4 py-2.5 shadow-card" style={{ left: ms.x + 16, top: ms.y - 14, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <div className="font-display text-sm font-extrabold text-text-dk">{it.name}</div>
          {it.contact && <div className="mt-1 text-[11px] font-semibold text-brand-gold">👤 {it.contact}</div>}
          {!it.contact && <div className="mt-1 text-[10px] font-semibold text-danger">⚠ Pendiente</div>}
        </div>);
      })()}

      {sItem && sItem.name && <ItemPopover item={sItem} onClose={() => setSItem(null)} noteText={nt} setNoteText={setNt} onSave={() => saveN(sItem.name, nt, sItem?._parentKey || "")} noteHistory={Array.isArray(notes[sItem.name]) ? notes[sItem.name] : []} onDelete={(idx) => delNote(sItem.name, idx, sItem?._parentKey || "")} onEdit={(idx, txt) => editNote(sItem.name, idx, txt, sItem?._parentKey || "")} userContacts={mergeItemPopContacts(sItem?.name, contacts, fbContactos)} onAddContact={c => addContact(sItem.name, c)} onEditContact={(idx, c) => editContact(sItem.name, idx, c)} onDelContact={idx => delContact(sItem.name, idx)} onSetPrimaryContact={(idx) => setPrimaryContact(sItem.name, idx)}
        itemTags={getTagsForItem(sItem?.name || '')}
        onAddTag={addFirebaseTag}
        onRmTag={rmFirebaseTag}
        mainContactHidden={(hiddenCT || []).includes(sItem?.name)} onHideMainContact={hideMainContact} onRestoreMainContact={restoreMainContact}
        resolvedMainContact={displayPrimaryContactLabel(sItem.name, fbContactos, contacts, CT)}
        onDeleteNode={(sItem?._parentKey || sItem?._level === 'hijo' || sItem?._mainKey) ? () => {
          try {
            const nm = sItem.name;
            if (sItem._isCustom && sItem._parentKey) {
              delNieto(sItem._parentKey, nm);
              (async () => {
                try { await removeAllNotasForNieto(sItem._parentKey, nm); } catch (e4) { console.error("RTDB notas nieto:", e4); }
              })();
            } else if (sItem._level === 'hijo' && sItem._mainKey) {
              deleteBuiltIn(nm);
              setSSub(null); setPanel(false);
            } else {
              deleteBuiltIn(nm);
            }
            /* Clean tags */
            try {
              if (isNietoNodeName(nm, cNietos)) {
                (async () => { try { await deleteTagMapEntry(nm); } catch (e4) { console.error(e4); } })();
              } else {
                const ut2 = { ...userTags }; delete ut2[nm]; saveUT(ut2);
              }
            } catch (e3) { }
            setSItem(null);
          } catch (e) { console.error(e); }
        } : null} />}

      <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 text-center text-[10px] text-text-lt/60">
        {sM && !sProj && !sSub && "Selecciona una subcategoría · Menú izquierdo: navegación"}
        {(sProj || sSub) && "Clic en un elemento para ver detalle y notas"}</div>
    </div>
  );
}

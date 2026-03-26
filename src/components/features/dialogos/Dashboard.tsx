// @ts-nocheck — large legacy surface; feature modules are fully typed
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  subscribeContactos,
  removeContactosLinkedToNode,
  appendContactoForNieto,
  appendContactoForParent,
  updateContacto,
  deleteContacto,
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
import { LOGO, C, CENTRAL, CT } from "../../../lib/mapStatic";
import { tagMapLive, getTags } from "../../../lib/tagMapStore";
import { fbContactosRef, mergeItemPopContacts, resolveGc } from "../../../lib/contactHelpers";
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
  const addContact = useCallback(async (key, c) => {
    const name = String(c.name || "").trim();
    if (!name) return;
    const row = {
      name,
      cargo: String(c.cargo || "").trim(),
      email: String(c.email || "").trim(),
    };
    try {
      await appendContactoForParent(key, row);
    } catch (e) {
      console.error("RTDB append contacto:", e);
      const pending = Array.isArray(contacts[key]) ? [...contacts[key]] : [];
      await saveContacts({ ...contacts, [key]: [...pending, row] });
    }
  }, [contacts, saveContacts]);
  const editContact = useCallback(async (key, idx, c) => {
    const merged = mergeItemPopContacts(key, contacts, fbContactos);
    const target = merged[idx];
    if (!target) return;
    const nextRow = {
      name: String(c.name || "").trim(),
      cargo: String(c.cargo || "").trim(),
      email: String(c.email || "").trim(),
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
      } catch (e) {
        console.error("RTDB update contacto:", e);
      }
    } else {
      try {
        await appendContactoForParent(key, nextRow);
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
      } catch (e) {
        console.error("RTDB append contacto (edit):", e);
        const list = Array.isArray(contacts[key]) ? [...contacts[key]] : [];
        const j = list.findIndex(
          (x) => !x.fbId
            && x.name === target.name
            && (x.email || "") === (target.email || "")
            && (x.cargo || "") === (target.cargo || "")
        );
        if (j >= 0) {
          list[j] = nextRow;
          await saveContacts({ ...contacts, [key]: list });
        }
      }
    }
  }, [contacts, fbContactos, saveContacts]);
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
      <div style={{ fontFamily: "'Source Sans 3','Segoe UI',sans-serif", background: C.bg, width: "100%", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.textDk, fontSize: 16 }}>
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
    <div style={{ fontFamily: "'Source Sans 3','Segoe UI',sans-serif", background: C.bg, width: "100%", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", WebkitFontSmoothing: "antialiased" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700;800;900&family=Cormorant+Garamond:wght@400;600;700;800&display=swap" />
      <style>{`@keyframes redPulse{0%,100%{opacity:0.6;transform:scale(1)}50%{opacity:0.15;transform:scale(1.2)}}
        @keyframes slI{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes pU{from{opacity:0;transform:scale(0.94) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
        svg text{text-rendering:optimizeLegibility}`}</style>

      {/* HEADER */}
      <div style={{ background: C.white, padding: "8px 22px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0, borderBottom: `1px solid ${C.gold}25`, zIndex: 40 }}>
        <div onClick={e => { e.stopPropagation(); sM ? goHome() : setCPanel(p => !p); }} style={{ width: 34, height: 34, borderRadius: "50%", cursor: "pointer", background: C.gold, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 900, color: C.white, fontFamily: "Impact,sans-serif" }}>UP</span></div>
        <div><div style={{ fontSize: 14, fontWeight: 800, color: C.textDk, fontFamily: "'Cormorant Garamond',serif" }}>Diálogos con el Entorno</div>
          <div style={{ fontSize: 9.5, color: C.textLt }}>Universidad Panamericana Guadalajara</div></div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <span style={{ color: !sM ? C.gold : C.textLt, cursor: "pointer", fontWeight: !sM ? 700 : 400 }} onClick={e => { e.stopPropagation(); goHome(); }}>Inicio</span>
          {sM && <><span style={{ color: C.gold + "60" }}>›</span><span style={{ color: sM.color, fontWeight: 700, cursor: "pointer" }} onClick={e => { e.stopPropagation(); goMain(sM); }}>{sM.name.split("\n")[0]}</span></>}
          {sProj && <><span style={{ color: C.gold + "60" }}>›</span><span style={{ color: sProj.color, fontWeight: 700 }}>{sProj.short}</span></>}
          {sSub && <><span style={{ color: C.gold + "60" }}>›</span><span style={{ color: sSub.color, fontWeight: 700 }}>{sSub.name.split("\n")[0]}</span></>}
          {sTema && <><span style={{ color: C.gold + "60" }}>›</span><span style={{ fontWeight: 700, color: C.textDk }}>{sTema.name.split("\n")[0]}</span></>}
        </div>
        <button type="button" onClick={e => {
          e.stopPropagation();
          setShowAdmin(a => {
            const n = !a; if (n) { setShowContactosFb(false); setShowTagMapFb(false); } return n;
          });
        }}
          style={{
            fontSize: 10, padding: "6px 14px", background: showAdmin ? C.gold : C.gold + "15", border: `1px solid ${C.gold}30`,
            borderRadius: 8, cursor: "pointer", color: showAdmin ? C.white : C.gold, fontWeight: 700, marginLeft: 8, flexShrink: 0
          }}>
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

      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {/* ADMIN */}
        {showContactosFb && (
          <ContactosFirebasePanel
            open={showContactosFb}
            onClose={() => setShowContactosFb(false)}
            records={fbContactos.filter((r) => !r.parentKey)}
            palette={C}
          />
        )}
        {showTagMapFb && (
          <TagMapFirebasePanel
            open={showTagMapFb}
            onClose={() => setShowTagMapFb(false)}
            tagMap={tagMapUi}
            usingFallback={tagMapRemoteEmpty}
            palette={C}
          />
        )}
        {showAdmin && (
          <NodesAdminPanel
            open={showAdmin}
            onClose={() => setShowAdmin(false)}
            palette={C}
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
          <div style={{ position: "absolute", top: 60, left: 14, width: 260, maxHeight: "calc(100% - 80px)", zIndex: 25, background: C.white + "f0", borderRadius: 14, border: `1px solid ${C.gold}25`, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px 10px", borderBottom: `1px solid ${C.gold}15` }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: sM.color, textTransform: "uppercase", letterSpacing: "1.5px" }}>{sM.name.split("\n")[0]}</div></div>
            <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
              {sM.key === "proyectos" && pN.map((p, i) => (<div key={i} onClick={e => { e.stopPropagation(); goProj(p); }}
                style={{ padding: "10px 18px", cursor: "pointer", borderBottom: `1px solid ${C.gold}08` }}
                onMouseEnter={e => e.currentTarget.style.background = C.gold + "10"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.textDk }}>{p.short}</span></div>))}
              {["cinov", "aliados", "investigacion"].includes(sM.key) && (sM.key === "cinov" ? cS : sM.key === "aliados" ? aS : iSub).map((s, i) => (<div key={i}
                onClick={e => { e.stopPropagation(); goSub(s); }}
                style={{ padding: "10px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.gold}08` }}
                onMouseEnter={e => e.currentTarget.style.background = C.gold + "10"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.textDk }}>{s.name.split("\n")[0]}</span>{s.listMode && <span style={{ fontSize: 9, color: C.gold, marginLeft: 6, fontWeight: 700 }}>📋 Lista</span>}</div>))}
            </div>
          </div>)}


        {/* SEARCH + VOLVER — stacked top-right */}
        <div style={{ position: "absolute", top: 14, right: 14, zIndex: 26, display: isMob ? "none" : "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          {/* SMART SEARCH */}
          <div style={{ position: "relative", width: 420 }}>
            {/* Input + mode toggle */}
            <div style={{
              display: "flex", background: C.white, border: `2px solid ${(searchText || searchTag) ? C.gold : C.gold + "60"}`,
              borderRadius: 12, boxShadow: "0 3px 14px rgba(0,0,0,0.07)", overflow: "hidden"
            }}>
              <div style={{ display: "flex", alignItems: "center", padding: "0 14px", fontSize: 20 }}>🔍</div>
              {searchMode === "text" ? (
                <input value={searchText} onChange={e => { setSearchText(e.target.value); setSearchTag(null); }}
                  placeholder="Buscar actor, tema o institución..."
                  style={{
                    flex: 1, border: "none", outline: "none", fontSize: 15, fontWeight: 600,
                    padding: "12px 0", color: C.textDk, background: "transparent",
                    fontFamily: "'Source Sans 3',sans-serif"
                  }} />
              ) : (
                <button type="button" onClick={() => setSearchOpen(o => !o)}
                  style={{
                    flex: 1, border: "none", background: "transparent", textAlign: "left",
                    padding: "12px 0", cursor: "pointer", fontSize: 15, fontWeight: 600,
                    color: searchTag ? C.gold : C.textMd, fontFamily: "'Source Sans 3',sans-serif"
                  }}>
                  {searchTag || "Seleccionar temática..."}</button>
              )}
              {(searchText || searchTag) && <button type="button" onClick={() => { setSearchText(''); setSearchTag(null); }}
                style={{
                  border: "none", background: "transparent", padding: "0 14px", fontSize: 16,
                  color: C.textLt, cursor: "pointer", fontWeight: 700
                }}>✕</button>}
              {/* Mode toggle */}
              <div style={{ display: "flex", borderLeft: `1px solid ${C.gold}20` }}>
                <button type="button" onClick={() => { setSearchMode("text"); setSearchTag(null); setSearchOpen(false); }}
                  style={{
                    border: "none", padding: "8px 12px", cursor: "pointer", fontSize: 10, fontWeight: 700,
                    background: searchMode === "text" ? C.gold + "15" : "transparent", color: searchMode === "text" ? C.gold : C.textLt
                  }}>
                  Texto</button>
                <button type="button" onClick={() => { setSearchMode("tag"); setSearchText(''); }}
                  style={{
                    border: "none", padding: "8px 12px", cursor: "pointer", fontSize: 10, fontWeight: 700,
                    background: searchMode === "tag" ? C.gold + "15" : "transparent", color: searchMode === "tag" ? C.gold : C.textLt
                  }}>
                  Temática</button>
              </div>
            </div>
            {/* Tag dropdown */}
            {searchMode === "tag" && searchOpen && (
              <div style={{
                position: "absolute", top: "100%", right: 0, marginTop: 6, width: 420, maxHeight: 400,
                background: C.white, border: `1px solid ${C.gold}30`, borderRadius: 14,
                boxShadow: "0 10px 40px rgba(0,0,0,0.12)", overflowY: "auto", zIndex: 30
              }}>
                {TAGS.slice().sort((a, b) => a.localeCompare(b, 'es')).map((tag, i) => (
                  <div key={i} onClick={e => { e.stopPropagation(); setSearchTag(tag); setSearchOpen(false); }}
                    style={{
                      padding: "11px 20px", cursor: "pointer", borderBottom: `1px solid ${C.gold}08`,
                      fontSize: 14, fontWeight: 600, color: C.textDk,
                      background: searchTag === tag ? C.gold + "15" : "transparent"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = C.gold + "10"}
                    onMouseLeave={e => e.currentTarget.style.background = searchTag === tag ? C.gold + "15" : "transparent"}>
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
                <div style={{
                  width: 420, maxHeight: 420, background: C.white, border: `1px solid ${C.gold}25`,
                  borderRadius: 14, boxShadow: "0 6px 30px rgba(0,0,0,0.1)", overflowY: "auto", display: "flex", flexDirection: "column"
                }}>
                  {/* Related tags header */}
                  {relatedTags.length > 0 && (
                    <div style={{
                      padding: "12px 18px", borderBottom: `1px solid ${C.gold}15`, flexShrink: 0,
                      position: "sticky", top: 0, background: C.white, zIndex: 1
                    }}>
                      <div style={{
                        fontSize: 10, fontWeight: 800, color: C.gold, textTransform: "uppercase",
                        letterSpacing: "1px", marginBottom: 6
                      }}>
                        {searchText ? "¿De qué puedes hablar?" : "Temática"} · {resultNodes.length} resultados</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {relatedTags.slice(0, 6).map((t, i) => (
                          <span key={i} style={{
                            fontSize: 9, fontWeight: 700, color: C.gold, background: C.gold + "12",
                            border: `1px solid ${C.gold}20`, borderRadius: 10, padding: "2px 8px"
                          }}>
                            {t}</span>))}
                      </div>
                    </div>
                  )}
                  {/* Node results */}
                  <div style={{ flex: 1, overflowY: "auto" }}>
                    {resultNodes.map((n, i) => {
                      const tc = typeColors[n.type] || C.textLt; const ct = gc(n.name);
                      return (
                        <div key={i} onClick={e => { e.stopPropagation(); doZoom(n, n.name); }}
                          style={{
                            padding: "10px 18px", cursor: "pointer", borderBottom: `1px solid ${C.gold}06`,
                            display: "flex", alignItems: "center", gap: 8
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = C.gold + "10"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <span style={{
                            fontSize: 8, fontWeight: 800, color: tc, background: tc + "14",
                            border: `1px solid ${tc}30`, borderRadius: 5, padding: "2px 7px",
                            textTransform: "uppercase", letterSpacing: "0.3px", flexShrink: 0,
                            whiteSpace: "nowrap"
                          }}>{n.type}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, fontWeight: 700, color: C.textDk, overflow: "hidden",
                              textOverflow: "ellipsis", whiteSpace: "nowrap"
                            }}>{n.name}</div>
                            <div style={{ fontSize: 10, color: C.textLt, marginTop: 1 }}>
                              {n.parent || ""}{n.matchType === "direct" ? " · coincidencia directa" : ""}</div>
                          </div>
                          {(() => {
                            try {
                              const hc = hasContact(n.name); return hc
                                ? <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, flexShrink: 0 }} title="Con contacto" />
                                : <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.pulseRed, flexShrink: 0 }} title="Sin contacto" />;
                            } catch (e) { return null; }
                          })()}
                          <span style={{ fontSize: 16, color: C.gold, flexShrink: 0 }}>›</span>
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
              style={{
                background: C.white, border: `1.5px solid ${C.gold}50`, borderRadius: 10,
                padding: "10px 24px", cursor: "pointer", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                display: "flex", alignItems: "center", gap: 8
              }}>
              <span style={{ fontSize: 20, color: C.gold }}>←</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: C.textDk }}>Volver</span>
            </button>
          )}
        </div>

        <div ref={svgR} style={{ position: "absolute", inset: 0, cursor: dr.current.a ? "grabbing" : "grab" }}
          onClick={e => { if (!dr.current.m) cBg(); }} onMouseDown={onD} onMouseMove={onM2} onMouseUp={onU} onMouseLeave={onU}>
          <svg viewBox={vS} preserveAspectRatio="xMidYMid meet"
            style={{ width: "100%", height: "100%", display: "block", userSelect: "none", imageRendering: "optimizeQuality" }}
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

        {panel && sProj && <CentralPanel data={sProj.desc} accent={sProj.color} onClose={() => setPanel(false)} isCentral={false} resolveTags={(t) => getTags(t)} palette={C} />}
        {/* GENERIC LIST PANEL — for any listMode sub */}
        {panel && sSub?.listMode && (
          <div style={{
            position: "absolute", top: 0, right: 0, width: 450, height: "100%", zIndex: 30,
            background: C.panelBg, borderLeft: `2px solid ${sSub.color}40`, boxShadow: "-6px 0 36px rgba(0,0,0,0.08)",
            display: "flex", flexDirection: "column", animation: "slI 0.45s cubic-bezier(0.22,1,0.36,1)"
          }}>
            <div style={{
              padding: "22px 24px 16px", borderBottom: `1px solid ${C.gold}25`, flexShrink: 0,
              display: "flex", justifyContent: "space-between", alignItems: "flex-start"
            }}>
              <div style={{ flex: 1, paddingRight: 12 }}>
                <div style={{
                  fontSize: 10, color: sSub.color, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "1.5px", marginBottom: 6
                }}>{sM?.name?.split("\n")[0] || ""}</div>
                <div style={{
                  fontSize: 22, fontWeight: 900, color: C.textDk, lineHeight: 1.3,
                  fontFamily: "'Cormorant Garamond',serif"
                }}>{sSub.name.split("\n").join(" ")}</div>
                <div style={{ fontSize: 12, color: C.textLt, marginTop: 4 }}>{sSub.items.length} elementos</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button type="button" onClick={e => { e.stopPropagation(); if (sSub) { openItem({ name: (sSub.name || '').replace(/\n/g, ' '), _level: 'hijo', _mainKey: sM?.key || null }); } }}
                  style={{
                    background: "transparent", border: `1px solid ${C.gold}40`, color: C.gold,
                    borderRadius: 8, width: 32, height: 32, fontSize: 13, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>ⓘ</button>
                <button type="button" onClick={() => { setPanel(false); setSSub(null); if (sM) goMain(sM); }}
                  style={{
                    background: "transparent", border: `1px solid ${C.gold}40`, color: C.textLt,
                    borderRadius: 8, width: 32, height: 32, fontSize: 15, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}> ✕</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
              {[...(sSub.items || []), ...(sSub.key ? customNietosForChildKey(cNietos, sSub.key).map(n => n.name) : [])].filter(it => !deletedNodes.includes(typeof it === 'string' ? it : it)).sort((a, b) => String(a).localeCompare(String(b), 'es')).map((item, i) => {
                const itemName = typeof item === "string" ? item : item.name;
                const sk = sSub?.key || "";
                const contact = gc(itemName) || (Array.isArray(contacts[itemName]) && contacts[itemName].length > 0 ? contacts[itemName].map(c => c.name).join(', ') : null);
                const tags = getTagsForItem(itemName);
                return (
                  <div key={i} onClick={() => { openItem({ name: itemName, contact: contact, _parentKey: sSub?.key || null, _isCustom: customNietosForChildKey(cNietos, sk).some(n => n.name === itemName) }); }}
                    style={{
                      padding: "14px 24px", cursor: "pointer", borderBottom: `1px solid ${C.gold}08`,
                      transition: "background 0.15s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = C.gold + "08"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {/* Contact indicator */}
                      <div style={{
                        width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                        background: (contact || hasContact(itemName)) ? C.green : C.pulseRed
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 15, fontWeight: 800, color: C.textDk, lineHeight: 1.4,
                          fontFamily: "'Cormorant Garamond',serif"
                        }}>{itemName}</div>
                        {contact && (
                          <div style={{ fontSize: 12, color: C.gold, fontWeight: 600, marginTop: 3 }}>
                            👤 {contact}</div>
                        )}
                        {tags.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
                            {tags.slice(0, 3).map((tg, ti) => (
                              <span key={ti} style={{
                                fontSize: 9, fontWeight: 700, color: C.gold,
                                background: C.gold + "12", border: `1px solid ${C.gold}20`,
                                borderRadius: 10, padding: "1px 8px"
                              }}>{tg}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 16, color: C.gold, flexShrink: 0 }}>›</span>

                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ height: 3, background: `linear-gradient(90deg,${sSub.color},${C.gold})`, flexShrink: 0 }} />
          </div>
        )}

        {cPanel && !sM && <CentralPanel data={CENTRAL} accent={C.gold} onClose={() => setCPanel(false)} isCentral={true} resolveTags={(t) => getTags(t)} palette={C} />}
      </div>

      {/* TOOLTIP */}
      {hov && hov.startsWith("it") && !sItem && (() => {
        const idx = parseInt(hov.slice(2)); const it = sItems[idx]; if (!it) return null;
        return (<div style={{ position: "fixed", left: ms.x + 16, top: ms.y - 14, pointerEvents: "none", background: C.white, border: `1px solid ${C.gold}30`, borderRadius: 10, padding: "10px 16px", zIndex: 80, maxWidth: 360, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize: 14, color: C.textDk, fontWeight: 800, fontFamily: "'Cormorant Garamond',serif" }}>{it.name}</div>
          {it.contact && <div style={{ fontSize: 11, color: C.gold, fontWeight: 600, marginTop: 4 }}>👤 {it.contact}</div>}
          {!it.contact && <div style={{ fontSize: 10, color: C.pulseRed, fontWeight: 600, marginTop: 4 }}>⚠ Pendiente</div>}
        </div>);
      })()}

      {sItem && sItem.name && <ItemPopover palette={C} item={sItem} onClose={() => setSItem(null)} noteText={nt} setNoteText={setNt} onSave={() => saveN(sItem.name, nt, sItem?._parentKey || "")} noteHistory={Array.isArray(notes[sItem.name]) ? notes[sItem.name] : []} onDelete={(idx) => delNote(sItem.name, idx, sItem?._parentKey || "")} onEdit={(idx, txt) => editNote(sItem.name, idx, txt, sItem?._parentKey || "")} userContacts={mergeItemPopContacts(sItem?.name, contacts, fbContactos)} onAddContact={c => addContact(sItem.name, c)} onEditContact={(idx, c) => editContact(sItem.name, idx, c)} onDelContact={idx => delContact(sItem.name, idx)}
        itemTags={getTagsForItem(sItem?.name || '')}
        onAddTag={addFirebaseTag}
        onRmTag={rmFirebaseTag}
        mainContactHidden={(hiddenCT || []).includes(sItem?.name)} onHideMainContact={hideMainContact} onRestoreMainContact={restoreMainContact}
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

      <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", fontSize: 10, color: C.textLt + "60", zIndex: 10, pointerEvents: "none", textAlign: "center" }}>
        {sM && !sProj && !sSub && "Selecciona una subcategoría · Menú izquierdo: navegación"}
        {(sProj || sSub) && "Clic en un elemento para ver detalle y notas"}</div>
    </div>
  );
}

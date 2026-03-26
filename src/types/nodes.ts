import type { Palette } from "./palette";

export interface MainBranch {
  key: string;
  name: string;
  color: string;
  angle: number;
}

export interface NodeIndexEntry {
  name: string;
  type: string;
  parent: string;
  branch: string;
  projKey?: string;
  subKey?: string;
  x?: number;
  y?: number;
  matchType?: string;
}

export interface MapItem {
  name: string;
  x?: number;
  y?: number;
  contact?: string | null;
  _parentKey?: string | null;
  _isCustom?: boolean;
  _level?: string;
  _mainKey?: string | null;
}

export interface NoteRow {
  text?: string;
  date?: string;
  edited?: string;
  fbId?: string;
}

export interface ContactRow {
  fbId?: string;
  name: string;
  cargo?: string;
  email?: string;
}

export interface FbContactoRecord {
  id: string;
  parentKey: string;
  patron: string;
  nombre: string;
  cargo: string;
  email: string;
  notas: string;
}

export interface DescSection {
  h: string;
  t: string;
}

export interface ProjectDesc {
  title: string;
  escuelas?: string[];
  sections?: DescSection[];
}

export interface ProjectDef {
  key: string;
  name: string;
  short: string;
  color: string;
  desc: ProjectDesc;
  tematicas: string[];
}

export interface SubDef {
  key: string;
  name: string;
  color: string;
  listMode?: boolean;
  items?: (string | { name: string })[];
}

export interface CentralCopy {
  title: string;
  intro: string;
  objetivos: DescSection[];
}

/** Props bundle for map text helper */
export interface MapTextStyle {
  palette: Palette;
}

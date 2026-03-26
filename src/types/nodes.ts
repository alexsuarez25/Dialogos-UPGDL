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
  /** At most one per node; drives map/list “main” contact line */
  isPrimary?: boolean;
}

export interface FbContactoRecord {
  id: string;
  parentKey: string;
  patron: string;
  nombre: string;
  cargo: string;
  email: string;
  notas: string;
  /** When true, this row is the sole primary for `parentKey` */
  primary?: boolean;
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

import {
  customNietosForHijo,
  type CustomNietosState,
} from "./firebase/mapCustomNodesRealtime";

export function isNietoNodeName(
  name: string,
  cNietos: CustomNietosState | Record<string, { name: string }[]>
): boolean {
  if (!name || !cNietos || typeof cNietos !== "object") return false;
  for (const pk of Object.keys(cNietos)) {
    if (
      customNietosForHijo(cNietos as CustomNietosState, pk).some(
        (n) => n && String(n.name) === String(name)
      )
    )
      return true;
  }
  return false;
}

export function getNietoParentKeyForName(
  name: string,
  cNietos: CustomNietosState | Record<string, { name: string }[]>
): string {
  if (!name || !cNietos || typeof cNietos !== "object") return "";
  for (const pk of Object.keys(cNietos)) {
    if (
      customNietosForHijo(cNietos as CustomNietosState, pk).some(
        (n) => n && String(n.name) === String(name)
      )
    )
      return pk;
  }
  return "";
}

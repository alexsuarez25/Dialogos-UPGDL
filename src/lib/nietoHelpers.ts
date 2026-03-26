export function isNietoNodeName(
  name: string,
  cNietos: Record<string, { name: string }[]>
): boolean {
  if (!name || !cNietos || typeof cNietos !== "object") return false;
  for (const arr of Object.values(cNietos)) {
    if (
      Array.isArray(arr) &&
      arr.some((n) => n && String(n.name) === String(name))
    )
      return true;
  }
  return false;
}

export function getNietoParentKeyForName(
  name: string,
  cNietos: Record<string, { name: string }[]>
): string {
  if (!name || !cNietos || typeof cNietos !== "object") return "";
  for (const [pk, arr] of Object.entries(cNietos)) {
    if (
      Array.isArray(arr) &&
      arr.some((n) => n && String(n.name) === String(name))
    )
      return pk;
  }
  return "";
}

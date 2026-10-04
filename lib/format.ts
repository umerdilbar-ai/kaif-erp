const nf = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 });

/** formatPKR(1250) -> "Rs 1,250"; negatives -> "-Rs 1,250" */
export function formatPKR(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return `${v < 0 ? "-" : ""}Rs ${nf.format(Math.abs(v))}`;
}

export function formatQty(n: number | null | undefined): string {
  return nf.format(Number(n ?? 0));
}

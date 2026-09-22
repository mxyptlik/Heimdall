// Exact decimal comparison (shared). Money, fractions, and regression margins
// compare as scaled integers, never binary floats. Malformed input yields
// undefined instead of throwing; callers turn that into explicit rejections.
const NANOS = 1_000_000_000n;

/** Format integer nanos as an exact decimal string. */
export function nanosToDecimalString(nanos: bigint): string {
  const sign = nanos < 0n ? '-' : '';
  const abs = nanos < 0n ? -nanos : nanos;
  const int = abs / 1_000_000_000n;
  const frac = (abs % 1_000_000_000n).toString().padStart(9, '0').replace(/0+$/, '');
  return frac === '' ? `${sign}${int}` : `${sign}${int}.${frac}`;
}
/** Parse an exact decimal string (up to 18 integer and 9 fractional digits) to integer nanos. */
export function parseDecimalToNanos(amount: string): bigint | undefined {
  const m = /^(-?)(\d{1,18})(?:\.(\d{1,9}))?$/.exec(amount);
  if (!m) return undefined;
  const [, sign, int, frac = ''] = m;
  if (int === undefined) return undefined;
  const scaled = BigInt(int) * NANOS + BigInt((frac + '000000000').slice(0, 9));
  return sign === '-' ? -scaled : scaled;
}

/** Compare two exact decimals. Undefined when either side is malformed. */
export function compareDecimals(a: string, b: string): -1 | 0 | 1 | undefined {
  const na = parseDecimalToNanos(a);
  const nb = parseDecimalToNanos(b);
  if (na === undefined || nb === undefined) return undefined;
  if (na < nb) return -1;
  if (na > nb) return 1;
  return 0;
}

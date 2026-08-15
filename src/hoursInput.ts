// hh:mm input masking shared by the app's Log-hours and goal fields.
//
// Auto-formats digits as the user types: "230" -> "2:30", "1200" -> "12:00",
// "0032" -> "0:32". One or two digits stay as plain hours ("8", "23"). Hours
// are clamped to 24 and minutes to 59 so the field always stays valid, and at
// most four digits are kept.
//
// Because the mask inserts the colon as soon as three digits are typed, the
// text that reaches the handler on the very next keystroke already contains a
// colon ("1:200" after typing "1200"). maskHours therefore strips ALL non-digit
// characters and re-derives from the digits, so it stays correct no matter how
// many times a colon has been inserted. Masking is idempotent, so pasting an
// already-formatted value ("12:00", "2:30") normalizes to itself.
export function maskHours(text: string): string {
  const digits = text.replace(/[^0-9]/g, '').slice(0, 4);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return String(Number(digits));
  const rawHours = Number(digits.slice(0, -2));
  const rawMinutes = Number(digits.slice(-2));
  const hours = Math.min(rawHours, 24);
  const minutes = Math.min(rawMinutes, 59);
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

// Wrap a setter so typed digits auto-format to hh:mm. A decimal point switches
// the field to decimal entry ("2.5") and is passed through untouched so the
// parser still accepts it; anything else (including text that already contains
// the colon the mask inserted) is re-masked from its digits.
export const maskOnChange = (set: (s: string) => void) => (text: string) => {
  if (text.includes('.')) {
    set(text);
    return;
  }
  set(maskHours(text));
};

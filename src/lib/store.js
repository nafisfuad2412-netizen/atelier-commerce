export const STORE_CURRENCY = "BDT";
export const DEFAULT_THEME = { primary_color: "#234D38", secondary_color: "#FAF8F4", font_family: "sans" };
export const STORE_FONTS = { sans: "Arial, Helvetica, sans-serif", serif: "Georgia, 'Times New Roman', serif", mono: "'Courier New', monospace" };

export function formatMoney(value) {
  return new Intl.NumberFormat("en-BD", { style: "currency", currency: STORE_CURRENCY, currencyDisplay: "narrowSymbol", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
}

export function toMinorUnits(value) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!match) throw new Error("Invalid price.");
  const minor = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(minor)) throw new Error("Price is outside the supported range.");
  return minor;
}

export function contrastColor(hex) {
  const rgb = hex.slice(1).match(/.{2}/g).map((value) => parseInt(value, 16) / 255);
  const linear = rgb.map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722 > .179 ? "#17251e" : "#ffffff";
}

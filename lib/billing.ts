// lib/billing.ts — shared helpers for monthly delivery targets and invoicing

export type InvoiceItemInput = { description: string; quantity: number; unitPrice: number };

export const INVOICE_STATUS_BADGE: Record<string, string> = {
  DRAFT: "badge-gray",
  RAISED: "badge-blue",
  PAID: "badge-green",
  CANCELLED: "badge-red",
};
export const INVOICE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  RAISED: "Raised",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const CURRENCY_SYMBOL: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", AED: "د.إ",
};

export function currencySymbol(code: string) {
  return CURRENCY_SYMBOL[code] || code + " ";
}

export function money(amount: number, currency = "INR") {
  return `${currencySymbol(currency)}${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function invoiceSubtotal(items: { quantity: number; unitPrice: number }[]) {
  return items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
}
export function invoiceTotals(items: { quantity: number; unitPrice: number }[], taxPercent = 0) {
  const subtotal = invoiceSubtotal(items);
  const tax = subtotal * (taxPercent / 100);
  return { subtotal, tax, total: subtotal + tax };
}

export const TAX_MODES = [
  { value: "SIMPLE", label: "Single tax rate" },
  { value: "GST_SPLIT", label: "GST — CGST + SGST (same state)" },
  { value: "IGST", label: "IGST (inter-state)" },
] as const;
export type TaxMode = (typeof TAX_MODES)[number]["value"];

export type TaxableInvoice = {
  taxMode?: string | null;
  taxPercent?: number | null;
  cgstPercent?: number | null;
  sgstPercent?: number | null;
  igstPercent?: number | null;
  discount?: number | null;
  roundOff?: number | null;
};

/**
 * Full money breakdown for an invoice.
 * Discount is applied before tax, which is how GST invoices are computed.
 */
export function computeInvoice(
  items: { quantity: number; unitPrice: number }[],
  inv: TaxableInvoice = {},
) {
  const subtotal = invoiceSubtotal(items);
  const discount = Math.min(Number(inv.discount) || 0, subtotal);
  const taxable = subtotal - discount;

  const mode = (inv.taxMode || "SIMPLE") as TaxMode;
  const cgstRate = mode === "GST_SPLIT" ? Number(inv.cgstPercent) || 0 : 0;
  const sgstRate = mode === "GST_SPLIT" ? Number(inv.sgstPercent) || 0 : 0;
  const igstRate = mode === "IGST" ? Number(inv.igstPercent) || 0 : 0;
  const flatRate = mode === "SIMPLE" ? Number(inv.taxPercent) || 0 : 0;

  const cgst = taxable * (cgstRate / 100);
  const sgst = taxable * (sgstRate / 100);
  const igst = taxable * (igstRate / 100);
  const flatTax = taxable * (flatRate / 100);
  const tax = cgst + sgst + igst + flatTax;

  const roundOff = Number(inv.roundOff) || 0;
  const total = taxable + tax + roundOff;

  return {
    subtotal, discount, taxable,
    cgstRate, sgstRate, igstRate, flatRate,
    cgst, sgst, igst, flatTax, tax,
    roundOff, total,
    totalTaxRate: cgstRate + sgstRate + igstRate + flatRate,
  };
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10), o = n % 10;
  return TENS[t] + (o ? ` ${ONES[o]}` : "");
}

/** Indian numbering: crore / lakh / thousand */
function indianWords(n: number): string {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  const hundred = Math.floor(n / 100); n %= 100;

  if (crore) parts.push(`${indianWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (n) parts.push(twoDigits(n));
  return parts.join(" ");
}

const CURRENCY_WORDS: Record<string, { major: string; minor: string }> = {
  INR: { major: "Rupees", minor: "Paise" },
  USD: { major: "Dollars", minor: "Cents" },
  EUR: { major: "Euros", minor: "Cents" },
  GBP: { major: "Pounds", minor: "Pence" },
  AED: { major: "Dirhams", minor: "Fils" },
};

/** "Rupees Twelve Thousand Nine Hundred Eighty Only" */
export function amountInWords(amount: number, currency = "INR") {
  const words = CURRENCY_WORDS[currency] || { major: currency, minor: "Cents" };
  const rounded = Math.round(Math.abs(amount) * 100) / 100;
  const major = Math.floor(rounded);
  const minor = Math.round((rounded - major) * 100);

  let out = `${words.major} ${indianWords(major)}`;
  if (minor > 0) out += ` and ${twoDigits(minor)} ${words.minor}`;
  return `${out} Only`;
}

/** INV-YYYYMM-XXXX — readable and sortable */
export function generateInvoiceNumber(date = new Date()) {
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${stamp}-${rand}`;
}

/** Parse a YYYY-MM-DD string as a local date at noon, avoiding timezone drift */
export function parseDateOnly(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

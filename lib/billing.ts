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

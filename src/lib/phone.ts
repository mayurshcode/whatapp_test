export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  return hasPlus ? `+${digits}` : digits;
}

export function isValidWhatsAppNumber(input: string): boolean {
  const digits = input.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function formatPhoneDisplay(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length < 10) return input.trim();
  const country = digits.slice(0, digits.length - 10);
  const rest = digits.slice(-10);
  const local = `${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
  return country ? `+${country} ${local}` : `+${local}`;
}

export function toApiPhone(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Server-side IMEI generation utility
 * Generates a realistic IMEI (International Mobile Equipment Identity) number
 * Format: 14 digits + 1 check digit = 15 digits total
 * Structure: TAC (8 digits) + SNR (6 digits) + CD (1 digit)
 */

// Common TAC (Type Allocation Code) prefixes for popular phone manufacturers
const TAC_PREFIXES = [
  "35209806", // Samsung
  "35328308", // Apple iPhone
  "35891807", // Huawei
  "35404907", // Xiaomi
  "35875608", // OnePlus
  "35316509", // LG
  "35434006", // Sony
  "35699908", // Nokia
]

/**
 * Generates a realistic IMEI number
 */
export function generateIMEI(): string {
  // Pick a random TAC prefix
  const tac = TAC_PREFIXES[Math.floor(Math.random() * TAC_PREFIXES.length)]

  // Generate 6-digit Serial Number (SNR)
  const snr = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0")

  // Combine TAC + SNR (14 digits)
  const imeiWithoutCheckDigit = tac + snr

  // Calculate Luhn check digit
  const checkDigit = calculateLuhnCheckDigit(imeiWithoutCheckDigit)

  return imeiWithoutCheckDigit + checkDigit
}

/**
 * Calculates the Luhn check digit for IMEI validation
 */
function calculateLuhnCheckDigit(digits: string): string {
  let sum = 0
  let alternate = false

  // Process digits from right to left
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i))

    if (alternate) {
      digit *= 2
      if (digit > 9) {
        digit = (digit % 10) + 1
      }
    }

    sum += digit
    alternate = !alternate
  }

  // Check digit makes the total sum divisible by 10
  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit.toString()
}

/**
 * Validates an IMEI number using the Luhn algorithm
 */
export function validateIMEI(imei: string): boolean {
  if (imei.length !== 15) return false
  if (!/^\d{15}$/.test(imei)) return false

  const checkDigit = imei.slice(-1)
  const calculatedCheckDigit = calculateLuhnCheckDigit(imei.slice(0, 14))

  return checkDigit === calculatedCheckDigit
}

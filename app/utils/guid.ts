/**
 * Generates a UUID/GUID using the crypto library
 * Returns a RFC 4122 version 4 UUID in the format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateGuid(): string {
  // Use Web Crypto API for browser environments or Node.js crypto for server-side
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  
  // Fallback for older environments (should not be needed in modern browsers/Node.js 18+)
  // This uses crypto.getRandomValues which is widely supported
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16
      const v = c === "x" ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }
  
  // Ultimate fallback using Math.random (less secure, but compatible)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

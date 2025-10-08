/**
 * Generates a UUID/GUID using the crypto library
 * Returns a standard UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateGuid(): string {
  // Use the Web Crypto API (browser) or Node.js crypto module
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  
  // Fallback for older environments (should not be needed with modern browsers/Node.js)
  throw new Error("crypto.randomUUID is not available in this environment")
}

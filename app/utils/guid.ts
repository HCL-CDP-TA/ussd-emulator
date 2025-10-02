/**
 * Generates a UUID/GUID in the format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where x is a random hexadecimal digit and y is one of 8, 9, A, or B
 */
export function generateGuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

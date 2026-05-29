/**
 * Decodes the 32-byte graffiti field from a beacon block.
 * Returns a clean human-readable string (trailing null bytes removed).
 */
export function decodeGraffiti(hex: string | null | undefined): string {
  if (!hex || hex === '0x' || hex.length < 4) {
    return ''
  }

  try {
    // Remove 0x prefix
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex

    // Convert hex to Uint8Array
    const bytes = new Uint8Array(cleanHex.length / 2)
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16)
    }

    // Decode as UTF-8 and strip null bytes + trim
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    return text.replace(/\0/g, '').trim()
  } catch (e) {
    console.warn('Failed to decode graffiti', hex, e)
    return ''
  }
}

/**
 * Checks if the graffiti is essentially empty (all zeros or whitespace)
 */
export function isEmptyGraffiti(graffiti: string): boolean {
  return !graffiti || graffiti.length === 0
}

import { isEmptyGraffiti } from './aggregateGraffiti'

/**
 * Decodes the 32-byte `graffiti` field from a beacon block (body.graffiti).
 *
 * Beacon graffiti is set by validators using the --graffiti flag on their
 * consensus client (Lighthouse, Prysm, Teku, etc). It is the correct source
 * for "validator graffiti" — much more reliable than execution-layer extraData.
 */
export function decodeGraffiti(hex: string | null | undefined): string {
  if (!hex || hex === '0x' || hex.length < 4) {
    return ''
  }

  try {
    // Strip 0x prefix and convert hex to bytes
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
    const bytes = new Uint8Array(cleanHex.length / 2)

    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16)
    }

    // Decode UTF-8, remove null padding (beacon graffiti is 32 bytes), trim
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    return text.replace(/\0/g, '').trim()
  } catch (e) {
    console.warn('Failed to decode graffiti', hex, e)
    return ''
  }
}

// Re-export for convenience (used by consumers who only import this file)
export { isEmptyGraffiti } from './aggregateGraffiti'

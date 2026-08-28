/**
 * Decodes the 32-byte `graffiti` field from a beacon block (body.graffiti).
 *
 * Beacon graffiti is set by validators using the --graffiti flag on their
 * consensus client (Lighthouse, Prysm, Teku, etc). It is the correct source
 * for "validator graffiti" — much more reliable than execution-layer extraData.
 */
const HEX_RE = /^(?:0x)?[0-9a-fA-F]+$/

export function decodeGraffiti(hex: string | null | undefined): string {
  if (!hex || hex === '0x' || hex.length < 4) {
    return ''
  }

  if (!HEX_RE.test(hex)) {
    return ''
  }

  try {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
    if (cleanHex.length === 0 || cleanHex.length % 2 !== 0) {
      return ''
    }

    const bytes = new Uint8Array(cleanHex.length / 2)

    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16)
    }

    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    return text.replace(/\0/g, '').trim()
  } catch (e) {
    console.warn('Failed to decode graffiti', hex, e)
    return ''
  }
}

// Re-export for convenience (used by consumers who only import this file)
export { isEmptyGraffiti } from './aggregateGraffiti'

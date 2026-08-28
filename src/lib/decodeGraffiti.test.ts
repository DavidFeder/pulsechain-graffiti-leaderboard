import { describe, expect, it } from 'vitest'
import { decodeGraffiti } from './decodeGraffiti'

function toHex(text: string, padTo = 32): string {
  const bytes = new TextEncoder().encode(text)
  const padded = new Uint8Array(padTo)
  padded.set(bytes.slice(0, padTo))
  return `0x${Array.from(padded, (b) => b.toString(16).padStart(2, '0')).join('')}`
}

describe('decodeGraffiti', () => {
  it('decodes UTF-8 graffiti and strips null padding', () => {
    expect(decodeGraffiti(toHex('Pulse'))).toBe('Pulse')
  })

  it('returns empty for missing or blank payloads', () => {
    expect(decodeGraffiti(null)).toBe('')
    expect(decodeGraffiti('0x')).toBe('')
    expect(decodeGraffiti('0x00')).toBe('')
  })

  it('rejects odd-length and non-hex input', () => {
    expect(decodeGraffiti('0xabc')).toBe('')
    expect(decodeGraffiti('0xzzzz')).toBe('')
  })
})

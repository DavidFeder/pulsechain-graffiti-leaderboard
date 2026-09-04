import { describe, expect, it } from 'vitest'
import { isAllowedBeaconProxyPath } from './proxyPaths'

describe('isAllowedBeaconProxyPath', () => {
  it('allows head and numeric block paths on both prefixes', () => {
    expect(isAllowedBeaconProxyPath('/api/beacon/eth/v1/beacon/headers/head')).toBe(true)
    expect(isAllowedBeaconProxyPath('/api/beacon-fallback/eth/v1/beacon/headers/head')).toBe(true)
    expect(isAllowedBeaconProxyPath('/api/beacon/eth/v2/beacon/blocks/123')).toBe(true)
    expect(isAllowedBeaconProxyPath('/api/beacon-fallback/eth/v2/beacon/blocks/9')).toBe(true)
  })

  it('rejects open-proxy paths and non-numeric slots', () => {
    expect(isAllowedBeaconProxyPath('/api/beacon/eth/v1/node/identity')).toBe(false)
    expect(isAllowedBeaconProxyPath('/api/beacon/eth/v2/beacon/blocks/head')).toBe(false)
    expect(isAllowedBeaconProxyPath('/api/beacon/eth/v2/beacon/blocks/12/extra')).toBe(false)
    expect(isAllowedBeaconProxyPath('/api/beacon/')).toBe(false)
  })
})

import { BEACON_SLOT_EXPLORER } from '../constants'

export function slotExplorerUrl(slot: number): string {
  return `${BEACON_SLOT_EXPLORER}${slot}`
}

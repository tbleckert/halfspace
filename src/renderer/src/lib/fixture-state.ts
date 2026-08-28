const liveStateIds = new Set([2, 6, 9, 22])

export function isFixtureLive(stateId: number): boolean {
  return liveStateIds.has(stateId)
}

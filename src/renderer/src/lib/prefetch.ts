export function startPrefetch(prefetch: () => Promise<void>): void {
  void prefetch().catch(() => undefined)
}

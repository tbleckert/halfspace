import type { SportmonksTransfer } from '@shared/contracts'

export function TransferPosition({
  transfer
}: {
  transfer: Pick<SportmonksTransfer, 'position' | 'detailedPosition'>
}): React.JSX.Element | null {
  const name = transfer.detailedPosition?.name ?? transfer.position?.name
  return name ? <span className="block truncate text-xs text-muted-foreground">{name}</span> : null
}

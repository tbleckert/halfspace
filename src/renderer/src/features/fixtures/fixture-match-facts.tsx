import { useState } from 'react'
import type { SportmonksFixture, SportmonksMatchFact } from '@shared/contracts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ErrorAlert } from '@/components/error-alert'
import { fixtureParticipantAt } from '@/lib/fixture'
import { featureAccess } from '@/features/subscription/subscription-access'
import { useSubscription } from '@/features/subscription/use-subscription'
import { useMatchFacts } from './use-match-facts'

export function FixtureMatchFacts({
  fixture,
  online
}: {
  fixture: SportmonksFixture
  online: boolean
}): React.JSX.Element {
  const subscription = useSubscription(online)
  const access = featureAccess(subscription.cached, 'facts')
  const query = useMatchFacts(fixture.id, online && access !== 'not-included')
  const [participant, setParticipant] = useState('all')
  const [scope, setScope] = useState('all')
  const [category, setCategory] = useState('all')
  const [expanded, setExpanded] = useState(false)
  const written = (query.cached?.facts ?? []).filter((fact) => fact.natural_language?.trim())
  const facts = written.filter(
    (fact) =>
      (participant === 'all' || fact.participant === participant) &&
      (scope === 'all' || fact.scope === scope) &&
      (category === 'all' || fact.category === category)
  )
  const categories = [...new Set(written.map((fact) => fact.category))].sort()
  const scopes = [...new Set(written.map((fact) => fact.scope))].sort()
  const participantName = (side: SportmonksMatchFact['participant']): string => {
    if (side === 'both') return 'Both teams'
    if (side === 'referee') return 'Referee'
    return fixtureParticipantAt(fixture, side)?.name ?? factLabel(side)
  }
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b px-4 py-3">
        <CardTitle>Match facts</CardTitle>
      </CardHeader>
      {query.error && (
        <CardContent className="p-4">
          <ErrorAlert>{query.error}</ErrorAlert>
        </CardContent>
      )}
      {!!written.length && (
        <div className="flex flex-wrap gap-2 border-b px-4 py-3">
          <NativeSelect
            aria-label="Facts participant"
            value={participant}
            onChange={(event) => {
              setParticipant(event.target.value)
              setExpanded(false)
            }}
          >
            <NativeSelectOption value="all">All participants</NativeSelectOption>
            {(['home', 'away', 'both', 'referee'] as const)
              .filter((side) => written.some((fact) => fact.participant === side))
              .map((side) => (
                <NativeSelectOption key={side} value={side}>
                  {participantName(side)}
                </NativeSelectOption>
              ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Facts scope"
            value={scope}
            onChange={(event) => {
              setScope(event.target.value)
              setExpanded(false)
            }}
          >
            <NativeSelectOption value="all">All scopes</NativeSelectOption>
            {scopes.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {factLabel(value)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Facts category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value)
              setExpanded(false)
            }}
          >
            <NativeSelectOption value="all">All categories</NativeSelectOption>
            {categories.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {factLabel(value)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      )}
      <div className="divide-y">
        {facts.slice(0, expanded ? undefined : 6).map((fact) => (
          <div key={fact.id} className="px-4 py-3">
            <p className="text-sm leading-relaxed">{fact.natural_language}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {[
                participantName(fact.participant),
                fact.basis === 'h2h' ? 'Head-to-head' : factLabel(fact.basis),
                factLabel(fact.scope),
                fact.type?.name.replace(/^Match Facts?\s*/i, '')
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        ))}
      </div>
      {!facts.length && (
        <CardContent className="p-4 text-sm text-muted-foreground">
          {query.cached
            ? written.length
              ? 'No facts match these filters'
              : 'No written match facts reported'
            : access === 'not-included'
              ? 'Match facts are not included in your subscription'
              : query.error
                ? 'Match facts unavailable'
                : !online
                  ? 'Match facts not available offline'
                  : 'Loading match facts…'}
        </CardContent>
      )}
      {facts.length > 6 && (
        <div className="border-t px-4 py-2">
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Show fewer' : 'Show more'}
          </Button>
        </div>
      )}
    </Card>
  )
}
function factLabel(value: string): string {
  const words = value.replaceAll('_', ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

import { ArrowUp, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export function ViewComposer({
  prompt,
  onPromptChange,
  generating,
  placed,
  hasView,
  configured,
  online,
  hasContexts,
  error,
  onSubmit,
  onCancel
}: {
  prompt: string
  onPromptChange: (value: string) => void
  generating: boolean
  placed: number
  hasView: boolean
  configured: boolean | null
  online: boolean
  hasContexts: boolean
  error: string | null
  onSubmit: () => void
  onCancel: () => void
}): React.JSX.Element {
  const availability = !online
    ? 'Offline. Saved views are still available.'
    : configured === false
      ? 'Add your OpenAI key in Settings to build or edit a view.'
      : configured === null
        ? 'Checking AI settings…'
        : !hasContexts
          ? 'Open a team or competition to make its context available.'
          : null
  const canSubmit = !generating && !availability && Boolean(prompt.trim())

  return (
    <div className="view-composer-wrap">
      {generating && (
        <p className="sr-only" role="status">
          {placed
            ? `${placed} ${placed === 1 ? 'block' : 'blocks'} placed. Composing your view…`
            : 'Composing your view…'}
        </p>
      )}
      {error && (
        <p className="view-composer-error text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {availability && (
        <p className="sr-only" id="view-prompt-availability">
          {availability}
        </p>
      )}
      <form
        className="view-composer"
        onSubmit={(event) => {
          event.preventDefault()
          if (canSubmit) onSubmit()
        }}
      >
        <Label htmlFor="view-prompt" className="sr-only">
          {hasView ? 'Describe a change to your view' : 'Describe your football view'}
        </Label>
        <Textarea
          id="view-prompt"
          className="view-composer-input min-h-12 max-h-48 min-w-0 flex-1 resize-none rounded-xl px-4 py-[11px] text-[15px] leading-6 disabled:opacity-100"
          rows={1}
          maxLength={2000}
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder={hasView ? 'What would you like to change?' : 'Describe your football view…'}
          disabled={generating}
          title={availability ?? undefined}
          aria-describedby={availability ? 'view-prompt-availability' : undefined}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              (event.metaKey || event.ctrlKey) &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault()
              if (canSubmit) onSubmit()
            }
          }}
        />
        {generating ? (
          <Button
            className="size-12 shrink-0 rounded-xl"
            type="button"
            variant="outline"
            size="icon"
            aria-label="Stop generating"
            onClick={onCancel}
          >
            <Square className="size-3.5 fill-current" />
          </Button>
        ) : (
          <Button
            className="size-12 shrink-0 rounded-xl disabled:bg-secondary disabled:text-primary/60 disabled:opacity-100"
            type="submit"
            size="icon"
            aria-label={hasView ? 'Update view' : 'Build view'}
            title={availability ?? (hasView ? 'Update view' : 'Build view')}
            disabled={!canSubmit}
          >
            <ArrowUp className="size-4" />
          </Button>
        )}
      </form>
    </div>
  )
}

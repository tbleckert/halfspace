import { Link } from '@tanstack/react-router'
import { ArrowUp, Check, KeyRound, LoaderCircle, Square } from 'lucide-react'
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
  return (
    <div className="view-composer-wrap">
      {(generating || error) && (
        <div className="view-composer-status" role={error ? 'alert' : 'status'}>
          {generating ? (
            <>
              <LoaderCircle className="size-3.5 motion-safe:animate-spin text-primary" />
              <span>
                {placed
                  ? `${placed} ${placed === 1 ? 'block' : 'blocks'} placed · composing your view…`
                  : 'Composing your view…'}
              </span>
              <span className="ml-auto flex items-center gap-1 text-primary">
                <span className="size-1.5 rounded-full bg-primary" />
                Live
              </span>
            </>
          ) : (
            <span className="text-destructive">{error}</span>
          )}
        </div>
      )}
      <form
        className="view-composer"
        onSubmit={(event) => {
          event.preventDefault()
          if (!generating) onSubmit()
        }}
      >
        <Label htmlFor="view-prompt" className="sr-only">
          {hasView ? 'Describe a change to your view' : 'Describe your football view'}
        </Label>
        <Textarea
          id="view-prompt"
          className="min-h-[88px] max-h-40 resize-none rounded-none border-0 px-[18px] pb-2.5 pt-[18px] text-[15px] leading-normal focus-visible:ring-0"
          rows={2}
          maxLength={2000}
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder={hasView ? 'What would you like to change?' : 'Describe your football view…'}
          disabled={generating}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              (event.metaKey || event.ctrlKey) &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault()
              if (!generating && configured && online && hasContexts && prompt.trim()) onSubmit()
            }
          }}
        />
        <div className="flex items-center justify-between gap-3 px-4 pb-3">
          <div className="min-w-0 text-xs text-muted-foreground">
            {!online ? (
              'Offline · saved views are still available'
            ) : configured === false ? (
              <Link
                to="/settings"
                className="flex items-center gap-1.5 text-primary hover:underline"
              >
                <KeyRound className="size-3.5" />
                Add your OpenAI key
              </Link>
            ) : configured === null ? (
              'Checking AI settings…'
            ) : !hasContexts ? (
              <Link to="/competitions" className="text-primary hover:underline">
                Open a competition to make its season available
              </Link>
            ) : (
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5" />
                {hasView ? 'Edit with OpenAI' : 'OpenAI'}
                <span className="mx-1 opacity-40">/</span>
                <span>Fixtures, standings, leaders</span>
              </span>
            )}
          </div>
          {generating ? (
            <Button
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
              type="submit"
              size="icon"
              aria-label={hasView ? 'Update view' : 'Build view'}
              disabled={!configured || !online || !hasContexts || !prompt.trim()}
            >
              <ArrowUp className="size-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

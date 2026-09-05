import { ipcMain } from 'electron'
import { z } from 'zod'
import { ipcChannels, type Result } from '@shared/contracts'
import { generateViewInputSchema, type ViewSpec } from '@shared/views'
import { assertTrustedSender } from './trusted-sender'
import { clearAiKey, readAiKey, saveAiKey } from './ai-key-store'
import { generateView, generationErrorMessage } from './view-generation'

const jobs = new Map<number, { id: string; controller: AbortController }>()
let keyOperation: Promise<void> = Promise.resolve()

export function cancelViewGenerations(): void {
  for (const job of jobs.values()) job.controller.abort()
  jobs.clear()
}

export function registerViewsIpc(): void {
  ipcMain.handle(
    ipcChannels.aiSettings,
    async (event): Promise<Result<{ configured: boolean }>> => {
      assertTrustedSender(event)
      try {
        return { ok: true, data: { configured: Boolean(await accessKey(readAiKey)) } }
      } catch {
        return { ok: false, error: { code: 'storage', message: 'Could not read your OpenAI key.' } }
      }
    }
  )

  ipcMain.handle(ipcChannels.aiSaveKey, async (event, raw: unknown): Promise<Result<null>> => {
    assertTrustedSender(event)
    const parsed = z
      .strictObject({ key: z.string().trim().min(10).max(1024).regex(/^\S+$/) })
      .safeParse(raw)
    if (!parsed.success)
      return {
        ok: false,
        error: { code: 'invalid_input', message: 'Enter a valid OpenAI API key.' }
      }
    return changeKey(() => saveAiKey(parsed.data.key))
  })

  ipcMain.handle(ipcChannels.aiClearKey, async (event): Promise<Result<null>> => {
    assertTrustedSender(event)
    return changeKey(clearAiKey)
  })

  ipcMain.handle(ipcChannels.viewCancel, (event, requestId: unknown) => {
    assertTrustedSender(event)
    const job = jobs.get(event.sender.id)
    if (job && job.id === requestId) job.controller.abort()
  })

  ipcMain.handle(
    ipcChannels.viewGenerate,
    async (event, raw: unknown): Promise<Result<ViewSpec>> => {
      assertTrustedSender(event)
      const parsed = generateViewInputSchema.safeParse(raw)
      if (!parsed.success)
        return {
          ok: false,
          error: {
            code: 'invalid_input',
            message: 'Choose an available competition and describe the view you want.'
          }
        }
      const input = parsed.data
      const owner = event.sender
      jobs.get(owner.id)?.controller.abort()
      const controller = new AbortController()
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(90_000)])
      const job = { id: input.requestId, controller }
      jobs.set(owner.id, job)
      const abandon = (): void => controller.abort()
      owner.once('destroyed', abandon)
      try {
        const key = await accessKey(readAiKey)
        if (!key)
          return {
            ok: false,
            error: {
              code: 'missing_token',
              message: 'Add your OpenAI key in Settings to build a view.'
            }
          }
        if (signal.aborted) throw new Error('Cancelled')
        const spec = await generateView(input, key, signal, (progress) => {
          if (!signal.aborted && jobs.get(owner.id) === job && !owner.isDestroyed())
            owner.send(ipcChannels.viewProgress, progress)
        })
        if (signal.aborted || jobs.get(owner.id) !== job) throw new Error('Cancelled')
        return { ok: true, data: spec }
      } catch (error) {
        return {
          ok: false,
          error: {
            code: 'upstream',
            message: signal.aborted
              ? 'Generation stopped. Your previous view is still available.'
              : generationErrorMessage(error)
          }
        }
      } finally {
        owner.removeListener('destroyed', abandon)
        if (jobs.get(owner.id) === job) jobs.delete(owner.id)
      }
    }
  )
}

async function changeKey(write: () => Promise<void>): Promise<Result<null>> {
  cancelViewGenerations()
  try {
    await accessKey(write)
    return { ok: true, data: null }
  } catch {
    return {
      ok: false,
      error: { code: 'storage', message: 'Could not update your securely stored OpenAI key.' }
    }
  }
}

function accessKey<T>(operation: () => Promise<T>): Promise<T> {
  // Reading can re-encrypt a key. Serialize it with replacement and removal.
  const pending = keyOperation.then(operation)
  keyOperation = pending.then(
    () => undefined,
    () => undefined
  )
  return pending
}

import { app, safeStorage } from 'electron'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

function keyPath(): string {
  return join(app.getPath('userData'), 'openai-key')
}

export async function readAiKey(): Promise<string | null> {
  let encrypted: Buffer
  try {
    encrypted = await readFile(keyPath())
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
  const decrypted = await safeStorage.decryptStringAsync(encrypted)
  if (decrypted.shouldReEncrypt) await saveAiKey(decrypted.result)
  return decrypted.result
}

export async function saveAiKey(key: string): Promise<void> {
  if (!(await safeStorage.isAsyncEncryptionAvailable()))
    throw new Error('Secure storage is unavailable.')
  const encrypted = await safeStorage.encryptStringAsync(key)
  const destination = keyPath()
  await writeFile(`${destination}.tmp`, encrypted, { mode: 0o600 })
  await rename(`${destination}.tmp`, destination)
}

export async function clearAiKey(): Promise<void> {
  await rm(keyPath(), { force: true })
}

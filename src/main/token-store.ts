import { app, safeStorage } from 'electron'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const tokenFileName = 'sportmonks-token'

function tokenPath(): string {
  return join(app.getPath('userData'), tokenFileName)
}

async function writeEncryptedToken(token: string): Promise<void> {
  if (!(await safeStorage.isAsyncEncryptionAvailable())) {
    throw new Error('Secure storage is not available on this device.')
  }

  const encryptedToken = await safeStorage.encryptStringAsync(token)
  const destination = tokenPath()
  const temporary = `${destination}.tmp`

  await writeFile(temporary, encryptedToken, { mode: 0o600 })
  await rename(temporary, destination)
}

export async function hasStoredToken(): Promise<boolean> {
  try {
    await readFile(tokenPath())
    return true
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return false
    throw error
  }
}

export async function readStoredToken(): Promise<string | null> {
  let encryptedToken: Buffer

  try {
    encryptedToken = await readFile(tokenPath())
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return null
    throw error
  }

  const decrypted = await safeStorage.decryptStringAsync(encryptedToken)

  if (decrypted.shouldReEncrypt) {
    await writeEncryptedToken(decrypted.result)
  }

  return decrypted.result
}

export async function saveStoredToken(token: string): Promise<void> {
  await writeEncryptedToken(token)
}

export async function clearStoredToken(): Promise<void> {
  await rm(tokenPath(), { force: true })
}

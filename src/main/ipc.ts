import type { IpcMainInvokeEvent } from 'electron'
import { BrowserWindow, ipcMain } from 'electron'
import type { ApiErrorCode, Result } from '@shared/contracts'
import { ipcChannels } from '@shared/contracts'
import {
  fetchCompetitions,
  fetchCompetitionFixtures,
  fetchFixturesByDate,
  fetchStandingsBySeason,
  fetchTeamById,
  fetchTeamFixtures,
  SportmonksError,
  validateCompetitionFixturesInput,
  validateRefreshInput,
  validateStandingsInput,
  validateTeamFixturesInput,
  validateTeamInput,
  validateToken
} from './sportmonks'
import { clearStoredToken, hasStoredToken, readStoredToken, saveStoredToken } from './token-store'

export function registerIpcHandlers(): void {
  ipcMain.handle(ipcChannels.connectionState, async (event) => {
    assertTrustedSender(event)
    return { configured: await hasStoredToken() }
  })

  ipcMain.handle(ipcChannels.saveToken, async (event, input: unknown) => {
    assertTrustedSender(event)

    try {
      const token = validateToken((input as { token?: unknown } | undefined)?.token)
      await saveStoredToken(token)
      return success({ configured: true })
    } catch (error) {
      return failure(error, 'storage', 'Could not store the Sportmonks token.')
    }
  })

  ipcMain.handle(ipcChannels.clearToken, async (event) => {
    assertTrustedSender(event)

    try {
      await clearStoredToken()
      return success(null)
    } catch (error) {
      return failure(error, 'storage', 'Could not remove the Sportmonks token.')
    }
  })

  ipcMain.handle(ipcChannels.refreshFixtures, async (event, rawInput: unknown) => {
    assertTrustedSender(event)

    try {
      const input = validateRefreshInput(rawInput)
      const token = await readStoredToken()

      if (!token) {
        return failure(
          new SportmonksError('missing_token', 'Add your Sportmonks token in Settings.'),
          'missing_token',
          'Add your Sportmonks token in Settings.'
        )
      }

      return success(await fetchFixturesByDate(input, token))
    } catch (error) {
      return failure(error, 'upstream', 'Could not refresh fixtures.')
    }
  })

  ipcMain.handle(ipcChannels.refreshCompetitions, async (event) => {
    assertTrustedSender(event)

    try {
      const token = await readStoredToken()

      if (!token) {
        return failure(
          new SportmonksError('missing_token', 'Add your Sportmonks token in Settings.'),
          'missing_token',
          'Add your Sportmonks token in Settings.'
        )
      }

      return success(await fetchCompetitions(token))
    } catch (error) {
      return failure(error, 'upstream', 'Could not refresh competitions.')
    }
  })

  ipcMain.handle(ipcChannels.refreshStandings, async (event, rawInput: unknown) => {
    assertTrustedSender(event)

    try {
      const input = validateStandingsInput(rawInput)
      const token = await readStoredToken()

      if (!token) {
        return failure(
          new SportmonksError('missing_token', 'Add your Sportmonks token in Settings.'),
          'missing_token',
          'Add your Sportmonks token in Settings.'
        )
      }

      return success(await fetchStandingsBySeason(input, token))
    } catch (error) {
      return failure(error, 'upstream', 'Could not refresh standings.')
    }
  })

  ipcMain.handle(ipcChannels.refreshCompetitionFixtures, async (event, rawInput: unknown) => {
    assertTrustedSender(event)

    try {
      const input = validateCompetitionFixturesInput(rawInput)
      const token = await readStoredToken()

      if (!token) {
        return failure(
          new SportmonksError('missing_token', 'Add your Sportmonks token in Settings.'),
          'missing_token',
          'Add your Sportmonks token in Settings.'
        )
      }

      return success(await fetchCompetitionFixtures(input, token))
    } catch (error) {
      return failure(error, 'upstream', 'Could not refresh competition fixtures.')
    }
  })

  ipcMain.handle(ipcChannels.refreshTeam, async (event, rawInput: unknown) => {
    assertTrustedSender(event)

    try {
      const input = validateTeamInput(rawInput)
      const token = await readStoredToken()

      if (!token) {
        return failure(
          new SportmonksError('missing_token', 'Add your Sportmonks token in Settings.'),
          'missing_token',
          'Add your Sportmonks token in Settings.'
        )
      }

      return success(await fetchTeamById(input, token))
    } catch (error) {
      return failure(error, 'upstream', 'Could not refresh team.')
    }
  })

  ipcMain.handle(ipcChannels.refreshTeamFixtures, async (event, rawInput: unknown) => {
    assertTrustedSender(event)

    try {
      const input = validateTeamFixturesInput(rawInput)
      const token = await readStoredToken()

      if (!token) {
        return failure(
          new SportmonksError('missing_token', 'Add your Sportmonks token in Settings.'),
          'missing_token',
          'Add your Sportmonks token in Settings.'
        )
      }

      return success(await fetchTeamFixtures(input, token))
    } catch (error) {
      return failure(error, 'upstream', 'Could not refresh team fixtures.')
    }
  })
}

function assertTrustedSender(event: IpcMainInvokeEvent): void {
  const senderWindow = BrowserWindow.fromWebContents(event.sender)

  if (!senderWindow || event.senderFrame !== senderWindow.webContents.mainFrame) {
    throw new Error('Rejected IPC call from an untrusted sender.')
  }
}

function success<T>(data: T): Result<T> {
  return { ok: true, data }
}

function failure(
  error: unknown,
  fallbackCode: ApiErrorCode,
  fallbackMessage: string
): Result<never> {
  if (error instanceof SportmonksError) {
    return { ok: false, error: { code: error.code, message: error.message } }
  }

  return { ok: false, error: { code: fallbackCode, message: fallbackMessage } }
}

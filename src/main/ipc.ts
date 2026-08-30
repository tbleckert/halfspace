import type { IpcMainInvokeEvent } from 'electron'
import { BrowserWindow, ipcMain } from 'electron'
import type { ApiErrorCode, Result, SportmonksRateLimit } from '@shared/contracts'
import { ipcChannels } from '@shared/contracts'
import {
  fetchCompetitions,
  fetchCompetitionFixtures,
  fetchCompetitionSeasons,
  fetchEntitySearch,
  fetchFixtureById,
  fetchFixtureHeadToHead,
  fetchFixtureOdds,
  fetchFixturesByDate,
  fetchPlayerAppearances,
  fetchPlayerById,
  fetchSeasonStatistics,
  fetchStandingsBySeason,
  fetchTeamById,
  fetchTeamFixtures,
  fetchTeamSquad,
  fetchTeamStatistics,
  fetchVenueById,
  SportmonksError,
  validateCompetitionFixturesInput,
  validateCompetitionSeasonsInput,
  validateEntitySearchInput,
  validateFixtureInput,
  validateFixtureHeadToHeadInput,
  validatePlayerAppearancesInput,
  validatePlayerInput,
  validateRefreshInput,
  validateSeasonStatisticsInput,
  validateStandingsInput,
  validateTeamFixturesInput,
  validateTeamInput,
  validateTeamStatisticsInput,
  validateToken,
  validateVenueInput
} from './sportmonks'
import { clearStoredToken, hasStoredToken, readStoredToken, saveStoredToken } from './token-store'

let currentRateLimit: SportmonksRateLimit | null = null

export function registerIpcHandlers(): void {
  ipcMain.handle(ipcChannels.connectionState, async (event) => {
    assertTrustedSender(event)
    return { configured: await hasStoredToken() }
  })

  ipcMain.handle(ipcChannels.rateLimitState, (event) => {
    assertTrustedSender(event)

    if (currentRateLimit && currentRateLimit.resetsAt <= Date.now()) {
      currentRateLimit = null
    }

    return currentRateLimit
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

  ipcMain.handle(ipcChannels.refreshFixture, async (event, rawInput: unknown) => {
    assertTrustedSender(event)

    try {
      const input = validateFixtureInput(rawInput)
      const token = await readStoredToken()

      if (!token) {
        return failure(
          new SportmonksError('missing_token', 'Add your Sportmonks token in Settings.'),
          'missing_token',
          'Add your Sportmonks token in Settings.'
        )
      }

      return success(await fetchFixtureById(input, token))
    } catch (error) {
      return failure(error, 'upstream', 'Could not refresh fixture.')
    }
  })

  ipcMain.handle(ipcChannels.refreshFixtureHeadToHead, async (event, rawInput: unknown) => {
    assertTrustedSender(event)

    try {
      const input = validateFixtureHeadToHeadInput(rawInput)
      const token = await readStoredToken()

      if (!token) {
        return failure(
          new SportmonksError('missing_token', 'Add your Sportmonks token in Settings.'),
          'missing_token',
          'Add your Sportmonks token in Settings.'
        )
      }

      return success(await fetchFixtureHeadToHead(input, token))
    } catch (error) {
      return failure(error, 'upstream', 'Could not refresh previous meetings.')
    }
  })

  ipcMain.handle(ipcChannels.refreshFixtureOdds, async (event, rawInput: unknown) => {
    assertTrustedSender(event)

    try {
      const input = validateFixtureInput(rawInput)
      const token = await readStoredToken()

      if (!token) {
        return failure(
          new SportmonksError('missing_token', 'Add your Sportmonks token in Settings.'),
          'missing_token',
          'Add your Sportmonks token in Settings.'
        )
      }

      return success(await fetchFixtureOdds(input, token))
    } catch (error) {
      return failure(error, 'upstream', 'Could not refresh fixture odds.')
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

  ipcMain.handle(ipcChannels.refreshSeasonStatistics, async (event, rawInput: unknown) => {
    assertTrustedSender(event)

    try {
      const input = validateSeasonStatisticsInput(rawInput)
      const token = await readStoredToken()

      if (!token) {
        return failure(
          new SportmonksError('missing_token', 'Add your Sportmonks token in Settings.'),
          'missing_token',
          'Add your Sportmonks token in Settings.'
        )
      }

      return success(await fetchSeasonStatistics(input, token))
    } catch (error) {
      return failure(error, 'upstream', 'Could not refresh season statistics.')
    }
  })

  ipcMain.handle(ipcChannels.refreshCompetitionSeasons, async (event, rawInput: unknown) => {
    assertTrustedSender(event)

    try {
      const input = validateCompetitionSeasonsInput(rawInput)
      const token = await readStoredToken()

      if (!token) {
        return failure(
          new SportmonksError('missing_token', 'Add your Sportmonks token in Settings.'),
          'missing_token',
          'Add your Sportmonks token in Settings.'
        )
      }

      return success(await fetchCompetitionSeasons(input, token))
    } catch (error) {
      return failure(error, 'upstream', 'Could not refresh competition seasons.')
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

  ipcMain.handle(ipcChannels.refreshTeamSquad, async (event, rawInput: unknown) => {
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

      return success(await fetchTeamSquad(input, token))
    } catch (error) {
      return failure(error, 'upstream', 'Could not refresh team squad.')
    }
  })

  ipcMain.handle(ipcChannels.refreshTeamStatistics, async (event, rawInput: unknown) => {
    assertTrustedSender(event)

    try {
      const input = validateTeamStatisticsInput(rawInput)
      const token = await readStoredToken()

      if (!token) {
        return failure(
          new SportmonksError('missing_token', 'Add your Sportmonks token in Settings.'),
          'missing_token',
          'Add your Sportmonks token in Settings.'
        )
      }

      return success(await fetchTeamStatistics(input, token))
    } catch (error) {
      return failure(error, 'upstream', 'Could not refresh team statistics.')
    }
  })

  ipcMain.handle(ipcChannels.refreshVenue, async (event, rawInput: unknown) => {
    assertTrustedSender(event)

    try {
      const input = validateVenueInput(rawInput)
      const token = await readStoredToken()

      if (!token) {
        return failure(
          new SportmonksError('missing_token', 'Add your Sportmonks token in Settings.'),
          'missing_token',
          'Add your Sportmonks token in Settings.'
        )
      }

      return success(await fetchVenueById(input, token))
    } catch (error) {
      return failure(error, 'upstream', 'Could not refresh venue.')
    }
  })

  ipcMain.handle(ipcChannels.refreshPlayer, async (event, rawInput: unknown) => {
    assertTrustedSender(event)

    try {
      const input = validatePlayerInput(rawInput)
      const token = await readStoredToken()

      if (!token) {
        return failure(
          new SportmonksError('missing_token', 'Add your Sportmonks token in Settings.'),
          'missing_token',
          'Add your Sportmonks token in Settings.'
        )
      }

      return success(await fetchPlayerById(input, token))
    } catch (error) {
      return failure(error, 'upstream', 'Could not refresh player.')
    }
  })

  ipcMain.handle(ipcChannels.refreshPlayerAppearances, async (event, rawInput: unknown) => {
    assertTrustedSender(event)

    try {
      const input = validatePlayerAppearancesInput(rawInput)
      const token = await readStoredToken()

      if (!token) {
        return failure(
          new SportmonksError('missing_token', 'Add your Sportmonks token in Settings.'),
          'missing_token',
          'Add your Sportmonks token in Settings.'
        )
      }

      return success(await fetchPlayerAppearances(input, token))
    } catch (error) {
      return failure(error, 'upstream', 'Could not refresh player appearances.')
    }
  })

  ipcMain.handle(ipcChannels.searchEntities, async (event, rawInput: unknown) => {
    assertTrustedSender(event)

    try {
      const input = validateEntitySearchInput(rawInput)
      const token = await readStoredToken()

      if (!token) {
        return failure(
          new SportmonksError('missing_token', 'Add your Sportmonks token in Settings.'),
          'missing_token',
          'Add your Sportmonks token in Settings.'
        )
      }

      return success(await fetchEntitySearch(input, token))
    } catch (error) {
      return failure(error, 'upstream', 'Could not search Sportmonks.')
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
    if (error.code === 'rate_limited' && error.rateLimit) {
      publishRateLimit(error.rateLimit)
    }

    return {
      ok: false,
      error: { code: error.code, message: error.message, rateLimit: error.rateLimit }
    }
  }

  return { ok: false, error: { code: fallbackCode, message: fallbackMessage } }
}

function publishRateLimit(rateLimit: SportmonksRateLimit): void {
  currentRateLimit = rateLimit

  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(ipcChannels.rateLimitChanged, rateLimit)
  }
}

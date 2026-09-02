import type { IpcMainInvokeEvent } from 'electron'
import { BrowserWindow, ipcMain } from 'electron'
import type { ApiErrorCode, Result, SportmonksRateLimit } from '@shared/contracts'
import { ipcChannels } from '@shared/contracts'
import {
  fetchSeasonSchedule,
  validateSeasonScheduleInput,
  fetchCompetitions,
  fetchCoachById,
  fetchRefereeById,
  fetchCompetitionFixtures,
  fetchCompetitionSeasons,
  fetchEntitySearch,
  fetchFixtureById,
  fetchFixtureHeadToHead,
  fetchFixtureOdds,
  fetchFixtureCommentary,
  fetchFixturesByDate,
  fetchFixturesByDateRange,
  fetchPlayerAppearances,
  fetchPlayerById,
  fetchPlayerStatistics,
  fetchPlayerTransfers,
  fetchSeasonStatistics,
  fetchSeasonTopscorers,
  fetchStandingsBySeason,
  fetchTeamById,
  fetchTeamRivals,
  fetchTeamFixtures,
  fetchTeamSquad,
  fetchTeamStatistics,
  fetchTeamTransfers,
  fetchVenueById,
  SportmonksError,
  validateCompetitionFixturesInput,
  validateCoachInput,
  validateRefereeInput,
  validateCompetitionSeasonsInput,
  validateEntitySearchInput,
  validateFixtureInput,
  validateFixtureHeadToHeadInput,
  validateFixtureWindowInput,
  validatePlayerAppearancesInput,
  validatePlayerInput,
  validatePlayerStatisticsInput,
  validatePlayerTransfersInput,
  validateRefreshInput,
  validateSeasonStatisticsInput,
  validateSeasonTopscorersInput,
  validateStandingsInput,
  validateTeamFixturesInput,
  validateTeamInput,
  validateTeamSquadInput,
  validateTeamStatisticsInput,
  validateTeamTransfersInput,
  validateToken,
  validateVenueInput
} from './sportmonks'
import { clearStoredToken, hasStoredToken, readStoredToken, saveStoredToken } from './token-store'

const missingTokenMessage = 'Add your Sportmonks token in Settings.'

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

  registerSportmonksHandler(
    ipcChannels.refreshFixtures,
    validateRefreshInput,
    fetchFixturesByDate,
    'Could not refresh fixtures.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshFixtureWindow,
    validateFixtureWindowInput,
    fetchFixturesByDateRange,
    'Could not refresh the fixture window.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshFixture,
    validateFixtureInput,
    fetchFixtureById,
    'Could not refresh fixture.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshFixtureHeadToHead,
    validateFixtureHeadToHeadInput,
    fetchFixtureHeadToHead,
    'Could not refresh previous meetings.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshFixtureOdds,
    validateFixtureInput,
    fetchFixtureOdds,
    'Could not refresh fixture odds.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshFixtureCommentary,
    validateFixtureInput,
    fetchFixtureCommentary,
    'Could not refresh commentary.'
  )
  registerSportmonksHandlerWithoutInput(
    ipcChannels.refreshCompetitions,
    fetchCompetitions,
    'Could not refresh competitions.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshStandings,
    validateStandingsInput,
    fetchStandingsBySeason,
    'Could not refresh standings.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshSeasonStatistics,
    validateSeasonStatisticsInput,
    fetchSeasonStatistics,
    'Could not refresh season statistics.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshCompetitionSeasons,
    validateCompetitionSeasonsInput,
    fetchCompetitionSeasons,
    'Could not refresh competition seasons.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshSeasonTopscorers,
    validateSeasonTopscorersInput,
    fetchSeasonTopscorers,
    'Could not refresh player leaders.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshSeasonSchedule,
    validateSeasonScheduleInput,
    fetchSeasonSchedule,
    'Could not refresh season schedule.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshCompetitionFixtures,
    validateCompetitionFixturesInput,
    fetchCompetitionFixtures,
    'Could not refresh competition fixtures.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshTeam,
    validateTeamInput,
    fetchTeamById,
    'Could not refresh team.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshTeamRivals,
    validateTeamInput,
    fetchTeamRivals,
    'Could not refresh rivals.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshTeamFixtures,
    validateTeamFixturesInput,
    fetchTeamFixtures,
    'Could not refresh team fixtures.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshTeamSquad,
    validateTeamSquadInput,
    fetchTeamSquad,
    'Could not refresh team squad.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshTeamStatistics,
    validateTeamStatisticsInput,
    fetchTeamStatistics,
    'Could not refresh team statistics.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshTeamTransfers,
    validateTeamTransfersInput,
    fetchTeamTransfers,
    'Could not refresh team transfers.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshVenue,
    validateVenueInput,
    fetchVenueById,
    'Could not refresh venue.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshPlayer,
    validatePlayerInput,
    fetchPlayerById,
    'Could not refresh player.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshCoach,
    validateCoachInput,
    fetchCoachById,
    'Could not refresh coach.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshReferee,
    validateRefereeInput,
    fetchRefereeById,
    'Could not refresh referee.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshPlayerAppearances,
    validatePlayerAppearancesInput,
    fetchPlayerAppearances,
    'Could not refresh player appearances.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshPlayerStatistics,
    validatePlayerStatisticsInput,
    fetchPlayerStatistics,
    'Could not refresh player statistics.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshPlayerTransfers,
    validatePlayerTransfersInput,
    fetchPlayerTransfers,
    'Could not refresh player career.'
  )
  registerSportmonksHandler(
    ipcChannels.searchEntities,
    validateEntitySearchInput,
    fetchEntitySearch,
    'Could not search Sportmonks.'
  )
}

function registerSportmonksHandler<TInput, TData>(
  channel: string,
  validate: (value: unknown) => TInput,
  request: (input: TInput, token: string) => Promise<TData>,
  fallbackMessage: string
): void {
  ipcMain.handle(channel, async (event, rawInput: unknown) => {
    assertTrustedSender(event)

    try {
      const input = validate(rawInput)
      return success(await withStoredToken((token) => request(input, token)))
    } catch (error) {
      return failure(error, 'upstream', fallbackMessage)
    }
  })
}

function registerSportmonksHandlerWithoutInput<TData>(
  channel: string,
  request: (token: string) => Promise<TData>,
  fallbackMessage: string
): void {
  ipcMain.handle(channel, async (event) => {
    assertTrustedSender(event)

    try {
      return success(await withStoredToken(request))
    } catch (error) {
      return failure(error, 'upstream', fallbackMessage)
    }
  })
}

async function withStoredToken<T>(request: (token: string) => Promise<T>): Promise<T> {
  const token = await readStoredToken()
  if (!token) throw new SportmonksError('missing_token', missingTokenMessage)

  return request(token)
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

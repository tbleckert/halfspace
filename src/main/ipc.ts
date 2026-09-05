import type { IpcMainInvokeEvent } from 'electron'
import {
  fetchSeasonReferees,
  fetchSeasonVenues,
  fetchStandingCorrections
} from './season-resources'
import { fetchTransferRumours, validateTransferRumoursInput } from './transfer-rumours'
import { fetchTeamSchedule, validateTeamScheduleInput } from './sportmonks'
import { BrowserWindow, ipcMain } from 'electron'
import type { ApiErrorCode, Result, SportmonksRateLimit } from '@shared/contracts'
import { ipcChannels } from '@shared/contracts'
import { fetchSeasonBracket } from './season-bracket'
import {
  fetchStatisticSeasons,
  validateStatisticSeasonsInput,
  fetchSeasonSchedule,
  validateSeasonScheduleInput,
  fetchCompetitions,
  fetchCompetitionById,
  fetchSeasonTeams,
  fetchTeamCompetitions,
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
  fetchLiveFixtures,
  fetchPlayerAppearances,
  fetchPlayerById,
  fetchPlayerStatistics,
  fetchPlayerTransfers,
  fetchSeasonStatistics,
  fetchSeasonTopscorers,
  fetchStandingsBySeason,
  fetchStandingsByRound,
  fetchLiveStandings,
  validateLiveStandingsInput,
  fetchTransferFeed,
  validateTransferFeedInput,
  validateRoundStandingsInput,
  fetchTeamById,
  fetchTeamRivals,
  fetchTeamFixtures,
  fetchTeamSquad,
  fetchTeamStatistics,
  fetchTeamTransfers,
  fetchVenueById,
  validateCompetitionFixturesInput,
  validateCoachInput,
  validateRefereeInput,
  validateCompetitionSeasonsInput,
  validateEntitySearchInput,
  validateFixtureInput,
  validateFixtureOddsInput,
  validateFixtureHeadToHeadInput,
  validateFixtureWindowInput,
  validateLiveFixturesInput,
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
import { clearSportmonksRateLimits, SportmonksError } from './sportmonks-client'
import { clearStoredToken, hasStoredToken, readStoredToken, saveStoredToken } from './token-store'
import { fetchSubscription } from './subscription'
import { fetchFixtureTv } from './fixture-tv'
import { fetchPredictedLineups } from './predicted-lineups'
import { fetchNews, validateNewsInput } from './news'
import { fetchMatchFacts } from './match-facts'
import { fetchHonours, validateHonoursInput } from './honours'
import { fetchFixtureTrends } from './fixture-trends'
import {
  fetchBroadcaster,
  fetchBroadcastSchedule,
  validateBroadcasterInput,
  validateBroadcastScheduleInput
} from './broadcasts'
import { fetchFixturePressure } from './fixture-pressure'
import { fetchTeamOfWeek, validateTeamOfWeekInput } from './team-of-week'

const missingTokenMessage = 'Add your Sportmonks token in Settings.'

let currentRateLimit: SportmonksRateLimit | null = null
let credentialGeneration = 0

export function registerIpcHandlers(): void {
  registerSportmonksHandler(
    ipcChannels.refreshTeamSchedule,
    validateTeamScheduleInput,
    fetchTeamSchedule,
    'Could not refresh team schedule.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshSeasonReferees,
    validateStandingsInput,
    fetchSeasonReferees,
    'Could not refresh season referees.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshSeasonVenues,
    validateStandingsInput,
    fetchSeasonVenues,
    'Could not refresh season venues.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshStandingCorrections,
    validateStandingsInput,
    fetchStandingCorrections,
    'Could not refresh standings adjustments.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshTransferRumours,
    validateTransferRumoursInput,
    fetchTransferRumours,
    'Could not refresh transfer rumours.'
  )

  registerSportmonksHandler(
    ipcChannels.refreshLiveStandings,
    validateLiveStandingsInput,
    fetchLiveStandings,
    'Could not refresh live standings.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshFixtureTrends,
    validateFixtureInput,
    fetchFixtureTrends,
    'Could not refresh match trends.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshBroadcaster,
    validateBroadcasterInput,
    fetchBroadcaster,
    'Could not refresh broadcaster.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshBroadcastSchedule,
    validateBroadcastScheduleInput,
    fetchBroadcastSchedule,
    'Could not refresh broadcast schedule.'
  )

  registerSportmonksHandler(
    ipcChannels.refreshHonours,
    validateHonoursInput,
    fetchHonours,
    'Could not refresh honours.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshNews,
    validateNewsInput,
    fetchNews,
    'Could not refresh news.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshMatchFacts,
    validateFixtureInput,
    fetchMatchFacts,
    'Could not refresh match facts.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshPredictedLineups,
    validateFixtureInput,
    fetchPredictedLineups,
    'Could not refresh predicted lineups.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshSeasonBracket,
    validateSeasonScheduleInput,
    fetchSeasonBracket,
    'Could not refresh knockout progression.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshStatisticSeasons,
    validateStatisticSeasonsInput,
    fetchStatisticSeasons,
    'Could not refresh available seasons.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshTransferFeed,
    validateTransferFeedInput,
    fetchTransferFeed,
    'Could not refresh transfers.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshRoundStandings,
    validateRoundStandingsInput,
    fetchStandingsByRound,
    'Could not refresh round standings.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshFixturePressure,
    validateFixtureInput,
    fetchFixturePressure,
    'Could not refresh pressure.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshTeamOfWeek,
    validateTeamOfWeekInput,
    fetchTeamOfWeek,
    'Could not refresh Team of the Week.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshFixtureTv,
    validateFixtureInput,
    fetchFixtureTv,
    'Could not refresh TV listings.'
  )
  registerSportmonksHandlerWithoutInput(
    ipcChannels.refreshSubscription,
    fetchSubscription,
    'Could not refresh subscription access.'
  )
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
      resetRateLimits()
      return success({ configured: true })
    } catch (error) {
      return failure(error, 'storage', 'Could not store the Sportmonks token.')
    }
  })

  ipcMain.handle(ipcChannels.clearToken, async (event) => {
    assertTrustedSender(event)

    try {
      await clearStoredToken()
      resetRateLimits()
      return success(null)
    } catch (error) {
      return failure(error, 'storage', 'Could not remove the Sportmonks token.')
    }
  })

  registerSportmonksHandler(
    ipcChannels.refreshLiveFixtures,
    validateLiveFixturesInput,
    fetchLiveFixtures,
    'Could not refresh live fixtures.'
  )
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
    validateFixtureOddsInput,
    fetchFixtureOdds,
    'Could not refresh fixture odds.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshFixtureCommentary,
    validateFixtureInput,
    fetchFixtureCommentary,
    'Could not refresh commentary.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshCompetition,
    validateCompetitionSeasonsInput,
    fetchCompetitionById,
    'Could not refresh competition.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshSeasonTeams,
    validateStandingsInput,
    fetchSeasonTeams,
    'Could not refresh season teams.'
  )
  registerSportmonksHandler(
    ipcChannels.refreshTeamCompetitions,
    validateTeamInput,
    fetchTeamCompetitions,
    'Could not refresh current competitions.'
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
  const requestGeneration = credentialGeneration
  const token = await readStoredToken()
  if (!token) throw new SportmonksError('missing_token', missingTokenMessage)

  try {
    return await request(token)
  } catch (error) {
    if (
      requestGeneration === credentialGeneration &&
      error instanceof SportmonksError &&
      error.code === 'rate_limited' &&
      error.rateLimit
    ) {
      publishRateLimit(error.rateLimit)
    }
    throw error
  }
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
    return {
      ok: false,
      error: { code: error.code, message: error.message, rateLimit: error.rateLimit }
    }
  }

  return { ok: false, error: { code: fallbackCode, message: fallbackMessage } }
}

function resetRateLimits(): void {
  credentialGeneration += 1
  clearSportmonksRateLimits()
  publishRateLimit(null)
}

function publishRateLimit(rateLimit: SportmonksRateLimit | null): void {
  currentRateLimit = rateLimit

  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(ipcChannels.rateLimitChanged, rateLimit)
  }
}

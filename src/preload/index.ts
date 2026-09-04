import { contextBridge, ipcRenderer } from 'electron'
import type { HalfspaceApi, SportmonksRateLimit } from '@shared/contracts'
import { ipcChannels } from '@shared/contracts'

const halfspaceApi: HalfspaceApi = {
  credentials: {
    getConnectionState: () => ipcRenderer.invoke(ipcChannels.connectionState),
    saveToken: (input) => ipcRenderer.invoke(ipcChannels.saveToken, input),
    clearToken: () => ipcRenderer.invoke(ipcChannels.clearToken)
  },
  sportmonks: {
    refreshLiveStandings: (input) => ipcRenderer.invoke(ipcChannels.refreshLiveStandings, input),
    refreshFixtureTrends: (input) => ipcRenderer.invoke(ipcChannels.refreshFixtureTrends, input),
    refreshBroadcaster: (input) => ipcRenderer.invoke(ipcChannels.refreshBroadcaster, input),
    refreshBroadcastSchedule: (input) =>
      ipcRenderer.invoke(ipcChannels.refreshBroadcastSchedule, input),
    refreshHonours: (input) => ipcRenderer.invoke(ipcChannels.refreshHonours, input),
    refreshNews: (input) => ipcRenderer.invoke(ipcChannels.refreshNews, input),
    refreshMatchFacts: (input) => ipcRenderer.invoke(ipcChannels.refreshMatchFacts, input),
    refreshPredictedLineups: (input) =>
      ipcRenderer.invoke(ipcChannels.refreshPredictedLineups, input),
    refreshSeasonBracket: (input) => ipcRenderer.invoke(ipcChannels.refreshSeasonBracket, input),
    refreshStatisticSeasons: (input) =>
      ipcRenderer.invoke(ipcChannels.refreshStatisticSeasons, input),
    refreshSubscription: () => ipcRenderer.invoke(ipcChannels.refreshSubscription),
    refreshFixtureTv: (input) => ipcRenderer.invoke(ipcChannels.refreshFixtureTv, input),
    refreshFixturePressure: (input) =>
      ipcRenderer.invoke(ipcChannels.refreshFixturePressure, input),
    refreshTeamOfWeek: (input) => ipcRenderer.invoke(ipcChannels.refreshTeamOfWeek, input),
    refreshTeamRivals: (input) => ipcRenderer.invoke(ipcChannels.refreshTeamRivals, input),
    refreshFixtureCommentary: (input) =>
      ipcRenderer.invoke(ipcChannels.refreshFixtureCommentary, input),
    refreshSeasonSchedule: (input) => ipcRenderer.invoke(ipcChannels.refreshSeasonSchedule, input),
    refreshLiveFixtures: (input) => ipcRenderer.invoke(ipcChannels.refreshLiveFixtures, input),
    refreshFixtures: (input) => ipcRenderer.invoke(ipcChannels.refreshFixtures, input),
    refreshFixtureWindow: (input) => ipcRenderer.invoke(ipcChannels.refreshFixtureWindow, input),
    refreshFixture: (input) => ipcRenderer.invoke(ipcChannels.refreshFixture, input),
    refreshFixtureHeadToHead: (input) =>
      ipcRenderer.invoke(ipcChannels.refreshFixtureHeadToHead, input),
    refreshFixtureOdds: (input) => ipcRenderer.invoke(ipcChannels.refreshFixtureOdds, input),
    refreshCompetition: (input) => ipcRenderer.invoke(ipcChannels.refreshCompetition, input),
    refreshSeasonTeams: (input) => ipcRenderer.invoke(ipcChannels.refreshSeasonTeams, input),
    refreshTeamCompetitions: (input) =>
      ipcRenderer.invoke(ipcChannels.refreshTeamCompetitions, input),
    refreshCompetitions: () => ipcRenderer.invoke(ipcChannels.refreshCompetitions),
    refreshCompetitionSeasons: (input) =>
      ipcRenderer.invoke(ipcChannels.refreshCompetitionSeasons, input),
    refreshStandings: (input) => ipcRenderer.invoke(ipcChannels.refreshStandings, input),
    refreshRoundStandings: (input) => ipcRenderer.invoke(ipcChannels.refreshRoundStandings, input),
    refreshSeasonStatistics: (input) =>
      ipcRenderer.invoke(ipcChannels.refreshSeasonStatistics, input),
    refreshSeasonTopscorers: (input) =>
      ipcRenderer.invoke(ipcChannels.refreshSeasonTopscorers, input),
    refreshCompetitionFixtures: (input) =>
      ipcRenderer.invoke(ipcChannels.refreshCompetitionFixtures, input),
    refreshTeam: (input) => ipcRenderer.invoke(ipcChannels.refreshTeam, input),
    refreshTeamFixtures: (input) => ipcRenderer.invoke(ipcChannels.refreshTeamFixtures, input),
    refreshTeamSquad: (input) => ipcRenderer.invoke(ipcChannels.refreshTeamSquad, input),
    refreshTeamStatistics: (input) => ipcRenderer.invoke(ipcChannels.refreshTeamStatistics, input),
    refreshTeamTransfers: (input) => ipcRenderer.invoke(ipcChannels.refreshTeamTransfers, input),
    refreshTransferFeed: (input) => ipcRenderer.invoke(ipcChannels.refreshTransferFeed, input),
    refreshVenue: (input) => ipcRenderer.invoke(ipcChannels.refreshVenue, input),
    refreshPlayer: (input) => ipcRenderer.invoke(ipcChannels.refreshPlayer, input),
    refreshCoach: (input) => ipcRenderer.invoke(ipcChannels.refreshCoach, input),
    refreshReferee: (input) => ipcRenderer.invoke(ipcChannels.refreshReferee, input),
    refreshPlayerAppearances: (input) =>
      ipcRenderer.invoke(ipcChannels.refreshPlayerAppearances, input),
    refreshPlayerStatistics: (input) =>
      ipcRenderer.invoke(ipcChannels.refreshPlayerStatistics, input),
    refreshPlayerTransfers: (input) =>
      ipcRenderer.invoke(ipcChannels.refreshPlayerTransfers, input),
    getRateLimit: () => ipcRenderer.invoke(ipcChannels.rateLimitState),
    onRateLimitChange: (listener) => {
      const handleRateLimitChange = (
        _event: Electron.IpcRendererEvent,
        rateLimit: unknown
      ): void => {
        listener(rateLimit as SportmonksRateLimit)
      }

      ipcRenderer.on(ipcChannels.rateLimitChanged, handleRateLimitChange)

      return () => ipcRenderer.removeListener(ipcChannels.rateLimitChanged, handleRateLimitChange)
    },
    searchEntities: (input) => ipcRenderer.invoke(ipcChannels.searchEntities, input)
  }
}

contextBridge.exposeInMainWorld('halfspace', halfspaceApi)

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
    refreshFixtures: (input) => ipcRenderer.invoke(ipcChannels.refreshFixtures, input),
    refreshFixture: (input) => ipcRenderer.invoke(ipcChannels.refreshFixture, input),
    refreshFixtureHeadToHead: (input) =>
      ipcRenderer.invoke(ipcChannels.refreshFixtureHeadToHead, input),
    refreshFixtureOdds: (input) => ipcRenderer.invoke(ipcChannels.refreshFixtureOdds, input),
    refreshCompetitions: () => ipcRenderer.invoke(ipcChannels.refreshCompetitions),
    refreshCompetitionSeasons: (input) =>
      ipcRenderer.invoke(ipcChannels.refreshCompetitionSeasons, input),
    refreshStandings: (input) => ipcRenderer.invoke(ipcChannels.refreshStandings, input),
    refreshSeasonStatistics: (input) =>
      ipcRenderer.invoke(ipcChannels.refreshSeasonStatistics, input),
    refreshCompetitionFixtures: (input) =>
      ipcRenderer.invoke(ipcChannels.refreshCompetitionFixtures, input),
    refreshTeam: (input) => ipcRenderer.invoke(ipcChannels.refreshTeam, input),
    refreshTeamFixtures: (input) => ipcRenderer.invoke(ipcChannels.refreshTeamFixtures, input),
    refreshTeamSquad: (input) => ipcRenderer.invoke(ipcChannels.refreshTeamSquad, input),
    refreshTeamStatistics: (input) => ipcRenderer.invoke(ipcChannels.refreshTeamStatistics, input),
    refreshTeamTransfers: (input) => ipcRenderer.invoke(ipcChannels.refreshTeamTransfers, input),
    refreshVenue: (input) => ipcRenderer.invoke(ipcChannels.refreshVenue, input),
    refreshPlayer: (input) => ipcRenderer.invoke(ipcChannels.refreshPlayer, input),
    refreshCoach: (input) => ipcRenderer.invoke(ipcChannels.refreshCoach, input),
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

import { contextBridge, ipcRenderer } from 'electron'
import type { HalfspaceApi } from '@shared/contracts'
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
    refreshFixtureOdds: (input) => ipcRenderer.invoke(ipcChannels.refreshFixtureOdds, input),
    refreshCompetitions: () => ipcRenderer.invoke(ipcChannels.refreshCompetitions),
    refreshCompetitionSeasons: (input) =>
      ipcRenderer.invoke(ipcChannels.refreshCompetitionSeasons, input),
    refreshStandings: (input) => ipcRenderer.invoke(ipcChannels.refreshStandings, input),
    refreshCompetitionFixtures: (input) =>
      ipcRenderer.invoke(ipcChannels.refreshCompetitionFixtures, input),
    refreshTeam: (input) => ipcRenderer.invoke(ipcChannels.refreshTeam, input),
    refreshTeamFixtures: (input) => ipcRenderer.invoke(ipcChannels.refreshTeamFixtures, input),
    refreshTeamSquad: (input) => ipcRenderer.invoke(ipcChannels.refreshTeamSquad, input),
    refreshVenue: (input) => ipcRenderer.invoke(ipcChannels.refreshVenue, input),
    refreshPlayer: (input) => ipcRenderer.invoke(ipcChannels.refreshPlayer, input),
    refreshPlayerAppearances: (input) =>
      ipcRenderer.invoke(ipcChannels.refreshPlayerAppearances, input),
    searchEntities: (input) => ipcRenderer.invoke(ipcChannels.searchEntities, input)
  }
}

contextBridge.exposeInMainWorld('halfspace', halfspaceApi)

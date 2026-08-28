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
    refreshCompetitions: () => ipcRenderer.invoke(ipcChannels.refreshCompetitions),
    refreshStandings: (input) => ipcRenderer.invoke(ipcChannels.refreshStandings, input),
    refreshCompetitionFixtures: (input) =>
      ipcRenderer.invoke(ipcChannels.refreshCompetitionFixtures, input),
    refreshTeam: (input) => ipcRenderer.invoke(ipcChannels.refreshTeam, input),
    refreshTeamFixtures: (input) => ipcRenderer.invoke(ipcChannels.refreshTeamFixtures, input),
    refreshVenue: (input) => ipcRenderer.invoke(ipcChannels.refreshVenue, input)
  }
}

contextBridge.exposeInMainWorld('halfspace', halfspaceApi)

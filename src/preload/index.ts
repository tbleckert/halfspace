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
    refreshFixtures: (input) => ipcRenderer.invoke(ipcChannels.refreshFixtures, input)
  }
}

contextBridge.exposeInMainWorld('halfspace', halfspaceApi)

import { BrowserWindow, type IpcMainInvokeEvent } from 'electron'

export function assertTrustedSender(event: IpcMainInvokeEvent): void {
  const window = BrowserWindow.fromWebContents(event.sender)
  if (!window || event.senderFrame !== window.webContents.mainFrame) {
    throw new Error('Rejected IPC call from an untrusted sender.')
  }
}

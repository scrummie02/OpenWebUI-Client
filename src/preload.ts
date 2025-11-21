import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script used by the renderer process. It exposes a limited set of
 * APIs to the renderer via the `window.api` object. IPC channels can be
 * added here as needed.
 */
contextBridge.exposeInMainWorld('api', {
  sendMessage: (channel: string, data: any) => {
    ipcRenderer.send(channel, data);
  },
  onReceive: (channel: string, listener: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => listener(...args));
  }
});

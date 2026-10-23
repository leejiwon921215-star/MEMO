const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("memoDesktop", {
  getAlwaysOnTop: () => ipcRenderer.invoke("memo:get-always-on-top"),
  setAlwaysOnTop: (enabled) =>
    ipcRenderer.invoke("memo:set-always-on-top", enabled),
  getWindowSettings: () => ipcRenderer.invoke("memo:get-window-settings"),
  setSizeLocked: (enabled) =>
    ipcRenderer.invoke("memo:set-size-locked", enabled),
  resizeWindow: (width, height) =>
    ipcRenderer.invoke("memo:resize-window", width, height),
  copyText: (text) => ipcRenderer.invoke("memo:copy-text", text),
  read: () => ipcRenderer.invoke("memo:read"),
  save: (data) => ipcRenderer.invoke("memo:save", data),
  chooseFolder: () => ipcRenderer.invoke("memo:choose-folder"),
  openFolder: (folder) => ipcRenderer.invoke("memo:open-folder", folder),
});

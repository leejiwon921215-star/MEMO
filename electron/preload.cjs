const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("memoDesktop", {
  getAlwaysOnTop: () => ipcRenderer.invoke("memo:get-always-on-top"),
  setAlwaysOnTop: (enabled) =>
    ipcRenderer.invoke("memo:set-always-on-top", enabled),
  read: () => ipcRenderer.invoke("memo:read"),
  save: (data) => ipcRenderer.invoke("memo:save", data),
  chooseFolder: () => ipcRenderer.invoke("memo:choose-folder"),
  openFolder: (folder) => ipcRenderer.invoke("memo:open-folder", folder),
});

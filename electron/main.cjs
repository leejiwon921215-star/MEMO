const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  Menu,
} = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { validateFolder } = require("./folders.cjs");
let mainWindow;
const entry = path.join(__dirname, "../dist/index.html");
const entryURL = pathToFileURL(entry).href;
function trusted(event) {
  if (
    !mainWindow ||
    event.sender.id !== mainWindow.webContents.id ||
    event.senderFrame?.url !== entryURL
  )
    throw new Error("허용되지 않은 요청입니다.");
}
function validData(data) {
  if (
    data?.version !== 1 ||
    !Array.isArray(data.notes) ||
    data.notes.length > 10000 ||
    (data.selectedId !== null && typeof data.selectedId !== "string")
  )
    return false;
  const ids = new Set();
  return data.notes.every((note) => {
    if (!note || typeof note.id !== "string" || ids.has(note.id)) return false;
    ids.add(note.id);
    return (
      typeof note.title === "string" &&
      /^#[0-9a-f]{6}$/i.test(note.background) &&
      typeof note.favorite === "boolean" &&
      typeof note.updatedAt === "string" &&
      Number.isFinite(Date.parse(note.updatedAt)) &&
      Array.isArray(note.sections) &&
      note.sections.every((section) => {
        if (!section || typeof section.id !== "string" || ids.has(section.id))
          return false;
        ids.add(section.id);
        return (
          typeof section.title === "string" &&
          typeof section.content === "string"
        );
      })
    );
  });
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 640,
    title: "MEMO",
    backgroundColor: "#f6f5f1",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url !== entryURL) event.preventDefault();
  });
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) =>
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
          ],
        },
      }),
  );
  try {
    const preferences = JSON.parse(
      fs.readFileSync(
        path.join(app.getPath("userData"), "preferences.json"),
        "utf8",
      ),
    );
    mainWindow.setAlwaysOnTop(preferences.alwaysOnTop === true);
  } catch {
    /* A first launch has no saved window preference. */
  }
  mainWindow.webContents.on("will-prevent-unload", (event) => {
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: "warning",
      title: "아직 저장되지 않은 메모가 있어요",
      message: "저장되지 않은 변경사항이 있습니다. 앱을 종료할까요?",
      detail: "저장 오류가 있다면 메모 백업 파일을 먼저 내려받아 주세요.",
      buttons: ["메모로 돌아가기", "저장하지 않고 종료"],
      defaultId: 0,
      cancelId: 0,
    });
    if (choice === 1) event.preventDefault();
  });
  mainWindow.loadFile(entry);
}
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    const dataFile = path.join(app.getPath("userData"), "memos.json");
    ipcMain.handle("memo:read", (event) => {
      trusted(event);
      if (!fs.existsSync(dataFile)) return null;
      return JSON.parse(fs.readFileSync(dataFile, "utf8"));
    });
    ipcMain.handle("memo:save", (event, data) => {
      trusted(event);
      try {
        if (!validData(data))
          return { ok: false, error: "메모 데이터 형식이 올바르지 않습니다." };
        const json = JSON.stringify(data);
        if (Buffer.byteLength(json) > 50 * 1024 * 1024)
          return {
            ok: false,
            error:
              "메모 크기가 저장 한도(50MB)를 넘었습니다. 백업 후 메모를 정리해 주세요.",
          };
        fs.mkdirSync(path.dirname(dataFile), { recursive: true });
        const temp = `${dataFile}.tmp`;
        fs.writeFileSync(temp, json, "utf8");
        fs.renameSync(temp, dataFile);
        return { ok: true };
      } catch {
        return {
          ok: false,
          error:
            "메모를 저장하지 못했습니다. 저장 공간과 폴더 권한을 확인해 주세요.",
        };
      }
    });
    ipcMain.handle("memo:choose-folder", async (event) => {
      trusted(event);
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "메모에 연결할 폴더 선택",
        properties: ["openDirectory"],
      });
      return result.canceled ? null : result.filePaths[0];
    });
    ipcMain.handle("memo:open-folder", async (event, folder) => {
      trusted(event);
      const error = await validateFolder(folder);
      if (error) return { ok: false, error };
      try {
        const message = await shell.openPath(folder);
        return message
          ? {
              ok: false,
              error:
                "탐색기에서 폴더를 열지 못했습니다. 경로와 접근 권한을 확인해 주세요.",
            }
          : { ok: true };
      } catch {
        return {
          ok: false,
          error: "폴더를 열지 못했습니다. 다시 시도해 주세요.",
        };
      }
    });
    ipcMain.handle("memo:get-always-on-top", (event) => {
      trusted(event);
      return mainWindow.isAlwaysOnTop();
    });
    ipcMain.handle("memo:set-always-on-top", (event, enabled) => {
      trusted(event);
      if (typeof enabled !== "boolean")
        return { ok: false, error: "잘못된 창 설정입니다." };
      try {
        const preferences = path.join(
          app.getPath("userData"),
          "preferences.json",
        );
        fs.mkdirSync(path.dirname(preferences), { recursive: true });
        fs.writeFileSync(
          preferences + ".tmp",
          JSON.stringify({ alwaysOnTop: enabled }),
          "utf8",
        );
        fs.renameSync(preferences + ".tmp", preferences);
        mainWindow.setAlwaysOnTop(enabled);
        return { ok: true };
      } catch {
        return { ok: false, error: "창 고정 설정을 저장하지 못했습니다." };
      }
    });
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

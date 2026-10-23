const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  Menu,
  screen,
  clipboard,
} = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { validateFolder } = require("./folders.cjs");
const { validData } = require("./data.cjs");
let mainWindow;
let preferences = {};
let resizeTimer;
const entry = path.join(__dirname, "../dist/index.html");
const entryURL = pathToFileURL(entry).href;
const preferenceFile = () =>
  path.join(app.getPath("userData"), "preferences.json");
function savePreferences(patch) {
  const next = { ...preferences, ...patch };
  fs.mkdirSync(path.dirname(preferenceFile()), { recursive: true });
  fs.writeFileSync(preferenceFile() + ".tmp", JSON.stringify(next), "utf8");
  fs.renameSync(preferenceFile() + ".tmp", preferenceFile());
  preferences = next;
}
function trusted(event) {
  if (
    !mainWindow ||
    event.sender.id !== mainWindow.webContents.id ||
    event.senderFrame?.url !== entryURL
  )
    throw new Error("허용되지 않은 요청입니다.");
}
function windowSettings() {
  const { width, height } = mainWindow.getBounds();
  return {
    alwaysOnTop: mainWindow.isAlwaysOnTop(),
    sizeLocked: !mainWindow.isResizable(),
    width,
    height,
  };
}
function rememberBounds() {
  if (
    !mainWindow ||
    mainWindow.isDestroyed() ||
    mainWindow.isMaximized() ||
    mainWindow.isMinimized()
  )
    return;
  savePreferences({ bounds: mainWindow.getBounds() });
}
function displayArea(bounds) {
  const area = (
    bounds ? screen.getDisplayMatching(bounds) : screen.getPrimaryDisplay()
  ).workArea;
  // A disconnected or headless display may report a 1px work area.
  return area.width >= 320 && area.height >= 360
    ? area
    : { x: area.x || 0, y: area.y || 0, width: 1920, height: 1080 };
}
function createWindow() {
  const saved = preferences.bounds;
  const validBounds =
    saved &&
    ["width", "height", "x", "y"].every((key) => Number.isFinite(saved[key]));
  const area = displayArea(validBounds ? saved : undefined);
  const width = Math.min(
    Math.max(validBounds ? saved.width : 520, 320),
    area.width,
  );
  const height = Math.min(
    Math.max(validBounds ? saved.height : 760, 360),
    area.height,
  );
  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 320,
    minHeight: 360,
    ...(validBounds
      ? {
          x: Math.min(Math.max(saved.x, area.x), area.x + area.width - width),
          y: Math.min(Math.max(saved.y, area.y), area.y + area.height - height),
        }
      : {}),
    resizable: preferences.sizeLocked !== true,
    maximizable: preferences.sizeLocked !== true,
    title: "MEMO",
    backgroundColor: "#ffffff",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  mainWindow.setAlwaysOnTop(preferences.alwaysOnTop === true);
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
  const scheduleBounds = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      try {
        rememberBounds();
      } catch {
        /* A failed write is reported by explicit window settings. */
      }
    }, 200);
  };
  mainWindow.on("resize", scheduleBounds);
  mainWindow.on("move", scheduleBounds);
  mainWindow.on("close", () => {
    clearTimeout(resizeTimer);
    try {
      rememberBounds();
    } catch {}
  });
  mainWindow.on("closed", () => {
    clearTimeout(resizeTimer);
    mainWindow = null;
  });
  mainWindow.webContents.on("will-prevent-unload", (event) => {
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: "warning",
      title: "저장 확인",
      message: "저장되지 않은 변경사항이 있습니다. 종료할까요?",
      detail: "저장 오류가 있다면 메모 백업 파일을 먼저 내려받아 주세요.",
      buttons: ["메모로 돌아가기", "저장하지 않고 종료"],
      defaultId: 0,
      cancelId: 0,
    });
    if (choice === 1) event.preventDefault();
  });
  mainWindow.loadFile(entry);
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    try {
      const saved = JSON.parse(fs.readFileSync(preferenceFile(), "utf8"));
      if (saved && typeof saved === "object" && !Array.isArray(saved))
        preferences = saved;
    } catch {}
    const dataFile = path.join(app.getPath("userData"), "memos.json");
    ipcMain.handle("memo:read", (event) => {
      trusted(event);
      return fs.existsSync(dataFile)
        ? JSON.parse(fs.readFileSync(dataFile, "utf8"))
        : null;
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
              "저장 한도(50MB)를 넘었습니다. 백업 후 메모를 정리해 주세요.",
          };
        fs.mkdirSync(path.dirname(dataFile), { recursive: true });
        fs.writeFileSync(dataFile + ".tmp", json, "utf8");
        fs.renameSync(dataFile + ".tmp", dataFile);
        return { ok: true };
      } catch {
        return {
          ok: false,
          error: "저장하지 못했습니다. 저장 공간과 폴더 권한을 확인해 주세요.",
        };
      }
    });
    ipcMain.handle("memo:choose-folder", async (event) => {
      trusted(event);
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "연결할 폴더 선택",
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
                "폴더를 열지 못했습니다. 경로와 접근 권한을 확인해 주세요.",
            }
          : { ok: true };
      } catch {
        return { ok: false, error: "폴더를 열지 못했습니다." };
      }
    });
    ipcMain.handle("memo:copy-text", (event, text) => {
      trusted(event);
      if (
        typeof text !== "string" ||
        Buffer.byteLength(text) > 10 * 1024 * 1024
      )
        return {
          ok: false,
          error: "복사할 내용이 너무 크거나 올바르지 않습니다.",
        };
      try {
        clipboard.writeText(text);
        return { ok: true };
      } catch {
        return { ok: false, error: "클립보드에 복사하지 못했습니다." };
      }
    });
    ipcMain.handle("memo:get-always-on-top", (event) => {
      trusted(event);
      return mainWindow.isAlwaysOnTop();
    });
    ipcMain.handle("memo:get-window-settings", (event) => {
      trusted(event);
      return windowSettings();
    });
    ipcMain.handle("memo:set-always-on-top", (event, enabled) => {
      trusted(event);
      if (typeof enabled !== "boolean")
        return { ok: false, error: "잘못된 창 설정입니다." };
      try {
        savePreferences({ alwaysOnTop: enabled });
        mainWindow.setAlwaysOnTop(enabled);
        return { ok: true };
      } catch {
        return { ok: false, error: "창 고정 설정을 저장하지 못했습니다." };
      }
    });
    ipcMain.handle("memo:set-size-locked", (event, enabled) => {
      trusted(event);
      if (typeof enabled !== "boolean")
        return { ok: false, error: "잘못된 크기 설정입니다." };
      try {
        savePreferences({
          sizeLocked: enabled,
          bounds: mainWindow.getBounds(),
        });
        mainWindow.setResizable(!enabled);
        mainWindow.setMaximizable(!enabled);
        return { ok: true };
      } catch {
        return { ok: false, error: "크기 고정 설정을 저장하지 못했습니다." };
      }
    });
    ipcMain.handle("memo:resize-window", (event, width, height) => {
      trusted(event);
      if (
        !Number.isInteger(width) ||
        !Number.isInteger(height) ||
        width < 320 ||
        height < 360 ||
        width > 16384 ||
        height > 16384
      )
        return {
          ok: false,
          error: "가로 320px, 세로 360px 이상의 크기를 입력해 주세요.",
        };
      if (!mainWindow.isResizable())
        return { ok: false, error: "크기 고정을 먼저 해제해 주세요." };
      try {
        const area = displayArea(mainWindow.getBounds());
        if (width > area.width || height > area.height)
          return {
            ok: false,
            error: `현재 화면에서 최대 ${area.width} × ${area.height}px까지 설정할 수 있습니다.`,
          };
        if (mainWindow.isMaximized()) mainWindow.unmaximize();
        mainWindow.setSize(width, height);
        rememberBounds();
        return { ok: true };
      } catch {
        return { ok: false, error: "창 크기를 변경하지 못했습니다." };
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

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { _electron: electron } = require("playwright");
const { validateFolder } = require("../electron/folders.cjs");

test("folder validation rejects URLs, relative paths, files and missing folders", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "memo-folder-check-"));
  try {
    const file = path.join(dir, "file.txt");
    await fs.writeFile(file, "test");
    assert.equal(await validateFolder(dir), null);
    for (const candidate of [
      "https://example.com",
      "file:///tmp",
      "relative/folder",
      path.join(dir, "missing"),
      file,
      "",
      null,
      "C:\\bad\0path",
    ])
      assert.equal(typeof (await validateFolder(candidate)), "string");
    assert.match(await validateFolder("C:relative", "win32"), /전체/);
    assert.match(await validateFolder("https://example.com", "win32"), /전체/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test(
  "real Electron bridge saves, restores and opens validated folders",
  { timeout: 60000 },
  async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "memo-electron-"));
    const userData = path.join(dir, "profile");
    await fs.mkdir(userData);
    const bootstrap = path.join(dir, "bootstrap.cjs");
    await fs.writeFile(
      bootstrap,
      `const {app}=require('electron'); app.setPath('userData',${JSON.stringify(userData)}); require(${JSON.stringify(path.resolve("electron/main.cjs"))});`,
    );
    const launch = () =>
      electron.launch({
        args: [
          ...(process.platform === "linux"
            ? ["--no-sandbox", "--ozone-platform=headless", "--disable-gpu"]
            : []),
          bootstrap,
        ],
        timeout: 20000,
      });
    let app;
    try {
      app = await launch();
      const page = await app.firstWindow();
      await page
        .getByRole("textbox", { name: "메모 제목", exact: true })
        .waitFor();
      assert.equal(
        await app.evaluate(({ app }) => app.getPath("userData")),
        userData,
      );
      await page
        .getByRole("textbox", { name: "메모 제목", exact: true })
        .fill("데스크톱에 저장한 기록");
      await page
        .getByRole("status")
        .filter({ hasText: "모든 변경사항 저장됨" })
        .waitFor();
      assert.equal(
        JSON.parse(await fs.readFile(path.join(userData, "memos.json"), "utf8"))
          .notes[0].title,
        "데스크톱에 저장한 기록",
      );
      await app.evaluate(({ shell, dialog }, selected) => {
        globalThis.__openedFolder = null;
        shell.openPath = async (folder) => {
          globalThis.__openedFolder = folder;
          return "";
        };
        dialog.showOpenDialog = async () => ({
          canceled: false,
          filePaths: [selected],
        });
      }, dir);
      const chosen = await page.evaluate(() =>
        window.memoDesktop.chooseFolder(),
      );
      assert.equal(chosen, dir);
      const result = await page.evaluate(
        (folder) => window.memoDesktop.openFolder(folder),
        dir,
      );
      assert.deepEqual(result, { ok: true });
      assert.equal(await app.evaluate(() => globalThis.__openedFolder), dir);
      const invalid = await page.evaluate(() =>
        window.memoDesktop.openFolder("https://example.com"),
      );
      assert.equal(invalid.ok, false);
      const badSave = await page.evaluate(() =>
        window.memoDesktop.save({ version: 1, notes: [{ title: "bad" }] }),
      );
      assert.equal(badSave.ok, false);
      const mainWindowId = await app.evaluate(
        ({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].id,
      );
      assert.equal(
        await app.evaluate(
          ({ BrowserWindow }, id) =>
            BrowserWindow.fromId(id).webContents.getLastWebPreferences()
              .sandbox,
          mainWindowId,
        ),
        true,
      );
      await app.close();
      app = null;
      app = await launch();
      const restoredPage = await app.firstWindow();
      await restoredPage
        .getByRole("textbox", { name: "메모 제목", exact: true })
        .waitFor();
      assert.equal(
        await restoredPage
          .getByRole("textbox", { name: "메모 제목", exact: true })
          .inputValue(),
        "데스크톱에 저장한 기록",
      );
    } finally {
      if (app) await app.close();
      await fs.rm(dir, { recursive: true, force: true });
    }
  },
);

// Actual window stacking needs a window manager; a headless browser cannot test it.
test(
  "native window stacking and its preference persist across restart",
  {
    skip: process.platform === "linux" && !process.env.DISPLAY,
    timeout: 60000,
  },
  async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "memo-window-"));
    const bootstrap = path.join(dir, "bootstrap.cjs");
    await fs.writeFile(
      bootstrap,
      `const {app}=require('electron'); app.setPath('userData',${JSON.stringify(dir)}); require(${JSON.stringify(path.resolve("electron/main.cjs"))});`,
    );
    const launch = () =>
      electron.launch({
        args: [
          ...(process.platform === "linux" ? ["--no-sandbox"] : []),
          bootstrap,
        ],
        timeout: 20000,
      });
    let app;
    try {
      app = await launch();
      const page = await app.firstWindow();
      await page
        .getByRole("switch", { name: "항상 위에 표시", exact: true })
        .waitFor();
      await page
        .getByRole("switch", { name: "항상 위에 표시", exact: true })
        .click();
      await page.waitForFunction(
        () =>
          document
            .querySelector('[role="switch"]')
            .getAttribute("aria-checked") === "true",
      );
      assert.equal(
        await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].isAlwaysOnTop(),
        ),
        true,
      );
      assert.deepEqual(
        JSON.parse(
          await fs.readFile(path.join(dir, "preferences.json"), "utf8"),
        ),
        { alwaysOnTop: true },
      );
      await app.close();
      app = null;
      app = await launch();
      const restored = await app.firstWindow();
      await restored.waitForFunction(
        () =>
          document
            .querySelector('[role="switch"]')
            ?.getAttribute("aria-checked") === "true",
      );
      assert.equal(
        await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].isAlwaysOnTop(),
        ),
        true,
      );
      await restored
        .getByRole("switch", { name: "항상 위에 표시", exact: true })
        .click();
      await restored.waitForFunction(
        () =>
          document
            .querySelector('[role="switch"]')
            .getAttribute("aria-checked") === "false",
      );
      assert.equal(
        await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].isAlwaysOnTop(),
        ),
        false,
      );
    } finally {
      if (app) await app.close();
      await fs.rm(dir, { recursive: true, force: true });
    }
  },
);

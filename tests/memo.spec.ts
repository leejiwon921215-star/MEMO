import { test, expect, type Page } from "@playwright/test";
async function open(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("textbox", { name: "메모 제목", exact: true }),
  ).toBeVisible();
}
const body = (page: Page, name = "생각이 머무는 곳 내용") =>
  page.getByRole("textbox", { name, exact: true });
async function selectBody(page: Page) {
  await body(page).click();
  await page.keyboard.press("ControlOrMeta+a");
}

test("title and rich text survive a reload", async ({ page }) => {
  await open(page);
  await page
    .getByRole("textbox", { name: "메모 제목", exact: true })
    .fill("업무 기록");
  await body(page).fill("지재권 관련 업무를 기록합니다.");
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "메모 제목", exact: true }),
  ).toHaveValue("업무 기록");
  await expect(body(page)).toHaveText("지재권 관련 업무를 기록합니다.");
});

test("formatting controls apply to the selected text and persist", async ({
  page,
}) => {
  await open(page);
  await body(page).fill("서식 테스트");
  await selectBody(page);
  for (const label of ["굵게", "기울임", "밑줄"])
    await page.getByRole("button", { name: label, exact: true }).click();
  await page.getByLabel("글자 크기", { exact: true }).selectOption("24px");
  await page.getByLabel("글꼴", { exact: true }).selectOption("NeoDunggeunmo");
  await page
    .getByLabel("글씨색", { exact: true })
    .evaluate((input: HTMLInputElement) => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, "#cc3344");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  await page
    .getByLabel("강조색", { exact: true })
    .evaluate((input: HTMLInputElement) => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, "#ffff88");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  await page.getByRole("button", { name: "가운데 정렬", exact: true }).click();
  await expect(body(page).locator("strong")).toHaveText("서식 테스트");
  await expect(body(page).locator("em")).toHaveText("서식 테스트");
  await expect(body(page).locator("u")).toHaveText("서식 테스트");
  await expect(body(page).locator("p")).toHaveCSS("text-align", "center");
  await expect(body(page).locator("span").first()).toHaveCSS(
    "font-size",
    "24px",
  );
  await expect(body(page).locator("span").first()).toHaveCSS(
    "color",
    "rgb(204, 51, 68)",
  );
  await expect(body(page).locator("span").first()).toHaveCSS(
    "background-color",
    "rgb(255, 255, 136)",
  );
  await page.reload();
  await expect(body(page).locator("strong")).toHaveText("서식 테스트");
  await expect(body(page).locator("p")).toHaveCSS("text-align", "center");
});

test("sections edit independently; deletion always requires confirmation", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "새 섹션 추가", exact: false })
    .click();
  await page
    .getByRole("textbox", { name: "섹션 3 제목", exact: true })
    .fill("업무");
  await body(page, "업무 내용").fill("별도의 섹션 내용");
  await page
    .getByRole("button", { name: "업무 섹션 삭제", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "섹션을 삭제할까요?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await expect(body(page, "업무 내용")).toHaveText("별도의 섹션 내용");
  await page
    .getByRole("button", { name: "업무 섹션 삭제", exact: true })
    .click();
  await page.getByRole("button", { name: "삭제하기", exact: true }).click();
  await expect(body(page, "업무 내용")).toHaveCount(0);
  await expect(body(page)).toContainText("흩어져 있던 생각");
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "섹션 3 제목", exact: true }),
  ).toHaveCount(0);
});

test("notes can be created, searched, favorited, and deleted with confirmation", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "새 메모 만들기", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "메모 제목", exact: true })
    .fill("비밀 아이디어");
  await page
    .getByRole("button", { name: "즐겨찾기 추가", exact: true })
    .click();
  await page.getByRole("button", { name: /^즐겨찾기\s+\d+$/ }).click();
  await page
    .getByRole("textbox", { name: "메모 검색", exact: true })
    .fill("비밀");
  await expect(page.locator(".note-card")).toHaveCount(1);
  await page.getByRole("button", { name: "메모 삭제", exact: true }).click();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "메모 제목", exact: true }),
  ).toHaveValue("비밀 아이디어");
  await page.getByRole("button", { name: "메모 삭제", exact: true }).click();
  await page.getByRole("button", { name: "삭제하기", exact: true }).click();
  await expect(page.locator(".note-card")).toHaveCount(0);
});

test("custom background persists", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "세이지 배경", exact: true }).click();
  await expect(page.locator(".paper-scroll")).toHaveCSS(
    "background-color",
    "rgb(241, 246, 240)",
  );
  await page
    .getByLabel("사용자 지정 배경색", { exact: true })
    .evaluate((input: HTMLInputElement) => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, "#ffeedd");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  await expect(page.locator(".paper-scroll")).toHaveCSS(
    "background-color",
    "rgb(255, 238, 221)",
  );
  await page.reload();
  await expect(page.locator(".paper-scroll")).toHaveCSS(
    "background-color",
    "rgb(255, 238, 221)",
  );
});

test("folder buttons persist and browser limitations are explained", async ({
  page,
}) => {
  await open(page);
  await body(page).click();
  await page.getByRole("button", { name: "폴더 연결", exact: true }).click();
  await page.getByLabel("버튼 이름", { exact: true }).fill("지재권폴더");
  await page
    .getByLabel("폴더 경로", { exact: true })
    .fill("C:\\Users\\me\\Documents\\지재권");
  await page.getByRole("button", { name: "버튼 추가", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "▱ 지재권폴더", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "▱ 지재권폴더", exact: true }).click();
  await expect(page.locator(".toast")).toContainText("Windows 데스크톱 앱");
  await page
    .getByRole("switch", { name: "항상 위에 표시", exact: true })
    .click();
  await expect(page.locator(".toast")).toContainText("항상 위에 표시");
});

test("desktop bridge handles folder picking and always-on-top settings", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.memoDesktop = {
      read: async () =>
        JSON.parse(localStorage.getItem("native-data") || "null"),
      save: async (data) => {
        localStorage.setItem("native-data", JSON.stringify(data));
        return { ok: true };
      },
      chooseFolder: async () => "C:\\Users\\me\\Documents\\지재권",
      openFolder: async (path) => {
        localStorage.setItem("opened-folder", path);
        return { ok: true };
      },
      getAlwaysOnTop: async () => localStorage.getItem("native-top") === "true",
      setAlwaysOnTop: async (enabled) => {
        localStorage.setItem("native-top", String(enabled));
        return { ok: true };
      },
    };
  });
  await open(page);
  await page
    .getByRole("switch", { name: "항상 위에 표시", exact: true })
    .click();
  await expect(
    page.getByRole("switch", { name: "항상 위에 표시", exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "폴더 연결", exact: true }).click();
  await page.getByRole("button", { name: "찾아보기", exact: true }).click();
  await expect(page.getByLabel("폴더 경로", { exact: true })).toHaveValue(
    "C:\\Users\\me\\Documents\\지재권",
  );
  await page.getByRole("button", { name: "버튼 추가", exact: true }).click();
  await page.getByRole("button", { name: "▱ 지재권", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("opened-folder")))
    .toBe("C:\\Users\\me\\Documents\\지재권");
  await page.reload();
  await expect(
    page.getByRole("switch", { name: "항상 위에 표시", exact: true }),
  ).toBeChecked();
});

test("backup export and import preserve existing notes", async ({ page }) => {
  await open(page);
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "메모 백업하기", exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^MEMO-백업-/);
  const backup = {
    version: 1,
    selectedId: "note-backup",
    notes: [
      {
        id: "note-backup",
        title: "가져온 메모",
        favorite: false,
        background: "#ffffff",
        updatedAt: new Date().toISOString(),
        sections: [
          {
            id: "section-backup",
            title: "백업 섹션",
            content: "<p>복원한 기록</p>",
          },
        ],
      },
    ],
  };
  await page
    .getByLabel("메모 백업 파일", { exact: true })
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
  await expect(
    page.getByRole("dialog", { name: "백업 메모를 가져올까요?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "가져오기", exact: true }).click();
  await expect(page.locator(".note-card")).toHaveCount(4);
  await expect(body(page, "백업 섹션 내용")).toHaveText("복원한 기록");
  await page.reload();
  await expect(page.locator(".note-card")).toHaveCount(4);
});

test("small screens keep the editor usable without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await expect(body(page)).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/memo-mobile.png",
    fullPage: true,
  });
});

test("retro workspace renders without runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await open(page);
  await page.evaluate(() => document.fonts.ready);
  await expect(
    page.getByRole("button", { name: "MEMO.exe", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/memo-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

import { test, expect, type Page } from "@playwright/test";
const KEY = "memo-studio.v1";
const legacy = {
  version: 1,
  selectedId: "note-1",
  notes: [
    {
      id: "note-1",
      title: "업무 메모",
      background: "#ffffff",
      favorite: true,
      updatedAt: "2026-10-23T01:00:00.000Z",
      sections: [
        {
          id: "s1",
          title: "업무",
          content:
            "<p>프로젝트 일정을 정리합니다.</p><p>확인할 내용을 기록해요.</p>",
        },
        { id: "s2", title: "기록", content: "<p>자료를 확인합니다.</p>" },
      ],
    },
    {
      id: "note-2",
      title: "답변 문구",
      background: "#ffffff",
      favorite: false,
      updatedAt: "2026-10-23T01:00:00.000Z",
      sections: [
        {
          id: "s3",
          title: "답변",
          content: "<p>안녕하세요.</p><p>자료를 전달드립니다.</p>",
        },
      ],
    },
  ],
};
const body = (page: Page, name = "업무 내용") =>
  page.getByRole("textbox", { name, exact: true });
async function open(page: Page, seed = true) {
  if (seed)
    await page.addInitScript(
      ({ key, data }) => {
        if (!localStorage.getItem(key))
          localStorage.setItem(key, JSON.stringify(data));
      },
      { key: KEY, data: legacy },
    );
  await page.goto("/");
  await expect(
    page.getByRole("textbox", { name: "메모 제목", exact: true }),
  ).toBeVisible();
}
async function menu(page: Page) {
  await page.getByRole("button", { name: "메모 메뉴", exact: true }).click();
}
async function color(page: Page, name: string, value: string) {
  await page
    .getByLabel(name, { exact: true })
    .evaluate((input: HTMLInputElement, value) => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
}
async function mockClipboard(page: Page) {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          sessionStorage.setItem("copied", text);
        },
      },
    }),
  );
}
async function folder(
  page: Page,
  label = "지재권폴더",
  placement: "top" | "body" = "top",
) {
  await page.getByRole("button", { name: "폴더 추가", exact: true }).click();
  await page.getByLabel("버튼 이름", { exact: true }).fill(label);
  await page
    .getByLabel("폴더 경로", { exact: true })
    .fill("C:\\Users\\me\\Documents\\지재권");
  if (placement === "body")
    await page
      .getByRole("radio", { name: "본문 커서 위치", exact: true })
      .check();
  await page.getByRole("button", { name: "버튼 추가", exact: true }).click();
}

test("clean install is compact, black on white, and has no sidebar or decorative headings", async ({
  page,
}) => {
  await page.setViewportSize({ width: 520, height: 760 });
  await open(page, false);
  await expect(body(page, "이름 없는 섹션 내용")).toHaveCSS(
    "color",
    "rgb(0, 0, 0)",
  );
  await expect(page.locator(".paper-scroll")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(
    page.locator("aside,h1,.desktop-taskbar,.workspace-heading"),
  ).toHaveCount(0);
  await expect(page.locator(".compact-title")).toHaveValue("새 메모");
  await expect(page.locator(".compact-title")).toHaveCSS("font-size", "14px");
});

test("existing version-one notes survive upgrade, editing and restart", async ({
  page,
}) => {
  await open(page);
  await expect(body(page)).toContainText("프로젝트 일정을");
  await page
    .getByRole("textbox", { name: "메모 제목", exact: true })
    .fill("변경한 제목");
  await body(page).fill("새로운 기록");
  await page.reload();
  await expect(body(page)).toHaveText("새로운 기록");
  await expect(body(page, "기록 내용")).toHaveText("자료를 확인합니다.");
  await expect(
    page.getByRole("textbox", { name: "메모 제목", exact: true }),
  ).toHaveValue("변경한 제목");
  await page.getByRole("button", { name: "메모 목록", exact: true }).click();
  await expect(page.locator(".note-choice")).toHaveCount(2);
});

test("rich formatting, text colors, font and alignment persist", async ({
  page,
}) => {
  await open(page);
  await body(page).fill("서식 테스트");
  await body(page).click();
  await page.keyboard.press("ControlOrMeta+a");
  for (const label of ["굵게", "기울임", "밑줄"])
    await page.getByRole("button", { name: label, exact: true }).click();
  await page.getByLabel("글자 크기", { exact: true }).selectOption("24px");
  await page.getByLabel("글꼴", { exact: true }).selectOption("NeoDunggeunmo");
  await color(page, "글씨색", "#cc3344");
  await color(page, "강조색", "#ffff88");
  await page.getByRole("button", { name: "가운데 정렬", exact: true }).click();
  await expect(body(page).locator("strong")).toHaveText("서식 테스트");
  await expect(body(page).locator("em")).toHaveText("서식 테스트");
  await expect(body(page).locator("u")).toHaveText("서식 테스트");
  await expect(body(page).locator("span").first()).toHaveCSS(
    "color",
    "rgb(204, 51, 68)",
  );
  await expect(body(page).locator("span").first()).toHaveCSS(
    "background-color",
    "rgb(255, 255, 136)",
  );
  await page.reload();
  await expect(body(page).locator("p")).toHaveCSS("text-align", "center");
  await expect(body(page).locator("span").first()).toHaveCSS(
    "font-size",
    "24px",
  );
});

test("background can still be customized per note", async ({ page }) => {
  await open(page);
  await color(page, "메모 배경색", "#ffeedd");
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

test("sections edit independently and both cancel and confirmed deletion work", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "섹션 추가", exact: true }).click();
  await page
    .getByRole("textbox", { name: "섹션 3 제목", exact: true })
    .fill("독립 섹션");
  await body(page, "독립 섹션 내용").fill("독립된 본문");
  await page
    .getByRole("button", { name: "독립 섹션 섹션 삭제", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "섹션을 삭제할까요?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await expect(body(page, "독립 섹션 내용")).toHaveText("독립된 본문");
  await page
    .getByRole("button", { name: "독립 섹션 섹션 삭제", exact: true })
    .click();
  await page.getByRole("button", { name: "삭제하기", exact: true }).click();
  await expect(body(page, "독립 섹션 내용")).toHaveCount(0);
  await expect(body(page)).toContainText("프로젝트");
});

test("memo list and former sidebar tools are available at the top", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "새 메모", exact: true }).click();
  await page
    .getByRole("textbox", { name: "메모 제목", exact: true })
    .fill("새 아이디어");
  await menu(page);
  await page
    .getByRole("button", { name: "즐겨찾기 추가", exact: true })
    .click();
  await page.getByRole("button", { name: "메모 목록", exact: true }).click();
  await page
    .getByRole("textbox", { name: "메모 검색", exact: true })
    .fill("아이디어");
  await expect(page.locator(".note-choice")).toHaveCount(1);
  await page.getByRole("button", { name: "새 아이디어", exact: true }).click();
  await menu(page);
  await page.getByRole("button", { name: "메모 삭제", exact: true }).click();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await expect(page.locator(".compact-title")).toHaveValue("새 아이디어");
  await menu(page);
  await page.getByRole("button", { name: "메모 삭제", exact: true }).click();
  await page.getByRole("button", { name: "삭제하기", exact: true }).click();
  await expect(page.locator(".compact-title")).toHaveValue("업무 메모");
});

test("folder buttons remain pinned while the memo scrolls and persist after reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 520, height: 760 });
  await open(page);
  await folder(page);
  await body(page).fill(
    Array.from({ length: 80 }, (_, i) => `기록 ${i}`).join("\n"),
  );
  const button = page.getByRole("button", { name: "지재권폴더", exact: true });
  const before = await button.boundingBox();
  await page.locator(".paper-scroll").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  expect((await button.boundingBox())!.y).toBe(before!.y);
  await expect(
    page.getByRole("button", { name: "복사 버튼", exact: true }),
  ).toBeVisible();
  await page.reload();
  await button.click();
  await expect(page.locator(".toast")).toContainText("Windows 앱");
});

test("folder and copy buttons can be inserted at the body cursor", async ({
  page,
}) => {
  await mockClipboard(page);
  await open(page);
  await body(page).fill("앞뒤");
  await body(page).click();
  await page.keyboard.press("ControlOrMeta+Home");
  await page.keyboard.press("ArrowRight");
  await folder(page, "본문 폴더", "body");
  await expect(body(page).locator("button")).toHaveText("▱ 본문 폴더");
  await expect(body(page)).toContainText("앞▱ 본문 폴더 뒤");
  await page.getByRole("button", { name: "복사 버튼", exact: true }).click();
  await page.getByLabel("버튼 이름", { exact: true }).fill("본문 복사");
  await page
    .getByRole("radio", { name: "직접 입력한 문구", exact: true })
    .check();
  await page
    .getByRole("textbox", { name: "복사할 문구", exact: true })
    .fill("미리 지정한 문구");
  await page
    .getByRole("radio", { name: "본문 커서 위치", exact: true })
    .check();
  await page.getByRole("button", { name: "버튼 추가", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "▣ 본문 복사", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("copied")))
    .toBe("미리 지정한 문구");
});

test("copying a saved memo uses its latest text and preserves line breaks", async ({
  page,
}) => {
  await mockClipboard(page);
  await open(page);
  await page.getByRole("button", { name: "복사 버튼", exact: true }).click();
  await page.getByLabel("버튼 이름", { exact: true }).fill("답변 복사");
  await page
    .getByRole("combobox", { name: "복사할 메모", exact: true })
    .selectOption("note-2");
  await page.getByRole("button", { name: "버튼 추가", exact: true }).click();
  await page.getByRole("button", { name: "답변 복사", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("copied")))
    .toBe("안녕하세요.\n자료를 전달드립니다.");
  await page.getByRole("button", { name: "메모 목록", exact: true }).click();
  await page.getByRole("button", { name: "답변 문구", exact: true }).click();
  await body(page, "답변 내용").fill("최신 답변\n수정된 내용");
  await page.getByRole("button", { name: "답변 복사", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("copied")))
    .toBe("최신 답변\n수정된 내용");
  await page.reload();
  await page.getByRole("button", { name: "답변 복사", exact: true }).click();
  await expect(page.locator(".toast")).toContainText("복사했습니다");
});

test("custom copy text can be edited, reordered and deleted with confirmation", async ({
  page,
}) => {
  await mockClipboard(page);
  await open(page);
  await folder(page, "자료");
  await page.getByRole("button", { name: "복사 버튼", exact: true }).click();
  await page.getByLabel("버튼 이름", { exact: true }).fill("인사");
  await page
    .getByRole("radio", { name: "직접 입력한 문구", exact: true })
    .check();
  await page
    .getByRole("textbox", { name: "복사할 문구", exact: true })
    .fill("감사합니다.");
  await page.getByRole("button", { name: "버튼 추가", exact: true }).click();
  await page
    .getByRole("button", { name: "바로가기 관리", exact: true })
    .click();
  await page
    .getByRole("button", { name: "인사 왼쪽으로 이동", exact: true })
    .click();
  await page.getByRole("button", { name: "인사 수정", exact: true }).click();
  await page
    .getByRole("textbox", { name: "복사할 문구", exact: true })
    .fill("감사합니다.\n좋은 하루 보내세요.");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.locator(".shortcut-button").first()).toHaveText("인사");
  await page.getByRole("button", { name: "인사", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("copied")))
    .toBe("감사합니다.\n좋은 하루 보내세요.");
  await page
    .getByRole("button", { name: "바로가기 관리", exact: true })
    .click();
  await page
    .getByRole("button", { name: "인사 버튼 삭제", exact: true })
    .click();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "인사", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "바로가기 관리", exact: true })
    .click();
  await page
    .getByRole("button", { name: "인사 버튼 삭제", exact: true })
    .click();
  await page.getByRole("button", { name: "삭제하기", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "인사", exact: true }),
  ).toHaveCount(0);
});

test("backup import preserves existing notes and remaps copy-button references", async ({
  page,
}) => {
  await mockClipboard(page);
  await open(page);
  await menu(page);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "백업 저장", exact: true }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/^MEMO-백업-/);
  const backup = {
    appearance: { headerColor: "#d6e6f4" },
    version: 1,
    selectedId: "note-1",
    notes: [
      {
        ...legacy.notes[0],
        sections: [
          {
            id: "s1",
            title: "가져온 섹션",
            content:
              '<p>백업의 본문</p><p><span data-copy-button="" data-label="본문 참조" data-mode="note" data-note-id="note-1">▣ 본문 참조</span></p>',
          },
        ],
      },
    ],
    shortcuts: [
      {
        id: "shortcut-1",
        type: "copy",
        label: "백업 복사",
        mode: "note",
        noteId: "note-1",
      },
    ],
  };
  await page.getByLabel("메모 백업 파일", { exact: true }).setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole("button", { name: "가져오기", exact: true }).click();
  await page.getByRole("button", { name: "▣ 본문 참조", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("copied")))
    .toContain("백업의 본문");
  await expect(page.locator(".note-bar")).toHaveCSS(
    "background-color",
    "rgb(214, 230, 244)",
  );
  await body(page, "가져온 섹션 내용").fill("가져온 메모만 수정");
  await page.getByRole("button", { name: "백업 복사", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("copied")))
    .toBe("가져온 메모만 수정");
  await page.getByRole("button", { name: "메모 목록", exact: true }).click();
  await expect(page.locator(".note-choice")).toHaveCount(3);
});

test("native controls and folder picker use the desktop bridge and preserve both locks", async ({
  page,
}) => {
  await page.addInitScript((data) => {
    const get = () =>
      JSON.parse(
        localStorage.getItem("native-settings") ||
          '{"alwaysOnTop":false,"sizeLocked":false,"width":520,"height":760}',
      );
    const set = (patch: object) =>
      localStorage.setItem(
        "native-settings",
        JSON.stringify({ ...get(), ...patch }),
      );
    window.memoDesktop = {
      read: async () =>
        JSON.parse(localStorage.getItem("native-data") || JSON.stringify(data)),
      save: async (data) => {
        localStorage.setItem("native-data", JSON.stringify(data));
        return { ok: true };
      },
      chooseFolder: async () => "C:\\資料",
      openFolder: async (path) => {
        sessionStorage.setItem("opened", path);
        return { ok: true };
      },
      copyText: async (text) => {
        sessionStorage.setItem("copied", text);
        return { ok: true };
      },
      getAlwaysOnTop: async () => get().alwaysOnTop,
      setAlwaysOnTop: async (enabled) => {
        set({ alwaysOnTop: enabled });
        return { ok: true };
      },
      getWindowSettings: async () => get(),
      setSizeLocked: async (enabled) => {
        set({ sizeLocked: enabled });
        return { ok: true };
      },
      resizeWindow: async (width, height) => {
        if (width < 320 || height < 360)
          return { ok: false, error: "최소 320 × 360px입니다." };
        set({ width, height });
        return { ok: true };
      },
    };
  }, legacy);
  await open(page, false);
  await page
    .getByRole("switch", { name: "항상 위에 표시", exact: true })
    .click();
  await page.getByRole("button", { name: "창 크기 설정", exact: true }).click();
  await page
    .getByRole("spinbutton", { name: "창 가로 크기", exact: true })
    .fill("200");
  await page.getByRole("button", { name: "크기 적용", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText(
    "최소 320 × 360px입니다.",
  );
  await page
    .getByRole("spinbutton", { name: "창 가로 크기", exact: true })
    .fill("360");
  await page
    .getByRole("spinbutton", { name: "창 세로 크기", exact: true })
    .fill("600");
  await page.getByRole("button", { name: "크기 적용", exact: true }).click();
  await page.getByRole("button", { name: "닫기", exact: true }).first().click();
  await page.getByRole("switch", { name: "창 크기 고정", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("switch", { name: "창 크기 고정", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("switch", { name: "항상 위에 표시", exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "폴더 추가", exact: true }).click();
  await page.getByRole("button", { name: "찾아보기", exact: true }).click();
  await expect(page.getByLabel("폴더 경로", { exact: true })).toHaveValue(
    "C:\\資料",
  );
  await page.getByRole("button", { name: "버튼 추가", exact: true }).click();
  await page.getByRole("button", { name: "資料", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("opened")))
    .toBe("C:\\資料");
});

test("invalid saved data is preserved instead of being overwritten", async ({
  page,
}) => {
  await page.addInitScript(
    (key) => localStorage.setItem(key, '{"version":1,"notes":"broken"}'),
    KEY,
  );
  await open(page, false);
  await expect(page.getByRole("alert")).toContainText("기존 데이터 보호");
  await body(page, "이름 없는 섹션 내용").fill("임시 기록");
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(
    '{"version":1,"notes":"broken"}',
  );
});

test("320px-wide editor has no horizontal overflow and keeps controls visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 520 });
  await open(page);
  await folder(page);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await expect(
    page.getByRole("button", { name: "폴더 추가", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "복사 버튼", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("switch", { name: "창 크기 고정", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/memo-narrow.png",
    fullPage: true,
  });
});

test("compact desktop screenshot has no runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 520, height: 760 });
  await open(page);
  await folder(page);
  await page.getByRole("button", { name: "복사 버튼", exact: true }).click();
  await page.getByLabel("버튼 이름", { exact: true }).fill("답변 복사");
  await page
    .getByRole("combobox", { name: "복사할 메모", exact: true })
    .selectOption("note-2");
  await page.getByRole("button", { name: "버튼 추가", exact: true }).click();
  await page.getByRole("button", { name: "알림 닫기", exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "test-results/memo-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("header colors persist globally, preserve the white paper, and can be reset", async ({
  page,
}) => {
  await open(page);
  await menu(page);
  await page
    .getByRole("button", { name: "상단 색상 설정", exact: true })
    .click();
  await color(page, "상단 배경색", "#ddaacc");
  await expect(page.locator(".note-bar")).toHaveCSS(
    "background-color",
    "rgb(221, 170, 204)",
  );
  await expect(page.locator(".paper-scroll")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await page.getByRole("button", { name: "완료", exact: true }).click();
  await page.getByRole("button", { name: "새 메모", exact: true }).click();
  await page.reload();
  await expect(page.locator(".note-bar")).toHaveCSS(
    "background-color",
    "rgb(221, 170, 204)",
  );
  await menu(page);
  await page
    .getByRole("button", { name: "상단 색상 설정", exact: true })
    .click();
  await page
    .getByRole("button", { name: "진회색 상단 색상", exact: true })
    .click();
  await expect(page.locator(".note-bar")).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );
  await page.getByRole("button", { name: "기본색으로", exact: true }).click();
  await page.getByRole("button", { name: "완료", exact: true }).click();
  await page.reload();
  await expect(page.locator(".note-bar")).toHaveCSS(
    "background-color",
    "rgb(215, 226, 202)",
  );
});

test("shortcuts wrap downward and long labels remain readable at 320px", async ({
  page,
}) => {
  const labels = [
    "업무 자료 폴더",
    "프로젝트 관리",
    "회의록과 참고 자료",
    "자주 쓰는 답변",
    "이름이아주긴바로가기버튼도창너비에맞춰여러줄로끝까지표시되어야합니다",
  ];
  await page.addInitScript(
    (data) => localStorage.setItem("memo-studio.v1", JSON.stringify(data)),
    {
      ...legacy,
      appearance: { headerColor: "#e8d9ec" },
      shortcuts: labels.map((label, index) =>
        index === 3
          ? {
              id: `shortcut-${index}`,
              type: "copy",
              label,
              mode: "text",
              text: "감사합니다.",
            }
          : {
              id: `shortcut-${index}`,
              type: "folder",
              label,
              path: "C:\\Documents",
            },
      ),
    },
  );
  await page.setViewportSize({ width: 900, height: 760 });
  await open(page, false);
  const wideHeight = (await page.locator(".shortcut-bar").boundingBox())!
    .height;
  await page.setViewportSize({ width: 320, height: 760 });
  const buttons = page.locator(".shortcut-button");
  await expect(buttons).toHaveCount(labels.length);
  const bounds = await buttons.evaluateAll((buttons) =>
    buttons.map((button) => {
      const box = button.getBoundingClientRect();
      const label = button.querySelector("span")!;
      return {
        left: box.left,
        right: box.right,
        top: box.top,
        labelWidth: label.clientWidth,
        labelScrollWidth: label.scrollWidth,
      };
    }),
  );
  expect(new Set(bounds.map((box) => box.top)).size).toBeGreaterThan(1);
  for (const box of bounds) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(320);
    expect(box.labelScrollWidth).toBeLessThanOrEqual(box.labelWidth);
  }
  expect(
    (await page.locator(".shortcut-bar").boundingBox())!.height,
  ).toBeGreaterThan(wideHeight);
  expect(
    await page
      .locator(".shortcut-scroll")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await page
    .getByRole("button", { name: labels[3], exact: true })
    .scrollIntoViewIfNeeded();
  await page
    .getByRole("button", { name: "바로가기 관리", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "바로가기 관리" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.screenshot({
    path: "test-results/memo-wrapped.png",
    fullPage: true,
  });
});

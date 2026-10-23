const path = require("node:path");
const fs = require("node:fs/promises");
async function validateFolder(folder, platform = process.platform) {
  if (typeof folder !== "string" || !folder.trim() || folder.includes("\0"))
    return "올바른 폴더 경로를 입력해 주세요.";
  const paths = platform === "win32" ? path.win32 : path.posix;
  if (!paths.isAbsolute(folder) || /^[a-z][a-z\d+.-]*:\/\//i.test(folder))
    return "전체 폴더 경로를 입력해 주세요. 웹 주소는 사용할 수 없습니다.";
  try {
    if (!(await fs.stat(folder)).isDirectory())
      return "파일이 아닌 폴더를 선택해 주세요.";
  } catch {
    return "폴더를 찾을 수 없거나 접근 권한이 없습니다. 경로를 확인해 주세요.";
  }
  return null;
}
module.exports = { validateFolder };

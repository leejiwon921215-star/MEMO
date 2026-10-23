# MEMO.exe

도트 픽셀과 레트로 PC 감성의 Windows 메모장입니다. 인터넷 연결이나 계정 없이 내 컴퓨터에 기록합니다.

![MEMO 레트로 화면](docs/preview.png)

## Windows에서 사용하기

1. `release/MEMO-1.0.0-win-x64.zip`의 압축을 폴더에 **전부** 풀어주세요.
2. 압축을 푼 폴더 안의 `MEMO.exe`를 실행하세요. 별도 Node.js 설치는 필요 없습니다.
3. 실행 파일만 다른 곳으로 옮기면 작동하지 않습니다. 바로가기를 만들어 사용하세요.

Windows 10/11의 64비트 Intel/AMD 컴퓨터용입니다. 이 빌드는 코드 서명이 없는 개발 빌드입니다. Windows에서 게시자 확인 경고가 표시될 수 있습니다. Windows ARM64 네이티브 빌드는 제공하지 않습니다.

## 기능

- 글꼴, 글자 크기, 굵게, 기울임, 밑줄, 글씨색, 강조색
- 왼쪽·가운데·오른쪽 정렬, 글머리·번호 목록, 실행 취소·다시 실행
- 메모마다 기본 배경색 또는 원하는 배경색 지정
- 메모와 섹션을 각각 만들고 제목·내용 편집
- 메모·섹션 삭제 전 확인 팝업
- 이름과 로컬 경로를 지정한 폴더 버튼: Windows 탐색기로 열기
- `항상 위에` 스위치: 다른 프로그램보다 위에 표시, 재실행 시 설정 유지
- 자동 저장, 제목·본문 검색, 즐겨찾기
- JSON 백업 내보내기와 가져오기: 가져올 때 기존 메모를 보존하며 추가

폴더 버튼은 본문의 커서 위치에 들어갑니다. ‘폴더 연결’ → 버튼 이름(예: `지재권폴더`) → ‘찾아보기’로 폴더 선택 → ‘버튼 추가’를 누르세요. 나중에 경로를 바꾸려면 본문에서 기존 버튼을 선택해 Delete 키로 지우고 새로 연결하세요. 폴더 자체나 안의 파일은 삭제되지 않습니다.

메모는 기본적으로 `%APPDATA%\MEMO\memos.json`, 창 고정 설정은 같은 폴더의 `preferences.json`에 저장됩니다. 다른 컴퓨터로 자동 동기화되지 않습니다. 정기적으로 ‘메모 백업하기’로 JSON 파일을 보관하세요. 백업에는 연결한 폴더의 경로가 포함되며, 그 폴더 안의 파일은 포함되지 않습니다.

## 개발 환경

Node.js 24 LTS와 npm을 사용합니다. 이 클라우드 작업은 이미 격리되어 있으므로 `/workspace/MEMO`의 기존 체크아웃을 사용하고 별도 Git worktree를 만들지 마세요.

```sh
cd /workspace/MEMO
npm ci
npm run dev
```

브라우저에서도 편집·자동 저장·백업은 동작합니다. 브라우저 데이터는 Windows 앱과 별도이며, 같은 백업 파일로 옮길 수 있습니다. 브라우저의 보안 제한으로 로컬 폴더 열기와 항상 위에 표시는 **데스크톱 앱에서만** 작동합니다. 브라우저 데이터를 지우기 전에 메모를 백업하세요.

Windows 컴퓨터에서 개발용 앱 실행:

```sh
npm ci
npm run desktop
```

검증:

```sh
npm run build
npx playwright install chromium
npm test
npm run test:native
```

브라우저 테스트는 시스템의 `/usr/bin/chromium`이 있으면 사용합니다. 별도 Chromium 경로는 `MEMO_CHROMIUM_PATH`로 설정할 수 있습니다. 실제 Electron 테스트는 임시 프로필에서 저장·재실행·IPC·폴더 경로 검증을 검사합니다. 디스플레이가 없는 Linux에서는 실제 창 겹침 검사를 건너뜁니다. Windows에서 브라우저를 열고 항상 위에 켜기·끄기, 앱 재실행, 실제 폴더 버튼 클릭을 최종 확인하세요.

클라우드 프록시와 쓰기 경로를 사용하는 재설치:

```sh
cd /workspace/MEMO
export XDG_CACHE_HOME=/workspace/.cache
export npm_config_cache=/workspace/.cache/npm
export NODE_USE_ENV_PROXY=1
npm ci --no-audit --no-fund
npm run build
```

TLS·패키지 무결성 검증은 유지합니다. 라이브 프로세스는 환경 게시 후에도 유지된다고 가정하지 말고 개발 서버를 다시 실행하세요.

## Windows 실행본 만들기

```sh
npm run package:win -- --x64
```

`release/MEMO-1.0.0-win-x64.zip`을 생성합니다. Linux에서도 크로스 빌드할 수 있습니다. Windows 설치 프로그램(NSIS)은 Windows 환경에서 아래 명령으로 생성할 수 있습니다. Linux에서 NSIS 빌드는 Wine이 필요합니다.

```sh
npm run package:win:installer -- --x64
```

릴리스 파일과 `node_modules`, 빌드 결과는 Git에 포함하지 않습니다.

## 글꼴

UI의 픽셀 글꼴은 [Neo둥근모 v1.601](https://github.com/neodgm/neodgm/releases/tag/v1.601)입니다. 앱에 포함되어 오프라인에서도 동작합니다. SIL Open Font License 전문은 `public/fonts/OFL.txt`에 있습니다. 픽셀 아이콘은 이 프로젝트에서 SVG로 제작했습니다.

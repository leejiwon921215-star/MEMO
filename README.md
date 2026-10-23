# MEMO 1.1.0 — Windows

[Windows 실행본 다운로드](https://github.com/leejiwon921215-star/MEMO/raw/refs/heads/downloads/MEMO-Windows-1.1.0.exe)

기존 앱을 완전히 종료한 뒤 새 파일을 실행하세요. 기존 메모는 %APPDATA%\MEMO에 그대로 유지됩니다.

- 기본 폭 520px, 최소 320px, 원하는 크기 지정과 크기 고정·재실행 시 복원
- 검정 본문과 흰 배경, 왼쪽 사이드바·큰 제목·장식 문구 제거
- 상단에 고정되는 폴더 버튼과 복사 버튼, 본문 커서 위치에도 추가 가능
- 저장된 메모의 최신 내용 또는 미리 정한 문구를 줄바꿈과 함께 클립보드에 복사
- 메모 목록·검색·즐겨찾기·백업은 상단 메뉴에서 사용

Windows 10/11 x64용 서명 없는 개발 빌드입니다. 실제 Windows의 탐색기 실행과 다른 창 위 표시는 최종 확인이 필요합니다. 브라우저 검사 15개와 실제 Electron 저장·크기 복원·클립보드·폴더 경로 검증 2개를 통과했고 디스플레이가 필요한 창 겹침 검사는 Linux 클라우드에서 건너뛰었습니다.

압축 해제 모듈은 Igor Pavlov의 공식 LZMA SDK 25.01의 공개 도메인 7zSD.sfx입니다. 실행 시 임시 폴더에 앱을 풀고 종료 후 정리하며 메모는 별도 AppData 경로에 저장됩니다.

Source: https://github.com/leejiwon921215-star/MEMO/tree/v1.1.0
SDK: https://github.com/ip7z/7zip/releases/tag/25.01

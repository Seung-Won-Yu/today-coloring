# 반응형 QA 기준

마지막 확인일: 2026-06-22

이 문서는 `07_develop-plan_COL-PLN-003`의 데스크톱·태블릿 반응형 마감 기준을 저장소 안에 고정하기 위한 기준선이다. 모바일 세로 화면은 기존 완성도를 유지하고, 태블릿·데스크톱은 큰 화면을 더 잘 쓰는 방향으로 검증한다.

## 방향 정책

- PWA manifest의 `orientation`은 `any`다.
- 폰은 세로 사용을 우선한다.
- 태블릿 세로는 하단 팔레트(`color--bottom`)와 큰 세로 캔버스를 유지한다.
- 태블릿 가로와 데스크톱은 측면 팔레트(`color--side`)를 사용한다.
- 완성/갤러리 상세 화면은 큰 화면에서 작품 액자를 충분히 크게 보여준다.

## 검증 매트릭스

| 뷰포트 | 홈/목록 | 색칠 화면 | 완료 화면 | 갤러리/상세 | 기준 |
|---|---|---|---|---|---|
| 390 x 844 | 모바일 2열 목록, 하단 내비 | `color--bottom`, 캔버스 약 380px | 액자 약 269px | 상세 액자 약 254px | 가로 overflow 0 |
| 820 x 1180 | 태블릿 3열 목록, 하단 내비 | `color--bottom`, 캔버스 약 690px | 액자 약 350px | 상세 액자 약 360px | 가로 overflow 0 |
| 1180 x 820 | 태블릿 가로 확장 목록 | `color--side`, 캔버스 약 550px | 액자 약 401px | 상세 액자 약 378px | 가로 overflow 0 |
| 1440 x 900 | 데스크톱 1240px 목록 | `color--side`, 캔버스 약 609px | 액자 약 460px | 상세 액자 약 420px | 가로 overflow 0 |

## 최근 검증 결과

- 홈, 설정, 색칠, 완료, 갤러리, 갤러리 상세 화면을 4개 뷰포트에서 확인했다.
- QA 매트릭스 alerts: 0개
- 콘솔 warning/error: 0개
- 키보드 포커스: 홈, 하단 내비, 설정/확인 팝업, 완료 화면 버튼 확인 완료
- 마우스 커서: 색칠 기본 `crosshair`, 확대 후 `grab`, 드래그 중 `grabbing`, 드래그 종료 후 `grab` 확인 완료
- 이미지 저장: React Native WebView 브리지와 브라우저 다운로드 fallback 회귀 테스트 추가

## 회귀 확인 명령

정적 서버:

```bash
python3 -m http.server 4173
```

기본 테스트:

```bash
node tests/cache-version-consistency.test.js
node tests/save-image-bridge.test.js
node tests/manifest-policy.test.js
node tests/storage-version.test.js
node tests/paint-engine.test.js
```

브라우저 QA는 Playwright CLI로 수행한다. 검증할 때는 다음 조건을 확인한다.

- 4개 뷰포트 모두 가로 overflow가 없어야 한다.
- 폰/태블릿 세로는 `color--bottom`이어야 한다.
- 태블릿 가로/데스크톱은 `color--side`이어야 한다.
- 색칠 캔버스와 완료/상세 액자 폭이 위 매트릭스 기준보다 작아지면 회귀로 본다.

## 보류 항목

- 완성작 공유(A-06)는 사용자 판단 대기 상태다.
- 색칠 배경이 흑백으로 보이는 문제는 사용자 판단 대기 상태다.

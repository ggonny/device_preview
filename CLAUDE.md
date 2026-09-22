# device_preview (반응형 테스트랩) — 작업 규칙과 확정 사항

이 문서는 대화 컨텍스트가 압축되어도 유지되어야 하는 규칙·결정사항의 단일 기준입니다.
프로젝트 목적: URL 을 입력해 **실제 모바일 기기에서 웹사이트가 어떻게 보이는지 최대한 정확하게 재현**하는 테스트 도구.
"기기마다 적당히 다르게 보이는 모형"이 아니라 실기기 재현이 목표다.

## 기본 규칙

- 답변과 작업 결과(문서·주석·안내 문구)는 **한국어**로 작성한다.
- **기존 구조를 최대한 유지**한다. 불필요한 전체 리팩터링 금지. 문제는 구조가 아니라 값일 때가 많다 — 데이터 보정을 우선한다.
- **HTML / CSS / Vanilla JavaScript** 만 사용. 프레임워크·번들러·외부 라이브러리(아이콘 라이브러리 포함) 임의 추가 금지.
- 파일 구성: 루트의 `index.html`, `app.js`, `styles.css`, `사용법.txt` 가 현재 버전. `v01/`, `v02/` 는 예전 스냅샷이며 `.gitignore` 로 제외됨(수정 대상 아님).
- 실행: VS Code Live Server(포트 5501, `.vscode/settings.json`). `file://` 로 열면 스크롤 동기화 등 same-origin 기능이 동작하지 않는다.

## Git

- `git add` / `git commit` / `git push` 는 **실행하지 않는다**. Git 관리는 사용자가 직접 한다.
- `git status`, `git diff`, `git log` 같은 조회 명령은 허용.
- 필요하면 커밋 메시지만 제안한다.

## 작업 방식

- 큰 작업은 **기기군 / 기능 단위**로 나누어 진행한다(예: P0 → P1 → P2 → P3 우선순위 표로 합의 후 진행).
- 수정 전에 필요하면 **현재 상태를 먼저 분석·보고**하고, 사용자가 "먼저 보고"를 요구하면 코드를 수정하지 않는다.
- 완료 후에는 항상 **변경 파일 / 핵심 변경사항 / 사용자가 직접 확인할 항목**을 정리한다. 값을 바꿨을 때는 `현재 값 → 수정 값 → source 등급` 표를 제공한다.
- 사용자 결정이 필요한 갈림길(예: 실제 제품 구조 vs 요청 내용이 상충)은 임의로 정하지 말고 명시적으로 묻는다.

## 코드 구조 (확정)

### 데이터 (app.js 상단)
- `frameProfiles` — 기기 프레임(하드웨어) 프로필. 키: `family`, 베젤 `top/right/bottom/left`, `ring`(금속 테 두께, 나머지 베젤은 검은 글래스), `radius`(바디 코너), `glassRadius`(글래스 베젤 코너 — 생략 시 바디 − ring 동심, 실측값이 다르면 지정), `screenRadius`(디스플레이 코너), `statusBarHeight / statusBarHeightLandscape`(OS 상태바 창 높이 — 생략 시 safeArea.top; 컷아웃 인셋과 상태바 높이가 다른 기기만 지정), `cutout{type,width,height,top|bottom,align,offset}`(세로 위치는 `top` 또는 `bottom` = 아래 가장자리 거리; `dual-hole` 은 `lens/ring/lensGap/flash/flashGap` 으로 [플래시][렌즈][렌즈] 상자 크기가 정해짐), `display.mask:'holes'`(디스플레이 마스크에서 dual-hole 의 렌즈·플래시 원을 뺌), `safeArea` / `safeAreaLandscape`, `homeIndicator`, `homeIndicatorWidth`, `homeIndicatorCenter`(세로 기준 중심 x, 하단 컷아웃 옆에 놓일 때만), `controls{homeButton,speaker,camera,sensor}`, `display.split`(듀얼스크린 전용, 현재 미사용), `hingeBody`(힌지 커버: `{type:'spine',side,width,inset,radius}` | `{type:'seam',size}`), `statusBar`(상태바 프로필 오버라이드), **`source`**(근거 메타데이터).
  - 컷아웃 기하는 `getCutoutGeometry(view,profile,landscape)` 한 곳에서 계산한다(상자 + dual-hole 원 목록, 가로는 (x,y)→(y,W−x) 반시계 회전). 디스플레이 마스크 홀(`updateShape`)·하드웨어 렌즈 위치(`updateCutout` → `--lens-*/--flash-*`)·상태바 패딩(`updateStatusBar`) 이 모두 이 결과를 쓴다.
  - radius 값은 `숫자(px)` | `{ratio}`(짧은 변 대비) | `{tl,tr,br,bl}`(코너별) 모두 가능. `resolveCorners()` 가 px 로 풀고, 가로 모드는 반시계 규칙으로 회전(새 tl = 이전 tr, tr = 이전 br, br = 이전 bl, bl = 이전 tl).
  - `controls` 확장(2026-09-21, iPad Air): `camera/sensor` 는 `{size,top,offsetX}`(상단 베젤) 외에 `{size,edge:'right'|'left',offset}`(긴 변 베젤 중앙선, offset 은 화면 중심에서 아래 +/위 −) 가능. `keys:[{type:'volume'|'power',edge,start,length}]`(세로 기준 변·시작·길이 px) 가 있으면 family 기본 키 대신 데이터 위치로 그린다(두 번째 volume → `.key_volume_b`). `port:{edge,width,height}` = 커넥터 슬롯. 가로 변환은 `updateFrameDetails()` 가 반시계 규칙(top→left, right→top, bottom→right, left→bottom, 변 위 시작점은 (x,y)→(y,W−x)) 으로 처리한다.
  - `cutout.edge:'right'|'left'`(2026-09-21, Galaxy Tab Ultra): 긴 변(세로 기준 좌우 베젤) 에 붙는 컷아웃. `depth`(화면 안 깊이)·`length`·`offset` 으로 정의하고 가로에서는 right → 상단 중앙으로 회전. `shape:'wave'` 는 반타원 노치(장식 없음, 카메라는 `controls.camera` 로). JS 가 `data-cutout-edge`(현재 방향의 변)·`data-cutout-shape` 를 넣고 CSS 가 곡률 방향을 고른다. `controls.camera/sensor.inset` = 바디 가장자리 → 중심 거리(생략 시 베젤 절반).
  - `family` 값: `iphone-modern | iphone-classic | galaxy-bar | pixel | fold | flip | duo | ipad-classic | ipad-modern | galaxy-tab | neutral`. CSS 는 `data-family` 로만 마감(링 색·글래스 색·측면 키)을 분기한다.
- `statusBarProfiles` — OS 상태바(`ios | android | oneui | generic | duo`): 시간 문자열, 아이콘 순서, `cellularStyle: bars(iOS 4막대) | wedge(Pixel 부채꼴) | bars-thin(One UI 가는 4막대)`, `batteryStyle: outline | pill`(One UI 7+ 숫자가 든 알약, `pill{width,height,fontSize}`), 배터리 잔량, 좌우 `padding`, `fontSize / fontWeight / letterSpacing`, `iconSize` + 아이콘별 배율 `batteryScale / cellularScale / wifiScale`, `iconGap`, `percentScale`(배터리 % 글자 = 시간 대비), `batteryText`, `fixedSize`(가로에서도 크기 유지), `centerY / centerYLandscape`(화면 상단 기준 세로 중심 px — 없으면 밴드 중앙). 프레임 `platform` 으로 고르고 `frameProfiles[*].statusBar` 가 덮어쓰며, `statusBar.profile:'oneui'` 처럼 베이스 프로필을 지정할 수 있다. 모든 값은 `updateStatusBar()` 가 CSS 변수(`--status-font/weight/tracking/icon/gap/battery/cellular/wifi/percent/pad-top/pad-bottom, --pill-*, --battery-level`) 로 넘기고 CSS 는 플랫폼별 크기를 하드코딩하지 않는다(가로 축소 규칙·컷아웃별 padding-top 규칙 제거됨).
  - **2026-09-21 전수 재실측(상태바만, 지오메트리·뷰포트 불변)**: 기준 이미지는 스크래치패드 `renders/` 의 `se/`(Apple 뉴스룸 SE 2022) · `ip14/`(뉴스룸 iPhone 14 Find-My, 1.783px/pt) · `ios26/`(뉴스룸 iOS 26 iPhone 16 Pro, 1.7435px/pt) · `ip18/`(뉴스룸 18 Pro Photos) · `ipad/multitasking`(13" Air 렌더 1.057px/pt) · `apple-support/ios-26-ipad-floating-keyboard.png`(홈 버튼형 iPad) · `oneui7/dl1.jpg`(Samsung 뉴스룸 One UI 7 Rollout, Galaxy S25 렌더 1.128px/CSSpx) · `firstlook-hr/dl3.jpg`(뉴스룸 First Look, Z Fold8 Ultra 잠금 화면 실사진 14.35px/mm) · AOSP `SystemUI/res/values/dimens.xml`(Pixel). 비교 파이프라인: `shot-status.js`(기기 CSS 1:1, 3×) → `sb-batch.js` → `sb-compare.js / sb-compare-wide.js`(공식 · 수정 전 · 수정 후 같은 배율 3단).
  - **iOS iPhone(노치·아일랜드)**: 시간 17 semibold(숫자 12.0pt) · 셀룰러 19×11.8 · Wi-Fi 16.3×11.8 · 배터리 27×12.3~12.6 → `iconSize 12, batteryScale 1.05, wifiScale .97, iconGap 8~9, letterSpacing −.4`(Windows Arial 600 의 "9:41" 폭 33.4 → 실측 31.5~32). **세로 중심은 밴드 중앙이 아니다**: 노치(390) 26pt(노치 33 의 아래쪽), 아일랜드 = 아일랜드 세로 중심(프리뷰 기하 11~48 → 29.5; iOS 26 실측 31.9 는 실제 아일랜드가 13.8~50 에 있기 때문 — 지오메트리 미수정). 여백: 노치 좌 38 / 우 27(photo) · 402 좌 56 / 우 36(photo) · 430 좌 63 / 우 43(derived). 시간은 왼쪽 귀 중앙(+3.8) 에, 아이콘 묶음 중심은 오른쪽 귀 중앙보다 6pt 왼쪽에 놓인다.
  - **iPhone SE(레거시 20pt 바, `layout:'legacy'`) — 기본 프리셋 = Display Zoom '표준'(2026-09-21 5차 확정)**: CSS 375×667 · safeArea.top 20 · 상태바 밴드 20 · 가이드 0~20 · 콘텐츠 중심 10(centerY 미지정 = 밴드 중앙 = 가이드 중앙). 표준 모드 기준값(photo-measured): Apple 뉴스룸 iOS 15 SE 이미지(1.712px/pt) 숫자 8.8pt · Commons "Onion Browser 2.8.1 on iPhone.png"(iOS 18 4.7" 실기기 캡처, 2px/pt) 숫자 8.5 · 셀룰러 16.5×10.5 · 배터리 24×11.5 · 여백 6.5/5.5 · %↔배터리 5.5 → 프로필 `fontSize 12.5(Arial 600 숫자 8.95px) · letterSpacing −.1 · iconSize 11 · batteryScale 1.05 · padding 6.5/5.5 · iconGap 5 · Wi-Fi·100% 표시`. **사용자 제공 reference 참고값**(user-provided reference image `renders/user-se/ref.png`, 375 좌표계 정규화 — 표준 기준보다 약 1.17배 크게 측정됨, Display Zoom '확대' 여부는 설정 정보 미확인·미확정): 숫자 10.7 · "10:00" 폭 37 · 셀룰러 19.5×12.7 · 배터리 27×13.6 · 여백 8/8 · 중심 11.7(바 23.4 상당) · Wi-Fi·% 없음. ×1.17 은 Display Zoom 확대(CSS 뷰포트 320×568) 비율과 일치하는 가능성이며, 확대 모드라면 뷰포트도 달라지므로 기본 프로필에 섞지 않는다 — **향후 확장 메모**: SE 에 '표준 375×667' / '확대 320×568' state 를 두고 확대 state 에서만 15/13/1.05/8/8 을 쓰도록 분리 가능(미구현). SE 가이드 의미: 빨간 빗금 = `env(safe-area-inset-*)` 가이드(값은 frameProfiles.safeArea). SE 는 노치가 없어 iOS 15+ Safari 에서 `viewport-fit=cover` 시 safe-area-inset-top = 상태바 20 → OS 상태바 20 = safe-area 20 = 가이드 20 이 같은 값(노치·아일랜드 기기와 달리). 레거시 배치의 절대 위치 시간은 `--status-pad-top/bottom` 으로 centerY 를 따르고, % 가 숨겨지면 `.status_percent[hidden] ~ .icon_battery` 로 배터리를 오른쪽 끝에 둔다. Windows 글꼴 스택은 Arial 600 유지(Segoe UI Semibold 는 더 좁고 가늘어 작아 보임).
  - **iPad Air 11(iPadOS 26/27)**: 이전 17 은 블러 행 포함 과대 → **글꼴 15**(숫자 10.4pt, 문자열 폭 130.6pt = Segoe UI Semibold 15 와 일치) · 100% 는 시간과 같은 크기(`percentScale 1`) · Wi-Fi .82 · 배터리 아이콘 11 · 간격 8 · 여백 좌 16 / 우 18 · 30 밴드 중앙(실측 16.1).
  - **iPad 9.7 [레거시]**: Apple 지원 문서 iPadOS 26 홈 버튼형 iPad 캡처로 **배치**(시간+날짜 좌 · Wi-Fi·%·배터리 우, 셀룰러 없음) 만 확인(derived). 크기 12/11·여백 7/6 은 20pt 레거시 바 표준값(approximation). 그 캡처는 텍스트 중심이 ≈15pt 라 20pt 바와 맞지 않는데 모델·px/pt 가 불확실해 밴드 높이(official 20) 는 유지 — 6세대 실기기 캡처 확보 시 재검토.
  - **One UI 7/8(Galaxy S25 · Z Flip8 펼침/Flex · Z Fold8 · Tab S11)**: `oneui` 프로필 — 시간 "12:45" 14px 굵기 500 · 가는 4막대 셀룰러(`bars-thin`, viewBox 11×12) · **알약 배터리 23×14 에 숫자(100)** · Wi-Fi 부채꼴 .62 · 간격 7 · 여백 15/15 (S25 렌더 photo-measured; Fold8 Ultra 실사진으로 형상·비율 교차 확인 → 다른 Galaxy 는 derived, Tab 여백은 approximation). 세로 중심: S25·Fold8 커버 23(렌더에서 시간 중심 = 홀 중심 − 2.8 관계를 실기기 홀 중심 26.5 에 적용), 나머지는 밴드 중앙. Flip8 커버 세로는 상태바 없음(verified) 유지.
  - **Pixel(표준 Android)**: AOSP dimens(official) — 시계 14sp · 시스템 아이콘 15dp(가시 ≈12) · 간격 5(2.5sp×2) · 배터리 unified 20.6×12(형상은 기존 외곽선 유지, approximation) · 여백 16/14 approximation. 실기기/공식 캡처 미확보.
  - **Android 가로**: 상태바 창은 컷아웃 safe-area(letterbox 열) 뒤에서 시작 + 프로필 기본 여백(DisplayCutout 규칙) → Pixel·S25 가로에서 시계가 홀 쪽 코너에 걸리던 문제 해소. 가로에서 글꼴·아이콘을 줄이던 CSS 규칙은 제거(Android 는 가로에서도 같은 크기, iOS 는 가로 Safari 에서 상태바 없음).
  - **iPhone Duo**: 코너 클러스터는 2026-09-18 실측값 유지(뉴스룸 이미지 재확인: 링 Ø/시간 높이 비 3.56 vs 프로필 3.54, 링–시간 중심 거리 비 0.906 vs 0.925).
  - 상태바 검증 중 발견한 **지오메트리 의심 항목(미수정, 별도 결정 필요)**: ① iPhone 16/18 Pro 아일랜드 실측 위치 13.8~50pt(프리뷰 11~48) ② Galaxy S25 One UI 7 렌더의 홀 중심 16.8px(프리뷰 26.5; 렌더 베젤이 실기기보다 얇아 렌더 쪽 오류 가능성) ③·④ 는 2026-09-21 처리 완료(Fold8 펼침 홀 위치 photo-measured 로 보정 → 회전 시 상태바 행과 겹치지 않음, safe left 38 / Flip8 커버 가로 상태바 제거) — 위 "현재 실기기 외형 보정 상태" 의 Fold8·Flip8 항목 참조.
- `browserProfiles` — 브라우저 UI 밴드 높이(`statusBar / urlBar / toolbar / homeIndicator`, 세로·가로), `urlBarPosition` 기본값, `sideInset:'safe-area'`(가로 letterbox). **`ios-chrome`(2026-09-22 photo-measured, 사용자 제공 iPhone 17 Pro 실기기 Chrome 캡처 `renders/user-chrome/ref.png` 941×2048 = 402×874pt, 2.341px/pt)**: 세로 urlBar **50**(pill 36 = 상 4 / 하 10, 좌우 여백 10, 완전 둥근 평면 회색, URL 14pt 가운데, 선행 페이지 정보 19 · 후행 공유 16×18) · toolbar **44** + 홈 인디케이터 영역 34 에 같은 배경 · 버튼 5개 [← → +(원 Ø36) 탭 카운터 24×24 …] 36 슬롯 `space-between` + 좌우 13.4 → 중심 31.4 / 116.2 / 201 / 285.8 / 370.6(실측 점 아이콘 362.9 는 글리프 오프셋으로 판단), y = 툴바 중앙. Safari 식 공유/북마크 대신 Chrome 구성(`.tb_new`, `.browser_share`, 화살표 `.arrow`) 을 `[data-browser="ios-chrome"]` CSS 로 분기. 값은 pt 공통이라 390/430 에서도 같은 여백으로 배치(뷰포트·아일랜드·safe-area 는 프레임 프로필). 가로 44 는 approximation. 키: `ios-safari | ios-chrome | android-chrome | samsung-internet | tablet-chrome | android-tablet-chrome | android-tablet-samsung | ipad-safari | ipados-safari | duo-safari`. `android-tablet-*`(`formFactor:'tablet'`) 는 기본 브라우저가 태블릿 프로필인 기기(Galaxy Tab) 에서만 목록에 노출되며, OS 상태바 24·내비 바 24 높이를 프레임이 아니라 이 프로필에서 명시한다(approximation). `ipados-safari`(홈 인디케이터형 iPad) 는 상태바 = 프레임 safeArea.top(28), 탭 바 50(approximation), 홈 인디케이터 밴드 0(iPad Safari 는 콘텐츠가 그 아래까지 펼쳐짐 → safe-area 가이드로만 표시). 구 키 `phone/compact/tablet` 은 `browserAliases` 로 호환. `duo-safari` 는 `layout:'side'`(측면 컨트롤 열, 밴드 전부 0) · `exclusive`(Duo 기본일 때만 목록) · `standardFallback:'ios-safari'`(표준 가로 바 상태에서 밴드 차용, 상태바 밴드 0) · `side{circle,capsule,pitch,gap,clusterGap,bottomMargin,top,topCapsule,bottomCapsule}`. state 의 `uiLayout:{natural,rotated}` 가 자세별로 `side | bars` 를 정한다.
- `devices` — 프리셋. `name, group, subtitle, note, source, frame, browser, dpr, states[]`. state 는 `width/height(CSS px), diagonal, physicalWidth/Height, frame/browser 오버라이드, hinge, hingeSize, hingePosition, orientation('portrait'|'landscape' 기본 자세), scaleWidth/Height`. `deviceGroups`, `deviceAliases` 와 함께 관리. `validateDevices()` 가 누락·오타를 콘솔 경고로 알린다(`source` 누락도 경고).
- **새 기기는 `devices`(+ 필요 시 `frameProfiles`) 데이터 추가만으로** 사이드바·카운트·WebMCP enum 에 자동 반영되어야 한다. 새 마감이 필요할 때만 CSS 에 `data-family` 하나를 추가한다.

### 뷰 모델
- `view` 객체 = 기기 프리뷰 1개(`dom, deviceId, stateId, rotated, baseWidth/Height, currentWidth/Height, frameProfile, frameInsets, scale, loaded, compare`). 단일 보기는 `primaryView`, 다중 비교는 `compareViews: Map<deviceId, view>`(최대 4).
- 지오메트리·렌더 함수는 모두 `view` 인자를 받는다(`getSiteViewport(view)`, `updateFrame(view)`, `updateBrowserChrome(view)`, `updateScale(view)`, `renderView(view)` …). 전역 표시 설정(주소창·툴바·UI 겹침·주소창 위치·safe-area·배율·URL)은 `refreshViews()` 로 모든 view 에 적용.
- 기기 셸 마크업은 `<template id="deviceShellTemplate">` 하나에서 `mountShell()` 로 생성. 단일 셸에는 기존 id(`deviceShell, screenWrap, siteView, siteFrame, bandStatus, bandUrl, bandToolbar, bandHome, browserUrl, hingeLine`)를 JS 가 부여. 비교 카드는 `<template id="compareItemTemplate">`.
- 아이콘은 `<svg class="icon_sprite">` 의 `<symbol>` 을 `<use>` 로 공유. 규칙: 24×24 viewBox, outline, 전역 `stroke-width 1.8`, `currentColor`, `aria-hidden="true"`, 버튼에는 `aria-label`.

### 시작 화면 (.intro_screen, 2026-09-21)
- URL 이 연결되기 전(`currentUrl` 비어 있음) 에만 `.preview_stage` 위를 덮는 소개 영역. `updateIntro()` 가 `loadUrl()` 끝과 부트스트랩 끝에서 `hidden` / `.preview_stage.is_intro` 를 토글한다. 기기 셸·비교 그리드는 `visibility:hidden` 으로만 숨겨 레이아웃(배율·측정) 이 유지된다.
- 입력창을 복제하지 않는다: CTA(`#introUrlBtn`) 는 상단 `#siteUrl` 로 포커스만 옮긴다. `#introSkipBtn`("URL 없이 기기 프레임 먼저 보기") 은 세션 한정 플래그 `introDismissed` 로 닫는다(저장 안 함).
- 실루엣(`.intro_device`) 은 CSS 장식이며 frameProfiles·기기 프레임 로직과 무관. iframe 안의 srcdoc placeholder(`initialPreviewContent`, 2026-09-21 재디자인) 는 "아직 URL 이 연결되지 않은 웹페이지" 처럼 보이는 옅은 wireframe/skeleton: 흰 배경 위에 헤더(로고 블록 + 메뉴 라인) · hero 라인 1~2개 · 콘텐츠 블록(이미지 rect + 라인) 과 작은 한 줄 안내("URL을 입력해 미리보기를 시작하세요." / 좁으면 "URL을 입력해 주세요."). 색은 #eceff3·#f1f3f6 저대비, 카드·아이콘 없음. 안내 문구는 UI 텍스트라 기기 크기에 비례해 줄이지 않고 **15px 고정(≥700px 16px)** — vmin·% 기반 font-size 금지(프리뷰 배율 0.4~0.6 이 추가로 곱해지므로 CSS px 자체가 작으면 읽을 수 없음). 반응형: ≤340px 폭 메뉴 라인 2개·짧은 문구, ≤280px 높이(Flip 커버) hero 보조 라인·블록 라인 생략, ≥700px 블록 3개, ≥1000px 블록 4개.
- 기능 칩의 "Scroll Sync*" 와 각주(`.intro_note` "* 외부 사이트는 브라우저 보안 정책에 따라 일부 기능이 제한될 수 있습니다.") 는 Same-Origin Policy 제한을 오해하지 않게 하는 보조 표기. 숨김은 `hidden` 속성(+ `.intro_screen[hidden]{display:none}`) 이라 CTA·skip 버튼이 Tab 순서·접근성 트리에서 제외되고, 표시 중에는 덮인 셸이 `visibility:hidden` 이라 iframe 도 Tab 순서에서 빠진다(2026-09-21 확인).

### 컨트롤 패널
- CSS Grid 5영역 고정: `device | fold | size | browser | tools` (grid-area). 접힘/펼침 열은 `--fold-col`(200px) 로 **항상 예약**하고 단일 화면 기기는 "단일 화면" 안내로 자리를 유지한다. JS 로 DOM 순서를 바꾸지 않는다.
- 폭 부족 시 순서 유지한 채 ≤1520px 2행(`device fold size` / `browser browser tools`), ≤700px 1열. `select`·배율 `output` 은 고정 폭(열 폭 흔들림 방지).
- 상태 전환(커버↔펼침)은 버튼 DOM 을 다시 만들지 않고 `updateStateButtons()` 로 표시만 바꾼다.
- **표시 배율(2026-09-21)**: `.scale_controls` = [−] [`#scaleInput` % 텍스트 입력] [+] [화면 맞춤 `#scaleFitBtn`] [실기기 `#scaleDeviceBtn`]. `scaleMode` ∈ `fit`(창·기기·회전 시 재계산) | `manual`(`manualScale`, 25~200% 5% 단위, 창 크기 변경에도 유지) | `device`(공개 inch 물리 근사). 기기 프레임의 `transform: scale` 만 바꾸며 iframe CSS 뷰포트·미디어 쿼리·DPR·프로필은 무관. **100% = 기기 CSS 1px : PC CSS 1px(물리 크기 아님)** — UI title/sr-only 설명·사용법에 명시. 예전 저장값 `actual` 은 `manual` 100% 로 이관. 입력 필드는 `.scale_controls input`(세그먼트 라디오 숨김 규칙) 과 `.scale_controls label span` 규칙을 되돌리는 CSS 가 필요하다(`.scale_field input`, `.scale_controls .scale_field .scale_unit`).

### 스타일 규칙
- 클래스는 snake_case(`device_btn`, `compare_item`), 상태는 `is_*`, JS→CSS 상태는 `data-*` 속성. CSS 에서 id 선택자 사용 안 함. 규칙은 여러 줄 포맷.
- 소형 텍스트 대비 WCAG AA 4.5:1 이상. `:focus-visible`, `prefers-reduced-motion` 유지.

## 레이어 구조 (반드시 분리)

```
device body      .device_shell            바디 = 금속 링(--ring-finish), --body-tl/tr/br/bl 코너
→ bezel          .device_shell::before    글래스 베젤(링 안쪽 검은 유리), 코너 = glassRadius(--glass-*) 또는 바디 − ring
→ physical display .screen_wrap           디스플레이 마스크: overflow:hidden + --screen-tl/tr/br/bl (듀얼스크린은 clip-path: path())
→ OS status bar  .band_status             시간·셀룰러·Wi-Fi·배터리 (자체 SVG + One UI 알약 배터리 .status_pill, statusBarProfiles)
→ hinge body     .hinge_body (.frame_detail 안)   힌지 커버: spine(셸 바깥 힌지 쪽) / seam(접힘선 양끝 테두리). 바디·디스플레이·접힘선과 별개
→ Duo OS status UI .status_cluster / .dynamic_island   iPhone Duo(iOS 27) 코너 상태 클러스터 · 세로 Dynamic Island(Live Activity). 가로 상태바 밴드 대신 사용, 컷아웃과 별개
→ Duo browser UI .side_controls                  측면 컨트롤 열(뒤로 원형 + 캡슐 / 하단 캡슐). 가로 URL·툴바 밴드 대신 사용
→ hardware cutout .screen_cutout (셸 직계 자식, 디스플레이 마스크 바깥) / .hinge_line / .frame_detail   노치·아일랜드·펀치홀·듀얼 렌즈+플래시·접힘선·홈 버튼·스피커·카메라
→ browser UI     .band_url / .band_toolbar / .band_home          browserProfiles
→ webpage viewport .site_view > iframe
```
- 하나의 radius 나 하나의 wrapper 로 뭉뚱그리지 않는다. iframe 에 radius 를 주지 않는다(마스크는 `.screen_wrap`).
- 컷아웃은 상태바·브라우저 UI 와 다른 레이어. `.screen_cutout` 은 `.screen_wrap`(마스크) 바깥의 `.device_shell` 직계 자식이며 CSS 가 `--frame-left/top` 을 더해 화면 좌표에 놓는다 → 마스크에 홀(`display.mask:'holes'`)이 있어도 렌즈는 그 위에 그려진다. 좌/우 정렬 컷아웃(Fold 펼침 우상단 카메라 등)은 상태바 아이콘이 `--status-pad-*` 로 비켜난다. 세로 하단 컷아웃(`cutout.bottom`, Flip8 커버)은 세로에서 상태바에 영향이 없고, 가로에서는 우상단으로 오므로 `--status-pad-right` 와 URL 밴드 `--band-pad-right` 가 카메라 열을 비켜난다.
- 전면 디테일(홈 버튼·스피커·카메라·센서)은 `frameProfiles[*].controls` → CSS 변수(`--home-*, --speaker-*, --camera-*, --sensor-*`)로 그린다. 가로 모드는 상단→왼쪽, 하단→오른쪽(반시계).
- 화면 크기 = `--viewport-width/height`(기기 전체 CSS 화면), 실제 웹 뷰포트는 `getSiteViewport()` 결과(밴드를 뺀 값). 축소는 `transform: scale` 이라 iframe 내부 CSS px 는 보존된다.

## 기기 데이터 규칙

- 모든 기기 외형은 `frameProfiles` 등 프로필 데이터로 관리한다. **특정 기기명을 CSS 에 하드코딩하지 않는다**(`data-family` 만 허용).
- iPhone / Galaxy / Pixel 을 같은 형상으로 처리하지 않는다(각각 다른 코너·베젤·컷아웃·상태바).
- Fold / Flip / Duo 구조를 서로 구분한다. Fold 는 단일 폴더블 디스플레이 + 접힘선. Flip 은 커버·펼침·Flex 상태별 프로필. Duo 는 **실제 제품 구조 기준**으로 처리한다.
- 접힘 / 펼침 / cover / flex 등 상태별로 다른 프레임 프로필을 허용한다(`state.frame`).
- 폴더블 펼침처럼 가로형 비율이지만 세로로 드는 상태는 `orientation:'portrait'` 로 명시한다(방향 판정은 `rotated` + 기본 자세).

## 실기기 정확도 규칙

- **기기 외형 수치를 임의로 만들지 않는다.** 공식 제조사 자료(해상도, 바디 mm, iOS safe-area)를 최우선으로 사용한다.
- 값의 근거를 `frameProfiles[*].source` 에 항목별로 표기한다: `official`(제조사 공개 수치) · `verified`(**해당 모델** 실기기 값 또는 해당 모델을 직접 측정한 신뢰 가능한 결과가 있을 때만) · `derived`(공개 수치에서 환산, 또는 동일 패널·전작 등 다른 모델의 자료를 준용한 inferred 값) · `photo-measured`(공식/신뢰 렌더 실측, 파일명·비율 기록) · `approximation`(근거 없음).
- **`verified` 판정 기준(2026-09-21 확정)**: 전작·동일 패널·같은 계열 기기의 레퍼런스를 준용한 값은 아무리 확실해 보여도 `verified` 가 아니라 `derived` 로 적고, note 에 어떤 모델·자료를 준용했는지와 "실기기 확인 시 verified 로 승격" 조건을 남긴다(iPad Air 11 M4 · Galaxy Tab S11/S11 Ultra 의 cssViewport 가 그 예).
- `approximation` 값을 실제 공식 수치처럼 표현하지 않는다. "실제 pt 값 기준" 같은 표현은 근거가 확인된 값에만 쓴다.
- **해상도 표기 규칙**(Flip8 커버·펼침 적용, 2026-09-21): 세 값을 같은 의미로 혼용하지 않는다. `nativePhysicalResolution` = 제조사 공식 표기값 그대로(official, 예: 1048×948 / 2520×1080) · `renderedPhysicalResolution` = 프로그램의 세로 방향 기준 width×height 로 정규화한 값(derived-orientation, state 의 `physicalWidth/Height`) · `cssViewport` = DPR 가정을 적용한 파생값(derived). 같은 제조사라도 지역 페이지마다 인쇄 순서가 다를 수 있으니 출처를 함께 적는다.
- 환산 규칙: `px/mm = CSS 폭 ÷ 디스플레이 활성영역 폭(mm)`, 활성영역은 대각선·해상도 비율에서 계산, `베젤 = (바디 − 활성영역) ÷ 2`. 렌더가 없을 때 바디 코너는 `화면 코너 + 베젤`(동심 가정, derived)로 유도한다.
- iOS 디스플레이 코너(47.33 / 55 / 62pt 등)는 커뮤니티 측정 `_displayCornerRadius` 값이며 Apple 공식이 아니다 → `derived/reference` 로 표기. Dynamic Island 126×37pt @11 도 커뮤니티 측정.
- Android 상태바 높이는 "컷아웃을 감싸는 높이(컷아웃 하단 + 여백)" 논리로 유도한 derived 값이다.
- **자동 테스트 통과와 실기기 외형 정확도 검증은 별개**다. 외형을 바꾸면 반드시 실기기/레퍼런스 렌더와 프리뷰를 비교한다(종횡비, 외곽·화면 곡률, 베젤, 컷아웃, 홈 버튼, 힌지, 상태바 위치).
- 렌더 실측 파이프라인: 스크래치패드의 `measure-run.js` + `measure-page.js`(헤드리스 Edge canvas 픽셀·기하 분석). SVG 벡터 렌더는 rect/circle 좌표를 직접 읽는 편이 정확하다. 실측에 쓴 파일: Commons `IPhone SE (2nd generation) white vector.svg`, `IPhone 12 Blue.svg`, `Galaxy S25 Black (front).png`(7.0px/mm), `Google Pixel 9 (Obsidian) front.svg`(정확히 10px/mm), samsung.com `galaxy-z-flip8-features-colors-design.jpg`(5.93px/mm, Flip8 접힘 정면), Samsung Newsroom `...Launch_dl3F.jpg`(3.6px/mm, Flip8 펼침 상단부), Apple tech specs `ipad-air-11-inch-m4.png`(3.37px/mm), samsung.com US 갤러리 `us-galaxy-tab-s11-…-550443947`(5.80px/mm) / `us-galaxy-tab-s11-ultra-…-548666708`(4.48px/mm).

## 브라우저 UI 규칙

- 주소창 위치(상단/하단)와 기기 종류를 분리한다. 브라우저 프로필이 기본값을 갖고, 사용자가 바꾸면 `urlBarPositionByBrowser` 로 브라우저별 기억. 가로 모드는 항상 상단(라디오 비활성). 상단이면 상태바(컷아웃 영역) 아래에서 시작.
- Chrome / Safari / Samsung Internet(+ Chrome(iOS), Chrome(태블릿), Safari(iPad)) 프로필을 유지한다. 브라우저 선택은 플랫폼별로 기억(`browserByPlatform`); 다중 비교에서는 선택 비활성.
- 사이트 영역 계산: 기본(축소) 모드 = 모든 밴드를 뺀 svh 상황, UI 겹침(overlay) 모드 = 상태바·홈 인디케이터만 빼고 URL 바·툴바를 콘텐츠 위에 얹는 lvh 상황(100vh 가림 확인용). 주소창 OFF 여도 상태바·홈 인디케이터는 남는다.
- iOS·Android 가로 모드에서는 컷아웃 쪽 safe-area 만큼 사이트 폭이 줄어든다(`sideInset:'safe-area'`, letterbox 열).

## 다중 비교 · 스크롤 동기화

- 다중 비교(최대 4): 사이드바가 체크박스로 바뀌고 카드는 CSS Grid `auto-fit` 로 1~4열 자동 배치(JS 로 순서 변경 없음). 카드 추가/제거 시 해당 iframe 만 생성/제거하며 설정 변경은 CSS 변수만 갱신한다.
- 스크롤 동기화는 절대 px 가 아니라 비율 `scrollTop ÷ (scrollHeight − clientHeight)` 로 맞춘다. 프로그램 스크롤의 되돌림은 값·시간 가드로 막는다.
- **Same-Origin Policy** 때문에 외부 출처 iframe 은 스크롤을 읽거나 옮길 수 없다. 이 경우 스위치를 비활성화하고 비교 바·카드 배지에 이유를 표시한다. **보안 정책을 우회하는 코드는 만들지 않는다.** 향후 cross-origin 은 Chrome Extension content script(all_frames) 방식으로만 가능하며 `getScrollRatio/applyScrollRatio/broadcastScroll` 이 그대로 옮겨질 수 있는 구조다.
- 같은 출처 판정 함정: 도구를 `file://` 로 연 경우, `localhost` ↔ `127.0.0.1`, 다른 포트.

## 검증 방법

- 기능 검사: 스크래치패드의 파일 기반 헤드리스 Edge 스위트(`make-test.js` → `test.html`, 가상 시간). 가상 시간에서는 rAF·네이티브 scroll 이벤트가 발생하지 않으므로 스크롤 검사는 이벤트를 직접 발생시킨다. 스로틀은 rAF 대신 16ms 타이머.
- 실시간 검사: `cdp-run.js`(로컬 서버 5601 = 같은 출처, 5602 = 다른 출처 + CDP). 스크롤 동기화·cross-origin 처리·스크린샷은 여기서 확인한다.
- 값을 의도적으로 바꾸면 테스트 기대치도 그 값으로 갱신하되, 반드시 환산 근거를 확인한 뒤 바꾼다. 기대치 갱신으로 "통과"를 만드는 것은 외형 검증이 아니다.
- 맞춤 배율은 뷰포트 높이로 상한을 둔다(스테이지 높이는 콘텐츠에 따라 늘어나 자기참조 진동이 생김). `.preview_stage` 는 `scrollbar-gutter: stable`.

## 저장 키 (localStorage)

`viewportLabDevice`(기기·상태·회전·직접 입력값), `viewportLabDisplay`(배율 모드 `scaleMode`·수동 배율 `manualScale`·밴드 스위치·UI 모드·safe-area·플랫폼별 브라우저·브라우저별 주소창 위치), `viewportLabCompare`(모드·카드·동기화 옵션), `viewportLabUrl`.

## 현재 실기기 외형 보정 상태 (2026-09 기준)

- **iPhone SE — 대표 모델은 3세대(2022)**: 프리셋 표시명 "iPhone SE (3세대)". 2세대(2020) 는 바디 67.3×138.4mm · 4.7" 1334×750 · CSS 375×667 · 홈 버튼 구조가 같아 별도 프리셋을 추가하지 않는다(외형/뷰포트 테스트 목적에서 중복). 공식 이미지·상태바 검증 자료(Apple tech specs 111866, 뉴스룸 2022 SE 이미지) 는 3세대 기준. 홈 버튼형 별도 프로필(`iphone-se`, family `iphone-classic`)로 보정 완료. 베젤 상하 110 / 좌우 28(derived), 홈 버튼 67px·링 3·하단 중심 55(photo-measured), 스피커·카메라·센서 위치 photo-measured, 화면 코너 0.
- iPhone 12/13/14(390): 베젤 21(derived), 바디 코너 66(photo), 화면 47(reference), 노치 168×33(derived). 14 Pro Max/15 Plus(430): 베젤 19, 화면 55, 바디 74(derived). iPhone 18 Pro: `iphone-dynamic-pro` 402×874 / 1206×2622(official), 베젤 15·화면 62·상단 safe-area 62(16 Pro 준용, 18 Pro 치수 미확인).
- Galaxy S25 프리셋(`mobile-360`, 360×780 official)과 "Android 20:9 범용"(`android-generic-360`, 360×800, neutral, 실기기 아님) 분리. S25 베젤 12/11(derived), 코너 36/24, 펀치홀 19@17(photo).
- Pixel 9/10: 베젤 22, 코너 64/54, 펀치홀 30@18(photo, 10px/mm 벡터), 상태바 52(derived).
- iPad 9.7(`tablet-768`, `ipad-home`, family `ipad-classic`; 가로 1024×768 은 회전으로 — 별도 프리셋 `tablet-1024` 는 2026-09-21 제거, `deviceAliases` 로 저장값 호환): 베젤 좌우 56 / 상하 112(derived), 홈 버튼 57(approximation), 화면 코너 0, 상태바 20, 홈 인디케이터 없음, 기본 브라우저 Safari(iPad). 그대로 유지(2026-09-21 iPad Air 추가 시 미수정).
- **Galaxy Tab S11 / S11 Ultra (2026-09-21 추가, family `galaxy-tab`)**: Samsung Global Newsroom 2025-09-04 사양표 + samsung.com/sec·uk 스펙 official — S11 바디 253.8×165.3×5.5mm · native **2560×1600** · 대각선 278.1mm(둥근 모서리 276.2) / Ultra 바디 326.3×208.5×5.1mm · native **2960×1848** · 369.9mm(367.2) · "narrow 5.2mm bezels"(Ultra, 각주: S11 7.8mm). 해상도 세 층위: native official → rendered 1600×2560 / 1848×2960 derived-orientation → cssViewport **800×1280 / 924×1480 @2 derived**(S11 실기기 미검증 — 동일 해상도·밀도 패널의 전작 Tab S9 / S9·S10 Ultra 가 보고된 1440px.com 레퍼런스를 준용한 inferred 값; 실기기 innerWidth·devicePixelRatio 확인 시 verified 로 승격). Samsung 은 CSS 폭·DPR 미공개.
  - 활성영역(derived, 공식 대각선 기준): S11 235.9×147.4mm → 5.43px/mm, 베젤 8.95mm → **49**(Samsung 7.8mm 는 유리 베젤 폭으로 해석) / Ultra 313.8×195.9mm → 4.72px/mm, 베젤 6.3mm → **30**(5.2 유리 + 1.1 프레임).
  - 렌더 실측(photo-measured, samsung.com US 갤러리 투명 PNG 2052×1641, 스크래치패드 `renders/tab/`): S11 `…550443947`(5.80px/mm) 바디 코너 9.75mm → 53 · 화면 코너 3.3mm → 18 · 카메라 긴 변 베젤 중앙, 가장자리에서 4.9mm(inset 27) Ø10 · 노치 없음 / Ultra `…548666708`(4.48px/mm) 바디 코너 9.9mm → 47 · 화면 코너 4.5mm → 21 · **wave 노치** 깊이 2.8mm → 13, 폭 13.2mm → 62 · 카메라 노치 위 베젤 안 5.4mm(inset 25) Ø10. 키(가로 상단 변 → 세로 오른쪽 변): 두 모델 모두 46.5~47mm 부터 20mm(볼륨 추정) · 77mm 부터 13mm(전원 추정) · USB-C 짧은 변 중앙(측면 렌더). S11 과 Ultra 는 베젤·코너·노치 유무·후면 카메라 수가 다르며 확대판으로 처리하지 않았다.
  - One UI/브라우저: 상태바는 `android` 프로필(가로에서도 크기 유지 `fixedSize`), 높이 24 · 제스처 바 24 는 **approximation**(공식 UI 스크린샷 미확보; One UI 기본 3버튼 내비는 48dp). `android-tablet-chrome`(탭 스트립+툴바 96) / `android-tablet-samsung`(상단 100 · 하단 툴바 52) 도 approximation.
  - 회전 검증: 세로 800×1280 / 924×1480 → 가로 1280×800 / 1480×924, safe-area 24/24 유지, 카메라 상단 중앙, Ultra 노치 오른쪽 변 중앙 → 상단 중앙, 키 오른쪽 변 → 상단 변, USB-C 하단 → 오른쪽.
  - 태블릿 그룹 순서: iPad Air 11 → Galaxy Tab S11 → Galaxy Tab S11 Ultra → iPad 9.7형 [레거시](이름만 변경, 프로필 그대로).
- **iPad Air 11 (M4, 2026)(`ipad-air-11`, family `ipad-modern`, 2026-09-21 추가)**: Apple tech specs(support.apple.com/126471) official — 바디 247.6×178.5×6.1mm · native **2360×1640** 264ppi · 대각선 10.86"(27.59cm) · "Landscape 12MP Center Stage camera" · Top button/Touch ID · USB-C. 해상도 세 층위: `nativePhysicalResolution` 2360×1640 official → `renderedPhysicalResolution` 1640×2360 derived-orientation → `cssViewport` **820×1180 @2 derived**(M4 실기기 미검증 — 동일 해상도·패널의 이전 모델 iPad Air 11" M2 레퍼런스(Use Your Loaf "iPad 2024 Screen Sizes")를 준용한 inferred 값; Apple HIG Layout 표는 현재 미게시라 official 도 아님. 실제 M4 에서 innerWidth·innerHeight·devicePixelRatio 확인 시 verified 로 승격).
  - 활성영역 derived: 공식 대각선 275.9mm ÷ 2873.8px → 226.6×157.4mm → 5.21px/mm, 베젤 4변 10.5mm → **55**. 렌더 실측(photo-measured): Apple tech specs 11" 정면 렌더 `ipad-air-11-inch-m4.png`(3.37px/mm, 스크래치패드 `renders/ipad/`) 바디 코너 13.4mm → **70**(동심 검산 18+55), 화면 코너 3.0±0.3mm → **18**(13" 뉴스룸 렌더 3.2mm · 참고값 18pt 일치), ring 5.
  - 전면 디테일(photo-measured, 11" 렌더 + 13" 뉴스룸 `Apple-iPad-Air-M4-multitasking-260302` 교차 확인 — 두 모델 모두 264ppi 라 pt 값 동일): 카메라 우측 긴 변 베젤 중앙선, 화면 중심 위 9.5mm → `camera:{edge:'right',offset:-49,size:15}` · 조도 센서 아래 9.8mm → `sensor:{edge:'right',offset:51}` · 볼륨 2개 우측 변 19.0~39.8mm(`keys` start 99/159, 길이 48; 두 버튼 분할은 approximation) · 상단 버튼/Touch ID 상단 변 우측 끝 12.5~30mm(start 774, 길이 93) · USB-C 하단 변 중앙(위치 official, 폭 47 approximation).
  - iPadOS 26/27 UI(2026-09-21 재실측): 상태바 **30**(13" 렌더 1.06px/pt + iPadOS 27 hero 11" 교차: 시간 텍스트 중심 15pt → 중심 대칭 가정 **approximation**; 시간/날짜 글꼴 **17**(숫자 높이 12.3pt), "100%" ≈13(.78em), 배터리 24.5×11 → 아이콘 11, Wi-Fi 12.6×8(.78배), 여백 좌 14/우 16, 가로에서도 동일 `fixedSize`) · 홈 인디케이터 safe-area 20(derived — iPad 계열 공통 UIKit 기준 준용, M4 실기기 미검증; 폭 300 approximation, Safari 에서는 밴드 0) · Safari 탭 바 50 approximation. 세로/가로 모두 safe-area 30/20, 사이트 820×1100 / 1180×740. 베젤(10.5mm=55px, 하드웨어) 과 상태바 높이(OS) 는 별개로 관리하며 텍스트/베젤 비 22% 가 렌더와 일치.
  - 회전 검증: 카메라 상단 중앙 왼쪽·센서 오른쪽(13" 렌더 −9.5/+9.7mm 일치), 볼륨 상단 변 왼쪽, Touch ID 왼쪽 변 위, USB-C 오른쪽 변 중앙, 상태바 크기 유지.
  - 부수 수정: 상태바 SVG 아이콘 숨김이 `.hidden` 프로퍼티(SVG 에 없음) 라 동작하지 않던 버그를 `toggleAttribute('hidden')` 로 고침 — 기존 프리셋은 아이콘 3종을 모두 쓰거나 상태바가 없어 화면 변화 없음(스크린샷 픽셀 동일 확인).
- Fold8 커버(`fold8-cover`, 2026-09-21 재실측): samsung.com US 갤러리 Scene7 투명 PNG `us-galaxy-z-fold8-f971-600257-sm-f971ulvaxaa-553840953`(접힘 정면, 2052×1641, 화면 753px = 416 CSS px → 1.81px/px, 바디 836px = 81.9mm) 로 **바디·글래스·화면 코너를 각각 실측** — 동심 관계가 아님: 바디 힌지 반대쪽 33px → **18**, 힌지 쪽 앞판 7~11px → **5**(스파인 12px 은 별도, 미구현) · 글래스 4코너 17px → **9**(`glassRadius`) · 화면 4코너 13px → **7**. 홀 Ø37px → 20, 중심 상단에서 20.2 → top 10. **상단 세 값 분리**: `safeArea.top 30` = 홀 하단(env(safe-area-inset-top) 의미 = 빗금 가이드 높이) · `statusBarHeight 33` = 홀 하단 + 3(One UI 상태바 창, 콘텐츠 시작; S25 +1.5·Flip8 +2.5·Pixel +4 의 중간값, derived) · 상태바 텍스트 중심 = 밴드 중앙 16.5(홀 중심 − 2.8 관계와 일치). 가로 left 30 = 회전 시 홀 하단. 세로 사이트 높이 539 → 544. **베젤·링·스파인(같은 렌더 photo-measured, 2차 보정)**: 프레임(링) 13~14px → 7 · 글래스 상하 22px → 12.2 / 우 21px → 11.6 / 좌 22.5px → 12.4 → `top 20 · right 19 · bottom 20 · left 19 · ring 7`(상하≠좌우, 링 7 + 글래스 13/12). 힌지 스파인은 Duo 외부와 같은 북타입 구조(앞판 바깥 별개 레이어, 앞판과 1px 홈, 상하 안쪽으로 들어간 끝, 바깥 코너만 둥긂) 임을 렌더(x=616 어두운 홈 선·y 202 시작·바깥 코너 6~8px) 로 확인 → `hingeBody {spine, left, width 8, inset 7, radius 4}`(폭 14.5px · 상하 13px). 좌측 총 폭 19 + 8 = 27(실측 26.5). CSS 화면 416 과 화면 위치 관계는 그대로(스파인은 셸 바깥, mount 폭만 8 증가). 하단 제스처 바 24 는 `approximation`. **펼침 카메라 홀(2026-09-21 photo-measured)**: 뉴스룸 보도자료 `Launch_dl5_F.jpg`(1440×960 펼침 정면 카메라 앱 렌더, 화면 874px = 816 CSS px → 1.071px/px, 종횡비 1.324 = 1848×2448 일치) 실측 — 홀 Ø18.7 · 중심 우측 가장자리에서 **196** / 상단에서 21 → `cutout {top:12, align:right, offset:187}`(코너가 아니라 폭의 76% 지점; Fold8 Ultra 실사진에서도 같은 위치 비율). 세로 상태바 아이콘은 Android 우측 컷아웃 규칙대로 홀 왼쪽(pad-right 213). 회전(반시계) 시 홀은 왼쪽 변 187~205 에 놓여 가로 상태바 행(24) 과 겹치지 않음 → `safeAreaLandscape.left 38`(홀 오른쪽 30 + 8, derived). `tablet-chrome` 가로에는 `sideInset` 이 없어 회전 뷰포트(616 폭) 는 그대로이며 콘텐츠가 홀 아래로 지나간다 — 실제 Chrome 은 측면 컷아웃을 letterbox 하므로 `sideInset:'safe-area'` 추가(뷰포트 616→578) 는 별도 결정.
- **Galaxy Z Flip8 커버(2026-09-21 보정, `flip8-cover`)**: 공식 사양(Samsung Global Newsroom 2026-07-22 보도자료) 커버 4.1" 342ppi("full rectangular form" 기준, 실제 가시 영역은 코너·카메라 홀만큼 작음) · 접힘 **75.4×85.7×13.1mm** · 펼침 75.4×166.9×6.1mm · 메인 1080×2520 400ppi. **해상도 표기는 세 층위로 구분**(아래 "해상도 표기 규칙"): `nativePhysicalResolution` **1048×948 official**(한국 뉴스룸·samsung.com/sec 표기; 글로벌 영문 뉴스룸 사양표는 948 x 1048 순서로 인쇄) · 대각선 104.8mm official → `renderedPhysicalResolution` **948×1048 derived-orientation**(프로그램이 세로 기준 width×height 로 정규화한 값, official 원문값 아님; state 의 `physicalWidth/Height`) → `cssViewport` **316×349 derived**(÷DPR 3 가정, Samsung 은 CSS 폭·DPR 미공개). 활성영역은 ppi 기준 70.4×77.8mm(4.1" 기준 69.9×77.2 보다 정확) → 4.49px/mm.
  - 렌더 실측(photo-measured): samsung.com `galaxy-z-flip8-features-colors-design.jpg`(2048×1232, 접힘 정면, 5.93px/mm; 화면 418×461px 비율 1.103 = 공식 1.1055 와 0.2% 내 일치). 스크래치패드 `renders/samsung/`, 분석은 `measure-page.js` 의 `flipCover / arcFit / cornerRadius(cls notdark·pink)`.
  - **구조**: 힌지가 **위**(스파인 12, 양옆 6 안쪽, 끝 r 5 · `hingeBody spine top`), 카메라 2개 **가로 배치 우하단** + 플래시는 카메라 **왼쪽**, 디스플레이가 렌즈 주위를 감싼다(렌즈·플래시 = 화면 안의 홀). 코너: 힌지 쪽 위는 거의 각짐(바디 2 · 화면 2), 아래는 바디 31(7.0mm, 원 맞춤 rms 0.28) · 화면 21(4.7mm). 베젤 상 13 / 좌우 11 / 하 10, ring 6(프레임 1.35mm + 검은 유리 1.15mm).
  - 카메라: 렌즈 외경 59(13.2mm) · 링 4 · 렌즈 간격 5 · 중심 간격 64 · 우측 렌즈 중심이 화면 우측·하단에서 각 40 · 플래시 18(테 포함 4.0mm), 좌측 렌즈 중심에서 50 왼쪽 → `cutout:{type:'dual-hole',align:'right',offset:10,bottom:10,lens:59,ring:4,lensGap:5,flash:18,flashGap:12}`. First Look 사진(dl8) 의 렌즈 간격/지름 비 0.08 과 일치.
  - **디스플레이 마스크** = 코너별 둥근 사각형 − 렌즈 2 + 플래시 홀(`display.mask:'holes'`, clip-path nonzero 반시계 서브패스). "둥근 사각형 + 카메라 오버레이" 방식이 아니라 실제 가시 영역이며, 하드웨어(`.screen_cutout`) 는 마스크 밖 별개 레이어.
  - **UI**: 뉴스룸 First Look `dl9.jpg`(Samsung Health 커버 앱 사진) 기준 — 상단 상태바 없음(verified → safeArea.top 0), 앱 콘텐츠는 카메라 위에서 끝나고 하단 밴드의 내비게이션 바가 카메라 **왼쪽**에 놓임 → `safeArea.bottom 72`(렌즈 상단까지 69.5 + 여백, derived; Android 상태바의 "컷아웃을 감싸는 높이" 논리와 동일) · 홈 인디케이터 중심 76 / 폭 72 는 approximation(사진은 3버튼 내비). 가로: 카메라 열이 우상단 → `safeAreaLandscape {top:0,right:72,bottom:16,left:0}`(2026-09-21: 가로 상태바 24 → 0 — 세로 커버 화면에 상태바가 없음이 verified 이고 가로에 있다는 근거가 없어 제거, derived; 회전 사이트 높이 228 → 252. 하단 16 은 다른 Android 프로필 준용 approximation), 상태바 아이콘·URL 밴드가 `--status-pad-right/--band-pad-right` 로 비켜남.
  - 남은 approximation: 측면 키 위치(사진상 접힘 우측 변 상단부에 볼륨·전원, 왼쪽 변에는 키 없음 — 현재 CSS 는 family 공통 좌 볼륨/우 전원), 커버 브라우저 밴드 높이(Chrome 56 준용), 제스처 바 표시 여부.
- Flip8 펼침(`flip8-open`, 2026-09-21): 해상도 세 층위 — `nativePhysicalResolution` **2520×1080 official**(한국 뉴스룸·samsung.com/sec; 글로벌 영문 뉴스룸은 1080 x 2520 순서) · 대각선 174.1mm official → `renderedPhysicalResolution` **1080×2520 derived-orientation** → `cssViewport` **360×840 derived**(DPR 3 가정). 활성영역을 대각선 174.1mm(=400ppi) 기준 68.6×160.0mm 로 → 베젤 18/18(derived), 바디 코너 40. 펀치홀은 뉴스룸 `Launch_dl3F.jpg`(1440×960, 3.6px/mm 저해상도) 실측 지름 19 · 중심 화면 상단 20(top 10, ±0.3mm) → 상태바 32(derived). 화면 코너 22 는 S25 준용 approximation 유지(전체 정면 고해상도 렌더 미확보). Flex 는 펼침 준용.
- iPhone Duo(2026-09-09 발표, 북 타입): **단일 7.6" 폴딩 내부 화면 + 세로 접힘선** 구조. 외부 1398×2034 · 내부 2670×1878 · 바디 mm · 표준 사각형 대각선 5.36"/7.58" 모두 Apple specs **official**(2026-09-18 확인).
  - 2026-09-18 보정: Apple 뉴스룸 보도자료 원본 `Apple-iPhone-Duo-display-sizes-260909.jpg`(3840×2160, 9.48px/mm — 화면 종횡비가 공식값과 0.1% 내 일치) 로 **body / display / hinge / crease 를 분리 실측**. 스크래치패드 `renders/duo-zip/` 에 원본, `measure-page.js` 의 `cornerRadius/edges/screenEdges/crop` 로 측정.
  - 접힘(`duo-outer`, 6.04px/mm): 패널 베젤 상하 17 / 좌우 15(derived) + 힌지 쪽 **스파인 12(hingeBody spine, 상하 7 안쪽, r 8, photo)**. 바디 코너 `{tl:5,tr:75,br:75,bl:5}`, 화면 코너 `{tl:8,tr:60,br:60,bl:8}`(photo — 힌지 쪽이 거의 각진 비대칭). 외부 카메라 **우상단** Ø36 @ top 30 / right 30(photo). ring 4(photo 0.5~1.0mm).
  - 펼침(`duo-inner`, 5.65px/mm): 베젤 20(derived), 바디 코너 72 / 화면 코너 52 **4코너 동일**(photo — 힌지 쪽 각진 코너는 펼치면 중앙 접합부로 숨음). 힌지 커버는 정면에서 안 보이고 테두리 접합선(hingeBody seam 3) 만. 접힘선은 공식 이미지에서 검출되지 않아 2px 희미한 선(approximation, 위치 표시용).
  - 남은 approximation: 측면 키 위치(사진상 Touch ID 는 접힘 우측 29~41% 높이, 볼륨은 상단 변으로 보임). 상태바/safe-area 는 iOS 27 코너 클러스터로 교체됨(위 "iPhone Duo iOS 27 UI" 항목).
- `hingeBody`(힌지 커버) 는 바디·디스플레이·접힘선과 별개 레이어. `spine`(셸 바깥, `view.hingeExtent` 로 mount 폭·셸 위치 보정) / `seam`(접힘선 양끝 테두리 접합선). 스파인이 있는 변의 측면 키는 CSS 가 숨긴다.
- **iPhone Duo iOS 27 UI(2026-09-18)**: 일반 iPhone 의 가로 상태바·Safari 밴드를 Duo 에 재사용하지 않는다. 근거는 Apple 뉴스룸 본문·보도 이미지 원본(`renders/duo-ui/`) 과 HIG "Designing for iPhone Duo"(`renders/duo-ui/hig-duo.json`, 도식 PNG는 `renders/duo-ui/hig/`; `developer.apple.com/tutorials/images/com.apple.HIG/...` 로 받음).
  - official(텍스트): 상태바 = "circular, flexible system that nestles into the corner"; Dynamic Island = 외부·내부 화면 측면에 세로 배치, Live Activities 로 확장; 툴바·탭바·내비게이션은 카메라 쪽 세로 축(위→아래: 아일랜드 → 상태바 → 툴바 → 탭바); **내부 화면을 세로로 든 경우만 표준 가로 바**; Split View 는 각 앱이 바깥 가장자리; 공간 부족 시 탭바 단일 컨트롤·툴바 넘침 메뉴.
  - photo-measured: 외부 정지(홈 화면 이미지·HIG 도식 1.0944px/pt 일치) 시간 중심 92 · 링 Ø40 중심 129 · 축 48(카메라 중심과 동일) / Live Activity(통화 이미지) 필 38×62 @26, 클러스터 +14.5 / 내부(multitasking·Netflix) 시간 38.5 · 링 Ø38 중심 73 · 축 45 / Safari 측면 컨트롤 원형 Ø44 · 캡슐 44 · 항목 47 · 원형↔캡슐 13 · 하단 여백 21 / 전체 화면 앱 툴바 시작 = 클러스터 하단 + 22(Netflix).
  - approximation(명시·미창작): URL 필드(공식 자료에 없음 → 그리지 않음), 전체 화면 Safari 의 시작 높이(Netflix 간격 준용), Safari 웹 뷰포트 인셋(→ 화면 전체 + safe-area 가이드 우측 92/89), 회전 시 클러스터 위치(카메라 쪽 상단), 내부 화면 세로 상태의 클러스터 위치(우상단 유지), 내부 Live Activity 아일랜드(미표시), 링 호 = 배터리 잔량 여부, 홈 인디케이터(공식 이미지에 없음 → 없음), 클러스터 색(적응형 → 진한 색 + 흰 테두리).
  - 기본 표시는 island `state:'live'`(세로 필). 정지 상태로 바꾸려면 `frameProfiles['duo-outer'].statusBar.island.state='rest'`.
- `display.split` 은 Surface Duo 2 같은 실제 듀얼스크린 기기를 추가할 때만 사용한다.

## 알려진 한계 (문구·설계에 반영됨)

iframe 으로는 UA·실제 DPR·터치/hover/pointer 미디어·`env(safe-area-inset-*)`·`dvh/svh/lvh`·대상 페이지 `<meta viewport>` 처리·가상 키보드·브라우저 자동 숨김을 재현할 수 없다. Windows 브라우저는 iframe 안에 데스크톱 스크롤바(약 17px)가 생긴다. safe-area 는 빗금 가이드로만 보완한다.

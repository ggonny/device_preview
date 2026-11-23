(function(){
  'use strict';

  /* ==================================================================
   * 데이터
   *
   * frameProfiles  : 기기 프레임. 레이어별 값을 세로 기준으로 적고, 가로는 JS 가 반시계 90° 회전 규칙으로 계산한다.
   *   family                 : 형상 언어(바디 마감·측면 키·스피커 등 CSS 분기 키). iphone-modern | iphone-classic | galaxy-bar | fold | flip | duo | ipad-classic | ipad-modern | neutral
   *   controls               : 전면 디테일. homeButton{size,ring,bottom} · speaker{width,height,top} · camera/sensor{size, top,offsetX}(상단 베젤) 또는 {size, edge:'right'|'left', offset, inset}(긴 변 베젤, offset 은 화면 중심에서 변을 따라 아래(+)/위(−), inset 은 바디 가장자리에서 중심까지 — 생략 시 베젤 중앙)
   *                            keys[{type:'volume'|'power'|'action'|'mute', edge:'top'|'right'|'bottom'|'left', start, length, protrusion?}](세로 기준 변·시작·길이 px, 지정하면 family 기본 키 대신 사용 · protrusion = 바디 밖으로 보이는 돌출 px, 생략 시 공통 3) · port{edge,width,height}(USB-C 등 커넥터 슬롯).
   *                            가로 모드는 반시계 규칙: top→left, right→top, bottom→right, left→bottom (JS 가 start 를 변환)
   *   top/right/bottom/left  : 베젤(바디 외곽 ~ 디스플레이) 두께. 상하좌우가 달라도 된다
   *   ring                   : 베젤 중 금속 테 두께(px). 나머지 베젤은 검은 글래스로 그린다
   *   radius / screenRadius  : 바디 / 디스플레이 모서리. 숫자(px) · {ratio}(짧은 변 대비) · {tl,tr,br,bl}(코너별, 각 값도 숫자나 {ratio}) 모두 가능
   *   display.split          : 듀얼 디스플레이 {axis:vertical|horizontal, gap, panelRadius} → 두 패널 + 중앙 분리 영역으로 마스킹
   *   hingeBody              : 힌지 커버(바디·디스플레이·접힘선과 별개 요소). {type:'spine', side, width, inset, radius} = 접힌 북타입에서 패널 바깥 힌지 쪽에 보이는 스파인,
   *                            {type:'seam', size} = 펼침 상태에서 접힘선 양끝 테두리에 보이는 접합선. 가로 모드는 반시계 규칙으로 side 를 옮긴다(left→bottom)
   *   cutout / safeArea      : 하드웨어 컷아웃(별도 레이어) / OS safe-area. safeAreaLandscape 로 가로값을 덮어쓸 수 있음
   *   cutout.type  : none | notch | island | hole | dual-hole
   *   cutout.align : center | left | right  (offset 은 정렬 가장자리에서의 거리). 세로 위치는 top(위 가장자리 거리) 또는 bottom(아래 가장자리 거리)
   *   cutout.edge  : 'right' | 'left' 이면 긴 변(세로 기준 좌우 베젤) 에 붙는 컷아웃: depth(화면 안으로 들어오는 깊이)·length(변 방향 길이)·offset(중심에서 아래 +). 가로에서는 right → 상단 중앙.
   *                  shape:'wave' 는 Galaxy Tab Ultra 처럼 완만한 반타원 노치(스피커 슬릿·카메라 점 장식 없음, 카메라는 controls.camera 로 그림)
   *   dual-hole    : [플래시][렌즈][렌즈] 가로 상자. lens(렌즈 지름)·ring(링 두께)·lensGap·flash(플래시 지름, 0 이면 없음)·flashGap 으로 상자 크기가 정해진다
   *   display.mask : 'holes' 면 디스플레이 마스크(.screen_wrap clip-path) 가 코너별 둥근 사각형에서 dual-hole 의 렌즈·플래시 원을 뺀 실제 가시 영역이 된다
   *   homeIndicatorCenter : 홈 인디케이터 중심 x(px, 세로 기준). 하단 컷아웃 옆에 놓일 때만 지정, 생략 시 중앙
   *   platform     : ios | android | any    (브라우저 선택 목록 필터에 사용)
   *
   * browserProfiles: 브라우저 UI 를 밴드(statusBar / urlBar / toolbar / homeIndicator) 높이로 정의.
   *                  statusBar·homeIndicator 가 null 이면 프레임 safeArea 값을 사용한다.
   *                  sideInset:'safe-area' 이면 가로에서 좌우 safe-area 만큼 사이트 폭이 줄어든다(iOS Safari 기본 동작).
   *   urlBarPosition : 세로 모드 주소창 기본 위치(top|bottom). 사용자가 UI 에서 바꾸면 브라우저별로 기억한다.
   *                    가로 모드는 실제 브라우저처럼 항상 상단이며, 상태바(컷아웃 영역) 는 기기 영역이므로 주소창은 그 아래에서 시작한다.
   *   layout:'side'  : (iPhone Duo) 가로 밴드 대신 카메라 쪽 세로 축의 측면 컨트롤 열(.side_controls). 밴드는 전부 0, state.uiLayout 이 자세별로 side|bars 를 정한다.
   *
   * statusBarProfiles: OS 상태바. ios/android/generic 은 가로 밴드(.band_status), duo 는 layout:'corner' 코너 클러스터(.status_cluster) + 세로 Dynamic Island(.dynamic_island).
   *
   * devices        : 기기 프리셋. 새 기기는 여기에만 추가하면 사이드바·카운트·WebMCP enum 에 자동 반영된다.
   *   width/height : 기기 전체 CSS 화면(px). 브라우저 UI 를 뺀 값이 실제 사이트 뷰포트가 된다.
   *   orientation  : 기본 자세(portrait|landscape). 생략 시 width>=height 로 판정. 펼친 폴더블처럼
   *                  가로형 비율이지만 세로로 드는 기기는 'portrait' 로 명시한다.
   *   hinge        : horizontal | vertical | gap-vertical(듀얼스크린 물리 간격)
 *   uiLayout     : {natural, rotated} 각각 'side'(카메라 쪽 세로 축에 상태 클러스터·컨트롤, iPhone Duo) | 'bars'(표준 가로 밴드). 생략 시 bars
   * ================================================================== */

  /* source 등급: official(제조사 공개 수치) · derived(공개 수치에서 환산/기하 유도) · photo-measured(렌더 실측, 파일명 명시) · approximation(근거 없음, 시각 근사)
   * 환산 규칙: px/mm = CSS 폭 ÷ 디스플레이 활성영역 폭(mm, 대각선·비율에서 계산), 베젤 = (바디 − 활성영역) ÷ 2. */
  const frameProfiles={
    /* 범용: 실기기가 아니므로 비율 radius. 모든 값 approximation */
    neutral:{family:'neutral',top:14,right:14,bottom:14,left:14,ring:4,radius:{ratio:.09},screenRadius:{ratio:.05},platform:'any',obstruction:'없음',
      cutout:{type:'none'},safeArea:{top:0,right:0,bottom:0,left:0},homeIndicator:false,
      source:{body:'approximation: 범용 프리셋(실기기 아님)',bezel:'approximation',radius:'approximation',screenRadius:'approximation',cutout:'n/a',controls:'n/a',statusBar:'n/a'}},
    'neutral-tablet':{family:'neutral',top:14,right:14,bottom:14,left:14,ring:4,radius:32,screenRadius:18,platform:'any',obstruction:'없음',
      cutout:{type:'none'},safeArea:{top:0,right:0,bottom:0,left:0},homeIndicator:false,
      source:{body:'approximation: 범용 프리셋(실기기 아님)',bezel:'approximation',radius:'approximation(2026-10-14): Breakpoint 테스트 768 tablet 전용 — 범용 neutral 의 ratio .09(768 기준 69) 는 태블릿보다 큰 스마트폰처럼 보여 32 로 줄임. 화면 18 과 동심(바디 − 화면 = 14 = frame), glassRadius 미지정 → 바디 − 링 = 28 · 실기기 아님(iPad Air 67.5 / 18 · Tab S11 50 / 16 는 베젤이 훨씬 두꺼운 실기기 값이라 그대로 준용하지 않음)',screenRadius:'approximation(2026-10-14): 18 — 이전 ratio .05(768 기준 38.4)',cutout:'n/a',controls:'n/a',statusBar:'n/a'}},

    /* iPhone 12/13/14 (390×844): 바디 146.7×71.5mm(Apple), 활성영역 64.6×139.8mm(6.06" 2532×1170) → 6.04px/mm */
    'iphone-notch':{family:'iphone-modern',top:21,right:21,bottom:21,left:21,ring:8,radius:66,screenRadius:47,platform:'ios',obstruction:'상단 노치',
      cutout:{type:'notch',width:168,height:33,top:0,align:'center'},
      safeArea:{top:47,right:0,bottom:34,left:0},safeAreaLandscape:{top:0,right:47,bottom:21,left:47},homeIndicator:true,homeIndicatorWidth:134,
      source:{body:'official: iPhone 13 146.7×71.5mm (Apple tech specs)',bezel:'derived: (71.5−64.6)/2=3.45mm → 21px',radius:'photo-measured: Commons "IPhone 12 Blue.svg" 바디 코너 14.2/93.06(폭 비율 0.153) → 66px',screenRadius:'derived: 커뮤니티 측정 _displayCornerRadius 47.33pt (벡터 실측 46.2px 일치)',cutout:'derived: iPhone 12 노치 210×32pt(벡터 실측) × Apple 발표 "20% 축소" → 168×33',controls:'photo-measured(측면 키 위치만)',statusBar:'official: iOS safe-area 47/34/21/47'}},

    /* iPhone SE 2·3세대 (375×667): 바디 138.4×67.3mm(Apple), 활성영역 58.5×104.05mm(4.7" 16:9) → 6.41px/mm.
     * 외형(2026-10-08 재검증): Apple 뉴스룸 SE 3세대 정면 이미지에서 바디·링·베젤·홈 버튼·카메라·수화부·측면 키를 직접 측정(값별 근거는 source) */
    'iphone-se':{family:'iphone-classic',top:109,right:27,bottom:109,left:27,ring:11,radius:66,screenRadius:0,platform:'ios',obstruction:'화면 밖 홈 버튼·카메라',
      cutout:{type:'none'},safeArea:{top:20,right:0,bottom:0,left:0},safeAreaLandscape:{top:0,right:0,bottom:0,left:0},homeIndicator:false,
      controls:{homeButton:{size:68,ring:4,bottom:23},speaker:{width:76.5,height:8,top:57.5},camera:{size:15,top:58,offsetX:-68},sensor:{size:10,top:25},   /* 홈 버튼 bottom · 스피커/카메라 top 은 셸 border 안쪽 좌표 → 바디 외곽 기준 표시는 +1 */
        keys:[{type:'mute',edge:'left',start:114,length:36,protrusion:2.1},{type:'volume',edge:'left',start:190,length:65.5,protrusion:2.5},{type:'volume',edge:'left',start:270.5,length:65.5,protrusion:2.5},{type:'power',edge:'right',start:190,length:65.5,protrusion:2.5}]},   /* 왼쪽 무음 스위치(type mute — .key_action 슬롯을 action 과 공유)·볼륨 2 · 오른쪽 측면 버튼 — 공식 정면 이미지 photo-measured */
      source:{body:'official: 138.4×67.3mm (Apple tech specs 111866) → 셸 431 × 887 CSS(= 375 + 27×2 + border 2 / 667 + 109×2 + 2) 이 공식 431.4 × 887.2 와 일치',bezel:'photo-measured(2026-10-08): Apple 뉴스룸 2022-03 iPhone SE(3세대) 보도자료 원본 "Apple-iPhoneSE-iOS-Maps-220308" · "Apple-iPhoneSE-iOS-Focus-220308"(zip, 1306×1828, 정면 · 같은 기기 위치 — 바디 737.05 × 1515.8px, 비 2.0566 = 공식 138.4/67.3 의 2.0565 · 화면 폭 641.0px = 375 CSS → 1.7093px/CSS) 바디 외곽 → 활성 화면 좌 28.2 · 우 28.0 · 아래 109.1 · 위 110.7(위 경계는 상태바 배경이 어두워 직접 보이지 않아 아래 경계 + 667 CSS 로 계산 — 화면 둘레 약 3.5 CSS 의 어두운 비활성 테두리가 네 변 같은 폭으로 맞음) / 공식 mm 좌우 4.4mm = 28.2 · 상하 17.17mm = 110.1 → 셸 border 1px 포함 최종 표시 28 / 110 이 되도록 frame 27 / 109(이전 28 / 110 은 mm derived 로 border 미반영 → 표시 29 / 111)',ring:'photo-measured(같은 이미지): 알루미늄 테(바디 외곽 → 테와 유리 사이 어두운 분리선) 좌 10.52 · 우 10.52 · 위 11.36 · 아래 11.47(평균 11.0) → 11(이전 10, 근거 기록 없음) · 분리선 안쪽 회색 띠는 유리 가장자리라 링에 넣지 않음',radius:'photo-measured(같은 이미지, 4코너): 바디 외곽을 직선 변에 접하는 원으로 맞추면 위 67.0 · 67.1 / 아래 65.35 · 65.35(자유 원 맞춤 63.0~63.2, rms 0.27px) → 66(위·아래 평균; 66 에서 rms 0.41~0.53 CSS) · glassRadius 미지정 — fallback 바디 − 링 = 55 가 분리선 접선 맞춤 53.5~55.3 과 맞음 · 이전 65 는 Commons 2세대 벡터(Apple 공식 아님)',screenRadius:'official: 4.7" LCD 각진 코너 (0)',cutout:'n/a',controls:'photo-measured(2026-10-08, 같은 이미지): 홈 버튼 — 바디 가로 중앙(0.1 이내), 외경 67.6~68.1 · 링 두께 3.9~4.1(좌우 7 · 상하 6.5px) · 버튼 아래 끝이 바디 아래 외곽에서 24.1(중심 58.1) → size 68 · ring 4 · bottom 23(이전 67 · 3 · 21) / 전면 카메라 — 지름 14.9 · 중심 바디 중앙에서 −68.0 · 바디 위 외곽에서 58.9 → size 15 · offsetX −68 · top 58(이전 −69 · 50) / 수화부(스피커 그릴) — 76.6 × 8.2 · 가로 중앙 · 중심 바디 위에서 58.4 → 76.5 × 8 · top 57.5(이전 74 × 7 · 55) / 센서는 이 공식 이미지에서 보이지 않아 측정 불가 — 기존 size 10 · top 25(Commons 2세대 벡터) 를 그대로 둠(unverified) / 측면 키 — 바디 외곽 밖 돌출: 왼쪽 무음 스위치 바디 위에서 113.7 · 길이 35.7 · 돌출 2.1 · 볼륨 업 189.7 · 65.5 · 2.5 · 볼륨 다운 270.4 · 65.5 · 2.5 / 오른쪽 측면 버튼 189.7 · 65.5 · 2.5(볼륨 업과 같은 높이) → custom keys(무음 스위치는 type mute, 렌더는 .key_action 슬롯; 이전 family 기본 키 unverified) · 이전 근거: Commons "IPhone SE (2nd generation) white vector.svg"(2세대, Apple 공식 아님)',statusBar:'official: iOS 상태바 20pt'}},

    /* iPhone 14 Pro Max / 15 Plus / 16 Plus (430×932): 바디 160.7×77.6mm(Apple, 14 Pro Max), 활성영역 71.2×154.3mm(6.69") → 6.04px/mm */
    'iphone-dynamic':{family:'iphone-modern',top:19,right:19,bottom:19,left:19,ring:8,radius:74,screenRadius:55,platform:'ios',obstruction:'다이내믹 아일랜드',
      cutout:{type:'island',width:126,height:37,top:11,align:'center'},
      safeArea:{top:59,right:0,bottom:34,left:0},safeAreaLandscape:{top:0,right:59,bottom:21,left:59},homeIndicator:true,homeIndicatorWidth:134,
      source:{body:'official: iPhone 14 Pro Max 160.7×77.6mm',bezel:'derived: (77.6−71.2)/2=3.2mm → 19px',radius:'derived: 화면 코너 + 베젤 (동심 가정) 55+19=74',screenRadius:'derived: 커뮤니티 측정 _displayCornerRadius 55pt',cutout:'derived: 커뮤니티 측정 Dynamic Island 126×37pt, 상단 11pt (14 Pro)',controls:'n/a',statusBar:'official: iOS safe-area 59/34/21/59'}},

    /* iPhone 18 Pro (402×874): 해상도 2622×1206 · 바디 150.0×71.9mm · 6.27"(표준 사각형) 모두 Apple 18 Pro specs official → 활성영역 66.55×144.69mm → 6.04px/mm.
     * 외형(2026-10-08 재검증): Apple 공식 정면 이미지 2장에서 바디·링·글래스·화면을 각각 측정(값별 근거는 source). Apple 코너는 연속 곡률이라 CSS 원형 radius 는 직선 변에 접하는 원으로 맞춘 값 */
    'iphone-dynamic-pro':{family:'iphone-modern',top:15,right:15,bottom:15,left:15,ring:6.5,radius:79.5,screenRadius:62,platform:'ios',obstruction:'다이내믹 아일랜드',
      cutout:{type:'island',width:95,height:37,top:14,align:'center'},   /* 2026-10-08: 18 Pro 공식 이미지 실측 폭 95.2 (이전 125 는 iOS 26 iPhone 16 Pro 이미지 값) */
      controls:{keys:[{type:'action',edge:'left',start:186,length:42},{type:'volume',edge:'left',start:259,length:68},{type:'volume',edge:'left',start:344.5,length:68},{type:'power',edge:'right',start:282,length:107}]},   /* 왼쪽 액션·볼륨 2 · 오른쪽 측면 버튼 — 공식 정면 이미지 photo-measured(돌출 2.8~3.0 = 기본 3 이라 protrusion 미지정) */
      safeArea:{top:62,right:0,bottom:34,left:0},safeAreaLandscape:{top:0,right:62,bottom:21,left:62},homeIndicator:true,homeIndicatorWidth:134,
      source:{body:'official: 150.0×71.9mm (apple.com/iphone-18-pro/specs) → 셸 434 × 906 CSS(= 402 + 15×2 + border 2 / 874 + 15×2 + 2) 이 공식 434.3 × 906.2 와 일치 · 이전: iPhone 16 Pro 149.6×71.5mm 준용(derived)',bezel:'photo-measured(2026-10-08) + official mm 교차: Apple 뉴스룸 "Apple-iPhone-18-Pro-Photos-app-Apple-Reference-Image-260909" 다운로드 원본(3840×2560, 정면 기기 3대 — 바디 비 2.086 = 공식 150.0/71.9 의 2.0862 · 바디/화면 폭 비 1.0803 = 18 Pro 공식 1.0804(Pro Max 는 1.071) → 18 Pro, 화면 934.35px = 402 CSS → 2.3243px/CSS) 보이는 베젤 좌 15.8 · 우 15.8 · 위 16.1 · 아래 15.8(위·아래는 렌즈 중심 = 아일랜드 중심 기준) / apple.com/iphone-18-pro 이미지 "siri_app"(1392×904, 흰 UI 정면 — 화면 626.3px = 402 CSS → 1.558px/CSS, 바디/화면 폭 비 1.0805) 좌 16.1 · 우 16.3 · 위 16.6 / 공식 mm 계산 좌우 (71.9−66.55)/2 = 2.68mm = 16.2 · 상하 2.66mm = 16.0 → 셸 border 1px 포함 최종 표시 16 이 되도록 frame 15 유지(이전 15 는 16 Pro mm 로 border 미반영 derived)',ring:'photo-measured(같은 3840 원본): 금속 링(바디 외곽 → 안쪽 어두운 홈) 좌 14.6 · 우 15.1 · 위 16.6 · 아래 14.8px, 가운데 기기 좌 15.3 · 우 15.3px → 약 6.4~6.6 CSS → 6.5(이전 8, 근거 기록 없음) · 홈 안쪽의 회색 하이라이트는 유리 가장자리라 링에 넣지 않음',radius:'photo-measured(같은 3840 원본, 3코너): 바디 외곽을 직선 변에 접하는 원으로 맞추면 79.3 · 79.3 · 79.6 CSS(rms 0.47 CSS; 77 은 0.84) — apple.com/iphone-18-pro 이미지 "siri_app"(1392×904, 흰 UI 정면 — 화면 626.3px = 402 CSS → 1.558px/CSS, 바디/화면 폭 비 1.0805) 위 코너 79.8 · 79.75 와 일치 → 79.5. 자유 원 맞춤은 72.2~72.9(중심이 직선 변과 약 4px 어긋남 = Apple 연속 곡률) 이라 CSS 원형 radius 로는 접선 맞춤값을 쓴다 · 이전 77 은 동심 가정 62+15(derived)',glassRadius:'photo-measured(같은 원본): 링 안쪽 홈(글래스 시작) 접선 원 72.2 · 71.8 · 73.2 → glassRadius 미지정, fallback 바디 − 링 = 73 과 1 이내',screenRadius:'photo-measured(2026-10-08): apple.com/iphone-18-pro 이미지 "siri_app"(1392×904, 흰 UI 정면 — 화면 626.3px = 402 CSS → 1.558px/CSS, 바디/화면 폭 비 1.0805) 흰 화면 위 코너를 직선 변에 접하는 원으로 맞추면 좌 62.3 · 우 61.8(rms 0.32~0.35 CSS) → 62 유지(이전: 커뮤니티 측정 iPhone 16 Pro _displayCornerRadius 62pt derived) · 아래 코너는 공식 이미지에서 화면 콘텐츠가 검정이라 미측정(위와 같다고 가정)',cutout:'photo-measured(2026-10-07): Apple iOS 26 공식 이미지 "Phone-unified-layout"(iPhone 16 Pro, 18 Pro 와 같은 402pt, 1.744px/pt) — 아일랜드 y 13.90~50.47(높이 36.58) · 폭 125.04 · 가로 중심 201.0(화면 중앙) · 세로 중심 32.18 · 양 끝 반경 17.96 ≈ 높이/2(완전한 반원) → 125 × 37 @ top 14(컷아웃 상자는 공통 코드에서 CSS px 정수로 반올림되므로 높이는 37; 실측 36.58 과 0.4 차이) — 이전 126×37 @ top 11(14 Pro 커뮤니티 측정 준용 derived) 은 약 2.9pt 위에 있었다 · 2026-10-08 18 Pro 공식 이미지 교차 확인: apple.com/iphone-18-pro 이미지 "siri_app"(1392×904, 흰 UI 정면 — 화면 626.3px = 402 CSS → 1.558px/CSS, 바디/화면 폭 비 1.0805) 에서 화면 위 → 아일랜드 위 13.90 · 높이 37.1(일치) 이지만 폭은 약 95.2(카메라 렌즈 중심이 화면 중앙에서 29.1 — 3840 원본도 28.9) 로 125 와 다름 → 미수정, 별도 결정 대기',controls:'photo-measured(2026-10-08): Apple 뉴스룸 "Apple-iPhone-18-Pro-Photos-app-Apple-Reference-Image-260909" 다운로드 원본(3840×2560, 정면 기기 3대 — 바디 비 2.086 = 공식 150.0/71.9 의 2.0862 · 바디/화면 폭 비 1.0803 = 18 Pro 공식 1.0804(Pro Max 는 1.071) → 18 Pro, 화면 934.35px = 402 CSS → 2.3243px/CSS) 바디 외곽 밖 돌출을 행마다 측정(왼쪽·가운데 기기 같은 행) — 왼쪽 액션 버튼 바디 위에서 186.2 · 길이 42.2 · 볼륨 업 258.9 · 68.0 · 볼륨 다운 344.5 · 68.0 / 오른쪽 측면 버튼 282.1 · 107.1 · 돌출 6.5~6.9px = 2.8~3.0 CSS(기본 3) · Camera Control 은 정면에서 돌출이 보이지 않아 그리지 않음 · 이전: family 기본 키(왼쪽 볼륨 1 · 오른쪽 전원 1, unverified)',statusBar:'derived: iPhone 16 Pro safe-area top 62pt 준용 — 18 Pro 공식 이미지·HIG 로 safe-area 를 직접 확인할 자료 없음(18 Pro 아일랜드 아래 끝 51 보다 11 아래)'}},

    /* Galaxy S25 (360×780): 바디 146.9×70.5mm(Samsung), 활성영역 66.0×143.0mm(6.2" 2340×1080) → 5.45px/mm.
     * 프레임(바디 코너·베젤·링·홀·측면 키) 근거 = samsung.com 공식 정면 렌더 …544904933(값별 실측은 아래 source). 이력: 이전 바디 코너 36 · 홀 top 17 은 Commons "Galaxy S25 Black (front).png"(비공식 그림) 기준이었고 2026-10-07 폐기.
     * 시스템 인셋·화면 코너·내비게이션(2026-10-07): windowinsets.info "Galaxy S25" 실측(SM-S931N · Samsung RTL · One UI 8.5 · 2026-09-24) + 사용자 RTL 실기기 Chrome 캡처로 교체.
     * 역할 분리 — safeArea/statusBar = Android 시스템 인셋 · screenRadius = 디스플레이 clipping 코너 · cutout = 하드웨어 홀의 시각 위치(미변경) · navigation = Android 시스템 UI */
    'galaxy-bar':{family:'galaxy-bar',top:11,right:11.3,bottom:11,left:11.3,ring:5.5,radius:46,screenRadius:34,platform:'android',obstruction:'상단 펀치홀 카메라',
      cutout:{type:'hole',width:19,height:19,top:9,align:'center'},   /* 홀(시각) 중심 18.5 = top 9 + 9.5 — safeArea.top 34(Android 컷아웃 인셋) 와 별개 값 */
      controls:{keys:[{type:'volume',edge:'right',start:145,length:109},{type:'power',edge:'right',start:306,length:60}]},   /* 왼쪽 키 없음 · 오른쪽 볼륨 + 측면 키(공식 정면 렌더 photo-measured) */
      safeArea:{top:34,right:0,bottom:48,left:0},safeAreaLandscape:{top:24,right:0,bottom:16,left:34},statusBarHeight:34,homeIndicator:true,homeIndicatorWidth:108,navigation:'buttons',   /* safe top 34 = 실측 상단 인셋 34.33dp · 상태바 34(컷아웃 인셋과 같음) · 하단 48 = 3버튼 내비(RTL 실기기 상태) */
      source:{body:'official: Galaxy S25 146.9×70.5mm',bezel:'photo-measured(2026-10-07): samsung.com 공식 정면 렌더 "us-galaxy-s25-s931-536522-sm-s931uzdexaa-544904933"(2052×1641, 화면 487.1px = 360 CSS → 1.3531px/CSS · 바디 비 2.085 = 146.9/70.5) 바디 외곽 → 활성 화면 좌 16.71 · 우 16.66px = 12.35 · 12.31 CSS(= 공식 mm (70.5−66.0)/2 = 2.25mm → 12.3 과 일치) → 셸 border 1px 포함 최종 표시 두께로 보고 좌우 11.3(표시 12.3, 이전 12 → 표시 13) · 상하 11 유지(표시 12): 렌더 상 12.67 · 하 12.19 와 공식 mm 환산 (146.9−143.0)/2 = 1.95mm → 10.6 이 서로 어긋나(렌더 화면 높이가 공식 활성영역보다 0.5% 짧음) 근거 충돌 — 미수정',ring:'photo-measured(같은 렌더): 금속 링 상 7.57 · 하 7.16 · 좌 7.26 · 우 7.11px = 평균 5.38 CSS → 5.5(이전 5, 근거 기록 없음) · 글래스 코너는 바디 − 링 = 40.5(렌더 글래스 코너 54.1~55.1px = 40.0~40.7 CSS 와 일치 → glassRadius 미지정)',radius:'photo-measured(2026-10-07, 같은 공식 렌더): 바디 코너 61.7~61.9px(4코너, 원 맞춤 오차 0.12) = 45.7 CSS = 8.4mm → 46 — 이전 36 은 Commons 비공식 그림(45~49px/7.0) 실측이라 폐기. 화면 코너(34) 와 거의 동심(바디 − 화면 = 12 ≈ 베젤 12~12.3) 이 되어 코너에서도 베젤 간격이 유지된다(이전 36 은 코너 45° 간격이 직선 대비 약 +35%)',screenRadius:'verified: Android 보고 화면 코너 반경 34dp(windowinsets.info, SM-S931N, 2026-09-24) — 공식 정면 렌더 실측 활성 화면 코너 45.4~46.1px = 33.6~34.1 CSS 와 일치(2026-10-07 교차 확인) · 이전 24 는 Commons 그림 실측(4.3mm)',cutout:'photo-measured(2026-10-07 보정): 홀 시각 중심 18.5 · Ø19 → top 9 — samsung.com 공식 정면 렌더 "us-galaxy-s25-s931-536522-sm-s931uzdexaa-544904933"(2052×1641, 7.4px/mm) 홀 중심 화면 상단에서 약 3.4mm = 18.4 CSS · 사용자 RTL Chrome 캡처 중심 18.6 · Ø18.8 · Samsung One UI 7 렌더 16.8 · 지름은 Android 컷아웃 폭 19.33dp 와 일치 · 이전 top 17(중심 26.5) 은 Commons 비공식 그림(종횡비 2.83 로 실제 2.167 과 다름) 실측이라 폐기 · safeArea.top 34 는 DisplayCutout 인셋으로 별개 값',controls:'photo-measured: 공식 정면 렌더 933 — 왼쪽 측면 버튼 없음, 오른쪽 볼륨 26.7~46.6mm · 측면 키 56.2~67.1mm(바디 146.9mm 기준, 0.5mm 돌출) → CSS 145~254 / 306~366(셸 높이 802 = 146.9mm)',statusBar:'verified: windowinsets.info "Galaxy S25"(InsetsProbe, Samsung RTL SM-S931N, One UI 8.5 · Android 16, 2026-09-24) — density 480 · 360×780dp · 상단 인셋 34.33dp(= 컷아웃 bounding 하단 34.33) → safeArea.top · statusBarHeight 34, 가로 left 34 · 사용자 RTL Chrome 캡처(2026-10-07) 에서 Chrome 툴바 글자 중심으로 역산한 상태바 34.4 와 일치 · 가로 상단 24 는 AOSP 기본값 준용(derived) · 가로 하단 16 approximation(가로 3버튼 배치 미확인)',navigation:'verified: 3버튼 내비 48dp(windowinsets 하단 인셋 48dp · RTL 캡처 하단 ∣∣∣ ○ < 막대 49 CSS) — 아이콘 중심 x 78 / 180 / 281 · 크기 약 14 / 16 / 9×16(캡처 photo-measured). 세로에서만 버튼을 그리고 가로는 기존 하단 16 유지'}},

    /* Galaxy Z Flip8 접힘(FlexWindow) — 현재 CSS 399×441 @ DPR 2.375(verified, 2026-10-07). 아래 2026-09-21 근거 주석의 px·mm 환산은 당시 DPR 3 가정(316×349) 좌표계이며 그 값이 frameReferenceDpr:3 원본으로 남아 있다.
     * 접힌 바디 75.4×85.7mm(Samsung, official), 커버 native 1048×948 · 대각선 104.8mm(4.1형) 342ppi(official, 한국 뉴스룸·samsung.com/sec) → 세로 기준 width×height 로 정규화하면 948×1048(derived-orientation) → 활성영역 70.4×77.8mm → 4.49px/mm.
     * 렌더 실측: samsung.com "galaxy-z-flip8-features-colors-design.jpg"(2048×1232, 접힘 정면, 5.93px/mm — 화면 418×461px 비율 1.103 = 공식 1.1055 와 0.2% 내 일치).
     * 구조(photo): 힌지가 위(스파인 2.5mm, 양옆 1.4mm 안쪽, 끝 r 1.1mm) · 카메라 2개 가로 배치 우하단 + 플래시는 카메라 왼쪽 · 디스플레이가 렌즈 주위를 감싼다(렌즈 = 화면 안의 홀).
     * 코너: 힌지 쪽 위 코너는 거의 각짐(바디 r 0.3mm · 화면 r 0.5mm), 아래 코너 바디 r 7.0mm · 화면 r 4.7mm. 베젤 = 프레임 1.35mm + 검은 유리 1.15mm.
     * UI(뉴스룸 First Look "dl9.jpg" Samsung Health 커버 앱 사진): 상태바 없음, 앱 콘텐츠는 카메라 위에서 끝나고 하단 내비게이션이 카메라 왼쪽에 놓임.
     *   (폐기 이력: 이 사진에서 유도한 safeArea.bottom 72 = 카메라 영역 69.5 + 여백 — 2026-10-07 실측 컷아웃 88 로 교체, 아래 하단 구조 주석) */
    /* 2026-10-07: 이 프로필의 하드웨어 px 는 위 주석처럼 CSS 316(DPR 3) 좌표계에서 만든 값 → frameReferenceDpr:3. 커버 실측 DPR 2.375(399×441) 에서 3/2.375 = ×1.263 으로 환산해 물리 크기를 유지한다.
     * screenRadius 는 windowinsets 실측(현재 logical dp) 이라 logicalKeys 로 환산에서 제외. safeArea 는 환산 대상이 아니다(cutoutInsets 없음) — 아래 하단 88 은 실측 logical 값.
     * 하단 구조(2026-10-07 확정): display cutout(오른쪽 아래 국소 bounding 218.95×88 @ left 180.21 · top 353.26, 화면 아래 끝까지 닿음) 이 safe bottom 88 을 정하고,
     * navigation(3버튼 48) 은 그 88 영역의 아래쪽·카메라 왼쪽에 놓인다 → bottom = max(컷아웃 88, 내비 48) = 88 (88 + 48 로 더하지 않음) */
    'flip8-cover':{family:'flip',top:12.5,right:10.5,bottom:10.5,left:10.5,ring:6,radius:{tl:2,tr:2,br:32.5,bl:32.5},glassRadius:{tl:3,tr:3,br:26.5,bl:26.5},screenRadius:{tl:5,tr:5,br:29,bl:29},platform:'android',obstruction:'우하단 듀얼 카메라·플래시',frameReferenceDpr:3,logicalKeys:['screenRadius'],
      hingeBody:{type:'spine',side:'top',width:10.2,inset:6,radius:6.6},
      controls:{keys:[{type:'power',edge:'right',start:113,length:75,protrusion:1.2},{type:'volume',edge:'right',start:235,length:108}]},   /* 왼쪽 키 없음 · 오른쪽 측면 키(힌지 쪽) + 볼륨 — 공식 커버 정면 렌더 photo-measured. controls 는 frameReferenceDpr 환산 대상이 아니라 현재 CSS(DPR 2.375) 값 */
      /* dual-hole: [플래시][렌즈][렌즈] 가로 배치 상자. bottom/offset 은 상자의 아래·오른쪽 가장자리 거리(세로 기준). lens/ring/lensGap/flash/flashGap 으로 상자 크기와 홀 위치가 정해진다 */
      cutout:{type:'dual-hole',align:'right',offset:10,bottom:10,lens:59,ring:4,lensGap:5,flash:18,flashGap:12},
      display:{mask:'holes'},   /* 디스플레이 마스크 = 코너별 둥근 사각형 − 렌즈·플래시 홀 (실제 가시 영역). 하드웨어(.screen_cutout) 는 마스크 밖 별개 레이어 */
      safeArea:{top:0,right:0,bottom:88,left:0},safeAreaLandscape:{top:0,right:88,bottom:16,left:0},homeIndicator:true,navigation:'buttons',
      /* 3버튼 위치(세로, CSS px): 사용자 RTL 커버 캡처 photo-measured — 최근 앱 40 · 홈 96 · 뒤로 151(카메라 왼쪽, 컷아웃 left 180.21 과 겹치지 않음) · 막대 높이 48 의 가운데(아래에서 24) */
      navButtons:{centers:[40,96,151],barHeight:48},   /* 가로 상태바 24 → 0 (2026-09-21): 세로 커버 화면에 상태바가 없음이 photo-observed(뉴스룸 실사진) 이고 가로 상태바가 있다는 근거가 없어 제거(derived) · 가로 오른쪽 88 = 회전 시 같은 컷아웃 경계 */
      source:{nativePhysicalResolution:'official: 1048×948 (Samsung 뉴스룸 한국·samsung.com/sec 스펙 표기 · 글로벌 영문 뉴스룸 사양표는 948 x 1048 순서로 인쇄) · 대각선 104.8mm official',renderedPhysicalResolution:'derived-orientation: 948×1048 — 프로그램이 세로(portrait) 기준 width×height 로 정규화한 값, official 원문값 아님',cssViewport:'verified(2026-10-07): 399×441 @ DPR 2.375 — Samsung RTL 기기 정보 커버 948×1048 · 380dpi 와 windowinsets.info "Galaxy Z Flip8"(InsetsProbe 1.2.1, SM-F776B, 2026-09-23) density 일치 → 399.16×441.26dp 정수 반올림 · 폐기 이력: 948×1048 ÷ DPR 3 가정 = 316×349.3(derived, 2026-09-21 ~ 10-06)',visibleArea:'photo-measured: 코너 r 0.5/4.7mm 와 렌즈 2개·플래시 홀을 뺀 영역 (Samsung: "actual viewable area is less due to the rounded corners and camera hole")',
        body:'official: 접힘 75.4×85.7×13.1mm',bezel:'photo-measured(2026-10-12, 셸 border 포함 규칙): samsung.com US 갤러리 커버 정면 렌더 "us-galaxy-zflip8-f776-sm-f776ulgaxaa-553842870"(2052×1641 투명 PNG, 원근 없음 — 활성 화면 529.93 × 585.90px · 비 1.1056 = 1048/948 → 1.3284px/CSS(DPR 2.375)) 에서 변마다 32~99줄 서브픽셀 중앙값(측면 키 · 카메라 · 화면 모서리 제외) — 바디(앞판) 외곽 → 활성 화면 위(스파인과 앞판 사이 홈 중심 기준) 22.31 · 오른쪽 18.93 · 아래 19.01 · 왼쪽 19.04px = 보이는 두께 16.80 / 14.25 / 14.31 / 14.33 CSS → frame = (보이는 두께 − 셸 border 1) × 2.375/3 = 위 12.5 · 오른쪽 10.5 · 아래 10.5 · 왼쪽 10.6 → 좌우 차이 0.06 은 측정 오차 수준이라 10.5 로 통일 · 셸 앞판 427.65 × 472.05 = 렌더 앞판 427.5 × 472.2 CSS · 폐기: 13 / 11 / 10 / 11(2026-09-21 features-colors-design.jpg 5.93px/mm 의 mm 환산 derived, 셸 border 미반영 → 보이는 두께 17.4 / 14.9 / 13.6 / 14.9)',ring:'photo-measured: 프레임 8px/5.93=1.35mm → 6px · 2026-10-12 공식 렌더 553842870 재측정: 왼쪽 · 오른쪽 · 아래 9.84~10.02px = 7.41~7.54 CSS → 5.9 로 현재 6(렌더 7.58) 과 일치해 유지 · 위(힌지 쪽 앞판) 는 13.01px = 9.79 로 두껍지만 단일 ring 구조라 표현하지 않음',
        radius:'photo-measured(2026-10-07): samsung.com US 갤러리 커버 정면 렌더 "us-galaxy-zflip8-f776-sm-f776ulgaxaa-553842870"(2052×1641, 화면 529.9px = 399 CSS → 1.3281px/CSS · 화면 비 1.1055 = 1048/948 · 바디 75.4×85.7mm 일치) 아래 코너 좌 54.7 · 우 54.2px(오차 0.15~0.31) = 41.0 CSS → 32.5(×3/2.375 = 41.05) — 이전 31(features-colors-design.jpg 7.0mm) · 위(힌지 쪽) 앞판 코너 약 3.4 CSS 는 측정 한계가 큰 작은 반경이라 2 유지',glassRadius:'photo-measured(같은 렌더): 검은 글래스 위 3.9 · 아래 좌우 33.4 CSS(오차 0.15~0.24) → 3 / 26.5(×1.263 = 3.8 / 33.5) — fallback(바디 − 링) 은 위 코너가 0 이 되어 명시',screenRadius:'logical(frameReferenceDpr 환산 제외) — 위 5: verified(Android RoundedCorner 5.05dp, windowinsets.info "Galaxy Z Flip8" 커버, Samsung RTL SM-F776B, 2026-09-23; 공식 렌더 3.0~4.4 는 작은 반경이라 측정 한계 → 5 유지) · 아래 29: photo-measured(2026-10-07, 공식 커버 정면 렌더 553842870 의 실제 화면 clipping 좌 28.8 · 우 28.3 CSS, 오차 0.29~0.38 · 별도 공식 디자인 렌더 features-colors-design.jpg 약 4.7mm 와 독립 일치). Android RoundedCorner API 가 보고한 아래 40.84dp(약 7.2mm) 는 OS 보고 logical 값으로 기록만 남긴다 — Flip8 커버에서는 시각적 clipping radius(28.6) 와 Android RoundedCorner 값(40.84) 이 일치하지 않으며 프리뷰 외형은 공식 렌더 실측을 쓴다(41 이면 화면 반경이 바디보다 커져 코너 베젤이 직선 대비 +47%)',
        hingeBody:'photo-measured(2026-10-07): 공식 커버 정면 렌더 553842870(1.3281px/CSS, 7.53px/mm) — 스파인 높이(스파인 위 끝 499.2 → 앞판 위 끝 516.3) 17.2px = 12.92 CSS = 2.28mm → width 10.2(×3/2.375 = 12.9) · 끝 코너 좌 11.5~12.0px(오차 0.09~0.11) · 우 10.8px(오차 0.33) = 8.1~9.0 CSS → radius 6.6(= 8.3) · 양옆 안쪽 9.6px = 7.2 CSS 는 현재 6(= 7.6) 과 0.3 차이라 유지. 이전 width 12 · radius 5(features-colors-design.jpg 2.5mm · 1.1mm) 는 렌더 15.2 · 6.3 으로 높이 +2.3 · 코너 −2 였음. 스파인과 앞판 사이 홈은 셸 border 1px 가 대신한다',
        cutout:'photo-measured: 렌즈 외경 78px=13.2mm → 59px · 링 4px · 렌즈 간격 6px=1.0mm → 5px · 중심 간격 84px=14.2mm → 64px · 우측 렌즈 중심이 화면 우측·하단 가장자리에서 각 52~53px=8.9mm → 40px · 플래시 외경(테 포함) 24px=4.0mm → 18px, 중심이 좌측 렌즈 중심에서 66px=11.1mm → 50px 왼쪽 (First Look 사진 dl8 의 비율 렌즈 간격/지름 0.08 일치) · 2026-10-07 대조: Android 컷아웃 bounding 218.95 × 88dp · left 180.21 · top 353.26(windowinsets, 국소 영역) — frameReferenceDpr 환산 후 홀 상자 top 353.7 로 세로 위치 일치 · 렌즈 가로 간격은 RTL 스킨과 약 15% 차이(미변경)',
        cameraDiameter:'photo-measured: 13.2mm (위 cutout 참조)',controls:'photo-measured(2026-10-07): 공식 커버 정면 렌더 553842870(1.3281px/CSS) 오른쪽 외곽 돌출 — 앞판 상단(힌지 쪽) 기준 측면 키 112.7~188.0(길이 75.3, 돌출 1.2) · 볼륨 234.7~342.4(길이 107.7, 돌출 3.1) CSS, 왼쪽 돌출 없음(측면 키 protrusion 1.2 = 0.21mm, 펼침과 같은 물리 돌출). 펼침 렌더 553842867 의 같은 버튼과 힌지까지 거리(측면 키 19.9~33.1mm · 볼륨 41.5~60.3mm) 가 일치 — 접으면 위 반쪽이 힌지 축으로 뒤집혀 측면 키가 위, 볼륨이 아래. 측면 키 protrusion 1.2(2026-10-07) · 볼륨은 공통 기본 돌출 3',
        statusBar:'상단: photo-observed — 뉴스룸 First Look dl9.jpg(커버 앱 실사진) 에 상태바 없음 → 0 (실기기 직접 측정 아님 → verified 아님) · 하단(2026-10-07): safeArea.bottom 88 = 실측 display cutout bounding 높이(top 353.26 → 화면 아래 끝, verified) · 3버튼 내비 48 은 그 88 영역 안 카메라 왼쪽(navButtons 중심 40 / 96 / 151, RTL 캡처 ±1) → bottom = max(88, 48) · 제스처 바(홈 인디케이터) 는 그리지 않음 · 폐기 이력: 하단 밴드 72(렌즈 상단까지 69.5 + 여백, dl9 사진 기반 approximation) 와 제스처 바 중심 76 / 폭 72 approximation(2026-09-21 ~ 10-06) · 가로 상태바는 세로와 같이 없음(0, derived: 세로 photo-observed 사실에서 유도 — 가로 커버 화면 공식 이미지 미확보) · 가로 하단 16 은 다른 Android 프로필 준용(approximation)'}},

    /* Galaxy Z Flip8 펼침 (360×840): 바디 75.4×166.9mm(Samsung official), 메인 native 2520×1080 · 대각선 174.1mm(6.9형) 400ppi(official) → 세로 기준 정규화 1080×2520(derived-orientation) → 활성영역 68.6×160.0mm → 5.25px/mm.
     * 렌더: 뉴스룸 보도자료 "Launch_dl3F.jpg"(1440×960, 펼침 정면·후면, 3.6px/mm 저해상도 — 상단부만 보임) 로 펀치홀·상단 베젤만 확인. 코너·측면 키는 미측정 */
    'flip8-open':{family:'flip',top:16,right:16,bottom:16,left:16,ring:4.5,radius:38,screenRadius:20,platform:'android',obstruction:'상단 펀치홀·접힘선',
      cutout:{type:'hole',width:19,height:19,top:10,align:'center'},
      controls:{keys:[{type:'volume',edge:'right',start:121,length:99},{type:'power',edge:'right',start:263,length:70,protrusion:1.1}]},   /* 왼쪽 키 없음 · 오른쪽 볼륨 + 측면 키 — 공식 펼침 정면 렌더 photo-measured */
      safeArea:{top:29,right:0,bottom:48,left:0},safeAreaLandscape:{top:24,right:0,bottom:16,left:29},statusBarHeight:32,homeIndicator:true,homeIndicatorWidth:108,navigation:'buttons',   /* safe top 29 = 홀 하단 · statusBarHeight 32 = 홀 하단 + 3 (2026-09-22 분리) · 하단 48 = 3버튼 내비(RTL 실기기 상태, 2026-10-07) */
      source:{nativePhysicalResolution:'official: 2520×1080 (Samsung 뉴스룸 한국·samsung.com/sec 스펙 표기 · 글로벌 영문 뉴스룸 사양표는 1080 x 2520 순서로 인쇄) · 대각선 174.1mm official',renderedPhysicalResolution:'derived-orientation: 1080×2520 — 프로그램이 세로(portrait) 기준 width×height 로 정규화한 값, official 원문값 아님',cssViewport:'verified(2026-10-07): 360×840 @ DPR 3 — Samsung RTL 기기 정보 펼침 1080×2520 · 480dpi 와 windowinsets.info "Galaxy Z Flip8"(InsetsProbe 1.2.1, SM-F776B, 2026-09-23) density 일치 · 사용자 RTL Chrome 캡처의 줄 간격·박스 폭·줄바꿈이 360 과 일치',body:'official: 펼침 75.4×166.9mm',bezel:'photo-measured(2026-10-07): samsung.com US 갤러리 펼침 정면 렌더 "us-galaxy-zflip8-f776-sm-f776ulgaxaa-553842867"(2052×1641, 화면 520px = 360 CSS → 1.4444px/CSS · 화면 비 2.326 = 2520/1080) 바디 외곽 → 활성 화면 상 17.3 · 하 17.0 · 좌 16.9 · 우 17.1 CSS → 셸 border 1px 포함 최종 표시 두께로 보고 16(표시 17) — 이전 18(표시 19) 은 400ppi 활성영역 derived',ring:'photo-measured(같은 렌더): 금속 링 상 5.3 · 하 4.5 · 좌 4.7 · 우 4.4 = 평균 4.7 → 4.5(이전 6, 근거 기록 없음) · 글래스는 바디 − 링 = 33.5(렌더 글래스 띠가 바디와 동심, 약 33 — 띠 안쪽 홈선 때문에 직접 원 맞춤은 불안정) → glassRadius 미지정',radius:'photo-measured(같은 렌더): 바디 코너 53.9~55.6px(4코너, 원 맞춤 오차 0.12~0.30) = 37.8 CSS → 38 — 이전 40 은 동심 가정 22+18 derived',screenRadius:'photo-measured(같은 렌더): 화면 코너 28.4~30.6px(오차 0.13~0.33) = 19.7~21.2, 평균 20.3 CSS → 20 — 이전 22 는 Galaxy S25 준용 approximation',cutout:'photo-measured(저해상도 3.6px/mm, ±0.3mm): 홀 지름 13~14px=3.7mm → 19px · 중심 화면 상단에서 13.5px=3.75mm → 20px(top 10)',controls:'photo-measured(2026-10-07): 공식 펼침 정면 렌더 553842867(1.4444px/CSS) 오른쪽 외곽 돌출 — 바디 상단 기준 볼륨 120.9~219.9(길이 99.0, 돌출 3.1) · 측면 키 262.9~332.8(길이 69.9, 돌출 1.1) CSS, 왼쪽 돌출 없음. 측면 키 protrusion 1.1(= 0.21mm, 2026-10-07) · 볼륨은 공통 기본 돌출 3',statusBar:'derived: safeArea.top 29 = 홀 하단(컷아웃 경계 10+19) · statusBarHeight 32 = 홀 하단 + 3 여백(One UI 상태바 창, 여백은 approximation) · 가로 left 29 = 회전 시 홀 하단 · 가로 상단 24 는 AOSP 기본값 준용(derived) · 가로 하단 16 approximation · 미확정 차이(2026-10-07): 사용자 RTL Chrome 캡처에서 상단 UI 합계 93.5 CSS(±1.3), Chrome 툴바 글자 중심으로 역산한 상태바 약 36~37.5 — 펼침 인셋 실측이 없어 32 유지',navigation:'verified: 3버튼 내비 48(사용자 RTL Chrome 캡처 하단 막대 48 CSS · 아이콘 중심 최근 앱 79 / 홈 179 — S25 와 같은 배치) · 펀치홀 재측정 중심 Y 20.4 · Ø19.3(현재 19.5 / 19 와 일치)'}},

    /* Flex(반접힘, 2026-10-12 위쪽 패널 재검증): 위쪽 패널은 펼침과 같은 물리 부품(같은 패널 · DPR 3 좌표계) 이라 위 · 좌우 베젤 · 링 · 위 코너 · 카메라 홀 · 측면 키를
     * flip8-open 공식 렌더 실측에서 유도(verified-derived — Flex 상태 정면 실측 아님). 아래(힌지 쪽) 베젤 · 코너 · 접힘선 · 상태바 · 브라우저는 Flex 직접 근거가 없어 approximation 유지 */
    'flip8-flex':{family:'flip',top:16,right:16,bottom:22,left:16,ring:4.5,radius:{tl:38,tr:38,br:8,bl:8},screenRadius:{tl:20,tr:20,br:0,bl:0},platform:'android',obstruction:'상단 펀치홀·하단 힌지',
      cutout:{type:'hole',width:19,height:19,top:10,align:'center'},
      controls:{keys:[{type:'volume',edge:'right',start:121,length:99},{type:'power',edge:'right',start:263,length:70,protrusion:1.1}]},   /* 왼쪽 키 없음 · 오른쪽 볼륨 + 측면 키 — flip8-open 과 같은 물리 버튼(바디 위 끝 기준, 두 버튼 모두 위쪽 패널 안), verified-derived */
      safeArea:{top:29,right:0,bottom:0,left:0},safeAreaLandscape:{top:24,right:0,bottom:0,left:29},statusBarHeight:32,homeIndicator:false,   /* flip8-open 과 같은 분리(safe 29 / 상태바 32) — approximation */
      source:{body:'approximation: 위쪽 패널 폭은 flip8-open 과 같은 75.4mm · 반접힘 상태의 높이 · 외곽은 Flex 정면 공식 이미지 없음(samsung.com US 제품 페이지의 Flex 이미지 colors-graphite / colors-pink / highlights-flexcam 은 원근이 있는 3/4 시점이라 치수 측정 불가)',
        bezel:'verified-derived(2026-10-12): 위 · 좌우 16(표시 17) = flip8-open 공식 펼침 정면 렌더 553842867 실측(상 17.3 · 좌 16.9 · 우 17.1 CSS) — Flex 위쪽 패널은 펼침과 같은 물리 부품 · Flex 상태 정면 실측 아님 · 이전 18 은 2026-10-07 이전 펼침 값 준용 / 아래(힌지 쪽) 22: approximation(Flex 직접 근거 없음)',
        ring:'verified-derived(2026-10-12): 4.5 = flip8-open 공식 렌더 금속 링 평균 4.7(같은 물리 부품) · 이전 6 은 이전 펼침 값 준용',
        radius:'위 38: verified-derived(2026-10-12, flip8-open 공식 렌더 바디 코너 37.8 CSS — 같은 물리 부품, 이전 40) · 아래 8: approximation(힌지 쪽, Flex 직접 근거 없음) · glassRadius 미지정(바디 − 링 fallback, 위 33.5)',
        screenRadius:'위 20: verified-derived(2026-10-12, flip8-open 공식 렌더 화면 코너 20.3 CSS — 같은 패널, 이전 22) · 아래 0: approximation(화면이 접힘선까지 이어진다고 표현)',
        cutout:'verified-derived(2026-10-12): Ø19 · top 10 · 가운데 = flip8-open 펀치홀 실측(같은 패널 · 같은 홀, 값 변경 없음) · samsung.com US Flex 이미지에서 위쪽 패널 가운데 홀 육안 확인',
        controls:'verified-derived(2026-10-12): 오른쪽 볼륨 start 121 / length 99 · 측면 키 263 / 70 / protrusion 1.1 = flip8-open 공식 렌더 553842867 실측(바디 위 끝 기준 120.9~219.9 · 262.9~332.8, 왼쪽 돌출 없음) — 같은 물리 버튼 · 같은 DPR 3 좌표계 · 위 베젤 16 이 펼침과 같아 바디 위 끝 기준이 일치. 두 버튼 모두 위쪽 패널(바디 높이 460) 안. 보조 근거: samsung.com US Flex 이미지(highlights-flexcam · colors-pink) 에서 버튼이 위쪽 패널 오른쪽 변에 보임(원근이 있어 위치 측정에는 쓰지 않음) · 이전: family 기본 키(왼쪽 볼륨 · 오른쪽 전원, approximation)',
        statusBar:'approximation: flip8-open 준용(safeArea.top 29 = 홀 하단 · statusBarHeight 32 = 홀 하단 + 3, 펼침 쪽도 32 미확정) · Flex 상단 앱 영역엔 제스처 바 없음(bottom 0) · Samsung 지원 문서 "Flex mode on Galaxy foldable phones" 는 Labs Flex mode panel 을 켠 앱이 위쪽에 콘텐츠 · 아래쪽에 조작 패널을 둔다는 것만 확인 — Chrome 의 실제 CSS viewport · 상태바 · 주소창 배치 근거는 아님'}},

    /* Galaxy Z Fold8 접힘(커버 416×657): 접힌 바디 81.9×123.9mm(Samsung), 커버 활성영역 74.7×118.0mm(5.5" 1972×1248) → 5.57px/mm */
    /* Fold8 커버(접힘 정면, 2026-09-21 photo-measured): samsung.com US 갤러리 Scene7 투명 PNG "us-galaxy-z-fold8-f971-600257-sm-f971ulvaxaa-553840953"(2052×1641, 화면 753px = 416 CSS px → 1.81px/px, 바디 836px = 81.9mm → 10.2px/mm).
     * 코너는 바디(프레임 실루엣)·글래스 베젤·디스플레이를 각각 실측 — 동심 관계가 아니다: 바디 힌지 반대쪽 33px → 18 / 힌지 쪽 앞판 7~11px → 5(스파인 12px 은 별도, 미구현) · 글래스 4코너 17px → 9 · 화면 4코너 13px → 7.
     * 홀 Ø37px → 20, 중심 상단에서 20.2 → top 10. 베젤 실측 상하 35.5px=19.6 · 우 35px=19.3 · 좌(힌지) 48px=26.5 는 이번에 미수정(기존 derived 16/20 유지).
     * 상단 세 값 분리(사진 기반 원본, derived — 현재 렌더값 아님: 커버는 state.insets 실측 46 / 49 가 우선, 아래 z-fold 기기 항목): safeArea.top 30 = 홀 하단(= env(safe-area-inset-top) 의미, 가이드 높이) · statusBarHeight 33 = 홀 하단 + 3(One UI 상태바 창, 콘텐츠 시작) · 상태바 텍스트 중심 = 밴드 중앙 16.5(홀 중심 20.2 − 2.8 관계와 일치) */
    /* 베젤·스파인(2026-09-21 같은 렌더 photo-measured, 1.81px/CSSpx): 프레임(링) 13~14px → 7 · 검은 글래스 상하 22px → 12.2 / 우 21px → 11.6 / 좌 22.5px → 12.4 → 베젤(링+글래스) 상하 19.6 · 우 19.3 · 좌(앞판) 18.5.
     * 힌지 스파인은 앞판 바깥 별개 레이어(Duo 외부와 같은 북타입 구조 — 앞판과 스파인 사이 1px 홈, 상하 안쪽으로 들어간 끝, 바깥 코너만 둥긂): 폭 14.5px → 8 · 상하 안쪽 13px → 7 · 바깥 코너 6~8px → 4. 좌측 총 폭 19 + 8 = 27(실측 26.5)
     * → 2026-10-12 같은 렌더를 셸 border 포함 규칙으로 재측정해 베젤(18.4 / 18.3 / 18.6 / 16.7) · 링 7.5 · 글래스 코너 10.5 · 화면 코너 7.5 · 스파인 폭 7.5 로 교체(값별 근거는 source). 위 2026-09-21 수치는 이력 */
    /* 2026-10-06: 아래 Fold8 두 프로필의 하드웨어 px(베젤·링·코너·홀·스파인) 는 위 주석처럼 CSS 416 / 816 = DPR 3 좌표계에서 mm 를 환산해 만든 값 → frameReferenceDpr:3
     * (실제 기기의 DPR 이 아니라 이 프로필 px 값의 환산 기준 좌표계).
     * 기기 DPR(2.25, 실기기 캡처) 이 다르므로 scaleFrameProfile() 이 같은 mm 가 되도록 3/2.25 = ×1.333 으로 환산한다. cutoutInsets 는 홀 경계에서 정해지는 인셋 변(세로 top · 가로 left) 이라 함께 환산하고,
     * statusBarHeight 는 환산된 홀 하단 + 기존 여백 3. 단 state 에 실측 시스템 인셋(insets) 이 있으면(Fold8 커버) 그 값이 이 사진 기반 값보다 우선한다(getMeasuredInsets). Android UI dp 값(제스처 바 bottom 24 · 가로 top 24 / bottom 16 · homeIndicatorWidth · 상태바 글꼴) 은 DPR 과 무관하게 그대로 둔다. */
    'fold8-cover':{family:'fold',top:18.4,right:18.3,bottom:18.6,left:16.7,ring:7.5,radius:{tl:5,tr:18,br:18,bl:5},glassRadius:10.5,screenRadius:7.5,platform:'android',frameReferenceDpr:3,cutoutInsets:{portrait:'top',landscape:'left'},obstruction:'상단 펀치홀 카메라',
      hingeBody:{type:'spine',side:'left',width:7.5,inset:7,radius:4},   /* 2026-10-12: 폭만 공식 렌더 재측정(photo-measured) · inset 7 · radius 4 는 재측정하지 않은 2026-09-21 값 */
      controls:{keys:[{type:'volume',edge:'right',start:92,length:142,protrusion:4.1},{type:'power',edge:'right',start:313,length:100,protrusion:1.7}]},   /* 왼쪽(스파인 쪽) 키 없음 · 오른쪽 볼륨 + 측면 키 — 공식 커버 정면 렌더 photo-measured. controls 는 frameReferenceDpr 환산 대상이 아니라 현재 CSS(DPR 2.25) 값 */
      cutout:{type:'hole',width:20,height:20,top:10,align:'center'},
      safeArea:{top:30,right:0,bottom:24,left:0},safeAreaLandscape:{top:24,right:0,bottom:16,left:30},statusBarHeight:33,homeIndicator:true,homeIndicatorWidth:108,
      source:{body:'official: 접힘 81.9×123.9mm',ring:'photo-measured(2026-10-12, 같은 렌더): 바디 외곽 → 금속 테 안쪽(검은 글래스 시작) 위 13.48 · 오른쪽 13.60 · 아래 13.92px = 9.9~10.2 CSS → 7.5(렌더 10.0) · 왼쪽(힌지 쪽 앞판) 은 10.52px = 7.7 CSS 로 좁지만 단일 ring 구조라 표현하지 않음(왼쪽은 링 10 + 글래스 띠 13.3, 공식 7.7 + 15.5 — 보이는 베젤 합계는 일치) · 이전 7(2026-09-21 13~14px, 근거 기록 약함)',bezel:'photo-measured(2026-10-12 재측정, 셸 border 포함 규칙): samsung.com US 갤러리 커버 정면 렌더 "us-galaxy-z-fold8-f971-600257-sm-f971ulvaxaa-553840953"(2052×1641 투명 PNG, 원근 없음 — 활성 화면 754.83 × 1192.60px · 화면 비 1.5800 = 1972/1248 → 1.3607px/CSS(DPR 2.25) · 바디(스파인 포함) 834.8 × 1262.5px 비 1.5124 = 공식 123.9/81.9) 에서 변마다 66~136줄 서브픽셀 중앙값(측면 키 · 카메라 · 위 변 안테나 선 제외, 줄 간 편차 0.1px 이내) — 바디(앞판) 외곽 → 활성 화면 위 34.77 · 오른쪽 34.60 · 아래 35.10 · 왼쪽(스파인과 앞판 사이 홈 중심 → 화면) 31.68px = 보이는 두께 25.55 / 25.43 / 25.80 / 23.28 CSS → frame = (보이는 두께 − 셸 border 1) × 2.25/3 = 위 18.4 · 오른쪽 18.3 · 아래 18.6 · 왼쪽 16.7(렌더 24.53 / 24.4 / 24.8 / 22.27 + border 1). 왼쪽이 얇은 것은 힌지 쪽 앞판의 금속 테가 좁기 때문(7.7 vs 다른 변 10) · 셸 603.7 × 927.3 = 렌더 앞판 603.5 × 927.8 CSS(0.5 이내) · 폐기: 2026-09-21 상하 20 · 좌우 19(같은 렌더 35.5 / 35 / 33.5px 를 셸 border 를 빼지 않고 환산 → 보이는 두께 27.7 / 26.3, 공식보다 약 1~3 두꺼움)',hingeBody:'폭 7.5: photo-measured(2026-10-12, 같은 렌더) — 스파인 바깥 외곽 → 앞판과의 홈 중심 13.64px = 10.0 CSS → 10.0 × 2.25/3 = 7.5(이전 8 = 렌더 10.67, 2026-09-21 14.5px 실측) · inset 7 · radius 4: 2026-09-21 값 유지(상하 안쪽 13px → 7 · 바깥 코너 6~8px → 4) — 이번에 재측정하지 않음 · 앞판과의 홈 1px 은 셸 border 가 대신함',radius:'카메라 반대쪽(tr · br) 18: photo-measured — 2026-09-21 측정(33px) 을 2026-10-12 같은 렌더 직선 변 접선 원 맞춤으로 재확인 33.25 / 32.5px(오차 0.38) = 24.2 CSS → 18.1 · 힌지 쪽 앞판(tl · bl) 5: 2026-09-21 값 유지(7~11px) — 2026-10-12 재측정에서는 스파인과 붙어 있어 원 맞춤 불가(오차 1.9), 이번에 재검증된 값 아님',glassRadius:'photo-measured(2026-10-12, 같은 렌더 직선 변 접선 원 맞춤): 검은 글래스 바깥 코너 19.75 / 19.5 / 18 / 19px(오차 0.39~0.44, 4코너) = 14.0 CSS → 10.5(= 바디 18 − 링 7.5 와도 일치) · 이전 9(2026-09-21 17px)',screenRadius:'photo-measured(2026-10-12, 같은 렌더 직선 변 접선 원 맞춤): 화면 코너 위 15 / 14.25 · 아래 12.75 / 13.25px(오차 0.30~0.34) = 평균 10.15 CSS → 7.5(단일 screenRadius 라 4코너 평균, 위가 아래보다 약 1.4 CSS 큼) · 이전 7(2026-09-21 13px)',cutout:'photo-measured(2026-10-12 재측정으로 기존 정수값 검증): 같은 렌더에서 홀 지름 36.9px = 27.1 CSS → 20.3 · 중심 화면 위에서 27.35 CSS → top 10.3 · 가로 중심 = 화면 중심(차이 0) → 기존 20 · top 10 · 가운데 유지(컷아웃 상자는 정수 px 로 반올림되어 차이 0.5 이내) · 2026-09-21 측정 Ø37px · 중심 36.5px 와도 일치',controls:'photo-measured(2026-10-07): samsung.com US 갤러리 커버 정면 렌더 "us-galaxy-z-fold8-f971-600257-sm-f971ulvaxaa-553840953"(2052×1641, 화면 753px = 555 CSS → 1.357px/CSS · 10.19px/mm) 바디(앞판) 오른쪽 외곽 돌출 — 볼륨 바디 위 기준 92.1~234.3(길이 142.2, 12.3~31.2mm) 돌출 5.53px = 4.07 CSS(0.54mm) · 측면 키 313.2~412.7(길이 99.5, 41.7~54.9mm) 돌출 2.25px = 1.66 CSS(0.22mm) · 왼쪽(스파인 쪽) 돌출 없음. 펼침 렌더 553840954 의 같은 버튼과 이미지 행·mm 위치 일치(북 타입이라 접어도 오른쪽 변 그대로)',statusBar:'현재 적용값: safe-area top 46 · statusBarHeight 49 · 가로 left 46 — state.insets 실측(컷아웃 하단 46.22 · 상태바 48.89dp, windowinsets.info 물리 104 / 110px ÷ 2.25, verified-derived) 이 아래 사진 기반 값보다 우선한다(getMeasuredInsets) · 상태바 내용은 statusBar override(실기기 캡처 centerY 27) · 사진 기반 원본(derived, 현재 렌더값 아님): safeArea.top 30 = 홀 하단 · statusBarHeight 33 = 홀 하단 + 3(S25 +1.5 · Flip8 +2.5 · Pixel +4 의 중간값) · 가로 left 30 — frameReferenceDpr 3 좌표계 값이며 insets 가 없는 경우에만 ×1.333 환산되어 쓰인다 · 가로 상단 24/하단 16 approximation'}},

    /* Galaxy Z Fold8 펼침 (816×616): 바디 161.4×123.9mm(Samsung), 활성영역 154.1×116.3mm(7.6" 2448×1848) → 5.30px/mm */
    /* Fold8 펼침 카메라 홀(2026-09-21 photo-measured): 뉴스룸 보도자료 Launch_dl5_F.jpg(1440×960, 펼침 정면 카메라 앱 렌더, 화면 874px = 816 CSS px → 1.071px/px, 종횡비 1.324 = 1848×2448 일치) —
     * 홀 Ø20px → 18.7 CSS px(18 유지) · 중심 화면 좌측에서 620 / 우측에서 196 · 상단에서 21 → top 12 · offset(우측 가장자리→홀 오른쪽) 187. 코너가 아니라 폭의 76% 지점.
     * 회전(반시계) 시 홀은 왼쪽 변 위에서 187~205 → 가로 상태바 행(24) 과 겹치지 않음. safeAreaLandscape.left 38 = 홀 오른쪽 30 + 여백 8(세로 상태바 38 과 같은 '컷아웃을 감싸는' 규칙, derived) */
    'fold8-open':{family:'fold',top:17.5,right:16.5,bottom:17.5,left:16.5,ring:4.5,radius:15,glassRadius:10,screenRadius:6,platform:'android',frameReferenceDpr:3,cutoutInsets:{portrait:'top',landscape:'left'},obstruction:'상단 우측(폭 76%) 카메라·접힘선',
      cutout:{type:'hole',width:18,height:18,top:12,align:'right',offset:187},
      controls:{keys:[{type:'volume',edge:'right',start:86,length:133,protrusion:4.1},{type:'power',edge:'right',start:293,length:93,protrusion:1.6}]},   /* 왼쪽 키 없음 · 오른쪽 볼륨 + 측면 키 — 공식 펼침 정면 렌더 photo-measured(현재 CSS 값, frameReferenceDpr 환산 대상 아님) */
      safeArea:{top:30,right:0,bottom:24,left:0},safeAreaLandscape:{top:24,right:0,bottom:16,left:30},statusBarHeight:33,homeIndicator:true,homeIndicatorWidth:140,   /* safe top 30 = 홀 하단 · statusBarHeight 33 = 홀 하단 + 3 (2026-09-22: 근거 없던 +8 여백 제거, 다른 Galaxy 와 같은 규칙) */
      source:{body:'official: 펼침 161.4×123.9mm',bezel:'photo-measured(2026-10-07): 공식 펼침 정면 렌더 553840954(1.4494px/CSS) 바디 외곽 → 활성 화면 상 35.5px=24.5 · 하 35.8px=24.7 · 좌 34.0px=23.45 · 우 33.1px=22.9 CSS(변마다 39~59곳 중앙값) → 이 값은 셸 border 1px 을 포함한 최종 표시 두께로 보고 (실측 − 1) × 2.25/3 → 상하 17.5 · 좌우 16.5(대칭, 표시 24.3 / 23.0) — 이전 20/19 는 활성영역 154.1mm 가정 derived(3.65mm, 렌더 기준 실제 약 3.3mm)',ring:'photo-measured(같은 렌더): 밝은 금속 + 챔퍼(안쪽 어두운 홈 직전까지) 상 8.2 · 하 9.2 · 좌 8.0 · 우 8.7px = 평균 5.9 CSS → 4.5(표시 6.0) — 이전 6(표시 8) 은 근거 기록 없음',radius:'photo-measured(2026-10-07): samsung.com US 갤러리 펼침 정면 PNG "us-galaxy-z-fold8-f971-600257-sm-f971ulvaxaa-553840954"(2052×1641, 화면 1577px = 1088 CSS → 1.4494px/CSS, 비율 1.324 = 2448×1848 일치) 바디 코너 29.6px(4코너, 원 맞춤 오차 0.1) = 20.4 CSS → frameReferenceDpr 3 좌표 15(렌더 20.0) — 이전 35 는 동심 가정 16+19 derived',glassRadius:'photo-measured(같은 렌더): 검은 글래스 코너 약 20px(19~23, 링 안쪽 홈선 때문에 신뢰도 중간) = 약 14 CSS → 10(렌더 13.3) — 바디−링 동심 fallback(12) 은 실측 범위보다 작아 명시',screenRadius:'photo-measured(같은 렌더): 화면 코너 10.8~12.0px(원 맞춤 오차 0.04~0.1) = 7.7 CSS → 6(렌더 8.0) — 이전 16 은 렌더 미확보 approximation',cutout:'photo-measured: 뉴스룸 Launch_dl5_F.jpg(1.071px/CSSpx, 저해상도 ±1.5px) 홀 Ø18.7 · 중심 우측에서 196 / 상단에서 21 → top 12 · offset 187',controls:'photo-measured(2026-10-07): samsung.com US 갤러리 펼침 정면 렌더 "…sm-f971ulvaxaa-553840954"(화면 1577px = 1088 CSS → 1.4494px/CSS) 바디 오른쪽 외곽 돌출 — 볼륨 86.0~219.2(길이 133.2) 돌출 5.90px = 4.07 CSS(0.58mm) · 측면 키 292.9~386.0(길이 93.1) 돌출 2.25px = 1.55 CSS(0.22mm) · 왼쪽 돌출 없음',statusBar:'derived: safeArea.top 30 = 홀 하단(컷아웃 경계 12+18) · statusBarHeight 33 = 홀 하단 + 3 여백(다른 Galaxy 와 같은 규칙, 여백은 approximation; 2026-09-22 이전의 +8 은 근거 없어 제거) · 가로 left 30 = 회전 시 왼쪽 변 홀(187~205) 의 오른쪽 경계(Android 측면 컷아웃 letterbox 규칙) · 가로 상단 24 는 AOSP 기본값 준용(derived) · 가로 하단 16 approximation'}},

    /* iPhone Duo 접힘(외부 466×678): 접힌 바디 84.1×117.8mm(Apple specs), 외부 화면 5.36" 표준 사각형(Apple) 2034×1398 → 77.1×112.2mm → 6.04px/mm.
     * 렌더 실측: Apple 뉴스룸 "Apple-iPhone-Duo-display-sizes-260909.jpg"(3840×2160 원본, 9.48px/mm; 화면 종횡비 1.455 = 공식 2034/1398 일치).
     * 구조: 힌지 쪽(왼쪽) 코너는 거의 각지고 바깥쪽은 크게 둥근 비대칭. 바디(패널) 바깥 힌지 쪽에 힌지 커버(스파인) 가 별도로 보인다 → hingeBody.
     * 패널 폭 = 84.1 − 스파인 1.9 = 82.2mm, 베젤 (82.2−77.1)/2 = 2.55mm → 15px · 상하 (117.8−112.2)/2 = 2.8mm → 17px */
    /* 2026-10-08 재검증(셸 border 포함 기준): 위 · 오른쪽 · 왼쪽 베젤 · 링 · 화면 코너 · 스파인 · 홀 · 위 변 버튼은 display-sizes 원본 재측정, 아래 베젤은 손에 가려 공식 높이 117.8mm 에서 환산(값별 근거는 source) */
    'duo-outer':{family:'duo',top:15,right:15,bottom:17,left:13,ring:6.5,radius:{tl:5,tr:75,br:75,bl:5},screenRadius:{tl:9,tr:60,br:60,bl:9},platform:'ios',obstruction:'우상단 카메라',
      hingeBody:{type:'spine',side:'left',width:11.5,inset:8,radius:4},
      cutout:{type:'hole',width:37,height:37,top:29,align:'right',offset:29},
      controls:{keys:[{type:'volume',edge:'top',start:223.5,length:65.5},{type:'volume',edge:'top',start:304,length:65.5},{type:'power',edge:'right',start:202,length:113}]},   /* 위 변 볼륨 2(photo-measured) · 오른쪽 Touch ID 측면 버튼(손에 가려 내부 화면 실측을 mm 로 환산, verified-derived) — 왼쪽은 스파인 */
      safeArea:{top:0,right:92,bottom:0,left:0},safeAreaLandscape:{top:0,right:0,bottom:0,left:92},homeIndicator:false,
      source:{body:'official: 접힘 84.1×117.8mm (Apple iPhone Duo specs) · 외부 1398×2034 official',bezel:'photo-measured(2026-10-08): Apple 뉴스룸 "Apple-iPhone-Duo-display-sizes-260909" 원본(3840×2160, 손에 든 정면 — 외부 화면 732px = 466 CSS → 1.5705px/CSS, 화면 비 공식 2034/1398 일치) — 바디(앞판) 외곽 → 활성 화면 위 16.05 · 오른쪽 15.98 · 왼쪽(스파인 옆 앞판 가장자리) 13.98 → 셸 border 1px 포함 표시 16 / 16 / 14 가 되도록 frame 위 15 · 오른쪽 15 · 왼쪽 13. 아래는 손이 바로 닿아 외곽이 13.4~15.2 사이로 확정되지 않아 공식 바디 높이 117.8mm(= 711.9 CSS) − 위 16.05 − 화면 678 = 17.85 로 환산 → frame 17(verified-derived). 가로 합(스파인 11.6 + 왼쪽 14.0 + 화면 466 + 오른쪽 16.0 = 507.6 CSS = 84.0mm) 이 공식 84.1mm 와 일치 · 이전: 공식 mm derived 상하 17 · 좌우 15(셸 border 미반영)',radius:'photo-measured: 바깥쪽(카메라 쪽) 코너 — 오른쪽 위를 직선 변에 접하는 원으로 맞추면 75.6 CSS(rms 0.42 CSS @75) → 75 유지(오른쪽 아래는 손에 가려 72.1 로 불확실 — 위와 같다고 가정) · 힌지 쪽 앞판 코너 5 는 2026-09-18 값 유지(스파인과 붙어 있어 이번 이미지로는 원 맞춤 불가, 확대 관찰로는 약 3)',screenRadius:'photo-measured(2026-10-08, 같은 이미지): 바깥쪽 화면 코너 오른쪽 위 접선 맞춤 59.2 → 60 유지(오른쪽 아래는 화면 내용이 어두워 제외) · 힌지 쪽 왼쪽 위 rms 최소 9(8 은 0.28 · 9 는 0.17 CSS) → 9(이전 8)',hingeBody:'photo-measured(2026-10-08, 같은 이미지): 스파인 폭 11.1~11.6 → 11.5(이전 12) · 앞판 위 끝에서 안쪽으로 8.0 내려와 시작 → inset 8(이전 7) · 스파인 끝 코너 약 3.7 → radius 4(이전 8) · 앞판과 스파인 사이 어두운 홈은 셸 border 가 대신함',ring:'photo-measured(같은 이미지): 앞판 금속 테(바디 외곽 → 테 안쪽 어두운 선) 위 약 7.6 · 오른쪽 약 6.3 · 왼쪽 약 5.6(평균 6.5) → 6.5(이전 4 = 0.5~1.0mm 어림값)',cutout:'photo-measured(2026-10-08, 같은 이미지): 홀 지름 36.8 · 중심이 화면 오른쪽에서 47.6 · 위에서 47.7 → 37 × 37 @ top 29 · offset 29(중심 47.5; 컷아웃 상자는 정수 반올림) · 이전 36 @ 30 / 30(2026-09-18)',controls:'2026-10-08: 위 변 볼륨 2 — photo-measured(같은 이미지): 앞판 왼쪽 외곽에서 223.4 · 304.2 · 길이 각 65.6 · 돌출 3.0(기본 3) → start 223.5 / 304 · length 65.5. 펼친 화면의 위 변 버튼과 mm 로 같은 물리 버튼(길이 10.9mm · 오른쪽 끝에서 34.2 / 21.0mm) / 오른쪽 Touch ID 측면 버튼 — 이 이미지에서는 손가락에 가려 직접 측정 불가 → 같은 물리 변인 펼친 화면 오른쪽 변 실측(위에서 33.4mm · 길이 18.7mm) 을 외부 배율 6.04 CSS/mm 로 환산 start 202 · length 113(verified-derived) · 이전: family 기본 키(approximation)',statusBar:'official(HIG): 상태바·Dynamic Island·툴바·탭바가 카메라 쪽 세로 축에 배치 → statusBarProfiles.duo + frameProfiles.statusBar 오버라이드 참조 · safe-area 우측 92 = 측면 열(축 48 + 반폭 22 + 여백 22) derived · 홈 인디케이터는 공식 이미지에 없음(approximation)'}},

    /* iPhone Duo 펼침(내부 890×626): 바디 164.6×117.8mm(Apple specs), 내부 화면 7.58" 표준 사각형(Apple) 2670×1878 → 157.5×110.8mm → 5.65px/mm.
     * 렌더 실측(같은 파일, 열린 기기 9.48px/mm): 화면 1050×1493px = 110.8×157.5mm 로 공식과 일치. 4코너 모두 대칭(힌지 쪽 각진 코너는 펼치면 중앙 접합부로 숨음).
     * 단일 폴딩 화면 + 세로 접힘선(분리 영역 없음). 힌지 커버는 정면에서 보이지 않고 테두리 접합선(≈0.5mm) 만 보임 → hingeBody seam */
    /* 2026-10-08 재검증(셸 border 포함 기준): Siri-AI-app 원본(펼친 내부 정면) 에서 베젤 · 링 · 바디/화면 코너 · 이음새 · 상태 클러스터 · 측면 키 재측정(값별 근거는 source) */
    'duo-inner':{family:'duo',top:18,right:18,bottom:18,left:18,ring:4,radius:70.5,screenRadius:51,platform:'ios',obstruction:'언더 디스플레이 카메라·접힘선',
      hingeBody:{type:'seam',size:3},
      controls:{keys:[{type:'volume',edge:'top',start:673.5,length:61.5},{type:'volume',edge:'top',start:749,length:61.5},{type:'power',edge:'right',start:189,length:105.5}]},   /* 위 변 볼륨 2 · 오른쪽 Touch ID 측면 버튼 — Siri-AI-app 원본 photo-measured(돌출 3.1~3.2 = 기본 3) */
      cutout:{type:'none'},safeArea:{top:0,right:0,bottom:0,left:0},safeAreaLandscape:{top:0,right:0,bottom:0,left:0},homeIndicator:false,
      source:{body:'official: 펼침 164.6×117.8mm (Apple iPhone Duo specs) · 내부 2670×1878 official',bezel:'photo-measured(2026-10-08): Apple 뉴스룸 "Apple-iPhone-Duo-Siri-AI-app-260909" 원본(3840×2560, 펼친 내부 화면 정면 · 흰 배경 — 바디 3037.99 × 2174.3px, 비 1.3972 = 공식 164.6/117.8 의 1.3973 · 화면 2913.6 × 2049.3px = 890 × 626 CSS → 3.2737px/CSS) — 바디 외곽 → 활성 화면 좌 19.02 · 우 18.98 · 위 18.94 · 아래 19.26 → 셸 border 1px 포함 표시 19 가 되도록 frame 18 · 셸 928 × 664 = 이미지 바디 928.0 × 664.2 CSS(공식 mm 환산 930.3 × 665.8 과 0.3% 이내) · 이전: 공식 mm derived 20(셸 border 미반영 → 표시 21)',radius:'photo-measured(2026-10-08, 같은 이미지, 4코너): 바디 외곽을 직선 변에 접하는 원으로 맞추면 70.36 · 70.33 · 70.75 · 70.75(70.5 에서 rms 0.37 CSS; 72 는 0.60) → 70.5(이전 72) · glassRadius 미지정 — 링 안쪽 분리선이 두 줄로 겹쳐 원 맞춤이 불안정해 fallback 바디 − 링 = 66.5 유지',screenRadius:'photo-measured(2026-10-08, 같은 이미지): 화면 코너 접선 맞춤 왼쪽 위 51.23 · 오른쪽 위 51.29 · 오른쪽 아래 51.30(왼쪽 아래는 화면 내용이 어두워 제외) → 51(이전 52)',hingeBody:'photo-measured(2026-10-08, 같은 이미지): 위·아래 가운데(화면 중앙 x 와 0.2px 이내) 에서 바디 외곽선이 V 자로 갈라지는 이음새 — 바깥 폭 약 6 CSS(18~23px) 에서 깊이 약 4 CSS(링 두께와 같음) 에서 닫힘 → 평균 폭 약 3 이라 seam 3 유지(V 형상은 구현하지 않음) · 위 베젤 안의 힌지 커버 블록(폭 약 62 CSS) 은 그리지 않음',ring:'photo-measured(같은 이미지): 금속 테(바디 외곽 → 테 안쪽 어두운 분리선) 좌 12.15 · 우 12.3 · 위 11.6 · 아래 12.7px = 약 3.7 CSS → 4 유지(이전 근거: 0.5mm 어림값)',crease:'approximation: 공식 이미지에서는 접힘선이 검출되지 않음(나노 텍스처) — 위치 표시용 2px 희미한 선',cutout:'official: 언더 디스플레이 카메라 (Apple)',controls:'photo-measured(2026-10-08, 같은 이미지): 위 변 볼륨 2 — 바디 왼쪽 외곽에서 673.4 · 749.2, 길이 61.7 · 61.4, 돌출 3.2 → start 673.5 / 749 · length 61.5 / 오른쪽 Touch ID 측면 버튼 — 바디 위에서 189.0 · 길이 105.7 · 돌출 3.1 → start 189 · length 105.5(돌출은 기본 3) · 이전: n/a(family 기본 키)',statusBar:'official(HIG): 펼침(가로형) 은 카메라 쪽(우측) 세로 축에 상태 클러스터·컨트롤, 세로로 돌리면 표준 가로 바 → statusBarProfiles.duo 참조 · safe-area 우측 0(2026-11-09 — 이전 89 는 측면 열(축 45 + 22 + 22) 용 derived 값이었으나 실기기 사진에서 펼친 내부는 측면 열 없이 상단 가로 Safari 라 제거) · 홈 인디케이터는 공식 이미지에 없음(approximation)'}},

    /* iPad 9.7" 홈 버튼형 (768×1024): iPad 6세대(2018) 바디 240.0×169.5mm(Apple), 활성영역 147.8×197.1mm(9.7" 4:3) → 5.20px/mm */
    'ipad-home':{family:'ipad-classic',top:112,right:56,bottom:112,left:56,ring:8,radius:57,screenRadius:0,platform:'any',obstruction:'화면 밖 홈 버튼·카메라',
      cutout:{type:'none'},safeArea:{top:20,right:0,bottom:0,left:0},safeAreaLandscape:{top:20,right:0,bottom:0,left:0},homeIndicator:false,
      controls:{homeButton:{size:57,ring:3,bottom:28},camera:{size:10,top:51,offsetX:0}},
      source:{body:'official: iPad 6세대 240.0×169.5mm',bezel:'derived: 측면 (169.5−147.8)/2=10.85mm → 56px · 상하 (240−197.1)/2=21.45mm → 112px',radius:'approximation: 렌더 미확보 (≈11mm 추정)',screenRadius:'official: 각진 코너 (0)',cutout:'n/a',controls:'approximation: 홈 버튼 ≈11mm(57px) 하단 베젤 중앙 · 전면 카메라 상단 베젤 중앙 (미측정)',statusBar:'official: iPadOS 상태바 20pt, 홈 인디케이터 없음'}},

    /* iPad Air 11 (M4, 2026) 세로 820×1180: 바디 247.6×178.5×6.1mm · native 2360×1640 264ppi · 대각선 10.86"(27.59cm) 모두 Apple tech specs(support.apple.com/126471, official).
     * 활성영역(derived): 공식 대각선 275.9mm ÷ 2873.8px = 0.0960mm/px → 226.6×157.4mm → 5.21px/mm(CSS). 베젤 = (178.5−157.4)/2 = 10.55 · (247.6−226.6)/2 = 10.5mm → 55px 4변 동일.
     * 렌더 실측(photo-measured): Apple tech specs 정면 렌더 "ipad-air-11-inch-m4.png"(1000×1000, 3.37px/mm, 11" 정면) — 바디 코너 r 45px=13.4mm(rms 0.64; 동심 검산 3.0+10.5=13.5 일치) · 화면 코너 r 10px=3.0±0.3mm ·
     *   카메라(긴 변 우측 베젤 중앙선, 화면 중심에서 위로 32px=9.5mm) · 조도 센서(아래로 33px=9.8mm) · 볼륨 버튼(우측 변, 위에서 19.0mm 부터 20.8mm) · 상단 버튼/Touch ID(상단 변, 우측 끝에서 12.5~30mm).
     *   교차 확인: Apple 뉴스룸 13" 렌더 "Apple-iPad-Air-M4-multitasking-260302"(5.55px/mm) 화면 코너 r 18px=3.2mm 일치, 상태바 텍스트 중심 2.9mm(≈15pt) → 당시 상태바 28pt(폐기 이력 — 현재 safeArea.top 30 approximation, 상태바 글꼴·아이콘은 2026-10-07 재검증값 · 아래 statusBar override 참조).
     * 카메라가 가로 긴 변(Apple: "Landscape 12MP Center Stage camera") → 세로 기준 오른쪽 베젤, 가로(반시계) 에서는 상단 중앙 왼쪽. */
    'ipad-air-11':{family:'ipad-modern',top:54,right:54,bottom:54,left:54,ring:6,radius:67.5,screenRadius:18,platform:'ios',obstruction:'긴 변 베젤 카메라·홈 인디케이터',
      cutout:{type:'none'},safeArea:{top:30,right:0,bottom:20,left:0},safeAreaLandscape:{top:30,right:0,bottom:20,left:0},homeIndicator:true,homeIndicatorWidth:300,
      controls:{camera:{size:18.5,edge:'right',offset:-49,inset:23},sensor:{size:5.5,edge:'right',offset:49,inset:23},   /* inset = 셸 패딩 경계 기준이라 바디 외곽에서는 +1(실측 23.8 · 23.9) */
        keys:[{type:'volume',edge:'right',start:102,length:53,protrusion:1.5},{type:'volume',edge:'right',start:165,length:53,protrusion:1.5},{type:'power',edge:'top',start:774,length:89,protrusion:1.9}],
        port:{edge:'bottom',width:47,height:3}},
      source:{nativePhysicalResolution:'official: 2360×1640 (Apple tech specs 126471 "2360-by-1640-pixel resolution at 264 ppi") · 대각선 10.86"/27.59cm official',
        renderedPhysicalResolution:'derived-orientation: 1640×2360 — 세로(portrait) 프리뷰 기준 width×height 로 정규화, official 원문값 아님',
        cssViewport:'derived: 820×1180 @DPR 2 — iPad Air 11 (M4) 실기기에서 직접 검증한 값이 아님. 동일 해상도·패널(2360×1640 264ppi) 의 이전 모델 iPad Air 11" (M2) 레퍼런스(Use Your Loaf "iPad 2024 Screen Sizes" 2024-05-13: 820×1180 pt @2x, 2360÷2=1180 정합) 를 준용(inferred). Apple 공식 pt 표기는 확인하지 못함(HIG Layout 표 현재 미게시) → 실제 M4 에서 innerWidth / innerHeight / devicePixelRatio 확인 시 verified 로 승격',
        body:'official: 247.6×178.5×6.1mm',bezel:'photo-measured(2026-10-08): Apple Store iPad Air 구매 페이지(M4 판매 페이지 게시) 11" 제품 이미지 "ipad-air-select-11in-wifi-spacegray-202405"(Scene7 4000×4732 PNG, 정면 + 뒤쪽 뒷면 겹침 — 정면 기기 바디 2427.1 × 3367.3px, 비 1.3873 = 공식 247.6/178.5 의 1.3871 · 화면 2141.15 × 3080.5px, 비 1.4387 = 1180/820 → 2.611px/CSS; 자산명은 202405 이지만 M4 와 바디 치수 공식값이 같고 현재 Apple 이 M4 판매 페이지에 쓰는 이미지) — 바디 외곽 → 활성 화면 좌 54.55 · 우 54.95 · 위 54.87 · 아래 54.98 CSS(평균 54.8) → 셸 border 1px 포함 최종 표시 55 가 되도록 frame 54 · 셸 930 × 1290 = 공식 바디 178.5 × 247.6mm(5.21 CSS/mm) 와 일치 · 이전 55(공식 대각선 활성영역 derived, 셸 border 미반영 → 표시 56)',ring:'photo-measured(같은 이미지): 금속 테(바디 외곽 → 검은 글래스 시작) 좌 5.76 · 우 5.76 · 위 약 6.5 · 아래 5.17(평균 5.8) → 6(이전 5 = 3.37px/mm 저해상도 렌더 2~4px)',
        radius:'photo-measured(같은 이미지): 바디 코너를 직선 변에 접하는 원으로 맞추면 오른쪽 위 67.3 · 오른쪽 아래 67.45 CSS(rms 0.36~0.41 CSS; 70 은 0.85) → 67.5(이전 70 = 3.37px/mm 렌더 13.4mm) · 왼쪽 코너는 뒤쪽 뒷면 기기와 겹쳐 제외 · glassRadius 미지정 — fallback 바디 − 링 = 61.5 가 링 안쪽 코너 접선 맞춤 약 62 와 1 이내',screenRadius:'photo-measured(같은 이미지): 화면 코너 접선 맞춤 왼쪽 위 18.2 · 오른쪽 위 19.0 · 오른쪽 아래 18.6(자유 원 맞춤 17.6~17.7, 왼쪽 아래는 배경화면이 어두워 제외) → 18 유지(이전 근거: 3.37px/mm 렌더 3.0mm · 13" 렌더 3.2mm)',cutout:'n/a',
        controls:'photo-measured(2026-10-08, 같은 이미지): 카메라 — 오른쪽 긴 변 베젤, 중심이 화면 중심에서 위로 49.4 · 바디 외곽에서 23.8, 보이는 카메라 원판 Ø 18.4~18.6 → size 18.5 · offset −49 · inset 23(이전 15 · 기본 inset 베젤 절반 27.5) / 조도 센서 — 화면 중심 아래 49.4 · 바디 외곽에서 23.9 · Ø 5.4 → size 5.5 · offset 49 · inset 23(이전 7 · +51) / 볼륨 2개 — 오른쪽 변, 바디 위에서 101.9 · 164.7, 길이 각 52.9, 돌출 4.0px = 1.53 CSS → start 102 / 165 · length 53 · protrusion 1.5(이전 99 / 159 · 48, 두 버튼 분할 approximation) / 상단 버튼(Touch ID) — 위 변, 바디 왼쪽에서 773.7 · 길이 89.2 · 돌출 4.95px = 1.9 CSS → start 774 · length 89 · protrusion 1.9(이전 93) · USB-C 는 정면 이미지에서 보이지 않아 위치(하단 변 중앙, official) · 폭 47(approximation) 유지',
        statusBar:'상태바 내용 photo-measured(2026-10-07 재검증 — Apple 뉴스룸 iPad Air M4 Goodnotes 세로 0.956px/pt · Final Cut Pro 가로 1.066px/pt): font-size 14 · centerY / centerYLandscape 16.4 · wifiScale .88 · batteryScale 1.25 · iconGap 4.2 · padding 16.8 / 14.1 · percentScale 1 · percentLetterSpacing .85("100%" 폭 36.3) — 상세는 아래 iPad Air statusBar override 의 source · 상태바 높이 30 은 상태바 경계가 보이지 않아 approximation 유지(2026-09-21 시간 텍스트 중심 15pt 의 중심 대칭 가정, iPadOS 26/27 공식 수치 없음) · 폐기 이력(2026-09-21): 글꼴 ≈17 · 100% ≈13 · 배터리 24.5×11 · Wi-Fi 12.6×8 · 여백 14 / 16(multitasking 렌더 벽지 위 측정) · 홈 인디케이터 20pt 는 M4 실기기 직접 검증값이 아니라 홈 인디케이터형 iPad 계열 공통 UIKit safe-area 기준을 준용(derived; 실기기 env(safe-area-inset-bottom) 확인 시 verified), 폭 300 approximation(렌더에 미표시)'}},

    /* Galaxy Tab S11 (11.0형) 세로 800×1280: 바디 253.8×165.3×5.5mm · native 2560×1600 · 대각선 278.1mm(전체 직사각형)/276.2mm(둥근 모서리) — Samsung 뉴스룸 2025-09-04 사양표 + samsung.com/sec (official).
     * 활성영역(derived): 278.1mm ÷ 3018.6px = 0.09213mm/px → 235.9×147.4mm → 5.43px/mm(CSS). 베젤 = (165.3−147.4)/2 = 8.95 · (253.8−235.9)/2 = 8.95mm → 49px (Samsung "7.8mm bezel" 은 프레임 제외 검은 유리 폭으로 해석).
     * 렌더 실측(photo-measured): samsung.com US 갤러리 "us-galaxy-tab-s11-sm-x730-sm-x730nzaaxar-550443947"(2052×1641 투명 PNG, 가로 정면, 5.80px/mm) — 바디 코너 r 56~57px=9.75mm · 화면 코너 r 19px=3.3mm · 베젤 50~55px=8.6~9.5mm ·
     *   카메라 긴 변 베젤 중앙(수평), 바디 가장자리에서 28.6px=4.9mm, Ø≈11px=1.9mm · 노치 없음 · 상단 변(가로 기준) 키 2개: 46.5mm 부터 20.2mm(볼륨 추정) / 76.7mm 부터 13.3mm(전원 추정) · USB-C 는 측면 렌더 550443968 에서 짧은 변 중앙.
     * 카메라가 긴 변(가로 상단) → 세로 기준 오른쪽 베젤, 가로(반시계) 에서 상단 중앙. 가로 상단 변의 키는 세로에서 오른쪽 변(위에서 같은 거리). */
    'galaxy-tab-s11':{family:'galaxy-tab',top:46,right:46,bottom:46,left:46,ring:5,radius:50,screenRadius:16,platform:'android',obstruction:'긴 변 베젤 카메라',
      cutout:{type:'none'},safeArea:{top:24,right:0,bottom:24,left:0},safeAreaLandscape:{top:24,right:0,bottom:24,left:0},homeIndicator:true,homeIndicatorWidth:200,
      controls:{camera:{size:10,edge:'right',offset:0,inset:21},
        keys:[{type:'volume',edge:'right',start:252,length:107},{type:'power',edge:'right',start:416,length:72}],
        port:{edge:'bottom',width:49,height:3}},
      source:{nativePhysicalResolution:'official: 2560×1600 (Samsung Global Newsroom 2025-09-04 사양표 "11.0-inch, 2560 x 1600" · samsung.com/sec) · 대각선 278.1mm 전체 직사각형 / 276.2mm 둥근 모서리 official',
        renderedPhysicalResolution:'derived-orientation: 1600×2560 — 세로(portrait) 프리뷰 기준 width×height 로 정규화, official 원문값 아님',
        cssViewport:'derived: 800×1280 @DPR 2 — S11 실기기에서 직접 검증한 값이 아님. 동일 해상도·밀도 패널(2560×1600 274ppi) 의 전작 Galaxy Tab S9 가 800×1280 CSS @2 로 보고된 외부 레퍼런스(1440px.com "Android Tablets Screen Sizes") 를 준용(inferred). Samsung 공식 CSS 폭·DPR 표기 없음 → 실기기 innerWidth/devicePixelRatio 확인 시 verified 로 승격',
        body:'official: 253.8×165.3×5.5mm',bezel:'photo-measured(2026-10-07 재검증: samsung.com US 갤러리 "…550443947" 가로 정면 렌더 — 지금은 1600×1200 흰 배경 PNG 로 제공, 바디 1472.3 × 958.7px(비 1.5357 = 253.8/165.3 의 1.5354) · 화면 1371 × 858px(비 1.598 = 2560/1600) → 1.0711px/CSS · 5.80px/mm, 층별 경계·원 맞춤 실측): 바디 외곽 → 활성 화면 좌 48.1 · 우 46.5 · 상 47.6 · 하 46.4 CSS(평균 47.1) → 셸 border 1px 포함 최종 표시 두께로 보고 46(표시 47) — 이전 49 는 공식 대각선 기준 활성영역 derived(표시 50)',ring:'photo-measured(같은 렌더): 바디 → 검은 유리 좌 6.1 · 우 4.5 · 상 5.6 · 하 4.4(평균 5.1) → 5(이전 4) · 글래스 코너는 원 맞춤 오차가 커서(0.8~1.9) 미지정(바디 − 링 = 45)',
        radius:'photo-measured(같은 렌더): 바디 코너 우상 50.2 · 우하 49.3 · 좌하 50.5 CSS(원 맞춤 오차 0.17~0.33; 좌상은 키에 가까워 제외) → 50(이전 53 은 9.75mm 수동 측정)',screenRadius:'photo-measured(같은 렌더): 화면 코너 15.1~16.2(오차 0.2) → 16(이전 18)',cutout:'n/a: 노치 없음 (베젤 안 카메라)',
        controls:'photo-measured(2026-10-07 재측정, 같은 렌더): 카메라 긴 변 베젤 가운데(바디 중앙과 0.5 이내), 렌즈 중심이 바디 가장자리에서 23.7px = 22.1 CSS → 선언 inset 21(셸 border 안쪽 좌표 — 바디 외곽 기준 최종 표시 22; 2026-10-08 보정, 그 전 선언 22 는 표시 23 · 이전 27) · Ø 약 10.7 → 10 유지 · 키(가로 상단 변 → 세로 오른쪽 변): 253.5 부터 107.4 → start 252 · 길이 107(볼륨, 이전 110) / 415.9 부터 71.9 → start 416 · 길이 72(전원) · 두 키 돌출 3.03 CSS = 공통 기본 3 과 같아 protrusion 미지정 · USB-C 짧은 변 중앙(측면 렌더 550443968), 폭 9mm→49px approximation',
        statusBar:'approximation: One UI 8 태블릿 상태바 24dp(Android 표준) · 하단 제스처 바 24 (One UI 기본 3버튼 내비 48dp 일 수 있음) — 높이 값은 android-tablet-* browserProfiles 에서 관리'}},

    /* Galaxy Tab S11 Ultra (14.6형) 세로 924×1480: 바디 326.3×208.5×5.1mm · native 2960×1848 · 대각선 369.9mm(전체 직사각형)/367.2mm(둥근 모서리) — Samsung 뉴스룸 2025-09-04 + samsung.com/uk 스펙 (official). "narrow 5.2mm bezels" official.
     * 활성영역(derived): 369.9mm ÷ 3489.6px = 0.10600mm/px → 313.8×195.9mm → 4.72px/mm(CSS). 베젤 = (208.5−195.9)/2 = 6.3 · (326.3−313.8)/2 = 6.25mm → 30px (5.2mm 유리 + ≈1.1mm 프레임).
     * 렌더 실측(photo-measured): samsung.com US 갤러리 "us-galaxy-tab-s11-ultra-sm-x930-sm-x930nzaaxar-548666708"(2052×1641, 가로 정면, 4.48px/mm) — 바디 코너 r 44~45px=9.9mm · 화면 코너 r 20px=4.5mm · 베젤 28~29px=6.3~6.5mm ·
     *   상단 중앙 완만한 노치: 화면 안 깊이 12.5px=2.8mm, 폭 59px=13.2mm · 카메라 노치 위 베젤 안, 바디 가장자리에서 24px=5.4mm, Ø≈10px=2.2mm · 키: 46.9mm 부터 20mm / 77mm 부터 12.7mm (S11 과 같은 위치) · USB-C 짧은 변 중앙(측면 렌더 548666728).
     * S11 과의 차이: 베젤 8.95 → 6.3mm, 카메라가 베젤에 다 들어가지 않아 화면에 wave 노치, 화면 코너 3.3 → 4.5mm, 후면 듀얼 카메라. */
    'galaxy-tab-s11-ultra':{family:'galaxy-tab',top:28,right:28,bottom:28,left:28,ring:4.5,radius:43,screenRadius:19,platform:'android',obstruction:'긴 변 상단 wave 노치·카메라',
      cutout:{type:'notch',shape:'wave',edge:'right',depth:13,length:62,offset:0},
      safeArea:{top:24,right:0,bottom:24,left:0},safeAreaLandscape:{top:24,right:0,bottom:24,left:0},homeIndicator:true,homeIndicatorWidth:220,
      controls:{camera:{size:10,edge:'right',offset:0,inset:23},
        keys:[{type:'volume',edge:'right',start:223,length:91},{type:'power',edge:'right',start:364,length:56}],
        port:{edge:'bottom',width:42,height:3}},
      source:{nativePhysicalResolution:'official: 2960×1848 (Samsung Global Newsroom 2025-09-04 사양표 "14.6-inch, 2960 x 1848" · samsung.com/uk "2960 x 1848 (WQXGA+)") · 대각선 369.9mm 전체 직사각형 / 367.2mm 둥근 모서리 official',
        renderedPhysicalResolution:'derived-orientation: 1848×2960 — 세로(portrait) 프리뷰 기준 width×height 로 정규화, official 원문값 아님',
        cssViewport:'derived: 924×1480 @DPR 2 — S11 Ultra 실기기에서 직접 검증한 값이 아님. 동일 해상도·밀도 패널(2960×1848 239ppi) 의 전작 Galaxy Tab S9 Ultra·S10 Ultra 가 924×1480 CSS @2 로 보고된 외부 레퍼런스(1440px.com "Android Tablets Screen Sizes") 를 준용(inferred). Samsung 공식 CSS 폭·DPR 표기 없음 → 실기기 확인 시 verified 로 승격',
        body:'official: 326.3×208.5×5.1mm',bezel:'photo-measured(2026-10-07 재검증: samsung.com US 갤러리 "…548666708" 가로 정면 렌더, 1600×1200 흰 배경 PNG — 바디 1460.6 × 933.1px(비 1.5653 = 326.3/208.5 의 1.5650) · 화면 1406 × 878px(비 1.6014 = 2960/1848) → 0.9500px/CSS · 4.48px/mm): 바디 외곽 → 활성 화면 좌 29.0 · 우 28.4 · 상 29.9 · 하 28.1 CSS(평균 28.9) → 셸 border 포함 최종 표시 두께로 보고 28(표시 29) — 이전 30 은 공식 대각선 기준 derived(표시 31)',ring:'photo-measured(같은 렌더): 바디 → 검은 유리 좌 4.8 · 우 4.2 · 상 5.7 · 하 3.9(평균 4.7) → 4.5(이전 3) · 글래스 코너는 원 맞춤 결과가 바디보다 커서(47.9~48.6, 오차 0.7~0.8) 근거로 쓰지 않고 미지정(바디 − 링 = 38.5)',
        radius:'photo-measured(같은 렌더): 바디 코너 우상 43.2 · 우하 42.8 · 좌하 43.2 CSS(오차 0.14~0.33; 좌상은 키에 가까워 제외) → 43(이전 47)',screenRadius:'photo-measured(같은 렌더): 화면 코너 18.2~19.6(오차 0.21~0.23) → 19(이전 21)',
        cutout:'photo-measured: 상단 중앙 완만한 노치 깊이 12.5px=2.8mm → 13px · 폭 59px=13.2mm → 62px (반타원 근사, shape wave) · Samsung 각주 "actual viewable area is less due to the rounded corners and the camera hole"',
        controls:'photo-measured(2026-10-07 재측정, 같은 렌더): 카메라 노치 위 베젤 안 가운데, 렌즈 중심이 바디 가장자리에서 22.7px = 23.9 CSS → 선언 inset 23(셸 border 안쪽 좌표 — 바디 외곽 기준 최종 표시 24; 2026-10-08 보정, 그 전 선언 24 는 표시 25 · 이전 25) · Ø 약 10.5 → 10 유지 · 키(가로 상단 변 → 세로 오른쪽 변): 223.8 부터 90.5 → start 223 · 길이 91(볼륨, 이전 221/94) / 364.8 부터 55.8 → start 364 · 길이 56(전원, 이전 363/60) · 두 키 돌출 2.65 CSS — 공통 기본 3 과 0.35 차이라 protrusion 미지정 · 노치(cutout) 는 깊이 12.8~13.7 로 현재 13 과 맞고, 폭은 경계 기준선에 따라 57~62 로 달라 근거 부족 → 13 / 62 유지 · USB-C 짧은 변 중앙(측면 렌더 548666728), 폭 9mm→42px approximation',
        statusBar:'approximation: One UI 8 태블릿 상태바 24dp(Android 표준, 노치 깊이 13 을 덮음) · 하단 제스처 바 24 (3버튼 내비 48dp 일 수 있음) — 높이 값은 android-tablet-* browserProfiles 에서 관리'}},
    /* MacBook(2026-10-15, family macbook · platform macos). 화면 = macOS 기본 "Looks like" 배율 해상도(CSS px, DPR 2).
     * 공식(official): 원본 해상도 · ppi · 대각선 · 본체 폭/깊이(apple.com/macbook-air/specs · /macbook-pro/specs, 2026-10-15 확인).
     * 좌우 베젤 = (본체 폭 − 대각선 · 해상도 비로 계산한 화면 폭) ÷ 2 → CSS 환산(derived) − 셸 border 1. 위 · 아래 베젤은 공식 자료로 나눌 수 없어 좌우와 같게 둔다(approximation — 덮개 아래 힌지 부분은 그리지 않음).
     * 메뉴 막대 37pt = 노치 모델 기본 배율의 메뉴 막대(Bjango "Designing macOS menu bar extras", approximation — Air 13 은 같은 값 가정). 웹 viewport 는 메뉴 막대 아래 창 안이라 노치 · safe-area 영향 없음(safe-area 0, 노치 미표시).
     * 측면 키 없음(styles.css 가 family macbook 의 기본 키를 그리지 않음), 회전 안 함(devices 의 rotatable:false) */
    'macbook-air-13':{family:'macbook',top:35.7,right:35.7,bottom:35.7,left:35.7,ring:2,radius:18,screenRadius:0,platform:'macos',obstruction:'없음(노치는 메뉴 막대 영역)',
      cutout:{type:'none'},safeArea:{top:0,right:0,bottom:0,left:0},safeAreaLandscape:{top:0,right:0,bottom:0,left:0},statusBarHeight:37,statusBarHeightLandscape:37,homeIndicator:false,
      source:{body:'official: 30.41 × 21.5 × 1.13cm, 13.6형 2560 × 1664 @224ppi (apple.com/macbook-air/specs, M5)',bezel:'좌우 derived: 화면 폭 289.6mm(13.6형 · 2560:1664) → (304.1 − 289.6) ÷ 2 = 7.2mm × 5.08 CSS/mm = 36.7 − 셸 border 1 · 위/아래 approximation(좌우와 같게)',ring:'approximation',radius:'approximation',screenRadius:'approximation(각진 화면으로 둠)',cutout:'n/a — 노치는 메뉴 막대 안이라 그리지 않음',controls:'n/a',statusBar:'approximation: 메뉴 막대 37pt(노치 모델, Bjango)'}},
    'macbook-pro-14':{family:'macbook',top:24.2,right:24.2,bottom:24.2,left:24.2,ring:2,radius:18,screenRadius:0,platform:'macos',obstruction:'없음(노치는 메뉴 막대 영역)',
      cutout:{type:'none'},safeArea:{top:0,right:0,bottom:0,left:0},safeAreaLandscape:{top:0,right:0,bottom:0,left:0},statusBarHeight:37,statusBarHeightLandscape:37,homeIndicator:false,
      source:{body:'official: 31.26 × 22.12 × 1.55cm, 14.2형 3024 × 1964 @254ppi (apple.com/macbook-pro/specs, M5)',bezel:'좌우 derived: 화면 폭 302.5mm → (312.6 − 302.5) ÷ 2 = 5.05mm × 5.0 CSS/mm = 25.2 − 셸 border 1 · 위/아래 approximation(좌우와 같게)',ring:'approximation',radius:'approximation',screenRadius:'approximation(각진 화면으로 둠)',cutout:'n/a — 노치는 메뉴 막대 안이라 그리지 않음',controls:'n/a',statusBar:'approximation: 메뉴 막대 37pt(노치 모델 기본 배율, Bjango)'}},
    'macbook-pro-16':{family:'macbook',top:24.3,right:24.3,bottom:24.3,left:24.3,ring:2,radius:18,screenRadius:0,platform:'macos',obstruction:'없음(노치는 메뉴 막대 영역)',
      cutout:{type:'none'},safeArea:{top:0,right:0,bottom:0,left:0},safeAreaLandscape:{top:0,right:0,bottom:0,left:0},statusBarHeight:37,statusBarHeightLandscape:37,homeIndicator:false,
      source:{body:'official: 35.57 × 24.81 × 1.68cm, 16.2형 3456 × 2234 @254ppi (apple.com/macbook-pro/specs, M5 Pro/Max)',bezel:'좌우 derived: 화면 폭 345.6mm → (355.7 − 345.6) ÷ 2 = 5.05mm × 5.0 CSS/mm = 25.3 − 셸 border 1 · 위/아래 approximation(좌우와 같게)',ring:'approximation',radius:'approximation',screenRadius:'approximation(각진 화면으로 둠)',cutout:'n/a — 노치는 메뉴 막대 안이라 그리지 않음',controls:'n/a',statusBar:'approximation: 메뉴 막대 37pt(노치 모델 기본 배율, Bjango)'}}
  };
  Object.keys(frameProfiles).forEach(key=>{frameProfiles[key].id=key;});

  /* OS 상태바(시간·신호·Wi-Fi·배터리) 프로필.
   * 세 레이어를 분리한다: 컷아웃(노치·아일랜드·펀치홀) = frameProfiles.cutout(기기 하드웨어), 상태바 = 여기(OS), 주소창·툴바 = browserProfiles(브라우저 UI).
   * 프레임 platform 으로 기본 프로필을 고르고 frameProfiles[*].statusBar 로 항목을 덮어쓴다(예: iPhone SE 의 compact).
   *   icons        : 오른쪽 아이콘 순서.  cellularStyle : bars(iOS) | bars-wide | bars-high(짧은 막대가 높은 iOS 형) | wedge(Android) | bars-thin(One UI)
   *   padding      : 좌·우 기본 여백(px). 좌/우 정렬 컷아웃이 있으면 JS 가 그만큼 더 띄운다. */
  const statusBarProfiles={
    /* iOS 상태바(2026-09-21 전수 재실측, Apple 공식 이미지): 시간 SF Semibold 17pt(숫자 높이 12.0pt) · 셀룰러 19×11.8 · Wi-Fi 16.3×11.8 · 배터리 27×12.3~12.6pt · 아이콘 간격 8~9pt.
     *   iPhone 14(노치, 뉴스룸 Find-My 이미지 1.783px/pt) 와 iPhone 16 Pro(아일랜드, 뉴스룸 iOS 26 Phone 이미지 1.7435px/pt) 두 장에서 같은 값 → iconSize 12(배터리 1.05배) · iconGap 8.
     *   letterSpacing −.4 는 Windows 대체 글꼴(Arial 600) 의 "9:41" 폭 33.4 를 실측 31.5~32pt 에 맞추는 값. 좌우 여백·세로 중심(centerY) 은 컷아웃별로 다르므로 frameProfiles[*].statusBar 가 덮어쓴다.
     *   holdFontSize/iconSize 는 홈 버튼형(compact) 프레임이 별도 오버라이드. */
    ios:{platform:'ios',time:'9:41',icons:['cellular','wifi','battery'],cellularStyle:'bars',wifiStyle:'fan',batteryLevel:.82,padding:{left:30,right:26},fontSize:17,iconSize:12,iconGap:8,batteryScale:1.05,wifiScale:.97,letterSpacing:-.4},
    /* 표준 Android(AOSP 기본 상태바 — 현재 프리셋 중 직접 쓰는 기기는 없고 android 플랫폼 기본값·확장용): AOSP SystemUI dimens.xml(official) — status_bar_clock_size 14sp · status_bar_system_icon_size 15dp(드로어블 여백 포함, 가시 높이 ≈12) · status_bar_horizontal_padding 2.5sp → 간격 5 · 배터리 unified 20.6×12sp.
     * 좌우 여백 16/14 와 배터리 외곽선 형상은 실기기/공식 캡처 미확보 → approximation. 시간 글꼴 굵기 500 */
    android:{platform:'android',time:'12:30',icons:['wifi','cellular','battery'],cellularStyle:'wedge',batteryLevel:.82,padding:{left:16,right:14},fontSize:14,iconSize:12,iconGap:5},
    /* One UI 7/8(Galaxy): Samsung 공식 이미지 실측 — 뉴스룸 "One UI 7 Official Rollout" dl1.jpg(Galaxy S25 정면 렌더, 1.128px/CSSpx) 시간 "12:45" 숫자 높이 10 → 14px(굵기 500) · 좌 여백 14.6 · 우 여백 14.6 ·
     * 배터리 = 숫자가 든 알약(pill) 23×14, 100% 에서 전부 채움 · 신호 = 가는 4막대 10.6×12 · 항목 간격 7~8 / 뉴스룸 First Look dl3.jpg(Galaxy Z Fold8 Ultra 잠금 화면 실사진, 14.35px/mm) 로 One UI 8 아이콘 형상·비율 교차 확인
     * (Wi-Fi 부채꼴 1.88×1.32mm ≈ 폭 10.4·높이 7.3 → wifiScale .62, 막대 1.88×2.0mm, pill 4.0×2.4mm, 간격 1.1mm ≈ 6). 세로 위치는 밴드 중앙(Android 상태바 창 안 중앙 정렬). */
    oneui:{platform:'android',style:'oneui',time:'12:45',icons:['wifi','cellular','battery'],cellularStyle:'bars-thin',wifiStyle:'oneui',batteryStyle:'pill',batteryLevel:1,padding:{left:13,right:16},fontSize:14.5,letterSpacing:.6,numeric:'proportional-nums',ink:'#4a4a4a',iconSize:12,iconGap:4.5,wifiScale:.91,pill:{width:24,height:14,fontSize:11,letterSpacing:-.7}},
    /* 2026-10-07 재실측(One UI 공통값): 사용자 Galaxy Z Fold8 실기기 Chrome 캡처(커버·펼침, 2.25px/CSS 원본) — 신호 4막대 11.1×11.95 · 알약 "100" 24.0×14.0(숫자 높이 8.0 · 폭 17.8 → 글꼴 11 · 자간 −.7) · 막대 1.6 · 아이콘 간격 4.5~4.9 · 오른쪽 여백 16.0 · 시계 왼쪽 12.9(커버·펼침 동일 값).
     * Wi-Fi 는 iOS 형 가는 호를 .62 로 줄인 것이 아니라 두꺼운 호 3개 + 점(뉴스룸 First Look dl3.jpg Fold8 Ultra 실사진, 알약 높이 14 기준 2.43px/CSS): 높이 10.7 · 폭 14.8(좌우 대칭) · 호 굵기 1.65 · 중심선 반경 3.3/6.2/8.85 · 점 Ø2 · 끝 각도 ±48° → wifiStyle oneui · viewBox 15×11 · wifiScale .91(높이 10.9).
     * RTL(S25 · Flip8) 저해상도 캡처의 Wi-Fi 묶음(15.6 × 10.2, 송수신 화살표 포함) 과 일치. 실기기 이미지의 "6E"·↓↑ 활동 표시는 상태에 따라 바뀌어 그리지 않는다. 기기별 좌우 여백·세로 중심만 frameProfiles 가 덮어쓴다.
     * 색·시계(2026-10-07): 전경색 #4a4a4a — Fold8 커버·펼침 캡처의 시계·신호·알약·LTE 획 코어가 모두 #4a4a4a(밝기 74), S25·Flip8 RTL 알약 코어 #4c4c4c/#4a4a4a, 가는 획 최저값 72~78 로 일치(배경 #f8f8f9; Samsung 공식 One UI 7 렌더는 홈 화면 흰 아이콘이라 비교 제외).
     * 시계: 비례 숫자("1" 다음 숫자까지 중심 간격 S25 6.62 · Flip8 6.8 vs 다른 숫자 약 9.1 — 3개 캡처 공통) · 글꼴 14.5(Fold8 숫자 잉크 높이 10.4 ↔ Arial 14.5 = 10.36, 이전 14 = 10.0) · 자간 +.6(Fold8 글자 사이 1.97 vs Arial 자연 간격 1.3) · 글꼴은 Windows 대체 Arial 유지(Segoe UI 는 "5" 가 실기기보다 1.2 좁아 더 멀다) · 굵기 500 유지(Arial 은 400 으로 표시; 콜론 점 실기기 1.95 = Arial 400 1.6 과 700 2.2 사이). */
    generic:{platform:'generic',time:'12:30',icons:['wifi','battery'],cellularStyle:'wedge',batteryLevel:.82,padding:{left:16,right:14},fontSize:14,iconSize:12,iconGap:5},
    /* macOS 메뉴 막대(2026-10-15): 높이(프레임 statusBarHeight) 만 표현 — 메뉴 · 시계 · 상태 아이콘은 근거 없이 그리지 않는다 */
    macos:{platform:'macos',time:'',icons:[],padding:{left:16,right:16},fontSize:13,iconSize:12,iconGap:6,fixedSize:true}
  };
  /* iPhone Duo(iOS 27) 코너 상태 클러스터. Apple 뉴스룸(official): "The status bar includes a circular, flexible system that nestles into the corner of the screen,
   * showing relevant information like Wi-Fi, cellular strength, battery, and more." · HIG "Designing for iPhone Duo"(official): 카메라 쪽 세로 축에 위→아래로
   * Dynamic Island → 상태바 → 툴바 → 탭바. 가로형 상태바 밴드를 쓰지 않고(.band_status 높이 0) .status_cluster 를 코너에 띄운다.
   * 구성(뉴스룸 이미지 photo-measured): 시간 → 링(아래가 트인 호, 안쪽 Wi-Fi) → 링 하단 틈에 셀룰러 점 4개(링 중심선 원 위, 아래 기준 ±10.5° · ±31°).
   * 링 호가 배터리 잔량을 나타내는지는 미확인(approximation: 호 길이 고정 = 이미지 실측 244°). 값(px) 은 frameProfiles[*].statusBar 가 화면별로 덮어쓴다. */
  statusBarProfiles.duo={platform:'duo',layout:'corner',time:'9:41',icons:['wifi','cellular','battery'],cellularStyle:'dots',batteryLevel:.82,
    ring:{size:40,stroke:3,arcGap:116,wifiWidth:27,dotSize:4,dotAngles:[-31,-10.5,10.5,31]},timeSize:16,axis:48,timeCenter:92,ringCenter:129};
  /* iPhone SE(레거시 20pt 바): 시간 12pt semibold 유지 · 아이콘 배터리 24×11.5 / Wi-Fi 15×11 → 11 · 좌우 여백 6 (reference: iOS 레거시 상태바; 렌더 실측 아님 → approximation). fixedSize 로 compact 기본(9) 대신 프레임 값 사용 */
  /* iPhone SE(홈 버튼형, 20pt 레거시 바) — photo-measured: Apple 뉴스룸 "Apple-iPhoneSE-iOS-Focus-220308_carousel.jpg.large_2x"(iOS 15, 화면 641px = 375pt → 1.709px/pt).
   * 배치가 노치형과 다르다: 좌측 셀룰러·Wi-Fi, 중앙 "9:41 AM", 우측 "100%" + 배터리(layout:'legacy'). 숫자 높이 15px=8.8pt → 글꼴 12.5 · 셀룰러 27×18px=15.8×10.5pt · Wi-Fi 24×17px=14×10pt · 배터리 40×17px=23.4×10pt → 아이콘 11 ·
   * 좌 여백 12px=7pt · 우 ≈12px=7pt · 시간 중심 = 화면 중심. fixedSize 로 compact 기본(12/9) 대신 프레임 값 사용 */
  /* iPhone SE (3세대) 상태바 — 기본 프리셋은 Display Zoom '표준'(CSS 375×667) 으로 통일(2026-09-21 5차).
   *   표준 모드 기준값(photo-measured): Apple 뉴스룸 iOS 15 SE 이미지(1.712px/pt) 숫자 8.8pt · Commons iOS 18 4.7" 실기기 캡처(2px/pt) 숫자 8.5pt · 셀룰러 16.5×10.5 · 배터리 외곽 24×11.5 · 여백 좌 6.5 / 우 5.5 · %↔배터리 5.5 · 세로 중심 10(20pt 바 중앙)
   *   → Windows 대체 글꼴(Arial 600) 렌더 기준 fontSize 12.5(숫자 8.95px) · 자간 −.1 · 아이콘 11 · 배터리 1.05(24×11.6) · 여백 6.5/5.5 · iconGap 5 · centerY 미지정(밴드 20 중앙 10 = 가이드 중앙).
   *   사용자 제공 reference(user-provided reference image, images/1.png, 375 좌표계로 정규화 — 표준 기준보다 약 1.17배 크게 측정됨, Display Zoom '확대' 여부는 설정 정보 미확인·미확정): 숫자 10.7 · "10:00" 폭 37 · 셀룰러 19.5×12.7 · 배터리 27×13.6 · 여백 8/8 · 중심 11.7(바 23.4 상당) · Wi-Fi·% 없음.
   *   ×1.17 은 Display Zoom 확대(CSS 뷰포트 320×568) 의 비율과 일치하는 '가능성' 이며, 확대 모드라면 뷰포트도 달라지므로 기본 프로필에 섞지 않는다. 향후 확장 메모: iPhone SE 에 '표준 375×667' / '확대 320×568' state 를 두고 확대 state 에서만 위 참고값(15/13/1.05/8/8) 을 쓰는 방식으로 분리 가능(이번 작업에서는 미추가). */
  frameProfiles['iphone-se'].statusBar={compact:true,fixedSize:true,layout:'legacy',time:'9:41 AM',icons:['cellular','wifi','battery'],batteryText:true,batteryLevel:1,fontSize:12.5,iconSize:11,wifiScale:1,batteryScale:1.05,padding:{left:6.9,right:4.9},iconGap:4.2,letterSpacing:-.1,
    source:'2026-10-07 재검증(Apple 뉴스룸 iOS 15 SE 이미지 1.712px/pt, 잉크 실측): 시간 "9:41 AM" 164.9~210.8 = 프리뷰와 같음 · 셀룰러 7.0~23.4(16.4, 피치 4.5) = 프리뷰 일치 · 배터리 346.0~369.5 일치 → 셀룰러↔Wi-Fi 간격 4.9(프리뷰 5.6) 에 맞춰 iconGap 5 → 4.2 · 좌 잉크 7.0 → 여백 6.9 · 우 잉크 5.5 → 4.9 · %↔배터리 간격은 이 이미지 3.3 / Commons iOS 18 캡처 5.5 로 자료가 서로 달라 별도 보정 없음(현재 약 5.1) · photo-measured(표준 모드): Apple 뉴스룸 iOS 15 SE 이미지 숫자 8.8pt · Commons "Onion Browser 2.8.1 on iPhone.png"(iOS 18 4.7" 실기기 캡처 2px/pt) 숫자 8.5 · 셀룰러 16.5×10.5 · 배터리 24×11.5 · 여백 6.5/5.5 · %↔배터리 5.5 · 중심 10 → 12.5/11/1.05/6.5/5.5 · reference(user-provided reference image images/1.png — 표준 기준보다 약 1.17배 크게 측정된 사용자 제공 reference, Display Zoom 확대 여부 미확정): 숫자 10.7 · 셀룰러 19.5×12.7 · 배터리 27×13.6 · 여백 8/8 · 중심 11.7 — 확대 모드(뷰포트 320×568) 가능성이 있어 기본 프로필 미적용'};
  /* 노치·아일랜드 iPhone: 상태 항목이 노치/아일랜드 양옆 "귀" 의 중앙에 놓인다 → 시간 좌측 여백 = 귀 중심 − 시간 폭/2, 우측 여백 = 귀 중심 − 아이콘 묶음 폭/2 (derived: 컷아웃 폭 기준).
   * HIG "status-bar-visible@2x"(아일랜드 iPhone, 536px = 393pt, 1.364px/pt) 실측: 시간 x 53.5~89pt(중심 71.5) · 배터리 우측 끝 358pt(여백 35) · 숫자 높이 11.7pt(글꼴 ≈17) · 배터리 27.9×12.5 · 셀룰러 18.3×11 · Wi-Fi 18.3×9.5pt → derived 값(52.5/31.5) 과 3pt 내 일치 */
  /* 노치 iPhone(390): 뉴스룸 "Apple-iPhone-14-iPhone-14-Plus-Find-My-location-share-220907"(1.783px/pt) 실측 — 시간 x 37.7~69.7(중심 53.4 ≈ 귀 중심 55.5) · 세로 중심 26.3pt(노치 33pt 의 아래쪽, 47pt 바의 중앙이 아님!) ·
   * 셀룰러 19×11.8 · Wi-Fi 16.3×11.8 · 배터리 27×12.3 · 간격 8.4 · 배터리 우측 끝 → 화면 우측 26.5pt. centerY 는 화면 상단 기준 px */
  frameProfiles['iphone-notch'].statusBar={padding:{left:38,right:27},centerY:26,iconGap:8,source:'photo-measured: iPhone 14 뉴스룸 Find-My 이미지(1.783px/pt) — 시간 좌 37.7 · 세로 중심 26.3 · 우 여백 26.5 · 간격 8.4 · 아이콘 19/16.3/27 × 11.8~12.3pt'};
  /* 아일랜드 iPhone(402 · 430): 뉴스룸 "Apple-WWDC25-iOS-26-Apple-Intelligence-Phone-unified-layout-250609"(iPhone 16 Pro 402pt, 1.7435px/pt) 실측 — 시간 좌 57.0(중심 72.8 = 귀 중심 69 + 3.8) · 세로 중심 31.9pt = 아일랜드 세로 중심(13.8~50pt) ·
   * 배터리 우측 끝 → 화면 우측 36.4pt(아이콘 묶음 중심은 귀 중심보다 6pt 왼쪽) · 셀룰러 18.4×11.5 · Wi-Fi 15.5×11.5 · 배터리 27×12.6 · 간격 8.6~9.2.
   * 프리뷰의 아일랜드 기하는 11~48(커뮤니티 측정) 이므로 세로 중심은 그 중앙 29.5 로 맞춘다(실측 31.9 와 2.4pt 차이는 아일랜드 위치 차이 — 지오메트리 미수정, 별도 보고). 430 은 귀 폭 152 로 환산(derived) */
  frameProfiles['iphone-dynamic'].statusBar={padding:{left:63,right:43},centerY:29.5,iconGap:9,source:'derived: 402 실측(시간 중심 = 귀 중심 + 3.8 · 아이콘 묶음 중심 = 귀 중심 − 6) 을 귀 폭 152(중심 76) 로 환산 → 좌 63 · 우 43 · 세로 중심 = 아일랜드 중앙 29.5'};
  frameProfiles['iphone-dynamic-pro'].statusBar={padding:{left:63.5,right:38.8},centerY:32.8,fontSize:18.5,letterSpacing:.65,iconGap:7.5,cellularStyle:'bars-high',cellularScale:1.15,wifiScale:1.18,batteryScale:1.18,source:'photo-measured(2026-10-08, iPhone 18 Pro Apple 공식 이미지 2장 직접 실측 — 같은 잉크 측정 도구로 프리뷰를 공식 원본과 같은 2.3243px/CSS 로 캡처해 비교): Apple 뉴스룸 "Apple-iPhone-18-Pro-Photos-app-Apple-Reference-Image-260909" 다운로드 원본(3840×2560, 2.3243px/CSS) / apple.com/iphone-18-pro "siri_app"(1.558px/CSS). 공식(원본 / siri_app): 시간 "9:41" 63.97~99.53 / 63.73~98.99(폭 35.5 · 숫자 높이 13.1~13.5) · 셀룰러 277.41~298.26 / 277.64~298.29(20.9 × 14.0 · 막대 피치 5.6~5.7 · 막대 폭 약 3.7 → iOS 공통 bars 와 같은 막대 폭·피치 ×1.15, bars-wide 아님 · 막대 높이 원본 6.67 / 8.84 / 11.39 / 13.95 · siri_app 6.21 / 8.28 / 10.80 / 13.35 → 가장 짧은 / 가장 긴 막대 0.478 / 0.465 가 두 이미지에서 반복 → 18 Pro 전용 형상 bars-high(높이 비 .472 / .627 / .813 / 1, 공통 bars 0.38 은 SE 와 공유라 그대로) — 프리뷰 6.30 / 8.46 / 11.04 / 13.62 = 0.463) · Wi-Fi 306.20~325.34 / 306.48~325.36(19.1 × 14.4) · 배터리 333.27~362.26 / 333.80~362.14(29.0 × 13.8~15.5) · 아이콘 간격 7.9~8.4 · 오른쪽 여백 39.7 / 39.9 · 세로 중심 32.1~33.2. 프리뷰(수정 후): 시간 63.97~99.34 · 셀룰러 277.92~298.42 · Wi-Fi 306.15~325.43 · 배터리 333.45~362.02 · 오른쪽 여백 40.0 → 글꼴 18.5 · 자간 .65 · 셀룰러 bars-high ×1.15 · Wi-Fi 1.18 · 배터리 1.18 · iconGap 7.5 · 여백 63.5 / 38.8. 세로 centerY 32.8(2026-10-08 재검증): 공식 잉크 중심 평균 시간 32.37 · 셀룰러 32.96 · Wi-Fi 32.27 · 배터리 32.56(원본 / siri_app 평균) — 같은 배율 렌더에서 32.3 은 31.63 / 32.27 / 32.02 / 32.05(평균 −0.55), 32.6 은 평균 −0.22, 32.8 은 32.06 / 32.70 / 32.45 / 32.48(평균 −0.12, 요소별 0.31 이내), 33 은 +0.21 → 32.8(이전 32.3 은 16 Pro 이미지 기준). 배치 구조: 시간 중심은 왼쪽 귀(화면 끝 ~ 아일랜드 왼쪽 153.7) 중앙 76.8 보다 +4.9, 아이콘 묶음 중심은 오른쪽 귀(아일랜드 오른쪽 248.5 ~ 402) 중앙 325.3 보다 −5.4 — 귀 중앙 기준 정렬 규칙(16 Pro 이미지 +3.8 / −6) 과 같은 원리이며, 값은 계산이 아니라 18 Pro 공식 이미지 실측으로 정했다. 크기 차이 원인은 확정하지 않음: 18 Pro 공식 이미지 2장에서 16 Pro 기반 이전 값보다 시간·아이콘이 약 1.1~1.2배 크고 가로 위치가 다르게 일관되게 측정됨. 이전(2026-10-07, 16 Pro 기반 verified-derived): 여백 56.8 / 35.3 · 글꼴 17 · 자간 .5 · bars-wide · Wi-Fi 1.02 · 배터리 1.1 · iconGap 7.2 — 근거: Apple iOS 26 "Phone-unified-layout" 이미지, iPhone 16 Pro 402pt = 18 Pro 와 같은 폭, 1.744px/pt, 잉크 실측): 시간 "9:41" 잉크 57.1~89.8(폭 32.7) · 숫자 높이 11.95(프리뷰 12.06 — 글꼴 17 유지) → 이전 자간 −.4 는 프리뷰 글자 상자 폭을 실측 잉크 폭과 비교한 오차라 +.5 · 왼쪽 56.8 / 셀룰러 288.0~307.3(폭 19.3, 막대 3.3 · 피치 5.35 → bars-wide) / Wi-Fi 315.1~331.3(높이 11.43 → wifiScale 1.02) / 배터리 339.2~366.2(27.0 × 13.2 → batteryScale 1.1) / 간격 7.8 · 7.9 → iconGap 7.2 / 오른쪽 여백 35.8 → 35.3(배터리 꼭지 잉크가 상자 끝보다 .5 안쪽) / 세로 중심 = 아일랜드 중앙 32.3(2026-10-07 아일랜드를 공식 위치 top 14(실측 13.90) 로 옮기며 29.5 → 32.3; 실측 상태바 잉크 중심 32.0~32.75) · 이전: photo-measured: iPhone 16 Pro iOS 26 뉴스룸 이미지(1.7435px/pt, 18 Pro 동일 402pt) — 시간 좌 57.0(Arial 폭 보정 56) · 우 여백 36.4 · 간격 9 · 세로 중심 = 아일랜드 중앙(실측 31.9 · 프리뷰 기하 29.5) · 18 Pro 뉴스룸 Photos 이미지(1.2px/pt) 로 배치 동일 확인'};
  /* iPad 9.7(홈 버튼형, iPadOS ≤17): Apple 지원 문서 "ios-26-ipad-floating-keyboard.png"(홈 버튼형 iPad, iPadOS 26) 로 배치 확인 — 좌 "9:41 AM  Tue Apr 1", 우 셀룰러·Wi-Fi·배터리, 시간 중앙 배치 아님.
   * 해당 모델(6세대) 캡처가 아니고 이미지 px/pt 가 불확실해 크기는 레거시 20pt 바 표준(글꼴 12 · 아이콘 11, SE 와 동일 계열) → approximation. Wi-Fi 모델 기준 셀룰러 없음, 배터리 % 는 iPadOS 기본 표시 */
  frameProfiles['ipad-home'].statusBar={platform:'ios',compact:true,fixedSize:true,time:'9:41 AM\u2002Tue Mar 27',icons:['wifi','battery'],batteryText:true,batteryLevel:1,fontSize:12,iconSize:11,wifiScale:1,batteryScale:1,percentScale:1,padding:{left:7,right:6},iconGap:5,letterSpacing:0,
    source:'derived(배치): Apple 지원 문서 iPadOS 26 홈 버튼형 iPad 캡처 — 시간+날짜 좌 · 아이콘 우 · 좌 여백 ≈ 6.8 / 우 6.3pt(10.2형 가정) · approximation(크기): 글꼴 12 · 아이콘 11 은 20pt 레거시 바 표준값, 6세대 실기기 캡처 미확보'};
  /* One UI 8 태블릿 상태바(approximation: 공식 UI 스크린샷 미확보): Android 프로필 그대로, 태블릿은 가로에서도 글꼴·아이콘을 줄이지 않는다 */
  frameProfiles['galaxy-tab-s11'].statusBar={profile:'oneui',fixedSize:true,padding:{left:16,right:14},source:'approximation(배치): 좌우 여백 16/14 · 밴드 중앙 · 시간만 표시 — 2026-10-07 재검증 시 확보한 S11 공식 이미지(samsung.com US 갤러리 "…Gemini_Live-800x600", 0.34px/CSS) 는 1px ≈ 3 CSS 라 측정 오차가 커서(왼쪽 약 17.6 · 오른쪽 약 11.7 · 중심 약 13, 각 ±3) 수정하지 않음. 그 이미지에서도 시간 뒤 날짜가 붙은 것으로 보이나 해상도가 낮아 미확정(Ultra 는 날짜 표시 확인) · 아이콘 형상·크기·색·시계 글꼴은 One UI 공통값'};
  frameProfiles['galaxy-tab-s11-ultra'].statusBar={profile:'oneui',fixedSize:true,time:'12:45 Fri, Sep 5',padding:{left:22,right:17.5},centerY:10.5,centerYLandscape:10.5,source:'photo-measured(2026-10-07, 배치만 — 아이콘 형상·크기·색·시계 글꼴은 One UI 공통값): samsung.com US 제품 페이지 "08-Productivity-02-CO16-DiscoverColumn-02-Memos-D.jpg"(Tab S11 Ultra 가로 정면 · 노치 보임, 화면 1226px = 1480 CSS → 0.828px/CSS) — 왼쪽 시간 그룹 "10:10 Fri, Sep 5"(시간 + 날짜) 잉크 22.3~108.0 → 여백 22 · 알약 1438.3~1462.5(24.2 × 14) → 오른쪽 여백 17.5 · 시간·아이콘 세로 중심 10.4~10.7 → centerY 10.5(가로 실측; 세로는 같은 dp 로 가정 derived) · 노치(가운데 715~766) 와 상태바 항목은 떨어져 있어 회피 동작 없음 · 이전 16/14 · 밴드 중앙 12 는 approximation · statusBarHeight 24 는 공식 이미지로 판정 불가라 approximation 유지(android-tablet-* 브라우저 프로필)'};
  /* One UI 스마트폰(Galaxy S25 · Z Flip8 펼침/Flex · Z Fold8): 공통 oneui 프로필. 밴드 높이(safeArea.top) 는 컷아웃 기하에서 유도한 기존 값 유지 */
  frameProfiles['galaxy-bar'].statusBar={profile:'oneui',centerY:18,padding:{left:19,right:17},source:'좌우 여백 19 / 17(photo-measured 2026-10-07: 사용자 RTL S25 캡처 — 시계 시작 19.1 · 배터리 알약 오른쪽 끝에서 화면까지 16.8; 화면 코너 34 라 Fold8(13/16) 보다 왼쪽이 넓다) · photo-measured: Samsung 뉴스룸 One UI 7 Official Rollout dl1.jpg(Galaxy S25 정면 렌더, 1.128px/CSSpx) — 시간 12:45 숫자 높이 10(글꼴 14) 좌 14.6 · 5G/막대/알약 100 우 14.6 · 막대 10.6×12 · 알약 23×14 · 간격 7~8 · 세로 중심 18(photo-measured 2026-10-07: 사용자 Samsung RTL Galaxy S25 Chrome 캡처(0.9598px/CSS) 잉크 중심 — 시계 18.6 · Wi-Fi 17.9 · 신호 18.5 · 배터리 18.4 · 알림 아이콘 18.5~19.0 → 대표 약 18.4. 프리뷰는 centerY 대비 잉크 중심이 약 +0.4 라 18 로 둔다. 카메라 홀 중심 18.5 와는 독립 실측이며 결과적으로 거의 같은 높이. 이전 23 은 폐기된 홀 중심 26.5 에 "홀 중심 − 2.8"(One UI 7 렌더 관계) 을 적용한 derived 값)'};
  frameProfiles['flip8-open'].statusBar={profile:'oneui',padding:{left:14.5,right:10},centerY:20,source:'photo-measured(2026-10-07): 사용자 RTL Galaxy Z Flip8 펼침 Chrome 캡처(0.7602px/CSS) — 시계 시작 14.4 · 오른쪽 끝 349.8(여백 10.2) · 아이콘 세로 중심 20.0~20.9(대표 20.4) · 아이콘 크기·간격은 One UI 공통값과 일치(저해상도 ±1) — statusBarHeight 32 는 미확정 그대로(밴드 높이 미변경)'};
  frameProfiles['flip8-flex'].statusBar={profile:'oneui',padding:{left:15,right:15},source:'미검증(Flex 실기기 캡처 없음): 좌우 여백은 2026-10-07 이전 값 15/15 유지 · 아이콘 형상·크기·간격만 One UI 공통값'};
  frameProfiles['flip8-cover'].statusBar={profile:'oneui',source:'photo-observed(세로): 뉴스룸 First Look dl9.jpg 커버 앱 실사진에 상태바 없음 → safeArea.top 0 유지(실기기 직접 측정 아님) · 가로도 상태바 없음(safeAreaLandscape.top 0, derived) — 커버 앱이 가로에서 회전할 때의 공식 이미지는 미확보'};
  frameProfiles['fold8-cover'].statusBar={profile:'oneui',centerY:27,source:'photo-measured(2026-10-07): 사용자 Fold8 커버 Chrome 캡처(2.25px/CSS) — 시계 시작 12.9 · 오른쪽 여백 16.0 · 아이콘·시계 세로 중심 27.0~27.2(밴드 49 의 중앙 24.5 보다 2.6 아래) → One UI 공통 여백 13/16 + centerY 27 · 이전: derived: One UI 8 = Galaxy S25 렌더 실측 준용 · 세로 중심은 밴드(33) 중앙 16.5 = 실측 홀 중심 20.2 − 2.8(S25 렌더 관계) 과 일치 · Fold8 커버 UI 캡처 미확보'};
  frameProfiles['fold8-open'].statusBar={profile:'oneui',centerY:25,avoidCutout:false,source:'photo-measured(2026-10-07): 사용자 Fold8 펼침 Chrome 캡처(2.25px/CSS) — 시계 시작 12.9 · 오른쪽 아이콘 묶음이 화면 오른쪽 끝(여백 16.0)에 붙어 있고 카메라 홀(오른쪽에서 약 250) 을 비켜 가지 않음 → avoidCutout:false · 세로 중심 24.9 → centerY 25 · 이전: derived: 뉴스룸 First Look dl3.jpg(Z Fold8 Ultra 펼침 잠금 화면 실사진 14.35px/mm) — Wi-Fi 1.88×1.32 · 막대 1.88×2.0 · 알약 4.0×2.4mm · 간격 1.1mm · 우 여백 4.1mm · 세로 중심 3.3mm — Ultra 모델 값이라 Fold8 에는 형상·비율만 준용, 여백은 S25 값'};
  /* iPadOS 26/27 상태바(photo-measured, Apple 뉴스룸 13" 렌더): 좌 "9:41 AM  Wed Apr 1" · 우 Wi-Fi · 배터리 % · 배터리. 가로에서도 같은 크기(fixedSize) */
  /* iPadOS 26/27 상태바(2026-10-07 재검증 — Apple 뉴스룸 iPad Air M4 이미지 2장, 둘 다 13" 화면 비 1.333 · 11"/13" 모두 264ppi 라 pt 공유):
   * 세로 Goodnotes(0.956px/pt, 파란 툴바 위 흰 글자) · 가로 Final Cut Pro(1.066px/pt, 어두운 회색 위 흰 글자) 를 같은 잉크 측정으로 비교.
   * 숫자 높이 10.0pt → 글꼴 14(Arial 대체 9.97) · 시간과 날짜 사이 12.2pt(en space + three-per-em space) · Wi-Fi 13.1×9.2~9.7(.88) · 100% 숫자 높이 = 시간(percentScale 1) ·
   * 배터리(외곽+단자) 27.4~27.8×13.2~13.6(1.25) · 간격 Wi-Fi↔100% 5.6~5.8 / 100%↔배터리 4.6~5.0 → iconGap 4.2 · 잉크 여백 좌 16.8~17.9 / 우 14.6~14.9 · 세로 중심 15.9~16.4(세로·가로 같은 배치) */
  frameProfiles['ipad-air-11'].statusBar={platform:'ios',time:'9:41 AM\u2002\u2004Wed Apr 1',icons:['wifi','battery'],batteryText:true,batteryLevel:1,padding:{left:16.8,right:14.1},centerY:16.4,centerYLandscape:16.4,fixedSize:true,fontSize:14,iconSize:11,iconGap:4.2,wifiScale:.88,batteryScale:1.25,percentScale:1,percentLetterSpacing:.85,letterSpacing:-.17,
    source:'photo-measured(2026-10-07 재검증): Apple 뉴스룸 "apple-introduces-the-new-ipad-air-powered-by-m4" 이미지 — 세로 "Apple-iPad-Air-M4-Goodnotes-6-260302_inline"(화면 979×1306px = 1024×1366pt, 0.956px/pt) · 가로 "Apple-iPad-Air-M4-Final-Cut-Pro-260302_big"(화면 1456×1092px = 1366×1024pt, 1.066px/pt). 잉크 실측(세로 / 가로): 시간 시작 16.8 / 17.9 · "9:41 AM" 끝 → "Wed" 시작 간격 12.2 / 12.2 · 문자열 끝 143.7 / 144.3 · 숫자 높이 10.0 / 10.0 · Wi-Fi 13.07×9.18 / 13.09×9.71 · "100%" 폭 36.4 / 36.3 · 배터리 27.83×13.6 / 27.44×13.23 · Wi-Fi↔100% 5.8 / 5.6 · 100%↔배터리 4.6 / 5.0 · 오른쪽 여백 14.6 / 14.9 · 세로 중심(시간·Wi-Fi·배터리) 15.6~15.9 / 16.4 → 글꼴 14 · Wi-Fi .88 · 배터리 1.25 · iconGap 4.2 · "100%" 자간 percentLetterSpacing .85(Arial 숫자가 SF 보다 좁아 공통 자간 −.17 에서는 잉크 폭 33.2 → 36.3; 숫자 높이 9.97 유지, 끝 글자 뒤 자간은 margin 으로 상쇄해 %↔배터리 간격 유지) · 여백 16.8 / 14.1 · centerY 16.4(가로 동일) · 시간+날짜 사이 공백 확대. statusBarHeight 30 · 숫자 특성(tabular/proportional) · 굵기는 이 이미지로 판정 불가라 기존값 유지(approximation). 이전(2026-09-21) 값 글꼴 15 · 배터리 ≈24×11.5 · 간격 8 · 여백 16/18 · 밴드 중앙 15 는 벽지 위 multitasking 이미지에서 잰 값이라 폐기'};
  /* 외부 화면(466×678, 6.04px/mm): 뉴스룸 홈 화면 이미지(정지 상태) 실측 — 축 48(카메라 중심과 동일) · 시간 중심 92 · 링 Ø40 중심 129 · HIG 도식(1.0944px/pt) 과 일치(92.3 / 127.5).
   * island: Dynamic Island. 정지 상태(홈 화면 이미지·HIG 도식) 는 카메라 원(Ø36, 컷아웃과 동일) 만 보이고, Live Activity(통화 이미지) 에서 세로 필 38×62 @ top 26 으로 확장되며
   * 클러스터가 14.5px 내려온다(시간 106.5 · 링 143.5). 기본 표시는 live(세로 필) — state:'rest' 로 바꾸면 정지 상태. */
  frameProfiles['duo-outer'].statusBar={platform:'duo',axis:48,timeSize:16,timeCenter:92,ringCenter:129,ring:{size:40},
    island:{state:'live',width:38,height:62,top:26,shift:14.5,restSize:36},
    source:'photo-measured: 뉴스룸 "Apple-iPhone-Duo-Siri-AI-260909.jpg"(3.054px/CSSpx) 시간 30.8×11.5 중심 y 91.7 · 링 Ø40.3 중심 y 128.8 · 축 우측에서 47.5~48.6 · "Call-Context" 이미지 필 38×62 top 26, 시간 106.3 · 링 143.4 · HIG "designing-for-iphone-tab-bar-toolbar-layout" 도식 시간 92.3 · 링 127.5 · 카메라 원 Ø36 @ (48,47)'};
  /* 내부 화면(890×626, 5.65px/mm): 뉴스룸 multitasking·Netflix 이미지 실측 — 축 45 · 시간 중심 38.5 · 링 Ø38 중심 73. 내부 카메라는 UDC 라 정지 상태에 아일랜드 없음(HIG: "only present when the camera is active"),
   * Live Activity 세로 필 위치는 공식 이미지 없음 → island:null(미표시). HIG 도식상 카메라 영역 중심 ≈ 폭 70% / 높이 8%, Ø≈30 (참고). */
  frameProfiles['duo-inner'].statusBar={platform:'duo',axis:45,timeSize:15,timeCenter:38.5,ringCenter:73,ring:{size:38},island:null,
    source:'photo-measured: 뉴스룸 "Apple-iPhone-Duo-multitasking-Safari-and-Siri-app-260909.jpg"(3.273px/CSSpx) 시간 28.4×10.7 중심 y 38.5 · 링 Ø38.2 중심 y 73.2 · 축 우측에서 44.6~45.8 · Netflix 이미지 시간 32~42.5 · 링 53~82 · 점 86~91 일치 · 아일랜드: approximation 회피(미표시)'};

  const browserProfiles={
    /* 브라우저 UI 없음(2026-09-22): Breakpoint 테스트(가상) 프리셋의 기본값. 밴드 전부 0 → iframe CSS 뷰포트 = 목록에 표시된 화면 크기(세로/가로 모두). 실제 브라우저 UI 를 보고 싶으면 선택 목록에서 Safari/Chrome 등을 고른다.
     * formFactor:'generic' 이라 기본 브라우저가 이 프로필인 기기(범용 프리셋) 에서만 목록에 나온다 — 실기기 프리셋에서는 상태바·홈 인디케이터가 항상 남는 규칙 유지 */
    'none':{label:'브라우저 UI 없음 (CSS 뷰포트 그대로)',platform:'any',urlBarPosition:'top',formFactor:'generic',
      portrait:{statusBar:0,urlBar:0,toolbar:0,homeIndicator:0},
      landscape:{statusBar:0,urlBar:0,toolbar:0,homeIndicator:0}},
    'ios-safari':{label:'Safari',platform:'ios',urlBarPosition:'bottom',
      portrait:{statusBar:null,urlBar:50,toolbar:49,homeIndicator:null},
      landscape:{statusBar:0,urlBar:40,toolbar:0,homeIndicator:null,sideInset:'safe-area'}},
    /* Chrome (iOS) — 2026-09-22 photo-measured (user-provided reference image images/2.png: iPhone 17 Pro 실기기 Chrome 캡처 941×2048 = 402×874pt, 2.341px/pt).
     *   상단: 상태바(62) 아래 옴니박스 밴드 50.3 → 50 · pill 35.7 → 36(밴드 안 상 4.2 / 하 10.3, 좌우 여백 9.6, 완전 둥근) · URL 글자 x-height 7.3 / 캡 10.3 → 14pt, 가운데 정렬 ·
     *   선행 아이콘 19pt @ pill 안쪽 12.4 · 후행 공유 아이콘 16×18 @ 안쪽 16.3 · 페이지 시작 112.3.
     *   하단: 툴바 43.3 → 44 + 홈 인디케이터 영역 34(툴바 배경이 이어짐, 캡처에는 인디케이터 미표시) · 버튼 5개 [← → + 탭 …] 중심 x 31.4 / 116.2 / 201 / 285.6 / 362.9(점 아이콘 실측; 대칭 배치면 370.6), y 818.5 = 툴바 44 의 중앙 ·
     *   ← → 화살표 22×18 · + 원 Ø36 안 글리프 18 · 탭 카운터 24×24 · 점 Ø4.7 피치 8.8. 값은 ios-chrome 공통(pt) 이며 기기별 safe-area·아일랜드·뷰포트는 frameProfiles 가 담당(18 Pro 는 402×874 로 17 Pro 와 같은 좌표계).
     *   가로 44 는 기존값 유지(가로 캡처 없음, approximation). 레이아웃 세부(pill 여백·아이콘·버튼 슬롯) 는 styles.css [data-browser="ios-chrome"] 규칙 */
    'ios-chrome':{label:'Chrome (iOS)',platform:'ios',urlBarPosition:'top',
      portrait:{statusBar:null,urlBar:50,toolbar:44,homeIndicator:null},
      landscape:{statusBar:0,urlBar:44,toolbar:0,homeIndicator:null,sideInset:'safe-area'},
      source:'photo-measured (user-provided reference image images/2.png, iPhone 17 Pro Chrome 2.341px/pt): 상단 밴드 50.3 · pill 36(상 4.2/하 10.3, 여백 9.6) · URL 14pt 중앙 · 툴바 43.3 + 홈 34 · 버튼 중심 31.4/116.2/201/285.6/362.9 · approximation: 가로 44, 선행 아이콘(캡처는 Gemini 스파클 → 페이지 정보 자물쇠로 대체), 라이트 테마 색'},
    'android-chrome':{label:'Chrome',platform:'android',urlBarPosition:'top',
      portrait:{statusBar:null,urlBar:56,toolbar:0,homeIndicator:null},
      landscape:{statusBar:null,urlBar:48,toolbar:0,homeIndicator:null,sideInset:'safe-area'}},
    'samsung-internet':{label:'Samsung Internet',platform:'android',urlBarPosition:'top',
      portrait:{statusBar:null,urlBar:56,toolbar:52,homeIndicator:null},
      landscape:{statusBar:null,urlBar:48,toolbar:0,homeIndicator:null,sideInset:'safe-area'}},
    'tablet-chrome':{label:'Chrome (태블릿)',platform:'any',urlBarPosition:'top',
      portrait:{statusBar:null,urlBar:88,toolbar:0,homeIndicator:null},
      landscape:{statusBar:null,urlBar:88,toolbar:0,homeIndicator:null}},
    /* Android(One UI) 태블릿 브라우저: OS 상태바·내비게이션 바 높이를 프레임이 아니라 여기서 관리한다(approximation: Android 표준 상태바 24dp · 제스처 내비 24; One UI 기본 3버튼 내비는 48dp).
     * Chrome 태블릿 = 탭 스트립 40 + 툴바 56 = 96 (approximation) · Samsung Internet 태블릿 = 상단 탭 바+주소창 100, 하단 툴바 52 (approximation, 공식 스크린샷 미확보).
     * formFactor:'tablet' — 기본 브라우저가 태블릿 프로필인 기기(Galaxy Tab) 에서만 목록에 노출(스마트폰 목록 오염 방지) */
    'android-tablet-chrome':{label:'Chrome (Android 태블릿)',platform:'android',formFactor:'tablet',urlBarPosition:'top',
      portrait:{statusBar:24,urlBar:96,toolbar:0,homeIndicator:24},
      landscape:{statusBar:24,urlBar:96,toolbar:0,homeIndicator:24}},
    'android-tablet-samsung':{label:'Samsung Internet (태블릿)',platform:'android',formFactor:'tablet',urlBarPosition:'top',
      portrait:{statusBar:24,urlBar:100,toolbar:52,homeIndicator:24},
      landscape:{statusBar:24,urlBar:100,toolbar:52,homeIndicator:24}},
    'ipad-safari':{label:'Safari (iPad)',platform:'ios',urlBarPosition:'top',
      portrait:{statusBar:null,urlBar:50,toolbar:0,homeIndicator:null},
      landscape:{statusBar:null,urlBar:50,toolbar:0,homeIndicator:null}},
    /* 홈 인디케이터형 iPad(iPadOS 26/27) Safari: 상단 탭 바+주소 필드 한 줄. 상태바 높이는 프레임 safeArea.top(iPad Air 30, approximation — 이전 주석의 28 은 폐기) 을 쓰고,
     * 홈 인디케이터 영역(20) 은 iPad Safari 가 웹 콘텐츠를 그 아래까지 펼치므로 밴드 0(overlay) — safe-area 가이드로만 표시. 탭 바 높이 50 은 iPadOS 15~18 컴팩트 탭 바 준용(approximation, Liquid Glass 툴바 실측 미확보) */
    'ipados-safari':{label:'Safari (iPadOS)',platform:'ios',urlBarPosition:'top',
      portrait:{statusBar:null,urlBar:50,toolbar:0,homeIndicator:0},
      landscape:{statusBar:null,urlBar:50,toolbar:0,homeIndicator:0}},
    /* iPhone Duo(iOS 27) Safari. HIG(official): 툴바·탭바·내비게이션이 카메라 쪽 세로 축(측면 열) 에 놓이고, 내부 화면을 세로로 든 경우만 표준 가로 바.
     * layout:'side' 상태에서는 가로 밴드(상태바·URL·툴바·홈) 를 쓰지 않고 .side_controls 를 콘텐츠 위에 띄운다(뉴스룸 Netflix·Slack 이미지처럼 콘텐츠가 전체 화면).
     *   → 사이트 뷰포트는 viewport-fit 설정으로 고른다(2026-10-16): auto(기본) = 측면 UI 쪽 safe-area(프레임 safeArea, 외부 92 · 내부 89 approximation) 를 뺀 폭 — 안전 영역 시뮬레이션,
     *     cover = 화면 전체(측면 UI 가 콘텐츠 위에 겹침, safe-area 미대응 사이트의 가림 테스트). 실제 Duo Safari 의 웹 뷰포트 인셋은 출시 후 실기기 확인 필요. 축소/겹침 모드 구분은 없다.
     *   2026-11-09 실기기 사진(사용자 촬영 3장, Apple Store 진열 기기) 기준 1차 구조 수정 — 사진에서 보이는 컨트롤만 그린다:
     *     접힘 · 외부(side) = 오른쪽 세로 열 [뒤로 원형][북마크 원형] … 아래 캡슐 [+][탭] + 하단 별도 주소 필드(메뉴 · 도메인 · 새로고침, urlField).
     *       주소창 스위치 = 뒤로 · 북마크 + 하단 주소 필드, 툴바 스위치 = 아래 캡슐. 이전의 정보 · 공유 · 검색 / 나침반 · 작성 · 선택 · 창 아이콘은 사진과 맞지 않아 뺐다.
     *     펼침 · 내부(top, state.uiLayout) = 측면 열 없음, 상단 가로 Safari(top): [뒤로][북마크] · 주소 필드 · [+][탭] · 코너 클러스터(가로) + 탭 줄(시각용 placeholder).
     *       주소창 스위치 OFF = 사진의 스크롤 축약 상태(상단 가운데 작은 도메인 pill, 상태 클러스터 없음), 툴바 스위치 = 탭 줄.
     *     두 레이어 모두 콘텐츠 위에 그리는 시각 레이어이고 iframe 크기는 이전 값 그대로(실제 Duo Safari 의 innerWidth / innerHeight 미측정 — 사진으로는 CSS viewport 를 정할 수 없음).
     *     크기 값(urlField · top) 은 기존 측면 열 값(원형 44 · 캡슐 44 · 간격 13 · 하단 21 · 클러스터 축) 을 재사용하고, 그 밖의 값(주소 필드 폭 비율 · 탭 줄 · pill) 은 approximation.
     * 측면 열 값(photo-measured, 뉴스룸 multitasking 이미지의 Safari 창): 원형 Ø44 · 캡슐 폭 44 · 항목 간격 47 · 원형↔캡슐 13 · 하단 여백 21. 상단 시작 = 클러스터 아래(gap 22: Netflix 이미지 실측) 는 Safari 전체 화면 이미지가 없어 approximation.
     * exclusive: Duo 기기의 기본 브라우저일 때만 목록에 노출. standardFallback: 표준 가로 바 상태에서 쓰는 프로필(밴드만 차용, 상태바 밴드는 0). */
    'duo-safari':{label:'Safari (iPhone Duo)',platform:'ios',urlBarPosition:'bottom',layout:'side',exclusive:true,standardFallback:'ios-safari',
      portrait:{statusBar:0,urlBar:0,toolbar:0,homeIndicator:0},
      landscape:{statusBar:0,urlBar:0,toolbar:0,homeIndicator:0},
      side:{circle:44,capsule:44,pitch:47,gap:13,clusterGap:22,bottomMargin:21,top:['back','bookmark'],topCapsule:[],bottomCapsule:['plus','tabs'],urlField:{height:44,inset:13}},
      /* 내부 상단 Safari(2026-11-10 디자인 보정 — 사용자 실기기 사진(Apple Store 진열 기기, 펼침 · 손에 든 사선 사진) 을 화면 가장자리 직선으로 기울기 보정해 890 CSS 폭으로 환산.
       * 모두 photo-observed visual approximation(원근 · 기울기 · JPEG 로 ±1~2 CSS): 줄 중심 46 · 원형 Ø46 · 원형 간격 11 · 왼쪽 여백 11 · 주소 필드 폭 337(.38, 화면 가운데) · 높이 44 ·
       * 캡슐 슬롯 44 × 2 · 캡슐 ↔ 시간 25 · 링 오른쪽 여백 28 · 시간 ↔ 링 15 · 시간 상자 30 / 14px · 원형 아래 ↔ 탭 줄 11(탭 줄 위 80) · 높이 33 · 좌우 47 · 탭 줄 아래 ↔ 사이트 10(사이트 내비 띠 시작 약 123).
       * 가로값은 사진 좌표를 환산할 때만 −4.5 보정(측정 단계 — 보정 좌표의 화면 가장자리 추정 오차, 코드에는 오프셋 없음). 주소 필드 · 탭 줄 · 도메인은 CSS 구조(대칭 grid) 로 화면 50% 에 놓인다. 사진의 시간 위 위치 화살표는 상태(위치 사용 중) 표시라 그리지 않는다 */
      top:{center:46,row:44,circle:46,circleGap:11,inset:11,urlWidth:.38,slot:44,capsuleGap:25,statusRight:28,statusGap:15,timeWidth:30,timeSize:14,
        tabHeight:33,tabGap:11,tabInset:47,bottomGap:10,pillHeight:26}},
    /* 데스크톱 Safari(macOS, 2026-10-15) — 모바일 Safari 와 별개 프로필. 창을 화면 크기로(메뉴 막대 아래) 연 상태 · 탭 1개(탭 막대 숨김) · Dock 자동 숨김을 가정한다.
     * 상단 툴바 52 는 approximation(Apple 공식 수치 · 신뢰할 실측 없음 — 실제 Mac 에서 safari-measure.html 로 innerHeight 를 재서 확인할 것). 툴바 · 홈 밴드 0.
     * MacBook 은 회전하지 않으므로 화면 형상(가로) 기준 landscape 값만 쓰이며 주소창은 항상 상단 */
    'mac-safari':{label:'Safari (macOS)',platform:'macos',urlBarPosition:'top',
      portrait:{statusBar:null,urlBar:52,toolbar:0,homeIndicator:0},
      landscape:{statusBar:null,urlBar:52,toolbar:0,homeIndicator:0},
      source:'approximation: 툴바 52(창 툴바 한 줄, 탭 막대 숨김) · Dock 자동 숨김 가정 · 메뉴 막대는 프레임 statusBarHeight'}
  };
  const urlBarPositions=['top','bottom'];
  /* 이전 데이터 호환: 예전 browser 키 → 새 프로필 */
  const browserAliases={phone:'android-chrome',compact:'android-chrome',tablet:'tablet-chrome'};
  const defaultBrowserId='android-chrome';

  /* 기기 목록 그룹(2026-09-22 정리, 2026-10-08 Breakpoint 테스트 2종으로 축소): base = 실기기가 아닌 breakpoint 확인 전용 가상 프리셋(kind:'generic' → 사이드바 제목에 안내 표기), phone/fold/tablet = 실제 대표 기기.
   * 실제 모바일 폭(360 · 375 · 399 · 402 · 555 …) 은 실기기 프리셋으로 확인하므로 가상 프리셋은 360px 소형 · 768px Tablet 경계만 둔다 */
  const deviceGroups=[
    {id:'base',label:'Breakpoint 테스트',kind:'generic',hint:'실기기 아님'},
    {id:'phone',label:'주요 스마트폰'},
    {id:'fold',label:'폴더블'},
    {id:'tablet',label:'태블릿'},
    {id:'desktop',label:'노트북'}
  ];
  /* localStorage 에 남은 예전 기기 id → 현재 id. 매핑이 없는 제거된 id(pixel · 2026-10-08 의 mobile-320 / mobile-390 / mobile-430) 는 복원하지 않고 기본 기기(DEFAULT_DEVICE_ID) 로 시작한다 */
  const deviceAliases={'z-flip':'z-flip8','tablet-1024':'tablet-generic-768','tablet-768':'tablet-generic-768'};   /* 'iPad 9.7형 가로'(2026-09-21)·'iPad 9.7형 [레거시]'(2026-09-22) 프리셋 → 768px Tablet 경계(Breakpoint 테스트, 이전 이름 Tablet 기본). 제거된 'pixel' 저장값은 기본 기기로 복귀 */

  const devices={
    'android-generic-360':{name:'360px 소형 모바일',group:'base',subtitle:'360px 이하 소형 화면 · breakpoint 점검',note:'360 × 800 가상 CSS 화면(실기기 아님) · 기기 가림 없음 · 기본은 브라우저 UI 없이 iframe 뷰포트 = 360 × 800 · 360px 이하 소형 화면 breakpoint 점검',source:'approximation: 범용 프리셋(20:9). 특정 기기 재현 아님',
      frame:'neutral',browser:'none',dpr:3,states:[{id:'default',label:'기본',width:360,height:800,diagonal:6.1,physicalWidth:1080,physicalHeight:2400}]},
    /* 768px Tablet 경계 768×1024 — 실기기가 아닌 breakpoint 프리셋(767 ↔ 768px 전환 점검). 외형은 neutral 프레임(가림·컷아웃 없음), 가로 1024×768 은 회전으로 처리. 예전 iPad 9.7형 [레거시] 프리셋(ipad-home) 은 2026-09-22 제거(저장값은 deviceAliases 로 이 프리셋에 매핑). */
    'tablet-generic-768':{name:'768px Tablet 경계',group:'base',subtitle:'767 ↔ 768px breakpoint 전환 점검',note:'768 × 1024 가상 CSS 화면(실기기 아님) · 기본은 브라우저 UI 없이 iframe 뷰포트 = 768 × 1024 (회전 1024 × 768) · 767 ↔ 768px breakpoint 전환 점검',source:'approximation: 범용 프리셋(실기기 아님) — 768 × 1024 CSS · DPR 2 · 9.7형 상당 대각선은 실기기 배율 참고용',
      frame:'neutral-tablet',browser:'none',dpr:2,states:[{id:'default',label:'기본',width:768,height:1024,diagonal:9.7,physicalWidth:1536,physicalHeight:2048}]},
    /* 대표 모델 = iPhone SE (3세대, 2022). 2세대(2020) 와 바디·4.7" 1334×750·CSS 375×667·홈 버튼 구조가 같아 외형/뷰포트 테스트 목적에서는 중복이라 별도 프리셋을 두지 않는다(공식 이미지·상태바 검증 자료가 2022년 SE 기준). */
    'iphone-se':{name:'iPhone SE (3세대)',group:'phone',subtitle:'홈 버튼형 · 2022',note:'홈 버튼·상하단 베젤을 포함한 iPhone SE (3세대) 프레임 — 2세대와 외형·해상도 동일',source:'official: iPhone SE (3세대, 2022) 4.7" 1334 × 750 326ppi, DPR 2 · 바디 138.4 × 67.3mm (Apple tech specs 111866) · 2세대(2020) 도 동일 수치라 대표 모델로 3세대만 등록',
      frame:'iphone-se',browser:'ios-safari',dpr:2,states:[{id:'default',label:'기본',width:375,height:667,diagonal:4.7,physicalWidth:750,physicalHeight:1334}]},
    'iphone-pro':{name:'iPhone 18 Pro',group:'phone',subtitle:'Dynamic Island',note:'402 × 874 CSS 화면 · 다이내믹 아일랜드 가림 포함',source:'official: 6.3" 2622 × 1206, DPR 3 → 402 × 874 (Apple iPhone 18 Pro tech specs)',
      frame:'iphone-dynamic-pro',browser:'ios-safari',dpr:3,states:[{id:'default',label:'기본',width:402,height:874,diagonal:6.3,physicalWidth:1206,physicalHeight:2622,
        /* iOS Safari 실측 CSS viewport(2026-10-12) — 화면에 그리는 Safari UI 높이(browserProfiles 'ios-safari' · 아래 chrome) 와 iframe 크기를 분리한다.
         * [Safari 탭 레이아웃 compact|top][대상 사이트 viewport-fit auto|cover][portrait|landscape] = {small(svh), dynamic(스크롤 중 최대 innerHeight), large(lvh), *Top(화면상 viewport 위 끝 y), widthMode}
         *   shrink = small · overlay = large(getSiteViewport). dynamic 은 데이터로만 보존(현재 UI 모드 없음). widthMode 'safe' = 가로 폭에서 좌우 safe-area 제외(auto 750) · 'full' = 화면 전체(cover 874)
         *   chrome = 이 레이아웃에서 그리는 Safari UI 밴드(시각용). null 인 dynamic = 직접 측정하지 못한 값 */
        browserViewport:{'ios-safari':{
          top:{
            chrome:{portrait:{urlBarPosition:'top',urlBar:60,toolbar:58},landscape:{urlBar:110,toolbar:0}},
            auto:{portrait:{small:660,smallTop:122,dynamic:768,dynamicTop:106,large:812,largeTop:62},landscape:{small:292,smallTop:110,dynamic:402,dynamicTop:0,large:402,largeTop:0,widthMode:'safe'}},
            cover:{portrait:{small:660,smallTop:122,dynamic:768,dynamicTop:106,large:874,largeTop:0},landscape:{small:292,smallTop:110,dynamic:402,dynamicTop:0,large:402,largeTop:0,widthMode:'full'}}
          },
          compact:{
            chrome:{portrait:{urlBarPosition:'bottom',urlBar:50,toolbar:0},landscape:{urlBar:110,toolbar:0}},
            auto:{portrait:{small:714,smallTop:62,dynamic:null,large:754,largeTop:62},landscape:{small:292,smallTop:110,dynamic:402,dynamicTop:0,large:402,largeTop:0,widthMode:'safe'}},
            cover:{portrait:{small:714,smallTop:62,dynamic:754,dynamicTop:62,large:754,largeTop:62},landscape:{small:292,smallTop:110,dynamic:402,dynamicTop:0,large:402,largeTop:0,widthMode:'full'}}
          }
        }},
        browserViewportSource:'verified-derived: iPhone 17 Pro 실기기 Safari 26.5 측정(2026-10-12, safari-measure.html — screen 402 × 874 · DPR 3 · visualViewport.scale 1) 을 같은 402 × 874 CSS 화면인 18 Pro 에 적용(18 Pro 직접 측정 아님). 측정 기록의 layout 문자열이 아니라 측정 시점으로 구분: index 12~19 = 실제 Top, 20~26 = 설정에서 Compact 로 바꾼 뒤 · '
          +'Top: 세로 small 660 · dynamic 768 · large cover 874 / auto 812, 가로 small 292 · dynamic/large 402, 가로 폭 cover 874(safe L/R 62) / auto 750(safe L/R 0), 가로 safe bottom 20 · '
          +'Compact: 세로 small 714 · large 754(auto · cover 같음), cover dynamic 754, auto dynamic 은 Compact 상태 기록이 없어 null(index 17 의 768 은 Top 상태라 재사용하지 않음) · 가로 Top 과 같음 · '
          +'화면상 위치(*Top): Top 세로 small 122 · dynamic 106 · 가로 small 110 · 가로 dynamic 0 은 marker(빨강 top / 파랑 bottom) 스크린샷 photo-measured · Top 세로 large auto 62 는 874 − 812 를 위쪽 상태바로 본 derived · cover large 0 · '
          +'Compact 세로 위치 62(상태바 아래 시작) 와 Compact 가로 위치는 marker 스크린샷이 없어 approximation(가로는 같은 실측값인 Top 배치 준용) · '
          +'chrome: Top 세로 주소창 60(= 122 − 상태바 62) · 툴바 58(= 874 − 782 − 홈 34) · 가로 상단 110 은 marker 위치 photo-measured / Compact 세로 주소창 50 은 기존 ios-safari 시각값(approximation) · 툴바 없음 · 가로 110 은 Top 준용 approximation'}]},
    'mobile-360':{name:'Galaxy S25',group:'phone',subtitle:'Galaxy 바형 · 중앙 펀치홀',note:'360 × 780 CSS 화면 · 펀치홀 가림 포함',source:'official: 6.2" 2340 × 1080 · 바디 146.9 × 70.5mm (Samsung) · verified: Android density 480(DPR 3) · logical 360 × 780dp — windowinsets.info "Galaxy S25"(Samsung RTL SM-S931N, 2026-09-24) · 사용자 RTL Chrome 캡처(2026-10-07) 의 본문 줄 간격·박스 폭·줄바꿈 위치가 360 프리뷰와 픽셀 단위 일치',
      frame:'galaxy-bar',browser:'android-chrome',dpr:3,states:[{id:'default',label:'기본',width:360,height:780,diagonal:6.2,physicalWidth:1080,physicalHeight:2340}]},
    'z-flip8':{name:'Galaxy Z Flip8',group:'fold',subtitle:'커버·펼침·Flex',note:'Galaxy Z Flip8 공개 디스플레이 사양 기준',source:'official: 커버 4.1형(104.8mm) native 1048 × 948 342ppi · 메인 6.9형(174.1mm) native 2520 × 1080 400ppi · 바디 펼침 75.4 × 166.9 × 6.1 / 접힘 75.4 × 85.7 × 13.1mm (Samsung 뉴스룸 2026-07-22) · 프로그램 세로 기준 948 × 1048 / 1080 × 2520 은 derived-orientation · verified: Android density 커버 380(DPR 2.375) → 399.16 × 441.26dp · 메인 480(DPR 3) → 360 × 840dp — Samsung RTL 기기 정보(1080 × 2520 480dpi / 948 × 1048 380dpi) + windowinsets.info "Galaxy Z Flip8"(InsetsProbe 1.2.1, SM-F776B, 2026-09-23) 일치 · 사용자 RTL Chrome 캡처(2026-10-07) 의 펼침 줄 간격·박스 폭·줄바꿈이 360 과 일치 · CSS 크기는 정수 반올림',
      browser:'android-chrome',dpr:3,states:[
      /* physicalWidth/Height 는 세로 기준 정규화 값(derived-orientation). Samsung 공식 native 표기는 1048×948 → frameProfiles['flip8-cover'].source 참조 */
      {id:'cover',label:'커버 화면',width:399,height:441,dpr:2.375,diagonal:4.1,physicalWidth:948,physicalHeight:1048,frame:'flip8-cover',note:'FlexWindow 399 × 441 CSS 화면(948 × 1048 ÷ DPR 2.375, density 380 verified) · 힌지 위 · 우하단 듀얼 카메라·플래시 홀 · 하단 내비게이션 밴드'},
      /* physicalWidth/Height 는 세로 기준 정규화 값(derived-orientation). Samsung 공식 native 표기는 2520×1080 → frameProfiles['flip8-open'].source 참조 */
      {id:'open',label:'펼침',width:360,height:840,diagonal:6.9,physicalWidth:1080,physicalHeight:2520,frame:'flip8-open',hinge:'horizontal',hingeSize:3,note:'메인 화면 360 × 840 CSS 화면(native 2520 × 1080 → 세로 정규화 1080 × 2520 ÷ DPR 3, derived) · 펀치홀과 접힘선 포함'},
      /* Flex: 펼친 화면의 상단 절반. 물리값은 width×dpr 로 자동 계산(1080 × 1260), 실기기 배율은 전체 화면 기준(scaleWidth/Height). */
      {id:'flex',label:'Flex 90°',width:360,height:420,diagonal:6.9,scaleWidth:360,scaleHeight:840,frame:'flip8-flex',hinge:'horizontal',hingeSize:8,hingePosition:99,note:'펼친 화면 상단 절반 점검용 360 × 420(approximation) · 실제 Flex Mode 의 브라우저 영역은 실기기 확인 필요'}
    ]},
    /* Galaxy Z Fold8 — 실기기 프로필 하나(2026-10-07 확정). 사용자 실제 Fold8 의 Chrome 캡처로 검증한 상태(effective DPR 2.25) 를 그대로 쓴다.
     * Device Preview 는 설정 조합 시뮬레이터가 아니라 실제 기기 프리뷰라, 화면 확대/축소 단계별 프로필을 따로 두지 않는다. CSS 크기 = 물리 px ÷ 2.25 의 정수 반올림 */
    'z-fold':{name:'Galaxy Z Fold8',group:'fold',subtitle:'커버·펼침',note:'Galaxy Z Fold8 공개 물리 해상도 · 실기기 Chrome 캡처 기준 DPR 2.25',source:'official: 커버 5.5" 1972 × 1248 · 메인 7.6" 2448 × 1848 · 바디 펼침 161.4 × 123.9 / 접힘 81.9 × 123.9mm (Samsung, GSMArena) · Samsung 은 DPR 를 공개하지 않음 · verified: 사용자 Galaxy Z Fold8 실기기 Chrome 긴 캡처 측정(2026-10-06, 커버 1248 × 11090 · 펼침 2448 × 10921 원본 해상도) — CSS height 50px 표 행(.ds_table td) = 112.5 screenshot px(커버·펼침 동일) → effective scale 2.25 · 교차 확인: 펼침 캡처에 1040px 초과에서만 보이는 .left_nav 노출(2448 ÷ 2.25 = 1088), Chrome UI 도 같은 배율 · 프리뷰 대조: 텍스트·UI 크기 0~2.6%, 주요 요소 위치 ±1px · derived: DPR 2.25 는 스크린샷 실측에서 계산(Chrome window.devicePixelRatio 를 직접 읽지 않음) · CSS 554.67 × 876.44 / 1088 × 821.33 → 정수 반올림',
      browser:'android-chrome',dpr:2.25,states:[
      {id:'cover',label:'커버 화면',width:555,height:876,diagonal:5.5,physicalWidth:1248,physicalHeight:1972,frame:'fold8-cover',note:'커버 화면 555 × 876 CSS 화면(1248 × 1972 ÷ 2.25) · 펀치홀 포함',
        /* 실측 시스템 인셋(logical dp, DPR 2.25 기준): 컷아웃 하단 104 · 상태바 110 물리 px(Samsung RTL 실측 — 정수 물리 px 로 고정된 하드웨어 기준값) ÷ 2.25 */
        insets:{cutoutTop:46.22,statusBar:48.89},
        insetsSource:'derived: windowinsets.info "Galaxy Z Fold8"(InsetsProbe 1.1.2 on Samsung Remote Test Lab SM-F971N, 2026-09-22) 커버 실측 컷아웃 하단 39.62dp · 상단 41.9dp @density 420 = 104 / 110 물리 px(Fold7·Fold8 Ultra 실측도 정수 물리 px, Fold7 은 컷아웃 102px 인데 상태바 110px → px 고정값) ÷ 2.25 = 46.22 / 48.89dp · 360 캡처의 Chrome 툴바 중심 164px 도 상태바 110px 와 일치 · 하단 48dp 는 3버튼 내비 값이라 미적용(제스처 내비 24 유지)',
        /* 브라우저 밴드 덮어쓰기: 선택된 브라우저가 android-chrome 일 때 세로 urlBar 만 48(나머지는 공용 프로필 상속). 공용 android-chrome 56 은 그대로 */
        browserMetrics:{'android-chrome':{portrait:{urlBar:48}}},
        browserMetricsSource:'verified: 사용자 Galaxy Z Fold8 Chrome 커버 캡처 측정(2026-10-06) — 상단 UI 218 screenshot px = 상태바 110 + Chrome 툴바 108, 108 ÷ DPR 2.25 = 48dp(주소 글자 중심 164px = 110~218 구간 중앙, 오차 약 ±3dp) · Fold8 커버 1기기 근거라 공용 android-chrome(56) 에는 반영하지 않음'},
      {id:'open',label:'펼침',width:1088,height:821,diagonal:7.6,physicalWidth:2448,physicalHeight:1848,orientation:'portrait',browser:'tablet-chrome',frame:'fold8-open',hinge:'vertical',hingeSize:4,note:'메인 화면 1088 × 821 CSS 화면(2448 × 1848 ÷ 2.25) · 카메라와 접힘선 포함'}
    ]},
    'iphone-duo':{name:'iPhone Duo',group:'fold',subtitle:'북 타입 폴더블',note:'단일 7.6" 폴딩 내부 화면 + 접힘선 · 외부 5.4" · 힌지 쪽 각진 코너',source:'official: 외부 5.4" 1398 × 2034 · 내부 7.6" 2670 × 1878, DPR 3 · 바디 펼침 164.6 × 117.8 / 접힘 84.1 × 117.8mm · 표준 사각형 대각선 5.36" / 7.58" (Apple iPhone Duo specs)',
      browser:'ios-safari',dpr:3,states:[
      {id:'outer',label:'접힘 · 외부',width:466,height:678,diagonal:5.36,physicalWidth:1398,physicalHeight:2034,frame:'duo-outer',browser:'duo-safari',uiLayout:{natural:'side',rotated:'side'},note:'외부 화면 466 × 678 CSS 화면 · 우상단 카메라 · 코너 상태 클러스터·측면 컨트롤(iOS 27)'},
      {id:'inner',label:'펼침 · 내부',width:890,height:626,diagonal:7.58,physicalWidth:2670,physicalHeight:1878,orientation:'portrait',browser:'duo-safari',uiLayout:{natural:'top',rotated:'bars'},frame:'duo-inner',hinge:'vertical',hingeSize:2,note:'내부 화면 890 × 626 CSS 화면 · 단일 폴딩 화면 · 상단 가로 Safari(측면 열 없음 — 2026-11-09 실기기 사진), 세로로 돌리면 표준 가로 바(iOS 27)'}
    ]},
    /* physicalWidth/Height 는 세로 기준 정규화 값(derived-orientation). Apple 공식 native 표기는 2360×1640 → frameProfiles['ipad-air-11'].source 참조. dpr 2 는 M2 동일 패널 레퍼런스 준용(derived, M4 실기기 미검증) */
    'ipad-air-11':{name:'iPad Air 11',group:'tablet',subtitle:'M4 (2026) · 홈 인디케이터형',note:'iPad Air 11 (M4) 820 × 1180 CSS 화면 · 긴 변 카메라 · 상태바 30 · 홈 인디케이터 20',source:'official: 2360 × 1640 px 264ppi · 대각선 10.86"(27.59cm) · 바디 247.6 × 178.5 × 6.1mm (Apple tech specs 126471) · CSS 820 × 1180 @2 는 동일 패널 이전 모델(M2) 레퍼런스 준용(derived, M4 실기기 미검증)',
      frame:'ipad-air-11',browser:'ipados-safari',dpr:2,states:[{id:'default',label:'기본',width:820,height:1180,diagonal:10.86,physicalWidth:1640,physicalHeight:2360}]},
    /* physicalWidth/Height 는 세로 기준 정규화 값(derived-orientation). Samsung 공식 native 표기는 2560×1600 / 2960×1848 → frameProfiles source 참조. dpr 2 는 동일 패널 전작(Tab S9 / S9·S10 Ultra) 레퍼런스 준용(derived, 실기기 미검증) */
    'galaxy-tab-s11':{name:'Galaxy Tab S11',group:'tablet',subtitle:'11.0형 · One UI 8',note:'Galaxy Tab S11 800 × 1280 CSS 화면 · 긴 변 카메라(노치 없음) · Android 상태바 24 · 제스처 바 24',source:'official: 2560 × 1600 · 278.1mm(11.0형, 둥근 모서리 276.2mm) · 바디 253.8 × 165.3 × 5.5mm (Samsung 뉴스룸 2025-09-04, samsung.com/sec) · CSS 800 × 1280 @2 는 동일 패널 전작 Tab S9 레퍼런스 준용(derived, 실기기 미검증)',
      frame:'galaxy-tab-s11',browser:'android-tablet-chrome',dpr:2,states:[{id:'default',label:'기본',width:800,height:1280,diagonal:10.95,physicalWidth:1600,physicalHeight:2560}]},
    'galaxy-tab-s11-ultra':{name:'Galaxy Tab S11 Ultra',group:'tablet',subtitle:'14.6형 · wave 노치',note:'Galaxy Tab S11 Ultra 924 × 1480 CSS 화면 · 긴 변 상단 wave 노치·카메라 · Android 상태바 24 · 제스처 바 24',source:'official: 2960 × 1848 · 369.9mm(14.6형, 둥근 모서리 367.2mm) · 바디 326.3 × 208.5 × 5.1mm · 베젤 5.2mm (Samsung 뉴스룸 2025-09-04, samsung.com/uk) · CSS 924 × 1480 @2 는 동일 패널 전작 Tab S9/S10 Ultra 레퍼런스 준용(derived, 실기기 미검증)',
      frame:'galaxy-tab-s11-ultra',browser:'android-tablet-chrome',dpr:2,states:[{id:'default',label:'기본',width:924,height:1480,diagonal:14.56,physicalWidth:1848,physicalHeight:2960}]},
    /* MacBook(2026-10-15): CSS 화면 = macOS 기본 "Looks like" 배율 해상도(derived — Apple 사양 페이지에서 배율 목록이 빠져 언론 · 커뮤니티 자료로 확인: 9to5Mac 2021 "3024 × 1964 … presented as 1512 × 982@2x", MacRumors 포럼 16형 "Default: Looks like 1728 × 1117"; Air 13 1470 × 956 은 같은 방식의 기본값).
     * 사용자가 디스플레이 배율을 바꾸면 CSS 화면이 달라진다 — 다른 배율은 직접 크기 입력으로 확인. DPR 2 · 원본 해상도는 official. 회전 없음 */
    'macbook-air-13':{name:'MacBook Air 13',group:'desktop',subtitle:'M5 · 13.6형',rotatable:false,note:'CSS 1470 × 956 · DPR 2',noteDetail:'기본 macOS 배율 · 메뉴 막대 37 · Safari 툴바 52 · Dock 자동 숨김 가정 (근사값 — 실제 Mac 측정 전)',source:'official: 2560 × 1664 @224ppi · 13.6형 · 30.41 × 21.5cm / derived: 기본 Looks like 1470 × 956 / approximation: 메뉴 막대 37 · Safari 툴바 52',
      frame:'macbook-air-13',browser:'mac-safari',dpr:2,states:[{id:'default',label:'기본',width:1470,height:956,diagonal:13.6,physicalWidth:2560,physicalHeight:1664}]},
    'macbook-pro-14':{name:'MacBook Pro 14',group:'desktop',subtitle:'M5 · 14.2형',rotatable:false,note:'CSS 1512 × 982 · DPR 2',noteDetail:'기본 macOS 배율 · 메뉴 막대 37 · Safari 툴바 52 · Dock 자동 숨김 가정 (근사값 — 실제 Mac 측정 전)',source:'official: 3024 × 1964 @254ppi · 14.2형 · 31.26 × 22.12cm / derived: 기본 Looks like 1512 × 982 / approximation: 메뉴 막대 37 · Safari 툴바 52',
      frame:'macbook-pro-14',browser:'mac-safari',dpr:2,states:[{id:'default',label:'기본',width:1512,height:982,diagonal:14.2,physicalWidth:3024,physicalHeight:1964}]},
    'macbook-pro-16':{name:'MacBook Pro 16',group:'desktop',subtitle:'M5 Pro · 16.2형',rotatable:false,note:'CSS 1728 × 1117 · DPR 2',noteDetail:'기본 macOS 배율 · 메뉴 막대 37 · Safari 툴바 52 · Dock 자동 숨김 가정 (근사값 — 실제 Mac 측정 전)',source:'official: 3456 × 2234 @254ppi · 16.2형 · 35.57 × 24.81cm / derived: 기본 Looks like 1728 × 1117 / approximation: 메뉴 막대 37 · Safari 툴바 52',
      frame:'macbook-pro-16',browser:'mac-safari',dpr:2,states:[{id:'default',label:'기본',width:1728,height:1117,diagonal:16.2,physicalWidth:3456,physicalHeight:2234}]}
  };

  /* ==================================================================
   * DOM
   * 기기 셸(.device_shell 이하)은 #deviceShellTemplate 에서 생성한다. 단일 보기 셸에는 기존 id 를 그대로 부여한다.
   * ================================================================== */
  const elements={
    siteForm:document.getElementById('siteForm'),siteUrl:document.getElementById('siteUrl'),urlError:document.getElementById('urlError'),
    deviceNav:document.getElementById('deviceNav'),deviceCount:document.getElementById('deviceCount'),deviceButtons:[],
    viewModeInputs:Array.from(document.querySelectorAll('input[name="viewMode"]')),
    controlPanel:document.querySelector('.control_panel'),
    currentDevice:document.getElementById('currentDevice'),currentMeta:document.getElementById('currentMeta'),
    envNotice:document.getElementById('envNotice'),envNoticeText:document.getElementById('envNoticeText'),envNoticeLink:document.getElementById('envNoticeLink'),testNotice:document.querySelector('.test_notice'),foldControls:document.getElementById('foldControls'),stateList:document.getElementById('stateList'),viewportWidth:document.getElementById('viewportWidth'),
    viewportHeight:document.getElementById('viewportHeight'),applySize:document.getElementById('applySize'),sizeError:document.getElementById('sizeError'),
    browserSelect:document.getElementById('browserSelect'),addressBarToggle:document.getElementById('addressBarToggle'),bottomBarToggle:document.getElementById('bottomBarToggle'),
    urlPositionControls:document.getElementById('urlPositionControls'),urlPositionInputs:Array.from(document.querySelectorAll('input[name="urlPosition"]')),
    uiOverlayToggle:document.getElementById('uiOverlayToggle'),safeAreaBtn:document.getElementById('safeAreaBtn'),
    occlusionBtn:document.getElementById('occlusionBtn'),occlusionStatus:document.getElementById('occlusionStatus'),occlusionText:document.getElementById('occlusionText'),occlusionRecheck:document.getElementById('occlusionRecheck'),
    occlusionListBtn:document.getElementById('occlusionListBtn'),occlusionList:document.getElementById('occlusionList'),occlusionItems:document.getElementById('occlusionItems'),occlusionListNote:document.getElementById('occlusionListNote'),
    occlusionCopy:document.getElementById('occlusionCopy'),occlusionCopyBox:document.getElementById('occlusionCopyBox'),occlusionCopyText:document.getElementById('occlusionCopyText'),occlusionCopyClose:document.getElementById('occlusionCopyClose'),
    browserControls:document.querySelector('.browser_controls'),safariControls:document.getElementById('safariControls'),safariDetailBtn:document.getElementById('safariDetailBtn'),
    safariLayoutInputs:Array.from(document.querySelectorAll('input[name="safariLayout"]')),viewportFitInputs:Array.from(document.querySelectorAll('input[name="viewportFit"]')),
    rotateBtn:document.getElementById('rotateBtn'),refreshBtn:document.getElementById('refreshBtn'),captureBtn:document.getElementById('captureBtn'),scaleInput:document.getElementById('scaleInput'),scaleDownBtn:document.getElementById('scaleDownBtn'),scaleUpBtn:document.getElementById('scaleUpBtn'),scaleFitBtn:document.getElementById('scaleFitBtn'),scaleDeviceBtn:document.getElementById('scaleDeviceBtn'),
    openLink:document.getElementById('openLink'),previewArea:document.getElementById('previewArea'),previewStage:document.getElementById('previewStage'),previewMount:document.getElementById('previewMount'),
    compareBar:document.getElementById('compareBar'),compareCount:document.getElementById('compareCount'),compareNote:document.getElementById('compareNote'),
    compareGrid:document.getElementById('compareGrid'),compareEmpty:document.getElementById('compareEmpty'),
    syncScroll:document.getElementById('syncScroll'),syncRotate:document.getElementById('syncRotate'),syncRefresh:document.getElementById('syncRefresh'),syncNavigate:document.getElementById('syncNavigate'),
    deviceShellTemplate:document.getElementById('deviceShellTemplate'),compareItemTemplate:document.getElementById('compareItemTemplate'),
    frameStatus:document.getElementById('frameStatus'),loadStatus:document.querySelector('.load_status'),presetNote:document.getElementById('presetNote'),viewportStatus:document.getElementById('viewportStatus')
  };

  /* ==================================================================
   * 상태
   *
   * view : 기기 하나의 미리보기 단위. 단일 보기는 primaryView 하나, 다중 비교는 compareViews(Map: deviceId → view) 에 최대 MAX_COMPARE 개.
   *        { dom, deviceId, stateId, rotated, baseWidth/baseHeight(회전 전), currentWidth/currentHeight(회전 반영),
   *          frameProfile, frameInsets, scale, loaded, compare(비교 카드 여부) }
   * 전역 표시 설정(브라우저 UI·주소창 위치·safe-area·배율·URL) 은 모든 view 에 공통 적용된다.
   * ================================================================== */
  const MAX_COMPARE=4;
  let viewMode='single';      /* single | compare */
  const syncOptions={scroll:true,rotate:true,refresh:true,navigate:true};   /* navigate = 페이지 이동 동기화(2026-10-22) */
  const compareViews=new Map();
  let primaryView=null;

  /* 표시 배율: 'fit'(화면 맞춤, 창·기기 변경 시 재계산) | 'manual'(사용자 지정 %, 창 크기가 바뀌어도 유지) | 'device'(공개 inch 기준 물리 근사).
   * 기기 프레임 전체의 transform: scale 만 바꾸며 iframe CSS 뷰포트·미디어 쿼리·DPR 은 배율과 무관. 100% = 기기 CSS 1px : PC CSS 1px (물리 크기 아님) */
  let scaleMode='device';
  const SCALE_MIN=25,SCALE_MAX=200,SCALE_STEP=5;
  let manualScale=1;   /* 수동 배율(비율). 25%~200%, 5% 단위 */
  let showAddressBar=true;
  let showBottomBar=true;
  let uiMode='shrink';        /* shrink: UI 높이만큼 사이트 영역 축소(svh) · overlay: UI 를 콘텐츠 위에 겹침(lvh) */
  let safeAreaGuide=false;
  let browserByPlatform={};   /* 플랫폼별 사용자 브라우저 선택 { ios:'ios-chrome', ... } */
  let urlBarPositionByBrowser={}; /* 브라우저별 세로 모드 주소창 위치 선택 { 'ios-safari':'top', ... } · 없으면 프로필 기본값 */
  /* iOS Safari 실측 viewport(state.browserViewport) 가 있는 기기에만 쓰는 설정. 다른 기기·브라우저 계산에는 영향 없음.
   * safariLayout: 설정 › Safari › 탭 레이아웃(compact | top) · viewportFit: 대상 사이트의 meta viewport-fit(auto = 지정 없음 | cover) — iframe 안 meta 를 바꾸지 않는 프리뷰 계산 설정 */
  const SAFARI_LAYOUTS=['compact','top'],VIEWPORT_FITS=['auto','cover'];
  let safariLayout='compact';
  /* Safari(macOS) 버전 · 호환성 검사(2026-10-15): 선택 버전은 저장(viewportLabDisplay.safariVersion), 검사 켬 상태는 저장하지 않는다 */
  let safariVersion=null;
  let compatEnabled=false,compatResult=null,safariDataPromise=null;
  let viewportFit='auto';
  /* 가상 키보드 영역 시뮬레이션(2026-10-21): 켬 상태는 저장하지 않는다(새로 열면 꺼짐). 모드 · 높이(사용자 조절값, CSS px) 는 viewportLabDisplay 에 저장.
   * 기본 높이 280 은 기기별 실측이 아닌 하나의 일반 시뮬레이션 값이며, 화면마다 사이트 높이에 맞춰 제한해 적용한다(getKeyboardInset) */
  const KEYBOARD_MODES=['resize','overlay'],KEYBOARD_DEFAULT=280,KEYBOARD_MIN=80,KEYBOARD_SITE_MIN=120;
  let keyboardEnabled=false,keyboardMode='resize',keyboardHeight=KEYBOARD_DEFAULT;
  let currentUrl='';

  function setError(element,message){element.textContent=message;element.hidden=!message;}
  function announce(message){elements.viewportStatus.textContent=message;}
  function allViews(){return [primaryView].concat(Array.from(compareViews.values()));}
  function visibleViews(){return viewMode==='compare'?Array.from(compareViews.values()):[primaryView];}
  /* 지금 화면에 실제로 보이는 view 인지 — 다중 비교 중의 primaryView(#previewMount 는 display:none) 는 false.
   * 숨은 iframe 이 같은 URL 을 중복 요청·유지하지 않도록 loadInto/reloadView 가 이 값을 본다(DOM·view 구조는 그대로). */
  function isViewActive(view){return view===primaryView?viewMode==='single':viewMode==='compare';}
  /* 컨트롤 패널이 값을 표시할 기준 view: 단일 보기는 primaryView, 다중 비교는 첫 카드(없으면 primaryView) */
  function getControlView(){
    if(viewMode==='compare'){const first=compareViews.values().next().value;return first||primaryView;}
    return primaryView;
  }

  /* ------------------------------------------------------------------
   * view 생성 · 기기 셸 stamp
   * ------------------------------------------------------------------ */
  function mountShell(container,withIds){
    const fragment=elements.deviceShellTemplate.content.cloneNode(true);
    const shell=fragment.querySelector('.device_shell');
    const dom={
      mount:container,shell,
      screenWrap:shell.querySelector('.screen_wrap'),siteView:shell.querySelector('.site_view'),siteFrame:shell.querySelector('iframe'),
      bandStatus:shell.querySelector('.band_status'),bandUrl:shell.querySelector('.band_url'),bandToolbar:shell.querySelector('.band_toolbar'),bandHome:shell.querySelector('.band_home'),
      browserUrl:shell.querySelector('.browser_url'),tchromeTitle:shell.querySelector('.tchrome_title'),hingeLine:shell.querySelector('.hinge_line'),
      statusCluster:shell.querySelector('.status_cluster'),clusterTime:shell.querySelector('.cluster_time'),clusterRing:shell.querySelector('.cluster_ring'),
      dynamicIsland:shell.querySelector('.dynamic_island'),sideControls:shell.querySelector('.side_controls'),
      duoUrl:shell.querySelector('.duo_url'),duoTop:shell.querySelector('.duo_top'),duoTabs:shell.querySelector('.duo_tabs'),duoUrlTexts:Array.from(shell.querySelectorAll('.duo_field_text')),occlusionLayer:shell.querySelector('.occlusion_layer'),
      kbSim:shell.querySelector('.kb_sim'),kbValue:shell.querySelector('.kb_value'),kbHandle:shell.querySelector('.kb_handle'),
      statusTime:shell.querySelector('.status_time'),batteryFill:shell.querySelector('.battery_fill'),statusPercent:shell.querySelector('.status_percent'),statusPill:shell.querySelector('.status_pill'),
      keyVolume:shell.querySelector('.key_volume'),keyVolumeB:shell.querySelector('.key_volume_b'),keyPower:shell.querySelector('.key_power'),keyAction:shell.querySelector('.key_action'),
      statusIcons:{cellular:shell.querySelector('.icon_cellular'),wifi:shell.querySelector('.icon_wifi'),battery:shell.querySelector('.icon_battery')}
    };
    if(withIds){
      shell.id='deviceShell';dom.screenWrap.id='screenWrap';dom.siteView.id='siteView';dom.siteFrame.id='siteFrame';
      dom.bandStatus.id='bandStatus';dom.bandUrl.id='bandUrl';dom.bandToolbar.id='bandToolbar';dom.bandHome.id='bandHome';
      dom.browserUrl.id='browserUrl';dom.hingeLine.id='hingeLine';
    }
    container.appendChild(fragment);
    return dom;
  }

  /* 첫 진입(저장값 없음 · 저장된 기기 id 가 더 이상 없을 때) 의 기기 — Breakpoint 테스트 360px 소형 모바일(2026-10-08, 이전 기본 'mobile-390' 은 제거) */
  const DEFAULT_DEVICE_ID='android-generic-360';
  function createView(dom,extra){
    const defaultState=devices[DEFAULT_DEVICE_ID].states[0];
    const view=Object.assign({
      dom,deviceId:DEFAULT_DEVICE_ID,stateId:defaultState.id,rotated:false,
      baseWidth:defaultState.width,baseHeight:defaultState.height,currentWidth:defaultState.width,currentHeight:defaultState.height,
      frameProfile:frameProfiles.neutral,frameInsets:{top:14,right:14,bottom:14,left:14},
      scale:1,loaded:false,compare:false,ignoreScrollUntil:0
    },extra||{});
    dom.siteFrame.addEventListener('load',()=>onFrameLoad(view));
    bindKeyboardDrag(view);   /* 가상 키보드 영역 위 손잡이(켰을 때만 보임) */
    return view;
  }

  function getDevice(view){return devices[view.deviceId]||null;}
  function getState(view){
    const device=getDevice(view);
    return device?device.states.find(state=>state.id===view.stateId)||device.states[0]:null;
  }
  function getDeviceName(view){const device=getDevice(view);return device?device.name:'직접 설정';}

  /* 기본 자세(orientation) 와 현재 방향. 폴더블 펼침처럼 가로형 비율의 세로 자세는 state.orientation 으로 명시 */
  function getNaturalOrientation(view){
    const state=getState(view);
    if(state&&state.orientation)return state.orientation;
    return view.baseWidth>=view.baseHeight?'landscape':'portrait';
  }
  function getOrientation(view){
    const natural=getNaturalOrientation(view);
    if(!view.rotated)return natural;
    return natural==='portrait'?'landscape':'portrait';
  }
  function getOrientationLabel(view){return getOrientation(view)==='landscape'?'가로':'세로';}

  function getDpr(view){
    const device=getDevice(view);
    const state=getState(view);
    return state&&state.dpr?state.dpr:device&&device.dpr?device.dpr:null;
  }

  function getPhysicalResolution(view){
    const state=getState(view);
    if(!state)return null;
    const dpr=getDpr(view);
    let width=state.physicalWidth||dpr&&Math.round(state.width*dpr);
    let height=state.physicalHeight||dpr&&Math.round(state.height*dpr);
    if(!width||!height)return null;
    if(view.rotated){const previousWidth=width;width=height;height=previousWidth;}
    return{width,height};
  }

  /* 실기기 배율: 모니터 96ppi 가정. 화면 대각선(inch) 과 CSS 대각선(px) 비율 */
  function getPhysicalScale(view){
    const state=getState(view);
    if(!state||!state.diagonal)return null;
    const width=state.scaleWidth||state.width;
    const height=state.scaleHeight||state.height;
    return 96*state.diagonal/Math.hypot(width,height);
  }

  /* ------------------------------------------------------------------
   * 프레임·safe-area
   * ------------------------------------------------------------------ */
  function rotateInsets(profile){
    return{top:profile.right,right:profile.bottom,bottom:profile.left,left:profile.top};
  }

  function getFrameProfile(view){
    const device=getDevice(view);
    const state=getState(view);
    const profile=frameProfiles[state&&state.frame||device&&device.frame]||getGenericFrame(view);
    return scaleFrameProfile(profile,getDpr(view),getMeasuredInsets(view));
  }

  /* 직접 설정(custom) 처럼 프레임이 없는 view 의 범용 프레임(2026-10-22): 짧은 변이 768px Tablet 경계 이상이면 neutral-tablet, 미만이면 neutral.
   * neutral 의 ratio radius 는 큰 화면에서 스마트폰처럼 과하게 둥글어지므로(800×1024 → 바디 72 · 화면 40) 768 프리셋과 같은 프로필을 재사용한다.
   * 회전해도 프레임이 바뀌지 않도록 회전 전 baseWidth/baseHeight 로 판정 */
  function getGenericFrame(view){
    return Math.min(view.baseWidth,view.baseHeight)>=768?frameProfiles['neutral-tablet']:frameProfiles.neutral;
  }

  /* state.insets(실측 시스템 인셋: 컷아웃 하단·상태바, 현재 DPR 의 logical dp) 가 있으면 사진 기반 환산값 대신 쓴다. 정수 반올림 */
  function getMeasuredInsets(view){
    const state=getState(view);
    if(!state||!state.insets)return null;
    return{cutoutTop:Math.round(state.insets.cutoutTop),statusBar:Math.round(state.insets.statusBar)};
  }

  /* 하드웨어 치수의 DPR 환산(frameReferenceDpr 를 가진 프로필만 — 현재 Fold8 두 개).
   * 프로필 px 는 frameReferenceDpr 좌표계의 CSS px 로 환산된 물리 치수라, 현재 DPR 에서도 같은 mm 가 되도록 frameReferenceDpr/DPR 배.
   * 환산: 베젤·링·코너·홀·스파인 + cutoutInsets 가 가리키는 인셋 변(홀 경계) + statusBarHeight 의 홀 부분(여백은 유지).
   * measured(getMeasuredInsets) 가 있으면 컷아웃 인셋 변·statusBarHeight 는 사진 기반 값 대신 실측값을 쓴다.
   * 유지: Android UI dp 값(나머지 safe-area 변, homeIndicatorWidth, statusBar 프로필) */
  const scaledFrameCache=new Map();
  function scaleFrameProfile(profile,dpr,measured){
    if(!profile.frameReferenceDpr||!dpr||profile.frameReferenceDpr===dpr)return profile;
    const key=profile.id+'@'+dpr+(measured?'|'+measured.cutoutTop+'/'+measured.statusBar:'');
    if(scaledFrameCache.has(key))return scaledFrameCache.get(key);
    const k=profile.frameReferenceDpr/dpr;
    const px=value=>typeof value==='number'?Math.round(value*k*10)/10:value;
    const scaleKeys=(obj,keys)=>{
      if(!obj)return obj;
      const out=Object.assign({},obj);
      keys.forEach(key=>{if(typeof out[key]==='number')out[key]=px(out[key]);});
      return out;
    };
    const corners=value=>value&&typeof value==='object'&&!('ratio' in value)?scaleKeys(value,['tl','tr','br','bl']):px(value);
    const scaled=Object.assign({},profile,{
      top:px(profile.top),right:px(profile.right),bottom:px(profile.bottom),left:px(profile.left),
      ring:px(profile.ring),radius:corners(profile.radius),glassRadius:corners(profile.glassRadius),screenRadius:corners(profile.screenRadius),
      cutout:scaleKeys(profile.cutout,['width','height','top','bottom','offset','depth','length','lens','ring','lensGap','flash','flashGap']),
      hingeBody:scaleKeys(profile.hingeBody,['width','inset','radius','size'])
    });
    /* logicalKeys: 현재 DPR 의 logical 값으로 실측된 키는 환산하지 않는다(예: Flip8 커버 screenRadius 5/41) */
    (profile.logicalKeys||[]).forEach(name=>{scaled[name]=profile[name];});
    const sides=profile.cutoutInsets||{};
    if(sides.portrait&&profile.safeArea){
      scaled.safeArea=Object.assign({},profile.safeArea,{[sides.portrait]:Math.round(profile.safeArea[sides.portrait]*k)});
      if(typeof profile.statusBarHeight==='number'&&sides.portrait==='top')scaled.statusBarHeight=scaled.safeArea.top+(profile.statusBarHeight-profile.safeArea.top);
    }
    if(sides.landscape&&profile.safeAreaLandscape){
      scaled.safeAreaLandscape=Object.assign({},profile.safeAreaLandscape,{[sides.landscape]:Math.round(profile.safeAreaLandscape[sides.landscape]*k)});
    }
    if(measured){
      if(sides.portrait&&scaled.safeArea)scaled.safeArea=Object.assign({},scaled.safeArea,{[sides.portrait]:measured.cutoutTop});
      if(sides.landscape&&scaled.safeAreaLandscape)scaled.safeAreaLandscape=Object.assign({},scaled.safeAreaLandscape,{[sides.landscape]:measured.cutoutTop});   /* 회전 시 같은 물리 컷아웃 경계 */
      scaled.statusBarHeight=measured.statusBar;
    }
    scaledFrameCache.set(key,scaled);
    return scaled;
  }

  function getSafeArea(view){
    const profile=view.frameProfile;
    const portrait=profile.safeArea||{top:0,right:0,bottom:0,left:0};
    if(getOrientation(view)==='portrait')return portrait;
    return profile.safeAreaLandscape||rotateInsets(portrait);
  }

  /* ------------------------------------------------------------------
   * 브라우저 UI 밴드
   * ------------------------------------------------------------------ */
  /* 프레임 플랫폼이 'any'(범용 프리셋·직접 입력) 이면 모든 브라우저, 아니면 같은 플랫폼 브라우저만.
   * 기기 데이터가 기본으로 지정한 브라우저(예: Fold 펼침 → tablet-chrome) 는 항상 허용한다. */
  function profileFitsPlatform(profileId,platform,view){
    const profile=browserProfiles[profileId];
    if(!profile)return false;
    if(profileId===getDefaultBrowserId(view))return true;
    if(profile.exclusive)return false;   /* 특정 기기 전용(예: duo-safari) 은 그 기기의 기본일 때만 */
    /* 폼팩터 전용(formFactor:'tablet' — Android 태블릿 브라우저) 은 기기의 기본 브라우저가 같은 폼팩터일 때만 목록에 */
    const defaultProfile=browserProfiles[getDefaultBrowserId(view)];
    /* 기기 전용 브라우저가 기본인 기기(iPhone Duo → duo-safari) 는 그 프로필만 쓴다(2026-10-16): 다른 iPhone 에서 고른 browserByPlatform.ios(예: Chrome(iOS)) 가
     * Duo 에 그대로 적용되지 않게 하고, Duo 전용 UI 근거가 없는 다른 브라우저는 목록에도 넣지 않는다. 저장값(browserByPlatform) 은 건드리지 않아 다른 iPhone 은 그대로 */
    if(defaultProfile&&defaultProfile.exclusive)return false;
    if(profile.formFactor&&profile.formFactor!==(defaultProfile&&defaultProfile.formFactor))return false;
    if(platform==='any')return true;
    return (profile.platform||'any')===platform;
  }

  function getDefaultBrowserId(view){
    const device=getDevice(view);
    const state=getState(view);
    const raw=state&&state.browser||device&&device.browser||defaultBrowserId;
    const id=browserAliases[raw]||raw;
    return browserProfiles[id]?id:defaultBrowserId;
  }

  function resolveBrowserId(view){
    const platform=view.frameProfile.platform||'any';
    const chosen=browserByPlatform[platform];
    if(chosen&&profileFitsPlatform(chosen,platform,view))return chosen;
    return getDefaultBrowserId(view);
  }

  /* 주소창 위치: 가로는 항상 상단, 세로는 사용자 선택(브라우저별 기억) → 없으면 프로필 기본값 */
  function resolveUrlBarPosition(view,profileId,orientation){
    if((orientation||getOrientation(view))==='landscape')return 'top';
    const chosen=urlBarPositionByBrowser[profileId];
    if(urlBarPositions.includes(chosen))return chosen;
    const profile=browserProfiles[profileId];
    return profile&&urlBarPositions.includes(profile.urlBarPosition)?profile.urlBarPosition:'top';
  }

  /* UI 레이아웃: 'side'(카메라 쪽 세로 축 — iPhone Duo 외부) | 'top'(iPhone Duo 내부 상단 가로 Safari — 시각 레이어, viewport 는 side 와 같은 계산) | 'bars'(표준 가로 밴드).
   * 프로필이 side 를 지원할 때 state.uiLayout 이 자세별로 정한다 */
  function getUiLayout(view,profile){
    if(!profile||profile.layout!=='side')return 'bars';
    const state=getState(view);
    const map=state&&state.uiLayout;
    if(!map)return 'side';
    return map[view.rotated?'rotated':'natural']||'side';
  }

  /* 측면 컨트롤·코너 클러스터가 붙는 세로 가장자리: 카메라 쪽(HIG: "hold the same position relative to the camera").
   * 세로 기준 우측 → 반시계 회전(가로) 에서는 카메라가 좌상단으로 가므로 왼쪽. 카메라(컷아웃) 가 없는 내부 화면은 회전해도 우측(approximation) */
  function getControlEdge(view){
    const cutout=view.frameProfile.cutout;
    const hasCamera=cutout&&cutout.type&&cutout.type!=='none';
    return view.rotated&&hasCamera?'left':'right';
  }

  function getBrowserBands(view){
    const profileId=resolveBrowserId(view);
    const profile=browserProfiles[profileId];
    const orientation=getOrientation(view);
    const layout=getUiLayout(view,profile);
    let metrics=profile[orientation]||profile.portrait;
    let barsOrientation=orientation;
    let styleId=profileId;   /* 밴드 마감(CSS data-browser) 기준 프로필. 표준 바 상태에서는 차용한 프로필 */
    if(profile.layout==='side'&&layout==='bars'){
      /* 표준 가로 바 상태(예: Duo 내부 화면을 세로로 든 경우): 화면 형상(세로형이면 portrait) 기준으로 fallback 프로필의 밴드를 차용하되
       * 상태바는 코너 클러스터라 밴드 0. 펼친 폴더블의 방향 라벨(자세 기준) 과 형상이 반대라 형상으로 고른다 */
      barsOrientation=view.currentWidth>=view.currentHeight?'landscape':'portrait';
      const fallback=browserProfiles[profile.standardFallback]||profile;
      metrics=Object.assign({},fallback[barsOrientation]||fallback.portrait,{statusBar:0});
      styleId=fallback.id||profile.standardFallback||profileId;
    }
    /* state 별 브라우저 밴드 덮어쓰기(state.browserMetrics[프로필 id][방향]) — 공용 프로필 값을 상속하고 지정한 항목만 바꾼다(예: Fold8 커버 Chrome urlBar 48) */
    const state=getState(view);
    const override=state&&state.browserMetrics&&state.browserMetrics[profileId];
    if(override&&override[barsOrientation])metrics=Object.assign({},metrics,override[barsOrientation]);
    /* 실측 CSS viewport(state.browserViewport[프로필 id]) 가 있으면: Safari 탭 레이아웃의 시각 UI(chrome) 로 밴드를 그리고, iframe 크기는 getSiteViewport() 가 실측값으로 정한다.
     * 주소창 위치는 레이아웃이 정하므로 라디오는 잠그고, 가로 letterbox(sideInset) 대신 viewport-fit 의 widthMode 로 폭을 정한다 */
    const measuredSet=layout==='bars'&&state&&state.browserViewport&&state.browserViewport[profileId];
    const measuredLayout=measuredSet&&measuredSet[safariLayout];
    let measured=null,measuredPosition=null;
    if(measuredLayout&&measuredLayout[viewportFit]&&measuredLayout[viewportFit][barsOrientation]){
      const chrome=measuredLayout.chrome&&measuredLayout.chrome[barsOrientation]||{};
      metrics=Object.assign({},metrics,{sideInset:null},chrome.urlBar!=null?{urlBar:chrome.urlBar}:null,chrome.toolbar!=null?{toolbar:chrome.toolbar}:null);
      measured=Object.assign({layout:safariLayout,fit:viewportFit},measuredLayout[viewportFit][barsOrientation]);
      if(barsOrientation==='portrait'&&urlBarPositions.includes(chrome.urlBarPosition))measuredPosition=chrome.urlBarPosition;
    }
    const side=layout==='side';
    /* Duo 내부 상단 가로 Safari(2026-11-09): 측면 열 없음. 사이트는 상단 Safari 시각 UI(getDuoTopChrome — 그려지는 높이와 같은 값) 아래에서 시작한다(축소 모드).
     * 실측 innerHeight 가 아닌 "시각 UI 를 뺀 preview viewport approximation". 좌우 safe-area 는 0(측면 열용 89 제거) */
    const duoTop=layout==='top';
    const duoChrome=duoTop?getDuoTopChrome(view,profile):null;
    const safe=getSafeArea(view);
    /* 상태바 밴드 높이: 브라우저 프로필 값 → 없으면 프레임 statusBarHeight(세로)/statusBarHeightLandscape(가로) → 없으면 safe-area top (컷아웃 인셋과 상태바 창 높이가 같다고 보는 기본값) */
    const frameStatus=barsOrientation==='landscape'?view.frameProfile.statusBarHeightLandscape:view.frameProfile.statusBarHeight;
    const status=metrics.statusBar==null?(frameStatus!=null?frameStatus:safe.top):metrics.statusBar;
    const home=view.frameProfile.homeIndicator===false?0:(metrics.homeIndicator==null?safe.bottom:metrics.homeIndicator);
    /* side 레이아웃(iPhone Duo) 의 viewport-fit(2026-10-16): auto(기본) = 측면 Safari UI 쪽 safe-area 를 iframe 폭에서 뺀다(가로 Safari letterbox 와 같은 방식 —
     * 기존 frameProfiles.safeArea 값 그대로, 실제 Duo Safari 의 웹 viewport inset 은 미확인이라 "안전 영역 시뮬레이션"). cover = 화면 전체 + 측면 UI 가 콘텐츠 위에 겹침(이전 동작) */
    const sideInset=metrics.sideInset==='safe-area'||(side&&viewportFit==='auto');
    return{
      profileId,label:profile.label,platform:view.frameProfile.platform||'any',
      status,home,
      url:showAddressBar?metrics.urlBar:0,
      urlPosition:measuredPosition||resolveUrlBarPosition(view,profileId,barsOrientation),
      urlPositionLocked:barsOrientation==='landscape'||side||duoTop||Boolean(measured),
      urlPositionLockReason:side?'side':(duoTop?'duo-top':(barsOrientation==='landscape'?'landscape':(measured?'safari-layout':''))),
      toolbar:showBottomBar?metrics.toolbar:0,
      left:sideInset?safe.left:0,
      right:sideInset?safe.right:0,
      side,duoTop,chromeTop:duoChrome?duoChrome.height:0,sideEdge:side?getControlEdge(view):null,styleId,measured
    };
  }

  /* 실측 viewport 데이터가 있는 view 인지(Safari 탭 레이아웃 · viewport-fit 설정 표시용) */
  function hasMeasuredViewport(view){
    const profileId=resolveBrowserId(view);
    const state=getState(view);
    return Boolean(state&&state.browserViewport&&state.browserViewport[profileId]&&getUiLayout(view,browserProfiles[profileId])==='bars');
  }

  /* 사이트(iframe) 뷰포트.
   * shrink : 모든 UI 밴드를 뺀 가시 영역 = iframe 크기 (svh 상황)
   * overlay: 항상 남는 상태바·홈 인디케이터만 빼고 URL 바·툴바는 콘텐츠 위에 겹침 (lvh 상황, 100vh 가림 확인)
   * 실측 viewport(bands.measured) 가 있으면 밴드 합산 대신 실측값: shrink = small · overlay = large, 화면상 위치 = smallTop / largeTop,
   *   가로 폭 = widthMode 'safe'(viewport-fit auto: 좌우 safe-area 제외) | 'full'(cover: 화면 전체 — safe-area 는 viewport 안쪽 값). Safari UI 밴드는 iframe 위에 시각적으로만 놓인다 */
  function getSiteViewport(view){
    const bands=getBrowserBands(view);
    const overlay=uiMode==='overlay';
    if(bands.measured){
      const m=bands.measured;
      const safe=getSafeArea(view);
      const safeWidth=m.widthMode==='safe';
      const left=safeWidth?safe.left:0,right=safeWidth?safe.right:0;
      const width=view.currentWidth-left-right;
      const height=overlay?m.large:m.small;
      const top=overlay?m.largeTop:m.smallTop;
      return{width,height,visibleHeight:m.small,top,bottom:view.currentHeight-top-height,left,right,
        urlTop:bands.urlPosition==='top'?bands.url:0,urlBottom:bands.urlPosition==='bottom'?bands.url:0,overlay,bands,measured:m};
    }
    const urlTop=bands.urlPosition==='top'?bands.url:0;
    const urlBottom=bands.urlPosition==='bottom'?bands.url:0;
    const chromeTop=bands.chromeTop||0;   /* Duo 내부 상단 Safari 시각 UI 높이 — 축소 모드에서만 뺀다(UI 겹침 모드는 다른 브라우저 UI 처럼 콘텐츠 위에 겹침) */
    const top=bands.status+(overlay?0:urlTop+chromeTop);
    const bottom=bands.home+(overlay?0:urlBottom+bands.toolbar);
    const width=Math.max(80,view.currentWidth-bands.left-bands.right);
    const height=Math.max(80,view.currentHeight-top-bottom);
    const visibleHeight=Math.max(80,view.currentHeight-bands.status-bands.url-bands.toolbar-bands.home-chromeTop);
    return{width,height,visibleHeight,top,bottom,left:bands.left,right:bands.right,urlTop,urlBottom,overlay,bands};
  }

  /* 가상 주소창 표시: 다중 비교 카드는 페이지 이동 감지가 이미 관찰한 그 카드의 실제 URL(view.nav.url) 을 우선 쓴다(2026-10-26) —
   * 페이지 이동 OFF 로 카드마다 다른 페이지에 있거나 반응형 redirect 로 최종 URL 이 달라도 각자 표시. 관찰값이 없으면 currentUrl */
  function getDisplayUrl(view){
    const observed=view&&view.compare&&view.nav&&view.nav.url;
    const source=observed||currentUrl;
    if(!source)return'example.com';
    try{
      const url=new URL(source);
      const path=url.pathname==='/'?'':url.pathname;
      return(url.host+path).slice(0,64);
    }catch(error){return source;}
  }
  /* 주소 텍스트만 갱신(레이아웃 · 밴드 · 배율 재계산 없음) */
  function updateDisplayUrl(view){
    /* 태블릿 Chrome(tablet-chrome) 주소 필드는 실기기 캡처처럼 도메인만 표시(다른 브라우저는 기존 host + path, iframe URL · 이동 로직과 무관) */
    if(view.dom.browserUrl)view.dom.browserUrl.textContent=view.dom.screenWrap.dataset.browser==='tablet-chrome'?getDisplayUrl(view).split('/')[0]:getDisplayUrl(view);
    if(view.dom.tchromeTitle)view.dom.tchromeTitle.textContent=getDisplayUrl(view).split('/')[0];   /* 태블릿 Chrome 활성 탭: 같은 표시 주소의 도메인(iframe 제목은 읽지 않음) */
    if(view.dom.duoUrlTexts)view.dom.duoUrlTexts.forEach(el=>{el.textContent=getDisplayUrl(view);});
  }

  function updateBrowserChrome(view){
    const viewport=getSiteViewport(view);
    const bands=viewport.bands;
    const wrap=view.dom.screenWrap;
    wrap.dataset.browser=bands.styleId||bands.profileId;
    wrap.dataset.platform=bands.platform;
    wrap.dataset.urlPosition=bands.urlPosition;
    wrap.dataset.uiMode=uiMode;
    wrap.style.setProperty('--status-row',bands.status+'px');
    wrap.style.setProperty('--url-top-row',(viewport.overlay?0:viewport.urlTop+(bands.chromeTop||0))+'px');
    wrap.style.setProperty('--url-bottom-row',(viewport.overlay?0:viewport.urlBottom)+'px');
    wrap.style.setProperty('--toolbar-row',(viewport.overlay?0:bands.toolbar)+'px');
    wrap.style.setProperty('--home-row',bands.home+'px');
    wrap.style.setProperty('--url-height',bands.url+'px');
    wrap.style.setProperty('--toolbar-height',bands.toolbar+'px');
    wrap.style.setProperty('--side-left',bands.left+'px');
    wrap.style.setProperty('--side-right',bands.right+'px');
    /* 실측 viewport: iframe(.site_view) 을 그리드 행이 아니라 실측 위치·크기에 절대 배치하고, Safari UI 밴드는 시각 레이어로 그 위에 둔다.
     * 홈 인디케이터 행이 iframe 과 겹치면(가로 — 실측 viewport 가 화면 아래 끝까지) 밴드 배경을 비워 콘텐츠 위 인디케이터만 보이게 한다 */
    const measured=viewport.measured;
    wrap.dataset.viewportModel=measured?'measured':'bands';
    wrap.dataset.homeOverSite=measured&&viewport.top+viewport.height>view.currentHeight-bands.home?'true':'false';
    ['--site-x','--site-y','--site-w','--site-h'].forEach(name=>wrap.style.removeProperty(name));
    if(measured){
      wrap.style.setProperty('--site-x',viewport.left+'px');
      wrap.style.setProperty('--site-y',viewport.top+'px');
      wrap.style.setProperty('--site-w',viewport.width+'px');
      wrap.style.setProperty('--site-h',viewport.height+'px');
    }
    wrap.style.setProperty('--home-indicator-width',(view.frameProfile.homeIndicatorWidth||134)+'px');
    /* 홈 인디케이터 중심: 하단 컷아웃 옆에 놓이는 기기(Flip8 커버) 는 세로에서 homeIndicatorCenter(px), 그 외·가로는 중앙 */
    const indicatorCenter=view.frameProfile.homeIndicatorCenter;
    wrap.style.setProperty('--home-indicator-center',indicatorCenter!=null&&getOrientation(view)==='portrait'?indicatorCenter+'px':'50%');
    /* 하단 시스템 내비: frameProfiles[*].navigation 'buttons'(Android 3버튼) 이면 홈 인디케이터 대신 버튼 3개(세로에서만 — 가로 배치 미확인), 기본은 제스처 */
    wrap.dataset.nav=view.frameProfile.navigation==='buttons'?'buttons':'gesture';
    /* 버튼 위치 지정(navButtons): 하단 컷아웃 옆에 몰려 놓이는 기기(Flip8 커버) 는 중심 x(px) 와 내비 막대 높이를 넣고, 없으면 CSS 기본(가운데 ±101, 밴드 가운데). 기기 전환 시 이전 값이 남지 않게 지운다 */
    const navButtons=view.frameProfile.navButtons;
    ['--nav-recent-x','--nav-home-x','--nav-back-x','--nav-bar-height'].forEach(name=>wrap.style.removeProperty(name));
    if(navButtons&&navButtons.centers){
      ['--nav-recent-x','--nav-home-x','--nav-back-x'].forEach((name,index)=>wrap.style.setProperty(name,navButtons.centers[index]+'px'));
      if(navButtons.barHeight)wrap.style.setProperty('--nav-bar-height',navButtons.barHeight+'px');
    }
    view.dom.bandStatus.hidden=bands.status===0;
    view.dom.bandUrl.hidden=bands.url===0;
    view.dom.bandToolbar.hidden=bands.toolbar===0;
    view.dom.bandHome.hidden=bands.home===0;
    updateDisplayUrl(view);
    wrap.dataset.uiLayout=bands.side?'side':(bands.duoTop?'top':'bars');
    updateStatusBar(view);
    updateSideControls(view,bands);
    updateDuoSafari(view,bands);
    updateKeyboard(view,viewport);
    return viewport;
  }

  /* ------------------------------------------------------------------
   * 가상 키보드 영역 시뮬레이션(2026-10-21)
   * 실제 OS 키보드 · visualViewport 에뮬레이션이 아니다. 기존 사이트 영역(getSiteViewport — 브라우저 밴드 · Safari 실측 · Duo auto/cover 결과) 은 그대로 두고,
   * 그 아래쪽에 사용자 조절 높이의 영역을 놓는다: resize = iframe 높이만 줄임(사이트 innerHeight 감소) · overlay = iframe 그대로, 영역만 덮음.
   * 높이는 모든 기기 공통 CSS px(사용자 조절값) 를 각 화면의 사이트 높이에 맞춰 제한한다 — 회전 · 작은 화면에서는 줄어들고, 저장값은 그대로.
   * ------------------------------------------------------------------ */
  function keyboardApplies(view){
    return keyboardEnabled&&(view.frameProfile&&view.frameProfile.platform)!=='macos';
  }

  /* 화면별 허용 범위: 위로 사이트가 최소 KEYBOARD_SITE_MIN 은 남도록 → 최대 = 사이트 높이 − 120, 최소 = min(80, 최대) */
  function getKeyboardLimits(view,viewport){
    const site=(viewport||getSiteViewport(view)).height;
    const max=Math.max(0,Math.floor(site-KEYBOARD_SITE_MIN));
    return{min:Math.min(KEYBOARD_MIN,max),max,site};
  }

  function getKeyboardInset(view,viewport){
    if(!keyboardApplies(view))return 0;
    const limits=getKeyboardLimits(view,viewport);
    return Math.max(limits.min,Math.min(limits.max,Math.round(keyboardHeight)));
  }

  function updateKeyboard(view,viewport){
    const dom=view.dom;
    if(!dom.kbSim)return;
    const height=getKeyboardInset(view,viewport);
    view.keyboardInset=height;
    if(!height){
      delete dom.siteView.dataset.keyboard;
      dom.siteView.style.removeProperty('--kb-h');
      dom.kbSim.hidden=true;
      return;
    }
    dom.siteView.dataset.keyboard=keyboardMode;
    dom.siteView.style.setProperty('--kb-h',height+'px');
    dom.kbValue.textContent=height+'px · '+(keyboardMode==='resize'?'화면 축소':'겹침')+(height!==Math.round(keyboardHeight)?' (이 화면에 맞춰 제한)':'');
    dom.kbSim.hidden=false;
  }

  function updateAllKeyboards(){
    allViews().forEach(view=>{if(view.dom&&view.dom.siteView)updateKeyboard(view);});
    syncKeyboardControls();
    updateControls();
    visibleViews().forEach(view=>scheduleOcclusionCheck(view,OCCLUSION_RENDER_DELAY));
  }

  function getKeyboardDom(){
    if(!keyboardDom)keyboardDom={btn:document.getElementById('keyboardBtn'),status:document.getElementById('keyboardStatus'),text:document.getElementById('keyboardText'),
      settingsBtn:document.getElementById('keyboardSettingsBtn'),panel:document.getElementById('keyboardSettings'),input:document.getElementById('keyboardHeight'),
      note:document.getElementById('keyboardNote'),modes:Array.from(document.querySelectorAll('input[name="keyboardMode"]'))};
    return keyboardDom;
  }
  let keyboardDom=null;

  /* 버튼 · 푸터 상태 줄 · 설정 패널 표시. 적용 대상(MacBook 이 아닌 화면) 이 없으면 상태 줄을 숨긴다 */
  function syncKeyboardControls(){
    const dom=getKeyboardDom();
    if(!dom.btn)return;
    dom.btn.setAttribute('aria-pressed',keyboardEnabled?'true':'false');
    const views=visibleViews().filter(keyboardApplies);
    const active=keyboardEnabled&&views.length>0;
    dom.status.hidden=!active;
    if(!active)setKeyboardSettingsOpen(false);
    dom.modes.forEach(input=>{input.checked=input.value===keyboardMode;});
    if(document.activeElement!==dom.input)dom.input.value=String(Math.round(keyboardHeight));
    if(!active)return;
    const insets=views.map(view=>view.keyboardInset||0);
    const limited=insets.some(value=>value!==Math.round(keyboardHeight));
    const modeLabel=keyboardMode==='resize'?'화면 축소':'겹침';
    dom.text.textContent='가상 키보드(시뮬레이션) · '+modeLabel+' · '+(viewMode==='compare'?Math.round(keyboardHeight)+'px'+(limited?' (작은 화면은 제한)':''):insets[0]+'px');
    dom.note.textContent=viewMode==='compare'
      ? '모든 비교 기기에 같은 CSS px 를 적용하고, 화면마다 사이트가 '+KEYBOARD_SITE_MIN+'px 이상 남도록 제한합니다(현재 '+insets.join(' · ')+'px).'
      : (limited?'이 화면에서는 '+insets[0]+'px 로 제한해 적용합니다(사이트가 '+KEYBOARD_SITE_MIN+'px 이상 남도록, 저장값 '+Math.round(keyboardHeight)+'px 은 유지). ':'')
        +'실제 OS 키보드가 아닌 사용자 조절값입니다. 키보드 영역 위 손잡이를 끌어서도 바꿀 수 있습니다.';
  }

  function setKeyboardEnabled(enabled){
    keyboardEnabled=Boolean(enabled);
    updateAllKeyboards();
    announce(keyboardEnabled?'가상 키보드 영역 시뮬레이션을 켰습니다. 설정은 화면 아래 상태 줄에 있습니다.':'가상 키보드 영역 시뮬레이션을 껐습니다.');
  }

  function setKeyboardHeight(value,options){
    const number=Number(value);
    if(!Number.isFinite(number))return;
    keyboardHeight=Math.max(KEYBOARD_MIN,Math.min(900,Math.round(number)));
    updateAllKeyboards();
    if(!options||options.save!==false)saveDisplayPreference();
  }

  function setKeyboardSettingsOpen(open,returnFocus){
    const dom=getKeyboardDom();
    if(!dom.panel)return;
    dom.panel.hidden=!open;
    dom.settingsBtn.setAttribute('aria-expanded',open?'true':'false');
    if(open)dom.input.focus();
    else if(returnFocus)dom.settingsBtn.focus();
  }

  function bindKeyboardControls(){
    const dom=getKeyboardDom();
    if(!dom.btn)return;
    dom.btn.addEventListener('click',()=>setKeyboardEnabled(!keyboardEnabled));
    dom.settingsBtn.addEventListener('click',()=>setKeyboardSettingsOpen(dom.panel.hidden));
    dom.modes.forEach(input=>input.addEventListener('change',()=>{if(input.checked&&KEYBOARD_MODES.includes(input.value)){keyboardMode=input.value;updateAllKeyboards();saveDisplayPreference();}}));
    dom.input.addEventListener('change',()=>setKeyboardHeight(dom.input.value));
    dom.input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();setKeyboardHeight(dom.input.value);}});
    [dom.panel,dom.settingsBtn].forEach(el=>el.addEventListener('keydown',event=>{if(event.key==='Escape'&&!dom.panel.hidden){event.preventDefault();setKeyboardSettingsOpen(false,true);}}));
    dom.panel.addEventListener('focusout',event=>{if(!dom.panel.hidden&&event.relatedTarget&&!dom.panel.contains(event.relatedTarget)&&event.relatedTarget!==dom.settingsBtn)setKeyboardSettingsOpen(false);});
    document.addEventListener('pointerdown',event=>{if(!dom.panel.hidden&&!dom.panel.contains(event.target)&&!dom.settingsBtn.contains(event.target))setKeyboardSettingsOpen(false);});
    syncKeyboardControls();
  }

  /* 키보드 영역 위 손잡이 드래그: 화면에 그려진 배율로 나눠 CSS px 로 환산 → 공통 사용자 조절값을 바꾼다(놓을 때 저장) */
  function bindKeyboardDrag(view){
    const handle=view.dom.kbHandle;
    if(!handle)return;
    handle.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;
      event.preventDefault();
      const wrap=view.dom.screenWrap;
      const scale=wrap.getBoundingClientRect().height/wrap.offsetHeight||1;
      const startY=event.clientY,startHeight=view.keyboardInset||keyboardHeight;
      const limits=getKeyboardLimits(view);
      handle.setPointerCapture(event.pointerId);
      const move=moveEvent=>{const next=startHeight-(moveEvent.clientY-startY)/scale;setKeyboardHeight(Math.max(limits.min,Math.min(limits.max,next)),{save:false});};
      const end=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',end);handle.removeEventListener('pointercancel',end);saveDisplayPreference();};
      handle.addEventListener('pointermove',move);
      handle.addEventListener('pointerup',end);
      handle.addEventListener('pointercancel',end);
    });
  }

  /* 측면 컨트롤 열(browserProfiles[*].side, 브라우저 UI 레이어): 코너 클러스터와 같은 세로 축, 클러스터 아래에서 시작.
   * 위 그룹(주소창 스위치) = 뒤로 원형 + 캡슐, 아래 그룹(툴바 스위치) = 캡슐. 항목은 data-item 으로 프로필 목록에 있는 것만 표시 */
  function updateSideControls(view,bands){
    const wrap=view.dom.screenWrap;
    const root=view.dom.sideControls;
    if(!root)return;
    const profile=browserProfiles[bands.profileId];
    const side=bands.side&&profile.side?profile.side:null;
    root.hidden=!side;
    if(!side)return;
    const status=getStatusBarProfile(view);
    const cluster=getClusterGeometry(status);
    const set=(name,value)=>wrap.style.setProperty(name,value+'px');
    set('--side-axis',cluster.axis);
    set('--side-circle',side.circle);
    set('--side-capsule',side.capsule);
    set('--side-pitch',side.pitch);
    set('--side-gap',side.gap);
    set('--side-top',cluster.bottom+side.clusterGap);
    set('--side-bottom',side.bottomMargin);
    wrap.dataset.sideEdge=bands.sideEdge||'right';
    /* 세로 공간 압축(HIG official: "If there's not enough room, controls will collapse into an overflow menu" — 탭바는 단일 컨트롤로 접히고,
     * 툴바 항목은 아래에서부터 넘침 메뉴(…) 로 들어간다). 순서·항목 수만 줄이고 위치 규칙은 유지 */
    const top=showAddressBar?(side.top||[]).slice():[];
    let capsule=showAddressBar?(side.topCapsule||[]).slice():[];
    let bottom=showBottomBar?(side.bottomCapsule||[]).slice():[];
    const available=view.currentHeight-(cluster.bottom+side.clusterGap)-side.bottomMargin;
    const need=()=>top.length*side.circle+Math.max(0,top.length-1)*side.gap+(top.length&&capsule.length?side.gap:0)+capsule.length*side.pitch+(bottom.length&&(top.length||capsule.length)?side.gap:0)+bottom.length*side.pitch;
    let collapsedTabs=false,overflow=false;
    if(need()>available&&bottom.length>1){bottom=bottom.slice(0,1);collapsedTabs=true;}
    while(need()>available&&capsule.length>1){capsule=capsule.slice(0,-1);overflow=true;}
    if(overflow){capsule=capsule.slice(0,-1);capsule.push('more');}   /* 마지막 자리는 넘침 메뉴 */
    const wanted={top,topCapsule:capsule,bottomCapsule:bottom};
    root.querySelectorAll('[data-group]').forEach(group=>{
      const name=group.dataset.group;
      const list=wanted[name]||[];
      group.hidden=list.length===0;
      group.querySelectorAll('[data-item]').forEach(item=>{item.hidden=list.indexOf(item.dataset.item)<0;});
    });
    root.dataset.collapsedTabs=collapsedTabs?'true':'false';
    root.dataset.overflow=overflow?'true':'false';
  }

  /* iPhone Duo Safari 주소 필드 · 상단 가로 Safari(2026-11-09, 실기기 사진 기준 1차 — 브라우저 UI 시각 레이어, iframe 크기와 무관).
   * 외부(side): 측면 열 왼쪽 하단의 별도 주소 필드(주소창 스위치). 내부(top): 상단 툴바 + 주소 필드 + 탭 줄(placeholder), 주소창 스위치 OFF = 작은 도메인 pill.
   * 주소 글자는 getDisplayUrl(view). 탭 줄은 iframe 제목 · 기록과 연결하지 않는다 */
  /* Duo 내부 상단 Safari 시각 UI 의 높이(한 곳에서 계산 — 그리는 높이 --duo-top-h 와 iframe top / height 가 같은 값을 쓴다).
   * 주소창 ON = 툴바 줄 아래 끝(+ 툴바 스위치 ON 이면 간격 + 탭 줄), OFF = 축약 pill 아래 끝. 값은 photo-observed visual chrome approximation(browserProfiles['duo-safari'].top) */
  function getDuoTopChrome(view,profile){
    const top=profile&&profile.top;
    if(!top)return null;
    const center=top.center||getClusterGeometry(getStatusBarProfile(view)).axis;   /* 툴바 줄 · pill 세로 중심 */
    const full=showAddressBar;
    const tabs=full&&showBottomBar;
    /* 주소창 ON = 툴바 줄(원형 · 주소 필드 중 큰 높이) 아래 끝 (+ 탭 줄) + 사이트까지 간격, OFF = pill 아래 끝(pill 디자인 · 계산은 이전과 같음) */
    const rowBottom=center+Math.max(top.row,top.circle||top.row)/2;
    const tabTop=rowBottom+top.tabGap;
    const height=full?(tabs?tabTop+top.tabHeight:rowBottom)+(top.bottomGap||0):center+top.pillHeight/2;
    return{center,full,tabs,tabTop,height};
  }

  function updateDuoSafari(view,bands){
    const dom=view.dom,wrap=dom.screenWrap;
    const profile=browserProfiles[bands.profileId]||{};
    const set=(name,value)=>wrap.style.setProperty(name,value+'px');
    if(dom.duoUrlTexts)dom.duoUrlTexts.forEach(el=>{el.textContent=getDisplayUrl(view);});
    const field=bands.side&&profile.side&&profile.side.urlField;
    if(dom.duoUrl){
      dom.duoUrl.hidden=!(field&&showAddressBar);
      if(field){set('--duo-field-h',field.height);set('--duo-field-inset',field.inset);}
    }
    const top=bands.duoTop&&profile.top;
    if(dom.duoTop)dom.duoTop.hidden=!top;
    if(!top){delete wrap.dataset.duoTop;return;}
    const chrome=getDuoTopChrome(view,profile);
    wrap.dataset.duoTop=chrome.full?'full':'pill';
    set('--duo-top-center',chrome.center);   /* 툴바 줄 세로 중심 = 측면 배치 때 컨트롤 축(가장자리 → 중심) 과 같은 거리(approximation) */
    set('--duo-top-h',chrome.height);        /* 레이어 높이 = iframe 이 시작하는 위치(getBrowserBands().chromeTop 과 같은 값) */
    set('--duo-row',top.row);
    set('--duo-circle',top.circle||top.row);
    set('--duo-circle-gap',top.circleGap||8);
    set('--duo-inset',top.inset);
    set('--duo-slot',top.slot||top.row);
    set('--duo-caps-gap',top.capsuleGap||13);
    set('--duo-status-right',top.statusRight||top.inset);
    set('--duo-status-gap',top.statusGap||8);
    set('--duo-time-w',top.timeWidth||30);
    set('--duo-time-size',top.timeSize||15);
    set('--duo-tab-top',chrome.tabTop);
    set('--duo-tab-h',top.tabHeight);
    set('--duo-tab-gap',top.tabGap);
    set('--duo-tab-inset',top.tabInset);
    set('--duo-pill-h',top.pillHeight);
    wrap.style.setProperty('--duo-url-w',(top.urlWidth*100)+'%');
    if(dom.duoTabs)dom.duoTabs.hidden=!chrome.tabs;
    if(dom.statusCluster&&!showAddressBar)dom.statusCluster.hidden=true;   /* 축약 상태(사진) 에서는 상태 클러스터가 보이지 않는다 */
  }

  /* OS 상태바: 플랫폼 프로필 → 시간·아이콘 순서·배터리 잔량·컷아웃 회피 여백. 밴드 높이는 getBrowserBands() 의 status 값 */
  function getStatusBarProfile(view){
    const frame=view.frameProfile;
    const override=frame.statusBar||{};
    const base=statusBarProfiles[override.profile||override.platform||frame.platform]||statusBarProfiles.generic;
    const merged=Object.assign({},base,override);
    if(base.pill||override.pill)merged.pill=Object.assign({},base.pill,override.pill);
    if(base.ring||override.ring)merged.ring=Object.assign({},base.ring,override.ring);
    return merged;
  }

  /* 코너 클러스터 지오메트리(px): Live Activity 아일랜드(island.state==='live') 가 있으면 shift 만큼 내려온다 */
  function getClusterGeometry(profile){
    const ring=profile.ring||{size:40,stroke:3};
    const island=profile.island&&profile.island.state==='live'?profile.island:null;
    const shift=island?(island.shift||0):0;
    const timeCenter=(profile.timeCenter||0)+shift;
    const ringCenter=(profile.ringCenter||0)+shift;
    const size=ring.size||40;
    return{axis:profile.axis||0,timeCenter,ringCenter,ringSize:size,bottom:ringCenter+size/2,island};
  }

  /* 코너 상태 클러스터(statusBarProfiles[*].layout==='corner') 와 세로 Dynamic Island 렌더. 둘 다 OS UI 레이어(.screen_wrap 안, 컷아웃·브라우저 UI 와 별개).
   * 링 SVG: 아래가 트인 호(arcGap°) + 안쪽 Wi-Fi(기존 아이콘 path 재사용) + 호 틈의 셀룰러 점(링 중심선 원 위, 아래 기준 각도). */
  function updateStatusCluster(view,profile){
    const wrap=view.dom.screenWrap;
    const dom=view.dom;
    const corner=profile.layout==='corner';
    wrap.dataset.statusLayout=corner?'corner':'bar';
    if(dom.statusCluster)dom.statusCluster.hidden=!corner;
    if(dom.dynamicIsland)dom.dynamicIsland.hidden=true;
    if(!corner)return;
    const geometry=getClusterGeometry(profile);
    const ring=profile.ring||{};
    const size=geometry.ringSize,stroke=ring.stroke||3,gap=ring.arcGap||116;
    const set=(name,value)=>wrap.style.setProperty(name,value+'px');
    set('--cluster-axis',geometry.axis);
    set('--cluster-time-y',geometry.timeCenter);
    set('--cluster-time-size',profile.timeSize||16);
    set('--cluster-ring-y',geometry.ringCenter);
    set('--cluster-ring-size',size);
    wrap.dataset.clusterEdge=getControlEdge(view);
    if(dom.clusterTime)dom.clusterTime.textContent=profile.time||'';
    const icons=profile.icons||[];
    if(dom.clusterRing){
      const c=size/2,r=(size-stroke)/2;
      const rad=deg=>deg*Math.PI/180;
      const point=deg=>[(c+r*Math.cos(rad(deg))).toFixed(2),(c+r*Math.sin(rad(deg))).toFixed(2)];
      /* 각도: +x 축 기준 시계 방향(y 아래). 아래 = 90°. 호는 90+gap/2 에서 시작해 위를 지나 90−gap/2 까지(큰 호, 시계 방향) */
      const [x1,y1]=point(90+gap/2),[x2,y2]=point(90-gap/2);
      const svg=dom.clusterRing;
      svg.setAttribute('viewBox','0 0 '+size+' '+size);
      const arc=svg.querySelector('.ring_arc');
      if(arc){arc.setAttribute('d','M'+x1+' '+y1+'A'+r+' '+r+' 0 1 1 '+x2+' '+y2);arc.setAttribute('stroke-width',String(stroke));arc.classList.toggle('is_hidden',icons.indexOf('battery')<0);}
      const dots=svg.querySelector('.ring_dots');
      if(dots){
        const angles=ring.dotAngles||[-31,-10.5,10.5,31];
        const dotR=(ring.dotSize||4)/2;
        dots.replaceChildren(...angles.map(a=>{const [x,y]=point(90+a);const el=document.createElementNS('http://www.w3.org/2000/svg','circle');el.setAttribute('cx',x);el.setAttribute('cy',y);el.setAttribute('r',String(dotR));return el;}));
        dots.classList.toggle('is_hidden',icons.indexOf('cellular')<0);
      }
      const wifi=svg.querySelector('.ring_wifi');
      if(wifi){
        const w=ring.wifiWidth||27,scale=w/17;   /* 기존 Wi-Fi 아이콘 viewBox 17×12 를 확대. 세로 중심은 링 중심보다 10% 위(실측) */
        wifi.setAttribute('transform','translate('+(c-w/2).toFixed(2)+' '+(c-size*.1-6*scale).toFixed(2)+') scale('+scale.toFixed(3)+')');
        wifi.classList.toggle('is_hidden',icons.indexOf('wifi')<0);
      }
    }
    const island=geometry.island;
    if(dom.dynamicIsland){
      dom.dynamicIsland.hidden=!island;
      if(island){set('--island-w',island.width);set('--island-h',island.height);set('--island-top',island.top);}
    }
  }

  function updateStatusBar(view){
    const profile=getStatusBarProfile(view);
    const wrap=view.dom.screenWrap;
    const dom=view.dom;
    wrap.dataset.statusPlatform=profile.platform;
    wrap.dataset.statusCompact=profile.compact?'true':'false';
    const cellularStyle=profile.cellularStyle||'bars';
    wrap.dataset.cellularStyle=cellularStyle;
    wrap.dataset.batteryStyle=profile.batteryStyle||'outline';   /* outline(iOS·표준 Android 외곽선+채움) | pill(One UI 7+ 숫자가 든 알약) */
    if(dom.statusIcons&&dom.statusIcons.cellular)dom.statusIcons.cellular.setAttribute('viewBox',cellularStyle==='bars-thin'?'0 0 11 12':cellularStyle==='bars-wide'?'0 0 19.35 12':'0 0 18 12');   /* One UI 가는 막대는 폭 비율이 다르다 */
    const wifiStyle=profile.wifiStyle||'arcs';   /* arcs(표준 Android·범용) | fan(iOS) | oneui(One UI) */
    wrap.dataset.wifiStyle=wifiStyle;
    if(dom.statusIcons&&dom.statusIcons.wifi)dom.statusIcons.wifi.setAttribute('viewBox',wifiStyle==='oneui'?'0 0 15 11':'0 0 17 12');
    if(dom.statusTime)dom.statusTime.textContent=profile.time||'';
    const icons=profile.icons||[];
    Object.keys(dom.statusIcons||{}).forEach(name=>{
      const icon=dom.statusIcons[name];
      if(!icon)return;
      const index=icons.indexOf(name);
      icon.toggleAttribute('hidden',index<0);   /* SVG 요소는 .hidden 프로퍼티가 없어 속성으로 토글 (.sb_icon[hidden] 규칙) */
      icon.style.order=index<0?'':String(index);
    });
    const level=Math.max(0,Math.min(1,profile.batteryLevel==null?.82:profile.batteryLevel));
    if(dom.batteryFill)dom.batteryFill.setAttribute('width',String(Math.round(19*level*10)/10));
    /* 배터리 % 텍스트(iPadOS 등): 배터리 아이콘 바로 앞, 같은 order */
    if(dom.statusPercent){
      const show=!!profile.batteryText&&icons.indexOf('battery')>=0;
      dom.statusPercent.hidden=!show;
      dom.statusPercent.textContent=show?Math.round(level*100)+'%':'';
      dom.statusPercent.style.order=show?String(icons.indexOf('battery')):'';
    }
    /* One UI 알약 배터리: 숫자가 든 캡슐, 잔량만큼 왼쪽부터 채움(100% 면 전부 채움). SVG 배터리 대신 표시 */
    if(dom.statusPill){
      const pill=profile.batteryStyle==='pill'&&icons.indexOf('battery')>=0;
      const dims=profile.pill||{width:23,height:14,fontSize:9.5};
      dom.statusPill.hidden=!pill;
      dom.statusPill.textContent=pill?String(Math.round(level*100)):'';
      dom.statusPill.style.order=pill?String(icons.indexOf('battery')):'';
      wrap.style.setProperty('--pill-width',dims.width+'px');
      wrap.style.setProperty('--pill-height',dims.height+'px');
      wrap.style.setProperty('--pill-font',dims.fontSize+'px');
      wrap.style.setProperty('--pill-tracking',(dims.letterSpacing||0)+'px');
      wrap.style.setProperty('--battery-level',String(Math.round(level*1000)/10)+'%');
    }
    /* 타이포·간격: 프로필 값 → CSS 변수 (플랫폼별 하드코딩 대신 데이터로) */
    wrap.style.setProperty('--status-gap',(profile.iconGap==null?5:profile.iconGap)+'px');
    if(profile.ink)wrap.style.setProperty('--status-ink-profile',profile.ink);else wrap.style.removeProperty('--status-ink-profile');   /* 전경색(One UI 실기기 #4a4a4a) — 없으면 CSS 기본 #0f172a */
    if(profile.numeric)wrap.style.setProperty('--status-numeric',profile.numeric);else wrap.style.removeProperty('--status-numeric');   /* 숫자 폭(One UI 비례 숫자) — 없으면 tabular-nums */
    wrap.style.setProperty('--status-weight',String(profile.fontWeight||(profile.platform==='ios'?600:500)));
    wrap.style.setProperty('--status-tracking',(profile.letterSpacing==null?(profile.platform==='ios'?-.17:0):profile.letterSpacing)+'px');
    wrap.style.setProperty('--status-battery',String(profile.batteryScale||1));
    wrap.style.setProperty('--status-percent',String(profile.percentScale||.78));   /* 배터리 % 글자 크기(시간 대비): iPad Air 1 · 기본 .78 */
    /* 배터리 % 글자 자간(iPad Air: SF 보다 좁은 Arial 숫자 폭 보정) — 없으면 상태바 공통 자간. 브라우저는 마지막 글자(%) 뒤에도 자간을 더하므로
     * 공통 자간과의 차이만큼 오른쪽 margin 을 빼 %↔배터리 간격(iconGap)이 바뀌지 않게 한다 */
    if(profile.percentLetterSpacing!=null){const base=profile.letterSpacing==null?(profile.platform==='ios'?-.17:0):profile.letterSpacing;wrap.style.setProperty('--status-percent-tracking',profile.percentLetterSpacing+'px');wrap.style.setProperty('--status-percent-trim',(base-profile.percentLetterSpacing)+'px');}
    else{wrap.style.removeProperty('--status-percent-tracking');wrap.style.removeProperty('--status-percent-trim');}
    wrap.style.setProperty('--status-cellular',String(profile.cellularScale||1));
    /* 고정 크기 상태바(iPad): 가로에서도 글꼴·아이콘 크기를 줄이지 않는다 */
    wrap.dataset.statusFixed=profile.fixedSize?'true':'false';
    wrap.dataset.statusLegacy=profile.layout==='legacy'?'true':'false';   /* 홈 버튼형 iPhone: 좌 아이콘 · 중앙 시간 · 우 배터리 */
    wrap.style.setProperty('--status-font',(profile.fontSize||16)+'px');
    wrap.style.setProperty('--status-icon',(profile.iconSize||12)+'px');
    wrap.style.setProperty('--status-wifi',String(profile.wifiScale||1));   /* Wi-Fi 아이콘 높이 비율(iPadOS 는 배터리보다 낮음) */
    /* 세로 중심(centerY, 화면 상단 기준 px): 노치 iPhone 은 노치 아래쪽(26), 아일랜드 iPhone 은 아일랜드 중앙(29.5). 없으면 밴드 중앙.
     * 밴드 높이(H) 안에서 align-items:center 를 유지한 채 padding 으로 중심을 옮긴다: 중심 = H/2 + (padTop − padBottom)/2 */
    const bandHeight=getBrowserBands(view).status;
    const landscapeNow=getOrientation(view)==='landscape';
    const centerY=landscapeNow?profile.centerYLandscape:profile.centerY;
    let padTop=0,padBottom=0;
    if(centerY!=null&&bandHeight>0){
      const shift=centerY-bandHeight/2;
      if(shift>0)padTop=Math.min(bandHeight,shift*2);else padBottom=Math.min(bandHeight,-shift*2);
    }
    wrap.style.setProperty('--status-pad-top',padTop+'px');
    wrap.style.setProperty('--status-pad-bottom',padBottom+'px');
    /* 좌/우 정렬 컷아웃(예: Fold 펼침 우상단 카메라) 과 아이콘이 겹치지 않도록 여백 확보. 가로 모드는 컷아웃이 왼쪽 세로 가장자리라 영향 없음 */
    const cutout=view.frameProfile.cutout;
    const landscape=getOrientation(view)==='landscape';
    let padLeft=profile.padding?profile.padding.left:16;
    let padRight=profile.padding?profile.padding.right:14;
    let bandPadRight=0;   /* URL 바·툴바 내용이 비켜날 오른쪽 여백(측면 컷아웃이 밴드 행과 겹칠 때만) */
    const geometry=cutout&&cutout.type&&cutout.type!=='none'?getCutoutGeometry(view,view.frameProfile,landscape):null;
    if(geometry&&!landscape&&cutout.bottom==null&&profile.avoidCutout!==false){   /* avoidCutout:false = 실기기에서 아이콘이 컷아웃을 비켜 가지 않음(Fold8 펼침 캡처) */
      const extent=(cutout.offset||0)+geometry.box.width+8;
      if(cutout.align==='left')padLeft=Math.max(padLeft,extent);
      if(cutout.align==='right')padRight=Math.max(padRight,extent);
    }else if(geometry&&landscape&&cutout.bottom!=null&&cutout.align==='right'){
      /* 세로 우하단 컷아웃(Flip8 커버 카메라) 은 가로에서 우상단 → 상태바 오른쪽 아이콘과 상단 URL 바 내용이 카메라 열을 비켜난다 */
      const extent=cutout.bottom+geometry.box.width+8;
      padRight=Math.max(padRight,extent);
      bandPadRight=extent;
    }
    /* Android 가로: 상태바 창은 컷아웃 safe-area(letterbox 열) 뒤에서 시작하고 그 안에서 프로필의 기본 여백을 둔다(Android DisplayCutout 규칙 — Galaxy 가로에서 시계가 홀 쪽 코너에 걸리지 않음). 인셋 값 자체는 프레임 safeAreaLandscape */
    if(landscape&&(profile.platform==='android'||profile.platform==='generic')){const bandsNow=getBrowserBands(view);const baseL=profile.padding?profile.padding.left:16,baseR=profile.padding?profile.padding.right:14;if(bandsNow.left>0)padLeft=Math.max(padLeft,bandsNow.left+baseL);if(bandsNow.right>0)padRight=Math.max(padRight,bandsNow.right+baseR);}
    wrap.style.setProperty('--status-pad-left',padLeft+'px');
    wrap.style.setProperty('--status-pad-right',padRight+'px');
    wrap.style.setProperty('--band-pad-right',bandPadRight+'px');
    updateStatusCluster(view,profile);
  }

  /* 주소창 위치 라디오: 주소창이 꺼져 있거나 표시 중인 모든 view 가 가로 모드(상단 고정) 면 비활성 */
  function syncUrlPositionControls(){
    const views=visibleViews();
    const bandsList=views.map(getBrowserBands);
    const locked=bandsList.length>0&&bandsList.every(bands=>bands.urlPositionLocked);
    const disabled=!showAddressBar||locked;
    const position=bandsList.length?bandsList[0].urlPosition:'top';
    elements.urlPositionInputs.forEach(input=>{
      input.checked=input.value===position;
      input.disabled=disabled;
    });
    const sideLocked=locked&&bandsList.every(bands=>bands.urlPositionLockReason==='side');
    const layoutLocked=locked&&bandsList.every(bands=>bands.urlPositionLockReason==='safari-layout');
    /* 위치를 사용자가 고를 수 없는 배치(Safari 실측 탭 레이아웃 · iPhone Duo 측면 컨트롤) 만 보이는 화면에서는 비활성 버튼 대신 그룹을 숨긴다(2026-11-09).
     * 실측 기기는 가로에서도 같은 레이아웃이 위치를 정하므로 회전해도 숨긴 채 둔다 — 라디오 값 · 잠금 · urlBarPosition 계산은 그대로 */
    const positionHidden=locked&&views.every((view,index)=>hasMeasuredViewport(view)||bandsList[index].urlPositionLockReason==='side'||bandsList[index].urlPositionLockReason==='duo-top');
    elements.urlPositionControls.hidden=positionHidden;
    elements.browserControls.dataset.position=positionHidden?'hidden':'shown';
    elements.urlPositionControls.title=sideLocked?'iPhone Duo 외부 화면 Safari 는 주소 필드가 측면 열 옆 하단에 고정됩니다.':(layoutLocked?'주소창 위치는 Safari 상세 설정의 탭 레이아웃(하단형 Compact · 상단형 Top) 을 따릅니다.':(locked?'가로 모드에서는 주소창이 상단에 고정됩니다.':(showAddressBar?'':'주소창을 켜면 위치를 바꿀 수 있습니다.')));
    syncSafariControls(views);
  }

  /* Safari(iPhone Duo) 측면 · 내부 상단 레이아웃 view 인지 — viewport-fit 만 쓰는 상태(Duo 내부 화면 회전 = 표준 바 상태는 제외) */
  function isSideLayoutView(view){
    const profileId=resolveBrowserId(view);
    const layout=getUiLayout(view,browserProfiles[profileId]);
    return layout==='side'||layout==='top';
  }

  /* Safari 탭 레이아웃 · viewport-fit: 표시 중인 view 중 실측 viewport 데이터가 있는 기기(현재 iPhone 18 Pro + Safari) 가 있을 때 보인다.
   * iPhone Duo 측면 레이아웃만 있으면 viewport-fit 만 보이고 탭 레이아웃(Compact / Top) 은 숨긴다.
   * 2026-11-09: 같은 조건으로 "Safari 상세 설정" 버튼만 보이고, 두 설정은 그 버튼의 popover(#safariControls) 안에 있다 */
  function syncSafariControls(views){
    const measured=views.some(hasMeasuredViewport);
    const visible=measured||views.some(isSideLayoutView);
    elements.safariDetailBtn.hidden=!visible;
    if(!visible&&!elements.safariControls.hidden)setSafariDetailOpen(false);
    document.getElementById('safariLayoutField').hidden=!measured;
    elements.browserControls.dataset.safari=visible?'true':'false';
    elements.safariLayoutInputs.forEach(input=>{input.checked=input.value===safariLayout;});
    elements.viewportFitInputs.forEach(input=>{input.checked=input.value===viewportFit;});
  }

  function renderBrowserOptions(){
    const view=getControlView();
    const compare=viewMode==='compare';
    const platform=view.frameProfile.platform||'any';
    const currentId=resolveBrowserId(view);
    const fragment=document.createDocumentFragment();
    Object.keys(browserProfiles).forEach(id=>{
      if(!profileFitsPlatform(id,platform,view))return;
      const option=document.createElement('option');
      option.value=id;
      option.textContent=browserProfiles[id].label;
      option.selected=id===currentId;
      fragment.appendChild(option);
    });
    elements.browserSelect.replaceChildren(fragment);
    elements.browserSelect.value=currentId;
    /* 다중 비교에서는 플랫폼이 섞이므로 선택을 막고, 단일 보기에서 고른 플랫폼별 브라우저(browserByPlatform) 가 그대로 적용된다 */
    elements.browserSelect.disabled=compare;
    elements.browserSelect.title=compare?'브라우저는 단일 보기에서 선택합니다. 플랫폼별 선택이 비교 기기에도 적용됩니다.':'';
  }

  /* ------------------------------------------------------------------
   * 배율
   * ------------------------------------------------------------------ */
  function clampScalePercent(value){
    const number=Number(value);
    if(!isFinite(number))return null;
    const stepped=Math.round(number/SCALE_STEP)*SCALE_STEP;
    return Math.min(SCALE_MAX,Math.max(SCALE_MIN,stepped));
  }
  function setManualScale(percent,options){
    const clamped=clampScalePercent(percent);
    if(clamped==null){syncScaleControls();return false;}
    manualScale=clamped/100;
    scaleMode='manual';
    updateAllScales();
    saveDisplayPreference();
    if(!options||options.announce!==false)announce('미리보기 표시 배율 '+clamped+'% (기기 CSS 1:1 기준)');
    return true;
  }
  function setScaleMode(mode){
    scaleMode=mode;
    updateAllScales();
    saveDisplayPreference();
    announce(mode==='fit'?'화면 맞춤 배율 '+Math.round(getControlView().scale*100)+'%':'실기기 근사 배율 '+Math.round(getControlView().scale*100)+'%');
  }
  function syncScaleControls(){
    const view=getControlView();
    const hasDeviceScale=Boolean(getPhysicalScale(view));
    elements.scaleDeviceBtn.disabled=!hasDeviceScale;
    if(scaleMode==='device'&&!hasDeviceScale)scaleMode='fit';
    elements.scaleFitBtn.setAttribute('aria-pressed',scaleMode==='fit'?'true':'false');
    elements.scaleDeviceBtn.setAttribute('aria-pressed',scaleMode==='device'?'true':'false');
    /* 입력 필드는 현재 유효 배율을 보여준다(맞춤·실기기 모드는 계산값, 수동 모드는 지정값). 편집 중에는 덮어쓰지 않는다 */
    if(document.activeElement!==elements.scaleInput){
      const current=scaleMode==='manual'?manualScale:view.scale;
      elements.scaleInput.value=String(Math.round(current*100));
    }
    const percent=Math.round((scaleMode==='manual'?manualScale:view.scale)*100);
    elements.scaleDownBtn.disabled=percent<=SCALE_MIN;
    elements.scaleUpBtn.disabled=percent>=SCALE_MAX;
  }

  function getStagePadding(){
    const style=getComputedStyle(elements.previewStage);
    const read=name=>parseFloat(style.getPropertyValue(name))||0;
    return{x:read('padding-left')+read('padding-right'),y:read('padding-top')+read('padding-bottom')};
  }

  /* '맞춤' 배율의 기준 영역: 단일 보기는 스테이지 전체, 비교 카드는 자기 grid 셀 폭 × (스테이지 높이 − 카드 헤더) */
  function getFitArea(view){
    const padding=getStagePadding();
    /* 스테이지 높이는 콘텐츠에 따라 늘어나므로(페이지 스크롤) 그대로 쓰면 배율이 자기 자신을 참조해 진동한다.
     * 뷰포트 안에 보이는 높이(스테이지 top ~ 창 아래 여백) 로 상한을 둔다. */
    const stageTop=elements.previewStage.getBoundingClientRect().top;
    const viewportLimit=window.innerHeight-stageTop-56;
    const stageHeight=Math.max(300,Math.min(elements.previewStage.clientHeight,viewportLimit)-padding.y);
    if(view.compare){
      const cell=(view.dom.body.clientWidth||(elements.previewStage.clientWidth-padding.x))-12;   /* .compare_body 좌우 padding 6px */
      const head=view.dom.head?view.dom.head.offsetHeight:0;
      return{width:Math.max(160,cell),height:Math.max(240,stageHeight-head-12)};
    }
    return{width:Math.max(220,elements.previewStage.clientWidth-padding.x),height:stageHeight};
  }

  function updateScale(view){
    /* 셸(바디) 바깥에 보이는 힌지 커버(스파인) 만큼 mount 를 넓히고 셸을 그만큼 밀어 잘리지 않게 한다 */
    const extent=view.hingeExtent||{top:0,right:0,bottom:0,left:0};
    /* 셸 바깥 크기 = 화면 + 프레임 + 셸 border 1px × 2(styles.css .device_shell 과 같은 계산) + 힌지 커버 */
    const SHELL_BORDER=2;
    const frameWidth=view.currentWidth+view.frameInsets.left+view.frameInsets.right+SHELL_BORDER+extent.left+extent.right;
    const frameHeight=view.currentHeight+view.frameInsets.top+view.frameInsets.bottom+SHELL_BORDER+extent.top+extent.bottom;
    const physical=getPhysicalScale(view);
    const mode=scaleMode==='device'&&!physical?'fit':scaleMode;
    let scale=1;
    if(mode==='fit'){
      const area=getFitArea(view);
      scale=Math.min(1,area.width/frameWidth,area.height/frameHeight);
      scale=Math.max(view.compare?.12:.18,scale);
    }else if(mode==='device'){
      scale=physical||1;
    }else if(mode==='manual'){
      scale=manualScale;   /* 창 크기·기기·회전과 무관하게 사용자가 지정한 값 유지 */
    }
    view.scale=scale;
    view.dom.shell.style.setProperty('--preview-scale',String(scale));
    view.dom.shell.style.left=extent.left?Math.round(extent.left*scale)+'px':'';
    view.dom.shell.style.top=extent.top?Math.round(extent.top*scale)+'px':'';
    view.dom.mount.style.width=Math.ceil(frameWidth*scale)+'px';    /* 올림: 변환된 셸이 mount 를 넘지 않게 */
    view.dom.mount.style.height=Math.ceil(frameHeight*scale)+'px';
  }

  /* 풀페이지 스크린샷 중에는 배율을 다시 계산하지 않는다 — 공유 안내 막대로 스테이지가 줄어 화면 맞춤 배율이 애니메이션되면
   * Chrome 이 변환된 iframe 을 예전 배율로 그린 채(흐림 · 1~3행 어긋남) 남는 경우가 있다(실측). 끝나면 한 번 다시 맞춘다 */
  let captureScaleHold=false;
  function updateAllScales(){
    if(captureScaleHold)return;
    syncScaleControls();
    visibleViews().forEach(updateScale);
    syncScaleControls();   /* 계산된 배율을 입력 필드·±버튼 상태에 반영 */
  }

  /* ------------------------------------------------------------------
   * 프레임·컷아웃·힌지 렌더
   * ------------------------------------------------------------------ */
  function updateFrame(view){
    const profile=getFrameProfile(view);
    const landscape=getOrientation(view)==='landscape';
    const insets=landscape?rotateInsets(profile):{top:profile.top,right:profile.right,bottom:profile.bottom,left:profile.left};
    view.frameProfile=profile;
    view.frameInsets=insets;
    const shell=view.dom.shell;
    shell.dataset.frame=profile.id;
    shell.dataset.orientation=landscape?'landscape':'portrait';
    shell.style.setProperty('--frame-top',insets.top+'px');
    shell.style.setProperty('--frame-right',insets.right+'px');
    shell.style.setProperty('--frame-bottom',insets.bottom+'px');
    shell.style.setProperty('--frame-left',insets.left+'px');
    shell.dataset.family=profile.family||'neutral';
    shell.style.setProperty('--ring',(profile.ring==null?4:profile.ring)+'px');
    updateShape(view,profile,landscape,insets);
    updateFrameDetails(view,profile,landscape,insets);
    updateHingeBody(view,profile,landscape);
    updateCutout(view,profile,landscape);
    updateSafeGuides(view);
  }

  /* 힌지 커버(frameProfiles[*].hingeBody): 바디·디스플레이·접힘선과 별개 레이어.
   *   spine : 접힌 북타입에서 패널(셸) 바깥 힌지 쪽에 보이는 스파인. side 는 세로 기준이며 가로는 반시계 규칙(left→bottom, bottom→right, right→top, top→left).
   *           셸 바깥에 그려지므로 view.hingeExtent 로 mount 크기·셸 위치에 반영한다(updateScale).
   *   seam  : 펼침 상태에서 접힘선 양끝 테두리에 보이는 접합선. 위치는 hinge_line 과 같은 --hinge-position 을 쓴다. */
  function updateHingeBody(view,profile,landscape){
    const shell=view.dom.shell;
    const body=profile.hingeBody||null;
    const extent={top:0,right:0,bottom:0,left:0};
    const rotateSide={left:'bottom',bottom:'right',right:'top',top:'left'};
    shell.dataset.hingeBody=body?body.type:'none';
    if(body&&body.type==='spine'){
      const side=landscape?rotateSide[body.side||'left']:(body.side||'left');
      extent[side]=body.width||0;
      shell.dataset.hingeBodySide=side;
      shell.style.setProperty('--hinge-body-w',(body.width||0)+'px');
      shell.style.setProperty('--hinge-body-inset',(body.inset||0)+'px');
      shell.style.setProperty('--hinge-body-r',(body.radius||0)+'px');
    }else{
      delete shell.dataset.hingeBodySide;
      shell.style.setProperty('--hinge-body-w','0px');
      shell.style.setProperty('--hinge-body-inset','0px');
      shell.style.setProperty('--hinge-body-r','0px');
    }
    shell.style.setProperty('--hinge-seam',(body&&body.type==='seam'?body.size||3:0)+'px');
    view.hingeExtent=extent;
  }

  /* 전면 하드웨어 디테일(홈 버튼·스피커·카메라·센서): frameProfiles[*].controls 값을 CSS 변수로. 위치는 세로 기준이며 가로 배치는 CSS 가 반시계 규칙으로 옮긴다 */
  function updateFrameDetails(view,profile,landscape,insets){
    const shell=view.dom.shell;
    const controls=profile.controls||{};
    const set=(name,value)=>shell.style.setProperty(name,value+'px');
    /* 세로 기준 변(edge) → 현재 방향의 변. 반시계 90°: top→left, right→top, bottom→right, left→bottom */
    const rotateEdge={top:'left',right:'top',bottom:'right',left:'bottom'};
    const edgeFor=edge=>landscape?rotateEdge[edge]||edge:edge;
    /* 세로 기준 바디 크기(px). 가로에서는 현재 폭·높이가 서로 바뀌어 있다 */
    const bodyWidth=view.currentWidth+insets.left+insets.right,bodyHeight=view.currentHeight+insets.top+insets.bottom;
    const pw=landscape?bodyHeight:bodyWidth;
    /* 변을 따라 잰 시작 위치(세로 기준: top/bottom 은 왼쪽에서, left/right 는 위에서) 를 현재 방향으로 변환. (x,y)→(y, W−x) 규칙 */
    const startFor=(edge,start,length)=>{
      if(!landscape)return start;
      if(edge==='top'||edge==='bottom')return pw-start-length;   /* 상단 변 → 왼쪽 변(위에서), 하단 변 → 오른쪽 변(위에서) */
      return start;                                               /* 오른쪽 변 → 상단 변(왼쪽에서), 왼쪽 변 → 하단 변(왼쪽에서) */
    };
    const home=controls.homeButton;
    shell.dataset.homeButton=home?'true':'false';
    if(home){set('--home-size',home.size);set('--home-ring',home.ring==null?3:home.ring);set('--home-bottom',home.bottom);}
    const speaker=controls.speaker;
    shell.dataset.speaker=speaker?'true':'false';
    if(speaker){set('--speaker-w',speaker.width);set('--speaker-h',speaker.height);set('--speaker-top',speaker.top);}
    const camera=controls.camera;
    shell.dataset.camera=camera?'true':'false';
    shell.dataset.cameraEdge=camera&&camera.edge?camera.edge:'top';   /* top(상단 베젤, 기존) | right/left(긴 변 베젤 중앙선) */
    /* 긴 변 카메라의 바디 가장자리 → 중심 거리(inset). 생략 시 그 변 베젤의 절반(세로 기준 right/left 인셋) */
    const edgeInset=edge=>edge==='left'?insets.left:insets.right;   /* 세로 기준 인셋: 가로에서는 insets 가 이미 회전돼 있으므로 아래에서 되돌린다 */
    const portraitInset=edge=>landscape?(edge==='left'?insets.bottom:insets.top):edgeInset(edge);
    if(camera){set('--camera-size',camera.size);set('--camera-top',camera.top||0);set('--camera-x',camera.offsetX||0);set('--camera-offset',camera.offset||0);
      set('--camera-inset',camera.inset!=null?camera.inset:portraitInset(camera.edge||'right')/2);}
    const sensor=controls.sensor;
    shell.dataset.sensor=sensor?'true':'false';
    shell.dataset.sensorEdge=sensor&&sensor.edge?sensor.edge:'top';
    if(sensor){set('--sensor-size',sensor.size);set('--sensor-top',sensor.top||0);set('--sensor-offset',sensor.offset||0);
      set('--sensor-inset',sensor.inset!=null?sensor.inset:portraitInset(sensor.edge||'right')/2);}
    /* 데이터 기반 측면 키(controls.keys): 있으면 family 기본 위치 대신 변·시작·길이로 놓는다. type 별 요소: volume → .key_volume, 두 번째 volume → .key_volume_b, power → .key_power, action(iPhone 액션 버튼) · mute(무음 스위치) → .key_action */
    const keys=Array.isArray(controls.keys)?controls.keys:null;
    shell.dataset.keys=keys?'custom':'family';
    const keyElements={volume:[view.dom.keyVolume,view.dom.keyVolumeB],power:[view.dom.keyPower],action:[view.dom.keyAction],mute:[view.dom.keyAction]};   /* mute(iPhone SE 무음 스위치) 는 action(18 Pro 액션 버튼) 과 같은 렌더 슬롯을 쓰고 데이터 의미만 구분 */
    const used=new Set();
    if(keys)keys.forEach(key=>{
      const pool=keyElements[key.type]||[];
      const el=pool.find(candidate=>candidate&&!used.has(candidate));
      if(!el)return;
      used.add(el);
      el.dataset.edge=edgeFor(key.edge||'right');
      el.style.setProperty('--key-start',startFor(key.edge||'right',key.start||0,key.length||0)+'px');
      el.style.setProperty('--key-length',(key.length||0)+'px');
      if(typeof key.protrusion==='number')el.style.setProperty('--key-thick',(key.protrusion+1)+'px');else el.style.removeProperty('--key-thick');   /* 두께 = 돌출 + 셸 border 1px */
    });
    [view.dom.keyVolume,view.dom.keyVolumeB,view.dom.keyPower,view.dom.keyAction].forEach(el=>{if(el&&!used.has(el)){delete el.dataset.edge;el.style.removeProperty('--key-start');el.style.removeProperty('--key-length');el.style.removeProperty('--key-thick');}});
    /* 커넥터 슬롯(controls.port): 세로 기준 변 중앙 */
    const port=controls.port;
    shell.dataset.port=port?edgeFor(port.edge||'bottom'):'none';
    if(port){set('--port-w',port.width||40);set('--port-h',port.height||3);}
  }

  /* ------------------------------------------------------------------
   * 형상: 바디 코너(radius) · 디스플레이 코너(screenRadius) · 듀얼 패널 마스크(display.split)
   * radius 값은 숫자(px) | {ratio}(짧은 변 대비) | {tl,tr,br,bl} 를 받고, 가로 모드는 코너를 반시계로 돌린다.
   * ------------------------------------------------------------------ */
  function resolveRadiusValue(value,shortSide){
    if(value==null)return 0;
    if(typeof value==='number')return Math.max(0,value);
    if(typeof value==='object'&&typeof value.ratio==='number')return Math.max(0,Math.round(shortSide*value.ratio));
    return 0;
  }

  function resolveCorners(value,width,height,landscape){
    const shortSide=Math.min(width,height);
    let corners;
    if(value&&typeof value==='object'&&('tl' in value||'tr' in value||'br' in value||'bl' in value)){
      corners={tl:resolveRadiusValue(value.tl,shortSide),tr:resolveRadiusValue(value.tr,shortSide),br:resolveRadiusValue(value.br,shortSide),bl:resolveRadiusValue(value.bl,shortSide)};
    }else{
      const all=resolveRadiusValue(value,shortSide);
      corners={tl:all,tr:all,br:all,bl:all};
    }
    /* 반시계 90° 회전: 우상단 → 좌상단, 좌상단 → 좌하단, 좌하단 → 우하단, 우하단 → 우상단 */
    if(landscape)corners={tl:corners.tr,tr:corners.br,br:corners.bl,bl:corners.tl};
    return corners;
  }

  /* 코너별 둥근 사각형 path (clip-path 용) */
  function roundedRectPath(x,y,w,h,r){
    const c={tl:Math.min(r.tl,w/2,h/2),tr:Math.min(r.tr,w/2,h/2),br:Math.min(r.br,w/2,h/2),bl:Math.min(r.bl,w/2,h/2)};
    return 'M'+(x+c.tl)+' '+y+
      'H'+(x+w-c.tr)+'A'+c.tr+' '+c.tr+' 0 0 1 '+(x+w)+' '+(y+c.tr)+
      'V'+(y+h-c.br)+'A'+c.br+' '+c.br+' 0 0 1 '+(x+w-c.br)+' '+(y+h)+
      'H'+(x+c.bl)+'A'+c.bl+' '+c.bl+' 0 0 1 '+x+' '+(y+h-c.bl)+
      'V'+(y+c.tl)+'A'+c.tl+' '+c.tl+' 0 0 1 '+(x+c.tl)+' '+y+'Z';
  }

  /* 원 path. ccw=true 면 반시계(둥근 사각형 안의 홀용, nonzero 규칙) */
  function circlePath(cx,cy,r,ccw){
    const f=ccw?0:1;
    return 'M'+(cx-r)+' '+cy+'A'+r+' '+r+' 0 1 '+f+' '+(cx+r)+' '+cy+'A'+r+' '+r+' 0 1 '+f+' '+(cx-r)+' '+cy+'Z';
  }

  /* 컷아웃 기하(현재 방향 px). 세로 기준으로 계산한 뒤 가로는 반시계 90° 회전: (x,y) → (y, W−x).
   *   box     : 컷아웃 상자(left/top/width/height). 세로 위치는 cutout.top(위 가장자리 거리) 또는 cutout.bottom(아래 가장자리 거리)
   *   circles : dual-hole 의 렌즈·플래시 원(디스플레이 홀·하드웨어 공통). 세로 [플래시][렌즈][렌즈] 왼→오, 가로에서는 위→아래 [렌즈][렌즈][플래시] */
  function getCutoutGeometry(view,profile,landscape){
    const cutout=profile.cutout&&profile.cutout.type&&profile.cutout.type!=='none'?profile.cutout:null;
    if(!cutout)return null;
    const pw=landscape?view.currentHeight:view.currentWidth;   /* 세로 기준 화면 크기 */
    const ph=landscape?view.currentWidth:view.currentHeight;
    const dual=cutout.type==='dual-hole';
    const lens=dual?cutout.lens||44:0;
    const lensGap=dual?(cutout.lensGap==null?4:cutout.lensGap):0;
    const flash=dual?cutout.flash||0:0;
    const flashGap=dual&&flash?(cutout.flashGap==null?6:cutout.flashGap):0;
    const parts={lens,lensGap,flash,flashGap,ring:dual?(cutout.ring==null?4:cutout.ring):0};
    const sideEdge=cutout.edge==='right'||cutout.edge==='left';   /* 긴 변(세로 기준 좌우 베젤) 컷아웃: depth × length, 변 중앙 + offset */
    const width=sideEdge?cutout.depth||0:dual?flash+flashGap+lens*2+lensGap:cutout.width;
    const height=sideEdge?cutout.length||0:dual?lens:cutout.height;
    const offset=cutout.offset||0;
    const left=sideEdge?(cutout.edge==='right'?pw-width:0):cutout.align==='left'?offset:cutout.align==='right'?pw-offset-width:(pw-width)/2;
    const top=sideEdge?(ph-height)/2+offset:cutout.bottom!=null?ph-cutout.bottom-height:(cutout.top||0);
    const circles=[];
    if(dual){
      const cy=top+height/2;
      if(flash)circles.push({cx:left+flash/2,cy,r:flash/2,kind:'flash'});
      circles.push({cx:left+flash+flashGap+lens/2,cy,r:lens/2,kind:'lens'});
      circles.push({cx:left+flash+flashGap+lens+lensGap+lens/2,cy,r:lens/2,kind:'lens'});
    }
    if(!landscape)return{box:{left,top,width,height},circles,parts};
    const rot=(x,y)=>({x:y,y:pw-x});
    const a=rot(left,top),b=rot(left+width,top+height);
    return{box:{left:Math.min(a.x,b.x),top:Math.min(a.y,b.y),width:height,height:width},
      circles:circles.map(c=>{const p=rot(c.cx,c.cy);return{cx:p.x,cy:p.y,r:c.r,kind:c.kind};}),parts};
  }

  function updateShape(view,profile,landscape,insets){
    const shell=view.dom.shell;
    const wrap=view.dom.screenWrap;
    const width=view.currentWidth,height=view.currentHeight;
    const bodyWidth=width+insets.left+insets.right;
    const bodyHeight=height+insets.top+insets.bottom;
    const body=resolveCorners(profile.radius,bodyWidth,bodyHeight,landscape);
    const screen=resolveCorners(profile.screenRadius,width,height,landscape);
    /* 글래스 베젤 코너: 프로필 glassRadius 가 있으면 실측값, 없으면 CSS 기본(바디 − 링, 동심 가정) */
    const glass=profile.glassRadius!=null?resolveCorners(profile.glassRadius,bodyWidth,bodyHeight,landscape):null;
    ['tl','tr','br','bl'].forEach(corner=>{
      shell.style.setProperty('--body-'+corner,body[corner]+'px');
      shell.style.setProperty('--screen-'+corner,screen[corner]+'px');
      if(glass)shell.style.setProperty('--glass-'+corner,glass[corner]+'px');else shell.style.removeProperty('--glass-'+corner);
    });
    /* 디스플레이 마스크(display.mask:'holes'): 코너별 둥근 사각형에서 컷아웃 홀(렌즈·플래시) 을 뺀 실제 가시 영역. 홀은 반시계 서브패스라 nonzero 규칙으로 뚫린다.
     * 하드웨어(.screen_cutout) 는 .screen_wrap 바깥 별개 레이어라 홀 위에 그대로 그려진다 */
    const holes=profile.display&&profile.display.mask==='holes'?getCutoutGeometry(view,profile,landscape):null;
    /* 듀얼 디스플레이: 두 패널을 하나의 clip-path 로 마스킹 → 상태바·브라우저 UI·iframe 모두 같은 마스크 안에서 정렬, 분리 영역은 바디가 보인다 */
    const split=profile.display&&profile.display.split;
    if(holes&&holes.circles.length){
      const path=roundedRectPath(0,0,width,height,screen)+holes.circles.map(c=>circlePath(c.cx,c.cy,c.r,true)).join('');
      wrap.style.clipPath='path("'+path+'")';
      delete shell.dataset.split;
    }else if(split){
      const axis=landscape?(split.axis==='vertical'?'horizontal':'vertical'):split.axis;
      const gap=split.gap||12;
      const inner=split.panelRadius==null?8:split.panelRadius;
      let path;
      if(axis==='vertical'){
        const panel=(width-gap)/2;
        path=roundedRectPath(0,0,panel,height,{tl:screen.tl,tr:inner,br:inner,bl:screen.bl})+roundedRectPath(panel+gap,0,panel,height,{tl:inner,tr:screen.tr,br:screen.br,bl:inner});
      }else{
        const panel=(height-gap)/2;
        path=roundedRectPath(0,0,width,panel,{tl:screen.tl,tr:screen.tr,br:inner,bl:inner})+roundedRectPath(0,panel+gap,width,panel,{tl:inner,tr:inner,br:screen.br,bl:screen.bl});
      }
      wrap.style.clipPath='path("'+path+'")';
      shell.dataset.split=axis;
      shell.style.setProperty('--split-gap',gap+'px');
    }else{
      wrap.style.clipPath='';
      delete shell.dataset.split;
    }
  }

  /* 컷아웃 위치는 현재 화면 크기 기준 px 로 계산(getCutoutGeometry). 가로는 세로 기준값을 반시계 90° 회전:
   * 상단 가장자리 → 왼쪽 가장자리, 우상단 모서리 → 좌상단 모서리, 좌상단 모서리 → 좌하단 모서리, 우하단 모서리(cutout.bottom) → 우상단 모서리.
   * .screen_cutout 은 .screen_wrap(디스플레이 마스크) 바깥의 하드웨어 레이어라 CSS 가 --frame-left/top 을 더해 화면 좌표에 놓는다 */
  function updateCutout(view,profile,landscape){
    const shell=view.dom.shell;
    const cutout=profile.cutout&&profile.cutout.type&&profile.cutout.type!=='none'?profile.cutout:null;
    shell.dataset.cutout=cutout?cutout.type:'none';
    if(!cutout)return;
    const geometry=getCutoutGeometry(view,profile,landscape);
    const box=geometry.box;
    /* 컷아웃이 붙은 변(현재 방향): 세로 기준 top(기본) | right | left → 가로는 반시계 규칙(top→left, right→top, left→bottom). CSS 가 노치 곡률 방향에 쓴다 */
    const rotateEdge={top:'left',right:'top',bottom:'right',left:'bottom'};
    const edge=cutout.edge||'top';
    shell.dataset.cutoutEdge=landscape?rotateEdge[edge]:edge;
    shell.dataset.cutoutShape=cutout.shape||'default';
    shell.style.setProperty('--cutout-width',Math.round(box.width)+'px');
    shell.style.setProperty('--cutout-height',Math.round(box.height)+'px');
    shell.style.setProperty('--cutout-left',Math.round(box.left)+'px');
    shell.style.setProperty('--cutout-top',Math.round(box.top)+'px');
    if(cutout.type==='dual-hole'){
      const parts=geometry.parts;
      shell.style.setProperty('--lens-size',parts.lens+'px');
      shell.style.setProperty('--lens-ring',parts.ring+'px');
      shell.style.setProperty('--lens-gap',parts.lensGap+'px');
      shell.style.setProperty('--flash-size',parts.flash+'px');
      shell.style.setProperty('--flash-gap',parts.flashGap+'px');
    }
  }

  /* safe-area "가이드 표시" 전용 인셋(2026-09-23). 데이터(frameProfiles.safeArea) 는 건드리지 않는다.
   * 펀치홀 Android 는 safeArea.top 이 곧 홀 하단(컷아웃 경계) 이라 가이드 선이 원형 카메라에 정확히 접해 — 안티앨리어싱 때문에 — 떠 보인다.
   * iPhone 은 노치·아일랜드 아래로 safe-area 가 더 내려와(예: 18 Pro 아일랜드 하단 48 < safe 62) 자연스러운 여백이 생기므로, 같은 상태를 만들어 준다:
   *   세로  guide.top  = max(safeArea.top, statusBarHeight)            (= 홀 하단 + One UI 상태바 여백)
   *   가로  guide.left = safeAreaLandscape.left + 세로와 같은 보호 여백 (statusBarHeight − safeArea.top)
   * 사이트 뷰포트·브라우저 밴드 높이·가로 sideInset(letterbox) 은 모두 getSafeArea() 원본을 그대로 쓴다 — 이 값은 .safe_guides 표시에만 쓰인다. */
  function getSafeGuide(view){
    const safe=getSafeArea(view);
    /* 실측 viewport 의 가로 viewport-fit auto(widthMode 'safe'): 폭 자체가 safe-area 를 뺀 750 이고 env(safe-area-inset-left/right) 는 0(실측) → 좌우 가이드를 다시 표시하지 않는다.
     * cover('full') 는 iframe 이 화면 전체 874 이고 좌우 62 가 viewport 안쪽 값이라 기존처럼 화면 가장자리에서 62 를 표시 */
    const measured=getBrowserBands(view).measured;
    if(measured&&measured.widthMode==='safe')return Object.assign({},safe,{left:0,right:0});
    const profile=view.frameProfile;
    const cutout=profile.cutout;
    if(!cutout||cutout.type!=='hole'||!profile.safeArea||profile.statusBarHeight==null)return safe;
    const margin=profile.statusBarHeight-profile.safeArea.top;   /* 홀 하단 → 상태바 창 하단(콘텐츠 시작) 여백 */
    if(!(margin>0))return safe;
    return getOrientation(view)==='portrait'
      ? Object.assign({},safe,{top:Math.max(safe.top,profile.statusBarHeight)})
      : Object.assign({},safe,{left:safe.left+margin});
  }

  function updateSafeGuides(view){
    const safe=getSafeGuide(view);
    const shell=view.dom.shell;
    shell.dataset.safeGuide=safeAreaGuide?'true':'false';
    shell.style.setProperty('--safe-top',safe.top+'px');
    shell.style.setProperty('--safe-right',safe.right+'px');
    shell.style.setProperty('--safe-bottom',safe.bottom+'px');
    shell.style.setProperty('--safe-left',safe.left+'px');
  }

  function updateHinge(view){
    const state=getState(view);
    let hinge=state&&state.hinge?state.hinge:'none';
    if(view.frameProfile.display&&view.frameProfile.display.split)hinge='none';   /* 듀얼 패널은 분리 영역(바디) 이 경계 역할 */
    if(view.rotated&&hinge==='vertical')hinge='horizontal';
    else if(view.rotated&&hinge==='horizontal')hinge='vertical';
    view.dom.shell.dataset.hinge=hinge;
    view.dom.shell.style.setProperty('--hinge-size',(state&&state.hingeSize?state.hingeSize:2)+'px');
    view.dom.shell.style.setProperty('--hinge-position',(state&&state.hingePosition?state.hingePosition:50)+'%');
  }

  /* ------------------------------------------------------------------
   * URL
   * ------------------------------------------------------------------ */
  function normalizeUrl(value){
    const input=value.trim();
    if(!input)throw new Error('테스트할 사이트 주소를 입력해 주세요.');
    const hasScheme=/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(input);
    const isLocal=/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(input);
    const candidate=hasScheme?input:(isLocal?'http://':'https://')+input;
    let url;
    try{url=new URL(candidate);}catch(error){throw new Error('올바른 사이트 주소인지 확인해 주세요.');}
    if(!/^https?:$/.test(url.protocol))throw new Error('http 또는 https 주소만 열 수 있습니다.');
    return url.href;
  }

  /* placeholder(srcdoc) 는 URL 이 없을 때 보여 주는 자리표시 와이어프레임이다. */
  const initialPreviewContent='<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}html,body{height:100%}body{margin:0;background:#fff;font-family:-apple-system,"Apple SD Gothic Neo",Roboto,"Noto Sans KR",system-ui,sans-serif;color:#a3adba}.sk{background:#eceff3;border-radius:4px}.sk.l{background:#f1f3f6}.pg{display:flex;flex-direction:column;min-height:100%;padding:0 6%}.hd{display:flex;align-items:center;gap:8px;height:44px;border-bottom:1px solid #eef1f5}.hd .lg{width:56px;height:14px;border-radius:5px}.hd .nv{margin-left:auto;display:flex;gap:10px}.hd .nv i{display:block;width:26px;height:6px;border-radius:3px;background:#f1f3f6}.hr{padding:26px 0 18px}.hr .t1,.hr .t2{display:block}.hr .t1{height:16px;width:62%;max-width:420px;border-radius:6px}.hr .t2{height:10px;width:44%;max-width:300px;margin-top:10px;border-radius:5px}.hr p{margin:14px 0 0;font-size:15px;line-height:1.5;letter-spacing:-.01em;color:#98a2b3}.hr p .n{display:none}.bl{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding-bottom:24px}.bl div>i{display:block;height:64px;border-radius:6px;background:#f1f3f6}.bl div>b{display:block;height:8px;width:70%;margin-top:8px;border-radius:4px;background:#eceff3}.bl div>b+b{width:45%;margin-top:6px;background:#f1f3f6}.bl div:nth-child(n+3){display:none}@media(max-width:340px){.hd .nv i:nth-child(n+3){display:none}.hr p .w{display:none}.hr p .n{display:inline}}@media(max-height:280px){.pg{padding:0 5%}.hd{height:34px}.hr{padding:14px 0 10px}.hr .t2{display:none}.hr p{margin-top:8px}.bl div>i{height:36px}.bl div>b+b{display:none}.bl{padding-bottom:12px}}@media(min-width:700px){.pg{padding:0 8%}.hd{height:52px}.hd .lg{width:72px;height:16px}.hd .nv{gap:14px}.hd .nv i{width:34px}.hr{padding:36px 0 24px}.hr .t1{height:20px}.hr .t2{height:12px;margin-top:12px}.hr p{font-size:16px}.bl{grid-template-columns:repeat(3,1fr);gap:16px}.bl div>i{height:88px}.bl div:nth-child(3){display:block}}@media(min-width:1000px){.pg{padding:0 10%}.hr{padding:44px 0 28px}.bl{grid-template-columns:repeat(4,1fr);gap:18px}.bl div>i{height:104px}.bl div:nth-child(4){display:block}}</style></head><body><div class="pg" aria-hidden="true"><div class="hd"><span class="sk lg"></span><span class="nv"><i></i><i></i><i></i><i></i></span></div><div class="hr"><span class="sk t1"></span><span class="sk l t2"></span><p><span class="w">URL을 입력해 미리보기를 시작하세요.</span><span class="n">URL을 입력해 주세요.</span></p></div><div class="bl"><div><i></i><b></b><b></b></div><div><i></i><b></b><b></b></div><div><i></i><b></b><b></b></div><div><i></i><b></b><b></b></div></div></div></body></html>';

  /* view 에 현재 URL(없으면 안내 화면) 을 로드. iframe 은 재생성하지 않고 src 만 바꾼다 */
  function loadInto(view){
    const frame=view.dom.siteFrame;
    view.loaded=false;
    /* URL 이 없거나 지금 보이지 않는 view 면 사이트를 싣지 않는다. 이미 placeholder 면 문서를 다시 만들지 않는다. */
    if(!currentUrl||!isViewActive(view)){
      if(frame.hasAttribute('src')||frame.srcdoc!==initialPreviewContent){frame.removeAttribute('src');frame.srcdoc=initialPreviewContent;}
      return;
    }
    frame.removeAttribute('srcdoc');
    beginNavLoad(view);
    frame.src=currentUrl;
  }

  function reloadView(view){
    if(!currentUrl||!isViewActive(view))return false;
    view.loaded=false;
    beginNavLoad(view);
    view.dom.siteFrame.src=currentUrl;
    return true;
  }

  function onFrameLoad(view){
    /* src 속성이 있으면 사이트 문서(placeholder 는 srcdoc). 페이지 이동 동기화로 카드 안에서 이동하면 src 속성은 처음 URL 그대로라 currentUrl 과 비교하지 않는다(2026-10-22) */
    if(currentUrl&&view.dom.siteFrame.hasAttribute('src')){view.loaded=true;}
    if(view.compare){
      const win=getSameOriginWindow(view);
      let url='';
      try{url=win?win.location.href:'';}catch(error){}
      view.navDocument=isNavigationDocument(view,url);
      noteNavLoad(view);
      if(url)observeNav(view,url,{loading:false});
      attachScrollSync(view);
    }
    view.occlusionSlow=false;scheduleOcclusionCheck(view,OCCLUSION_LOAD_DELAY);   /* 새 문서: 큰 페이지 판정 초기화(view 마다 따로, 대상이 아니면 예약하지 않음) */
    if(view===primaryView&&compatEnabled)setTimeout(runCompatCheck,80);   /* Safari 호환성 검사: 새 문서면 다시 검사 */
    updateLoadStatus();
  }

  /* 스크롤바 처리(2026-09-29 종료): 여기서는 아무것도 하지 않는다.
   * 미리보기 iframe 안의 스크롤바는 강제로 숨기지 않는다 — CLAUDE.md "스크롤바" 결론 참조. */

  function updateLoadStatus(){
    if(!currentUrl)return;
    const views=visibleViews();
    const loadedCount=views.filter(view=>view.loaded).length;
    const done=loadedCount===views.length;
    elements.loadStatus.classList.toggle('is_loading',!done);
    elements.loadStatus.classList.toggle('is_loaded',done);
    if(done)elements.frameStatus.textContent='불러오기 요청이 완료되었습니다. 화면이 비어 있으면 iframe 차단 안내를 확인해 주세요.';
    else elements.frameStatus.textContent=views.length>1?'불러오는 중 ('+loadedCount+' / '+views.length+')':'사이트 불러오기를 요청했습니다.';
  }

  /* ------------------------------------------------------------------
   * 스크롤 동기화 (다중 비교)
   *
   * 원리 : 절대 scrollTop 이 아니라 비율을 맞춘다.
   *          ratio = scrollTop / (scrollHeight − clientHeight)
   *          targetScrollTop = (targetScrollHeight − targetClientHeight) × ratio
   *        → 뷰포트 높이가 다른 기기에서도 같은 콘텐츠 위치가 보인다.
   *
   * 제약 : 브라우저 Same-Origin Policy 때문에 iframe 문서(scrollTop 읽기·scrollTo) 는
   *        이 도구와 프로토콜·호스트·포트가 모두 같은 페이지에서만 접근할 수 있다.
   *        외부 도메인(cross-origin) 은 접근 시 SecurityError 가 나므로 여기서는 리스너를 붙이지 않는다.
   *        다른 출처는 아래 "스크롤 브리지"(Scroll Bridge 확장) 가 응답할 때만 동기화하고, 없으면 스위치를 비활성화해 이유를 보여준다.
   *        우회 코드는 두지 않는다.
   * ------------------------------------------------------------------ */
  const scrollAccessReasons={
    'same-origin':'같은 출처 · 동기화 가능',
    'cross-origin':'다른 출처 · 브라우저 정책상 스크롤 접근 불가',
    'file-origin':'file:// 로 열린 도구 · 서버(Live Server 등) 로 열어야 동기화 가능',
    'not-loaded':'불러오는 중'
  };
  /* 스크롤 동기화 전용 사유(카드 배지 title). 위 scrollAccessReasons 는 가림 검사 · Safari 호환성 검사가 그대로 쓴다 */
  const syncAccessReasons={
    'same-origin':'같은 출처 · 동기화 가능',
    'bridge':'확장 브리지 · 동기화 가능',
    'cross-origin':'다른 출처 · Scroll Bridge 연결 안 됨 · 확장 설치 및 사이트 접근 권한 확인',
    'bridge-pending':'Scroll Bridge 확장 확인 중',
    'file-origin':scrollAccessReasons['file-origin'],
    'not-loaded':scrollAccessReasons['not-loaded']
  };

  /* URL 만으로 미리 판정: 도구가 file:// 이면 항상 불가, http(s) 면 origin 비교 */
  function predictScrollAccess(url){
    if(!url)return 'same-origin';
    if(!/^https?:$/.test(location.protocol))return 'file-origin';
    try{return new URL(url).origin===location.origin?'same-origin':'cross-origin';}catch(error){return 'cross-origin';}
  }

  /* 실제 문서 접근 시도: 성공하면 window, 실패(SecurityError) 면 null */
  function getSameOriginWindow(view){
    try{
      const win=view.dom.siteFrame.contentWindow;
      if(!win||!win.document||!win.document.documentElement)return null;
      return win;
    }catch(error){return null;}
  }

  function getScrollAccess(view){
    if(!view.loaded&&currentUrl)return{accessible:false,reason:'not-loaded'};
    const win=getSameOriginWindow(view);
    if(win)return{accessible:true,reason:'same-origin',win};
    return{accessible:false,reason:predictScrollAccess(currentUrl)==='file-origin'?'file-origin':'cross-origin'};
  }

  function getScrollRatio(win){
    const doc=win.document.scrollingElement||win.document.documentElement;
    const maxY=doc.scrollHeight-doc.clientHeight;
    const maxX=doc.scrollWidth-doc.clientWidth;
    return{y:maxY>0?doc.scrollTop/maxY:0,x:maxX>0?doc.scrollLeft/maxX:0};
  }

  function applyScrollRatio(view,ratio){
    const win=getSameOriginWindow(view);
    if(!win)return false;
    const doc=win.document.scrollingElement||win.document.documentElement;
    const maxY=Math.max(0,doc.scrollHeight-doc.clientHeight);
    const maxX=Math.max(0,doc.scrollWidth-doc.clientWidth);
    const top=Math.round(ratio.y*maxY);
    const left=Math.round(ratio.x*maxX);
    /* 되돌림 루프 방지: 프로그램이 넣은 값과 같은 위치의 scroll 이벤트는 무시하고, 150ms 동안도 무시 */
    view.lastAppliedScroll={top,left};
    view.ignoreScrollUntil=performance.now()+150;
    win.scrollTo(left,top);
    return true;
  }

  /* ------------------------------------------------------------------
   * 다른 출처 iframe 의 스크롤 브리지(2026-10-16, device-preview-extension/scroll-bridge.js)
   *
   * 같은 출처 = 위의 direct 방식 그대로. 다른 출처 iframe 은 문서에 접근하지 않고, Scroll Bridge 확장의 content script 와
   * postMessage 로 스크롤 비율만 주고받는다(Same-Origin Policy 우회 · proxy · 보안 플래그 없음).
   *   부모 → iframe : hello {session, view, nonce}  (iframe load 마다, READY 가 올 때까지 몇 번 조용히 다시 보냄)
   *   iframe → 부모 : ready {ratio} · scroll {ratio}
   *   부모 → iframe : apply {ratio}
   * 받는 메시지는 type · session · view · nonce · event.source === 그 카드 iframe 의 contentWindow 를 모두 확인한다.
   * 확장 설치 여부는 가정하지 않고 실제 READY 응답으로만 판정한다. 응답이 없으면 조용히 "확장 필요" 상태가 된다(콘솔 출력 없음).
   * ------------------------------------------------------------------ */
  const BRIDGE_PREFIX='device-preview:scroll-bridge:';
  const BRIDGE_SESSION=makeBridgeToken();
  const BRIDGE_RETRY_MS=[0,250,700,1500,3000];
  let bridgeViewSeq=0;

  function makeBridgeToken(){
    const bytes=new Uint8Array(12);
    (window.crypto||{getRandomValues:array=>array.map(()=>Math.floor(Math.random()*256))}).getRandomValues(bytes);
    return Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
  }

  function postToBridge(view,type,extra){
    const win=view.dom.siteFrame.contentWindow;
    const bridge=view.bridge;
    if(!win||!bridge)return;
    /* targetOrigin '*': 카드 안에서 링크 · 리디렉트로 문서 출처가 바뀌어도 연결되게. 보내는 값은 무작위 토큰과 스크롤 비율뿐이고,
     * 받는 쪽(onBridgeMessage) 은 session · view · nonce · event.source 를 모두 확인한다 */
    try{win.postMessage(Object.assign({type:BRIDGE_PREFIX+type,session:BRIDGE_SESSION,view:bridge.id,nonce:bridge.nonce},extra),'*');}catch(error){}
  }

  /* iframe load 마다(다른 출처일 때) 새 nonce 로 연결을 다시 시작한다 — 이전 문서의 늦은 메시지는 nonce 가 달라 무시된다 */
  function startScrollBridge(view){
    if(!view.bridgeId)view.bridgeId='v'+(++bridgeViewSeq);
    (view.bridge&&view.bridge.timers||[]).forEach(clearTimeout);
    view.bridge={id:view.bridgeId,nonce:makeBridgeToken(),state:'pending',timers:[]};
    view.lastScrollRatio=null;
    const bridge=view.bridge;
    bridge.timers=BRIDGE_RETRY_MS.map((delay,index)=>setTimeout(()=>{
      if(view.bridge!==bridge||bridge.state==='ready')return;
      if(index===BRIDGE_RETRY_MS.length-1){bridge.state='none';updateSyncAvailability();return;}
      postToBridge(view,'hello');
    },delay));
    /* 마지막 타이머는 판정만 하고 hello 는 그 전까지 보낸다 */
  }

  function stopScrollBridge(view){
    if(!view.bridge)return;
    view.bridge.timers.forEach(clearTimeout);
    view.bridge=null;
    view.lastScrollRatio=null;
  }

  function sanitizeRatio(ratio){
    const clamp=value=>typeof value==='number'&&Number.isFinite(value)?Math.min(1,Math.max(0,value)):0;
    return ratio&&typeof ratio==='object'?{x:clamp(ratio.x),y:clamp(ratio.y)}:{x:0,y:0};
  }

  function onBridgeMessage(event){
    const data=event.data;
    if(!data||typeof data!=='object'||typeof data.type!=='string'||!data.type.startsWith(BRIDGE_PREFIX))return;
    if(data.session!==BRIDGE_SESSION)return;
    const view=allViews().find(item=>item.bridge&&item.bridge.id===data.view);   /* 단일 보기 iframe 은 풀페이지 캡처 동안만 브리지가 있다 */
    if(!view||data.nonce!==view.bridge.nonce||event.source!==view.dom.siteFrame.contentWindow)return;
    const type=data.type.slice(BRIDGE_PREFIX.length);
    if(type!=='ready'&&type!=='scroll'&&type!=='location'&&type!=='capture')return;
    if(type==='capture'){const wait=captureReplies.get(data.req);if(wait&&wait.view===view){captureReplies.delete(data.req);wait.resolve(sanitizeCaptureMetrics(data.metrics));}return;}   /* 풀페이지 캡처(2026-11-03) 의 위치 · 높이 응답 */
    if(type==='location'){if(view.bridge.state==='ready'&&view.bridge.navigate)observeNav(view,data.url,{loading:false});return;}   /* 페이지 이동(2026-10-22): 같은 문서 안 URL 변경 */
    /* 내부 요소 스크롤(2026-10-22): 문서 위치 캐시(lastScrollRatio) 는 건드리지 않고 대응 요소에만 전달 */
    if(type==='scroll'&&data.targetType==='element'){
      const key=sanitizeScrollKey(data.target);
      if(key&&view.bridge.state==='ready'&&syncOptions.scroll&&viewMode==='compare'){const ratio=sanitizeElementRatio(data.ratio);if(ratio.x!==null||ratio.y!==null)broadcastElementScroll(view,key,ratio);}
      return;
    }
    if(type==='ready'){
      view.bridge.element=Boolean(data.features&&data.features.element===true);
      view.bridge.navigate=Boolean(data.features&&data.features.navigate===true);   /* 1.2.0 이상만 페이지 이동 동기화 */
      view.bridge.capture=Boolean(data.features&&data.features.capture===true);     /* 1.3.0 이상만 풀페이지 캡처 */
    }
    view.lastScrollRatio=sanitizeRatio(data.ratio);   /* 다른 출처는 scrollTop 을 직접 못 읽으므로 마지막 비율을 기억해 둔다 */
    if(type==='ready'){
      const first=view.bridge.state!=='ready';
      view.bridge.state='ready';
      updateSyncAvailability();
      let navDocument=false;
      if(view.bridge.navigate&&view.compare){
        navDocument=first&&isNavigationDocument(view,data.url);
        observeNav(view,data.url,{loading:false});   /* 새 문서의 URL */
        syncBridgeWatch(view,navWatchActive());
      }
      /* 새로 추가 · 새로고침된 카드는 이미 스크롤된 다른 카드 위치에 맞춘다(direct 방식의 attachScrollSync 와 같은 동작) */
      if(first&&syncOptions.scroll&&viewMode==='compare'&&!navDocument){
        const reference=Array.from(compareViews.values()).find(other=>other!==view&&getSyncAccess(other).mode);
        const ratio=reference&&getViewScrollRatio(reference);
        if(ratio)applyViewScrollRatio(view,ratio);
      }
      return;
    }
    if(syncOptions.scroll&&viewMode==='compare')broadcastScroll(view);
  }
  window.addEventListener('message',onBridgeMessage);

  /* 동기화 경로 판정: direct(같은 출처 문서 접근) · bridge(확장 READY) · null(불가). 가림 검사 · Safari 호환성 검사는 계속 getScrollAccess 만 쓴다 */
  function getSyncAccess(view){
    const access=getScrollAccess(view);
    if(access.accessible)return{mode:'direct',reason:'same-origin'};
    if(access.reason!=='cross-origin')return{mode:null,reason:access.reason};
    const state=view.bridge&&view.bridge.state;
    if(state==='ready')return{mode:'bridge',reason:'bridge'};
    return{mode:null,reason:state==='pending'?'bridge-pending':'cross-origin'};
  }

  function getViewScrollRatio(view){
    const win=getSameOriginWindow(view);
    if(win)return getScrollRatio(win);
    return view.bridge&&view.bridge.state==='ready'?view.lastScrollRatio:null;
  }

  /* 같은 출처면 기존 applyScrollRatio, 브리지가 연결된 다른 출처면 확장에 비율 전달, 그 밖에는 건너뜀 */
  function applyViewScrollRatio(view,ratio){
    if(applyScrollRatio(view,ratio))return true;
    if(!view.bridge||view.bridge.state!=='ready')return false;
    view.lastScrollRatio={x:ratio.x,y:ratio.y};
    postToBridge(view,'apply',{ratio:{x:ratio.x,y:ratio.y}});
    return true;
  }

  function broadcastScroll(source){
    if(captureLock)return;   /* 풀페이지 캡처 중: 대상 카드만 움직인다(설정은 그대로) */
    const ratio=getViewScrollRatio(source);
    if(!ratio)return;
    compareViews.forEach(other=>{if(other!==source)applyViewScrollRatio(other,ratio);});
  }

  /* ------------------------------------------------------------------
   * 내부 overflow 스크롤 영역 동기화(2026-10-22) — 위의 문서(document/window) 동기화는 그대로 두고 덧붙인 경로
   *
   * 감지: 문서에 capture 단계 scroll 리스너 하나. 요소 scroll 이벤트는 버블링되지 않아 기존 window 리스너에는 오지 않고,
   *       문서 자신의 scroll(target = document) 은 여기서 건너뛴다 → 문서 스크롤은 기존 경로만 처리한다.
   *       전수 조사 · MutationObserver · 목록 캐시 없음. 실제로 스크롤된 요소만, 적용할 때마다 현재 DOM 에서 다시 찾는다.
   * 식별(scroll key): 고유 id → 고유 tag.class → 제한 구조 path(가장 가까운 고유 id 조상 또는 body 에서 내려가며
   *       각 단계가 형제 중 하나로만 맞을 때만, 최대 8단계). tag / id / class 만 쓰고 본문 · 속성값 · 입력값은 쓰지 않는다.
   *       is- / has- 로 시작하는 상태 클래스는 카드마다 다를 수 있어 뺀다. 어느 단계든 하나로 정해지지 않으면 동기화하지 않는다.
   * 적용: 대응 요소를 찾은 카드에만 비율(scrollTop / (scrollHeight − clientHeight), 가로도 같은 방식) 로 적용.
   *       못 찾으면 그 카드만 조용히 건너뛴다(문서로 대신 적용하지 않음).
   * 루프 방지: 요소별 WeakMap(적용 위치 + 150ms) — 문서용 view.lastAppliedScroll 과 섞지 않는다. 요소별 16ms 묶음.
   * ------------------------------------------------------------------ */
  const SCROLL_KEY_DEPTH=8;
  const SCROLL_KEY_CLASSES=4;
  const SCROLL_KEY_NAME=/^-?[A-Za-z_][\w-]{0,63}$/;
  const SCROLL_KEY_TAG=/^[a-z][a-z0-9-]{0,31}$/;
  const SCROLL_KEY_STATE=/^(is|has)[-_]/;
  const elementApplied=new WeakMap();
  const elementPending=new WeakSet();

  function scrollKeyStep(el){
    return{tag:el.localName,cls:Array.from(el.classList).filter(name=>SCROLL_KEY_NAME.test(name)&&!SCROLL_KEY_STATE.test(name)).slice(0,SCROLL_KEY_CLASSES)};
  }
  function scrollKeySelector(step){return step.tag+step.cls.map(name=>'.'+CSS.escape(name)).join('');}
  function uniqueById(doc,id){
    const list=doc.querySelectorAll('#'+CSS.escape(id));
    return list.length===1?list[0]:null;
  }
  function uniqueChild(parent,step){
    const selector=scrollKeySelector(step);
    const list=Array.from(parent.children).filter(child=>child.matches(selector));
    return list.length===1?list[0]:null;
  }

  /* 브리지에서 받은 key 도 같은 함수로 검사한다(형식이 맞지 않으면 null) */
  function sanitizeScrollKey(key){
    const isName=value=>typeof value==='string'&&SCROLL_KEY_NAME.test(value);
    const toStep=step=>step&&typeof step==='object'&&typeof step.tag==='string'&&SCROLL_KEY_TAG.test(step.tag)
      &&Array.isArray(step.cls)&&step.cls.length<=SCROLL_KEY_CLASSES&&step.cls.every(isName)?{tag:step.tag,cls:step.cls.slice()}:null;
    if(!key||typeof key!=='object')return null;
    if('id' in key)return isName(key.id)?{id:key.id}:null;
    if('sel' in key){const step=toStep(key.sel);return step?{sel:step}:null;}
    if(!Array.isArray(key.path)||key.path.length>SCROLL_KEY_DEPTH||!(key.anchor===null||isName(key.anchor)))return null;
    const path=key.path.map(toStep);
    return path.every(Boolean)?{anchor:key.anchor,path}:null;
  }

  function makeScrollKey(el){
    const doc=el.ownerDocument;
    const isUniqueId=node=>node.id&&SCROLL_KEY_NAME.test(node.id)&&uniqueById(doc,node.id)===node;
    try{
      if(isUniqueId(el))return{id:el.id};
      const own=scrollKeyStep(el);
      const list=doc.querySelectorAll(scrollKeySelector(own));
      if(list.length===1&&list[0]===el)return sanitizeScrollKey({sel:own});
      const path=[];
      let node=el;
      while(node!==doc.body){
        const parent=node.parentElement;
        if(!parent||path.length>=SCROLL_KEY_DEPTH)return null;
        const step=scrollKeyStep(node);
        if(uniqueChild(parent,step)!==node)return null;   /* 같은 모양의 형제가 있으면 애매 → 동기화 안 함 */
        path.unshift(step);
        node=parent;
        if(node!==doc.body&&isUniqueId(node))return sanitizeScrollKey({anchor:node.id,path});
      }
      return sanitizeScrollKey({anchor:null,path});
    }catch(error){return null;}
  }

  function resolveScrollKey(doc,key){
    try{
      if(key.id)return uniqueById(doc,key.id);
      if(key.sel){const list=doc.querySelectorAll(scrollKeySelector(key.sel));return list.length===1?list[0]:null;}
      let node=key.anchor?uniqueById(doc,key.anchor):doc.body;
      for(const step of key.path){
        if(!node)return null;
        node=uniqueChild(node,step);
      }
      return node;
    }catch(error){return null;}
  }

  function getElementRatio(el){
    const maxY=el.scrollHeight-el.clientHeight;
    const maxX=el.scrollWidth-el.clientWidth;
    /* 요소는 실제로 스크롤 가능한 축만 보낸다(불가 축 = null) — breakpoint 에 따라 축이 달라도 대상의 다른 축을 0 으로 되돌리지 않게 */
    return{y:maxY>0?el.scrollTop/maxY:null,x:maxX>0?el.scrollLeft/maxX:null};
  }

  /* 브리지로 받은 요소 비율: 숫자는 0~1 로 자르고, null(보내지 않은 축) 은 그대로 둔다 */
  function sanitizeElementRatio(ratio){
    const axis=value=>typeof value==='number'&&Number.isFinite(value)?Math.min(1,Math.max(0,value)):null;
    return ratio&&typeof ratio==='object'?{x:axis(ratio.x),y:axis(ratio.y)}:{x:null,y:null};
  }

  function applyElementRatio(el,ratio){
    /* 전달되지 않은 축(null) 은 현재 위치 유지 */
    const top=ratio.y===null?el.scrollTop:Math.round(ratio.y*Math.max(0,el.scrollHeight-el.clientHeight));
    const left=ratio.x===null?el.scrollLeft:Math.round(ratio.x*Math.max(0,el.scrollWidth-el.clientWidth));
    if(Math.abs(el.scrollTop-top)<1&&Math.abs(el.scrollLeft-left)<1)return;   /* 이미 그 위치면 scroll 이벤트가 없으므로 기록도 남기지 않는다 */
    elementApplied.set(el,{top,left,until:performance.now()+150});
    el.scrollTo(left,top);
  }

  function broadcastElementScroll(source,key,ratio){
    if(captureLock)return;   /* 풀페이지 캡처 중 */
    compareViews.forEach(other=>{
      if(other===source)return;
      const win=getSameOriginWindow(other);
      if(win){
        const doc=win.document;
        const el=resolveScrollKey(doc,key);
        if(el&&el!==doc.scrollingElement&&el!==doc.documentElement)applyElementRatio(el,ratio);
        return;
      }
      /* 요소 적용은 READY 에서 element 지원을 알린 브리지에만 보낸다(이전 버전 확장이 문서에 잘못 적용하지 않도록) */
      if(other.bridge&&other.bridge.state==='ready'&&other.bridge.element)postToBridge(other,'apply',{targetType:'element',target:key,ratio:{x:ratio.x,y:ratio.y}});
    });
  }

  function onElementScroll(view,event){
    if(!syncOptions.scroll||viewMode!=='compare')return;
    const el=event.target;
    if(!el||el.nodeType!==1)return;   /* 문서 자신의 scroll 은 기존 window 리스너가 처리 */
    const doc=el.ownerDocument;
    if(el===doc.scrollingElement||el===doc.documentElement)return;
    const applied=elementApplied.get(el);
    if(applied){
      /* 프로그램 스크롤의 메아리 — 받으면 기록을 지워 바로 뒤의 실제 사용자 스크롤은 150ms 안이어도 놓치지 않게 */
      if(Math.abs(el.scrollTop-applied.top)<1&&Math.abs(el.scrollLeft-applied.left)<1){elementApplied.delete(el);return;}
      if(performance.now()<applied.until)return;
    }
    if(elementPending.has(el))return;
    elementPending.add(el);
    setTimeout(()=>{
      elementPending.delete(el);
      if(!el.isConnected)return;
      const key=makeScrollKey(el);
      const ratio=getElementRatio(el);
      if(key&&(ratio.x!==null||ratio.y!==null))broadcastElementScroll(view,key,ratio);
    },16);
  }

  /* ------------------------------------------------------------------
   * 페이지 이동 동기화(2026-10-22, 다중 비교 · syncOptions.navigate)
   *
   * 감지: 카드 최상위 문서의 실제 location.href 를 본다(클릭 가로채기 · History API 패치 없음).
   *   같은 출처 = 부모가 250ms 마다 contentWindow.location.href 를 비교(+ 로드 때 한 번) — pushState / replaceState 는 이벤트가 없어 주기 비교가 필요.
   *     타이머는 다중 비교 + URL 있음 일 때 하나 돈다(navWatchActive) — 페이지 이동 OFF 여도 카드별 주소 표시를 위해 관찰은 유지하고, 다른 카드 전파만 ON 일 때(navSyncActive).
   *   다른 출처 = Scroll Bridge(1.2.0, READY features.navigate) 가 자기 문서 URL 을 같은 주기로 보고(location) · 새 문서는 READY 의 url.
   * 적용: 같은 출처 = target.contentWindow.location.replace(url) · 브리지 = navigate 메시지(확장이 같은 출처 URL 만 replace).
   *   replace 를 쓰는 이유: iframe 이동은 탭의 공동 세션 기록에 쌓이므로 target 이 기록을 남기면 뒤로/앞으로가 source 가 아닌 target 카드를 되돌린다.
   *   replace 도 브라우저 기본 이동이라 hash 만 다르면 같은 문서 안 이동이 된다.
   *   source 는 다시 로드하지 않는다. URL 이 이미 같은 카드 · 다른 사이트(origin) 에 가 있는 카드 · 이동할 수 없는 카드는 건너뛴다.
   * 루프 · redirect 방지(hold): 프로그램 이동을 받은 target 과 방금 이동을 보낸 source 는 hold 상태가 되어,
   *   그 카드의 로드가 끝나고 URL 변화가 NAV_QUIET_MS 동안 없을 때까지 관찰한 URL 을 기준값으로만 갱신한다(다시 보내지 않음).
   *   → 메아리 · redirect · 반응형 redirect(데스크톱 /desktop · 모바일 /mobile) 가 서로를 다시 이동시키지 않는다.
   *   사용자 이동은 로드가 끝나고 0.7초 뒤부터 다시 감지된다(로드가 오지 않는 경우 대비 최대 NAV_HOLD_MAX_MS).
   * 다른 origin 으로의 이동은 그 카드만 독립(전파 · currentUrl 갱신 없음).
   * 동기화된 URL 은 currentUrl · 주소 입력칸 · 새 창 링크에만 반영하고 localStorage(viewportLabUrl) 에는 저장하지 않는다.
   * ------------------------------------------------------------------ */
  const NAV_POLL_MS=250;
  const NAV_QUIET_MS=700;
  const NAV_HOLD_MAX_MS=15000;
  let navTimer=0;

  function navState(view){
    if(!view.nav)view.nav={url:null,hold:false,loading:false,quietAt:0,holdAt:0,moved:false};
    return view.nav;
  }
  function isHttpUrl(url){return typeof url==='string'&&url.length<=8192&&/^https?:\/\//i.test(url);}
  function urlOrigin(url){try{return new URL(url).origin;}catch(error){return null;}}
  function stripHash(url){const index=url.indexOf('#');return index<0?url:url.slice(0,index);}
  function navSyncActive(){return viewMode==='compare'&&syncOptions.navigate&&Boolean(currentUrl);}
  /* URL 관찰(카드별 주소 표시) 은 페이지 이동 동기화 ON/OFF 와 관계없이 다중 비교 + URL 있음이면 유지 — 동기화 OFF 는 "다른 카드로 전파하지 않음" 만 뜻한다(2026-11-02) */
  function navWatchActive(){return viewMode==='compare'&&Boolean(currentUrl);}

  /* hold 시작: loading = 로드 이벤트를 기다리는지. moved = 페이지 이동으로 생긴 문서(새 문서의 스크롤 초기 정렬을 하지 않음) */
  function holdNav(view,loading,moved){
    const nav=navState(view);
    const now=performance.now();
    nav.hold=true;
    nav.loading=loading;
    nav.moved=moved;
    nav.quietAt=now+NAV_QUIET_MS;
    nav.holdAt=now;
  }
  function navHolding(nav){
    if(!nav.hold)return false;
    const now=performance.now();
    if((!nav.loading&&now>=nav.quietAt)||now-nav.holdAt>NAV_HOLD_MAX_MS){nav.hold=false;nav.moved=false;}
    return nav.hold;
  }

  /* 사용자 · 전체 로드(loadInto · reloadView): 기준값을 비우고 로드 직후 redirect 를 흡수 */
  function beginNavLoad(view){
    holdNav(view,true,false);
    navState(view).url=null;
    updateDisplayUrl(view);   /* 새로 부르는 주소(currentUrl) 를 바로 표시 */
  }

  /* 로드 이벤트(onFrameLoad): hold 중이면 조용한 시간을 다시 잰다 */
  function noteNavLoad(view){
    const nav=navState(view);
    nav.loading=false;
    if(nav.hold)nav.quietAt=performance.now()+NAV_QUIET_MS;
  }

  /* 새 문서가 페이지 이동(동기화 · 사용자 이동) 으로 생겼는지 — 그렇다면 기존 스크롤 초기 정렬(다른 카드 위치 맞춤) 을 하지 않는다 */
  function isNavigationDocument(view,url){
    if(!navSyncActive()||!view.nav)return false;
    const nav=view.nav;
    if(navHolding(nav)&&nav.moved)return true;
    return Boolean(nav.url&&url&&url!==nav.url);
  }

  function observeNav(view,url,options){
    if(!isHttpUrl(url))return;
    const nav=navState(view);
    if(url===nav.url)return;
    const previous=nav.url;
    nav.url=url;
    updateDisplayUrl(view);   /* 관찰한 URL 이 바뀌면 그 카드의 가상 주소창만 바로 갱신 */
    if(navHolding(nav)){nav.quietAt=performance.now()+NAV_QUIET_MS;return;}   /* 메아리 · redirect: 기준값만 갱신 */
    if(!previous||!navSyncActive()||captureLock)return;                          /* 기준값 설정 · 동기화 꺼짐 · 풀페이지 캡처 중(그 사이 URL 변화는 기준값만) */
    const origin=urlOrigin(previous);
    if(!origin||urlOrigin(url)!==origin)return;                                   /* 다른 사이트로 나간 카드는 독립 */
    broadcastNav(view,url,origin,Boolean(options&&options.loading));
  }

  function broadcastNav(source,url,origin,loading){
    holdNav(source,loading,true);   /* source 자신의 로드 직후 redirect 를 다시 보내지 않게 */
    currentUrl=url;
    if(document.activeElement!==elements.siteUrl)elements.siteUrl.value=url;
    elements.openLink.href=url;
    compareViews.forEach(target=>{if(target!==source)applyNav(target,url,origin);});
    updateLoadStatus();
  }

  function applyNav(target,url,origin){
    const nav=navState(target);
    if(!isViewActive(target)||!nav.url||nav.url===url||urlOrigin(nav.url)!==origin)return;
    const sameDocument=url.includes('#')&&stripHash(url)===stripHash(nav.url);   /* hash 만 다르면 문서를 다시 만들지 않는 이동 */
    const win=getSameOriginWindow(target);
    const bridge=!win&&target.bridge&&target.bridge.state==='ready'&&target.bridge.navigate;
    if(!win&&!bridge)return;
    holdNav(target,!sameDocument,true);
    if(!sameDocument)target.loaded=false;
    if(win){try{win.location.replace(url);}catch(error){}}
    else postToBridge(target,'navigate',{url});
  }

  function pollNav(){
    compareViews.forEach(view=>{
      if(!isViewActive(view))return;
      const win=getSameOriginWindow(view);
      if(!win)return;
      let url='',loading=false;
      try{url=win.location.href;loading=win.document.readyState!=='complete';}catch(error){return;}
      observeNav(view,url,{loading});
    });
  }

  /* 감시 켜고 끄기: 다중 비교 + URL 있음 일 때(페이지 이동 ON/OFF 무관). 켤 때는 지금 URL 을 기준값으로만 잡는다(꺼져 있던 동안의 이동을 보내지 않음) */
  function updateNavWatch(){
    const active=navWatchActive()&&compareViews.size>0;
    if(active&&!navTimer){
      compareViews.forEach(view=>{
        const win=getSameOriginWindow(view);
        if(win){try{navState(view).url=win.location.href;}catch(error){}}
        else if(view.bridge&&view.bridge.navigate)navState(view).url=null;   /* 브리지 카드는 watch 응답이 기준값 */
      });
      navTimer=setInterval(pollNav,NAV_POLL_MS);
    }else if(!active&&navTimer){
      clearInterval(navTimer);
      navTimer=0;
    }
    compareViews.forEach(view=>syncBridgeWatch(view,active));
  }
  function syncBridgeWatch(view,active){
    const bridge=view.bridge;
    if(!bridge||bridge.state!=='ready'||!bridge.navigate||bridge.watch===active)return;
    bridge.watch=active;
    postToBridge(view,'watch',{navigate:active});
  }

  /* iframe load 마다 호출. 문서가 새로 생기면(새로고침·URL 변경) 리스너도 사라지므로 문서 기준으로 다시 붙인다 */
  function attachScrollSync(view){
    const access=getScrollAccess(view);
    view.scrollAccess=access.reason;
    if(access.reason==='cross-origin')startScrollBridge(view);
    else stopScrollBridge(view);
    updateSyncAvailability();
    if(!access.accessible)return;
    const win=access.win;
    if(view.scrollDocument===win.document)return;
    view.scrollDocument=win.document;
    let pending=false;
    win.addEventListener('scroll',()=>{
      if(!syncOptions.scroll||viewMode!=='compare')return;
      const doc=win.document.scrollingElement||win.document.documentElement;
      const applied=view.lastAppliedScroll;
      if(applied&&doc.scrollTop===applied.top&&doc.scrollLeft===applied.left)return;   /* 프로그램 스크롤의 메아리 */
      if(performance.now()<view.ignoreScrollUntil)return;
      if(pending)return;
      pending=true;
      /* 프레임당 1회로 묶어서 broadcast (rAF 가 멈추는 환경 대비 16ms 타이머) */
      setTimeout(()=>{pending=false;broadcastScroll(view);},16);
    },{passive:true});
    /* 내부 overflow 요소 스크롤(2026-10-22): capture 단계라 버블링되지 않는 요소 scroll 도 받는다 */
    win.document.addEventListener('scroll',event=>onElementScroll(view,event),{capture:true,passive:true});
    /* 새로 추가·새로고침된 카드는 이미 스크롤된 다른 카드 위치에 맞춘다(페이지 이동으로 생긴 새 문서는 제외 — 이전 페이지 위치를 새 페이지에 옮기지 않음) */
    if(syncOptions.scroll&&!view.navDocument){
      const reference=Array.from(compareViews.values()).find(other=>other!==view&&getSyncAccess(other).mode);
      const ratio=reference&&getViewScrollRatio(reference);
      if(ratio)applyScrollRatio(view,ratio);
    }
  }

  /* ------------------------------------------------------------------
   * 가림 검사 (2026-10-12, 1차 — 단일 보기 전용)
   *
   * 위험 영역 = 현재 렌더 결과를 읽어서 만든다(기기 데이터 · viewport · safe-area 계산은 바꾸지 않음).
   *   hardware : getCutoutGeometry() 의 컷아웃(노치 · Dynamic Island · 펀치홀 · 듀얼 렌즈 원). Duo 의 .dynamic_island DOM 은 중복이라 쓰지 않는다
   *   os       : 상태바 띠 · 홈 인디케이터 / 3버튼 띠 · Duo 코너 클러스터(시간 · 링)
   *   browser  : 주소창 · 툴바 띠 · Duo 측면 컨트롤
   *   safe     : getSafeGuide() 인셋(화면에 보이는 safe-area 가이드와 같은 값) — 실제 가림이 아니라 주의 판정.
   *              iframe 안 사이트에는 실제 env(safe-area-inset-*) 가 전달되지 않으므로 실기기에서는 사이트가 스스로 피했을 수 있다
   * 띠 영역은 렌더된 DOM rect(÷ view.scale) 를 그대로 쓴다 — 축소 / UI 겹침 · 주소창 위치 · Duo 측면 열이 이미 반영된 값.
   *
   * 자동 검사 = 같은 출처 문서(getScrollAccess) 에서만. position:fixed 와 지금 붙어 있는 position:sticky 만 대상.
   *   요소 rect(iframe CSS px) + getSiteViewport() 의 left / top = 화면 좌표(바깥 transform:scale 은 곱하지 않음).
   *   다른 출처 · file:// · URL 없음 · 로딩 중이면 DOM 검사를 하지 않고 위험 영역만 그린다("0개" 는 검사 성공 때만).
   * 재검사 = renderView 뒤(iframe 크기 전환 .24s 를 기다려 300ms) · iframe load 뒤 · 같은 출처 스크롤이 200ms 멈춘 뒤 · 다시 검사 버튼.
   *   MutationObserver · ResizeObserver · rAF 루프 없음. 탐색이 OCCLUSION_SLOW_MS 를 넘으면 그 문서는 자동 재검사를 끄고 수동 검사만(결과는 자르지 않음).
   * ------------------------------------------------------------------ */
  let occlusionEnabled=false;
  const OCCLUSION_RENDER_DELAY=300,OCCLUSION_LOAD_DELAY=60,OCCLUSION_SCROLL_DELAY=200,OCCLUSION_SLOW_MS=60;
  const OCCLUSION_KINDS=['hardware','os','browser','safe'];
  const OCCLUSION_LABELS={hardware:'하드웨어',os:'OS',browser:'브라우저',safe:'safe-area'};

  /* 검사 대상 = 지금 보이는 view(단일 → primaryView, 다중 비교 → compareViews 의 카드). 숨겨진 primaryView · 제거된 카드는 대상 아님.
   * 결과 · 타이머 · 큰 페이지 판정은 view 마다 따로(view.occlusion · occlusionTimer · occlusionSlow) — 전역 결과 배열 없음 */
  function isOcclusionTarget(view){
    if(!occlusionEnabled||!view)return false;
    return viewMode==='single'?view===primaryView:Boolean(view.compare)&&compareViews.get(view.deviceId)===view;
  }

  function scheduleOcclusionCheck(view,delay){
    if(!view)return;
    clearTimeout(view.occlusionTimer);
    view.occlusionTimer=null;
    if(!isOcclusionTarget(view))return;
    view.occlusionTimer=setTimeout(()=>runOcclusionCheck(view,{auto:true}),delay);
  }

  /* 대상이 아닌 view 정리(타이머 · 강조 · 결과 · 표시 레이어) — 모드 전환 · 검사 끔 · 카드 제거 */
  function resetOcclusionView(view){
    if(!view)return;
    clearTimeout(view.occlusionTimer);view.occlusionTimer=null;
    clearTimeout(view.occlusionFocusTimer);
    if(view.occlusionFocus){view.occlusionFocus.remove();view.occlusionFocus=null;}
    view.occlusion=null;
    if(view.dom)renderOcclusionLayer(view,[],null);
    updateCompareOcclusion(view);
  }

  /* 모드 전환 뒤: 보이지 않는 view 는 정리하고 보이는 view 는 검사를 예약 */
  function syncOcclusionViews(){
    allViews().forEach(view=>{if(!isOcclusionTarget(view)&&(view.occlusion||view.occlusionTimer||view.occlusionFocus))resetOcclusionView(view);});
    visibleViews().forEach(view=>scheduleOcclusionCheck(view,OCCLUSION_RENDER_DELAY));
    updateOcclusionStatus();
  }

  /* 카드 메타 끝의 작은 결과 표시(다중 비교 카드만). 스크롤 접근 안내 .compare_badge 와 별개 요소 */
  function updateCompareOcclusion(view){
    const el=view&&view.dom&&view.dom.occlusion;
    if(!el)return;
    const state=view.occlusion;
    let text='',title='',hit=false;
    if(isOcclusionTarget(view)&&currentUrl){
      if(!state||state.status==='not-loaded'){text='검사 중';}
      else if(state.status==='ok'){text='가림 '+state.results.length;hit=state.results.some(result=>result.reasons.some(kind=>kind!=='safe'));title='가림 요소 '+state.results.length+'개';}
      else if(state.status==='manual'){text='다시 검사 필요';title='큰 페이지라 자동 재검사를 껐습니다';}
      else if(state.status!=='no-url'){text='검사 불가';title='가림 자동 검사 불가 · '+(scrollAccessReasons[state.status]||state.status).split(' · ')[0];}
    }
    el.hidden=!text;
    el.textContent=text;
    el.title=title;
    if(hit)el.dataset.hit='true';else delete el.dataset.hit;
  }

  /* 위험 영역(화면 좌표 CSS px) */
  function getOcclusionZones(view){
    const zones=[];
    const cutout=view.frameProfile.cutout;
    const geometry=cutout&&cutout.type&&cutout.type!=='none'?getCutoutGeometry(view,view.frameProfile,getOrientation(view)==='landscape'):null;
    if(geometry){
      const box=geometry.box;
      if(geometry.circles.length)geometry.circles.forEach(c=>zones.push({kind:'hardware',shape:'circle',cx:c.cx,cy:c.cy,r:c.r}));
      else if(cutout.type==='hole')zones.push({kind:'hardware',shape:'circle',cx:box.left+box.width/2,cy:box.top+box.height/2,r:Math.min(box.width,box.height)/2});
      else zones.push({kind:'hardware',shape:'rect',x:box.left,y:box.top,w:box.width,h:box.height,round:cutout.type==='island'});
    }
    const wrapRect=view.dom.screenWrap.getBoundingClientRect();
    /* 화면의 "실제로 그려진" 배율(rect ÷ 레이아웃 폭). view.scale 은 목표 배율이라 transform 전환(.24s) 중에 읽으면 띠 영역이 화면보다 크게 계산됐다 */
    const scale=view.dom.screenWrap.offsetWidth?wrapRect.width/view.dom.screenWrap.offsetWidth:(view.scale||1);
    const domZone=(el,kind)=>{
      if(!el||el.hidden||el.closest('[hidden]'))return;
      const style=getComputedStyle(el);
      if(style.display==='none'||style.visibility==='hidden')return;
      const r=el.getBoundingClientRect();
      if(r.width<.5||r.height<.5)return;
      zones.push({kind,shape:'rect',x:(r.left-wrapRect.left)/scale,y:(r.top-wrapRect.top)/scale,w:r.width/scale,h:r.height/scale});
    };
    domZone(view.dom.bandStatus,'os');
    domZone(view.dom.bandHome,'os');
    domZone(view.dom.clusterTime,'os');
    domZone(view.dom.clusterRing,'os');
    domZone(view.dom.bandUrl,'browser');
    domZone(view.dom.bandToolbar,'browser');
    if(view.dom.sideControls)view.dom.sideControls.querySelectorAll('.side_group').forEach(group=>domZone(group,'browser'));
    const safe=getSafeGuide(view);
    const W=view.currentWidth,H=view.currentHeight;
    if(safe.top>0)zones.push({kind:'safe',shape:'rect',x:0,y:0,w:W,h:safe.top});
    if(safe.bottom>0)zones.push({kind:'safe',shape:'rect',x:0,y:H-safe.bottom,w:W,h:safe.bottom});
    if(safe.left>0)zones.push({kind:'safe',shape:'rect',x:0,y:0,w:safe.left,h:H});
    if(safe.right>0)zones.push({kind:'safe',shape:'rect',x:W-safe.right,y:0,w:safe.right,h:H});
    return zones;
  }

  /* 사각형 × 위험 영역 겹침(1px 미만 · 안티앨리어싱 경계는 겹침으로 보지 않음) */
  function occlusionIntersects(rect,zone){
    if(zone.shape==='circle'){
      const nx=Math.max(rect.x,Math.min(zone.cx,rect.x+rect.w));
      const ny=Math.max(rect.y,Math.min(zone.cy,rect.y+rect.h));
      return Math.hypot(zone.cx-nx,zone.cy-ny)<zone.r-.5;
    }
    const ix=Math.min(rect.x+rect.w,zone.x+zone.w)-Math.max(rect.x,zone.x);
    const iy=Math.min(rect.y+rect.h,zone.y+zone.h)-Math.max(rect.y,zone.y);
    return ix>=1&&iy>=1;
  }

  /* sticky 가 지금 붙어 있는지: rect 가 top / bottom / left / right 지정 위치에 있으면 붙은 것으로 본다(문서 viewport 기준 — 내부 스크롤 컨테이너 sticky 는 판정하지 않음) */
  function isStickyStuck(style,rect,vw,vh){
    const tolerance=1.5;
    const value=v=>{if(v==='auto')return null;const n=parseFloat(v);return isFinite(n)?n:null;};
    const top=value(style.top),bottom=value(style.bottom),left=value(style.left),right=value(style.right);
    return(top!=null&&Math.abs(rect.top-top)<=tolerance)||(bottom!=null&&Math.abs(rect.bottom-(vh-bottom))<=tolerance)
      ||(left!=null&&Math.abs(rect.left-left)<=tolerance)||(right!=null&&Math.abs(rect.right-(vw-right))<=tolerance);
  }

  /* 사람이 알아보기 위한 요소 요약(완전한 selector 아님) — 결과 목록 · 화면 번호 · 리포트가 모두 이 값을 쓴다.
   * tag/id/class 만 사용: tag#id.class1.class2 → tag.class1.class2 → tag#id → 식별자가 없으면 "tag (식별자 없음)"(입력 요소는 tag 만).
   * 클래스는 앞 2개 · 각 24자까지. 본문(textContent · innerText) · aria-label · title · placeholder · value 등 페이지 콘텐츠는 쓰지 않는다(개인정보 · 민감 내용 방지) */
  function describeOcclusionElement(el){
    const tag=el.tagName.toLowerCase();
    const id=el.id?'#'+el.id.slice(0,32):'';
    const classList=typeof el.className==='string'?el.className.trim().split(/\s+/).filter(Boolean):[];
    const classes=classList.slice(0,2).map(name=>'.'+name.slice(0,24)).join('')+(classList.length>2?'…':'');
    if(id||classes)return(tag+id+classes).slice(0,72);
    return /^(input|textarea|select|option)$/.test(tag)?tag:tag+' (식별자 없음)';
  }

  /* 같은 출처 문서의 fixed / 붙어 있는 sticky 요소. 첫 단계는 position 하나만 읽는다(큰 페이지 대비) */
  function scanFixedSticky(win){
    const doc=win.document;
    const started=performance.now();
    const all=doc.body?doc.body.getElementsByTagName('*'):[];
    const candidates=[];
    for(let i=0;i<all.length;i++){
      const position=win.getComputedStyle(all[i]).position;
      if(position==='fixed'||position==='sticky')candidates.push({el:all[i],position});
    }
    const vw=doc.documentElement.clientWidth,vh=doc.documentElement.clientHeight;
    const items=[];
    candidates.forEach(({el,position})=>{
      const style=win.getComputedStyle(el);
      if(style.display==='none'||style.visibility==='hidden'||parseFloat(style.opacity)===0)return;
      for(let parent=el.parentElement;parent&&parent!==doc.body;parent=parent.parentElement){if(parseFloat(win.getComputedStyle(parent).opacity)===0)return;}
      const rect=el.getBoundingClientRect();
      if(rect.width<=0||rect.height<=0)return;
      if(position==='sticky'&&!isStickyStuck(style,rect,vw,vh))return;
      const x0=Math.max(0,rect.left),y0=Math.max(0,rect.top),x1=Math.min(vw,rect.right),y1=Math.min(vh,rect.bottom);
      if(x1-x0<1||y1-y0<1)return;   /* 화면 밖 */
      items.push({el,position,rect:{x:x0,y:y0,w:x1-x0,h:y1-y0}});
    });
    return{items,elapsed:performance.now()-started};
  }

  function runOcclusionCheck(view,options){
    const settings=options||{};
    if(view.occlusionTimer){clearTimeout(view.occlusionTimer);view.occlusionTimer=null;}
    if(!isOcclusionTarget(view)){renderOcclusionLayer(view,[],null);updateCompareOcclusion(view);updateOcclusionStatus();return;}
    /* 화면 크기 전환(.24s — 회전 · 기기 변경) 이 끝나기 전이면 띠 위치가 중간값이라 자동 검사를 미룬다(수동 검사는 그대로 실행) */
    const wrap=view.dom.screenWrap;
    if(settings.auto&&wrap.offsetWidth&&(Math.abs(wrap.offsetWidth-view.currentWidth)>1||Math.abs(wrap.offsetHeight-view.currentHeight)>1)){scheduleOcclusionCheck(view,OCCLUSION_RENDER_DELAY);return;}
    const zones=getOcclusionZones(view);
    let state;
    if(!currentUrl)state={status:'no-url'};
    else{
      const access=getScrollAccess(view);
      if(!access.accessible)state={status:access.reason};
      else{
        attachOcclusionScroll(view,access.win);
        if(settings.auto&&view.occlusionSlow)state={status:'manual'};   /* 큰 페이지: 자동 재검사 끔, 이전 요소 표시는 지움 */
        else{
          const scan=scanFixedSticky(access.win);
          view.occlusionSlow=scan.elapsed>OCCLUSION_SLOW_MS;
          const viewport=getSiteViewport(view);
          const results=[];
          scan.items.forEach(item=>{
            const rect={x:item.rect.x+viewport.left,y:item.rect.y+viewport.top,w:item.rect.w,h:item.rect.h};
            const reasons=OCCLUSION_KINDS.filter(kind=>zones.some(zone=>zone.kind===kind&&occlusionIntersects(rect,zone)));
            if(reasons.length)results.push({el:item.el,position:item.position,rect,reasons,label:describeOcclusionElement(item.el)});   /* el = 이번 검사 결과에만 보관(다음 검사가 통째로 교체) */
          });
          state={status:'ok',results,scanned:scan.items.length,elapsed:scan.elapsed,slow:view.occlusionSlow};
        }
      }
    }
    view.occlusion=state;
    renderOcclusionLayer(view,zones,state);
    updateCompareOcclusion(view);
    updateOcclusionStatus();
  }

  function attachOcclusionScroll(view,win){
    if(view.occlusionDocument===win.document)return;
    view.occlusionDocument=win.document;
    win.addEventListener('scroll',()=>{
      if(!isOcclusionTarget(view)||view.occlusionSlow)return;
      scheduleOcclusionCheck(view,OCCLUSION_SCROLL_DELAY);
    },{passive:true});
  }

  /* 표시 상자를 화면(0~W, 0~H) 안으로 자르고, 화면 가장자리에 닿은 변은 테두리를 그리지 않는다(data-edge).
   * 가장자리 테두리는 소수 배율에서 화면 경계의 반쪽 픽셀에 걸려 베젤 위로 약 1px 색 줄처럼 보였다 — 판정 좌표는 바꾸지 않는 표시 전용 처리 */
  function placeOcclusionBox(view,span,x,y,w,h){
    const W=view.currentWidth,H=view.currentHeight,E=.5;
    const clampX=v=>Math.min(W,Math.max(0,v)),clampY=v=>Math.min(H,Math.max(0,v));
    const x0=clampX(x),y0=clampY(y),x1=clampX(x+w),y1=clampY(y+h);
    span.style.left=x0+'px';span.style.top=y0+'px';span.style.width=Math.max(0,x1-x0)+'px';span.style.height=Math.max(0,y1-y0)+'px';
    const edge=[x0<=E?'l':'',y0<=E?'t':'',x1>=W-E?'r':'',y1>=H-E?'b':''].filter(Boolean).join(' ');
    if(edge)span.dataset.edge=edge;else delete span.dataset.edge;
  }

  function renderOcclusionLayer(view,zones,state){
    const layer=view.dom.occlusionLayer;
    view.dom.shell.dataset.occlusion=isOcclusionTarget(view)?'true':'false';
    if(!layer)return;
    const fragment=document.createDocumentFragment();
    const box=(className,x,y,w,h,title)=>{
      const span=document.createElement('span');
      span.className=className;
      placeOcclusionBox(view,span,x,y,w,h);
      if(title)span.title=title;
      fragment.appendChild(span);
      return span;
    };
    if(isOcclusionTarget(view)){
      zones.forEach(zone=>{
        const span=zone.shape==='circle'?box('oz_'+zone.kind,zone.cx-zone.r,zone.cy-zone.r,zone.r*2,zone.r*2):box('oz_'+zone.kind,zone.x,zone.y,zone.w,zone.h);
        if(zone.shape==='circle')span.style.borderRadius='50%';
        else if(zone.round)span.style.borderRadius=Math.min(zone.w,zone.h)/2+'px';
      });
      if(state&&state.status==='ok')state.results.forEach((result,index)=>{
        const hit=result.reasons.some(kind=>kind!=='safe');
        const span=box(hit?'oe_hit':'oe_warn',result.rect.x,result.rect.y,result.rect.w,result.rect.h,(index+1)+'. '+result.label+' ('+result.position+') — '+formatOcclusionReasons(result.reasons));
        const number=document.createElement('i');number.className='oe_num';number.textContent=String(index+1);span.appendChild(number);   /* 목록 번호와 같은 번호(색 외 구분) */
      });
    }
    layer.replaceChildren(fragment);
  }

  /* 결과 한 줄(푸터). "0개" 는 같은 출처 검사에 성공했을 때만 */
  function updateOcclusionStatus(){
    const wrap=elements.occlusionStatus;
    if(!wrap)return;
    wrap.hidden=!occlusionEnabled;
    elements.occlusionBtn.setAttribute('aria-pressed',occlusionEnabled?'true':'false');
    if(!occlusionEnabled){renderOcclusionList(null);setOcclusionListOpen(false);setOcclusionCopyBox(null);return;}
    const note='safe-area 는 주의 판정입니다 — iframe 안 사이트에는 실제 env(safe-area-inset-*) 값이 전달되지 않습니다. fixed / 지금 붙어 있는 sticky 요소만 검사하며, 메뉴 열기 등 화면이 바뀌면 다시 검사를 눌러 주세요.';
    if(viewMode!=='single'){updateCompareOcclusionStatus(note);return;}
    const state=primaryView&&primaryView.occlusion;
    let text,recheck=true;
    if(!state||state.status==='no-url'){text='가림 검사 · 검사할 페이지 없음 (위험 영역만 표시)';recheck=false;}
    else if(state.status==='not-loaded')text='가림 검사 · 불러오는 중';
    else if(state.status==='cross-origin')text='가림 검사 · 자동 검사 불가 · 다른 출처 (위험 영역만 표시)';
    else if(state.status==='file-origin')text='가림 검사 · 자동 검사 불가 · file:// 로 열린 도구 (위험 영역만 표시)';
    else if(state.status==='manual')text='가림 검사 · 큰 페이지라 자동 재검사를 껐습니다 — 다시 검사를 눌러 주세요';
    else{
      const count={hardware:0,os:0,browser:0,safe:0};
      state.results.forEach(result=>result.reasons.forEach(kind=>{count[kind]++;}));
      text='가림 요소 '+state.results.length+' · '+OCCLUSION_KINDS.map(kind=>OCCLUSION_LABELS[kind]+' '+count[kind]).join(' · ')+(state.slow?' · 큰 페이지: 자동 재검사 꺼짐':'');
    }
    elements.occlusionText.textContent=text;
    wrap.title=note;
    elements.occlusionRecheck.hidden=!recheck;
    /* 리포트 복사: 검사를 켠 단일 보기에서만. URL 없음 · 로딩 중 · 다중 비교면 비활성(다른 출처 · file:// 은 환경 리포트 허용) */
    elements.occlusionCopy.disabled=viewMode!=='single'||!state||state.status==='no-url'||state.status==='not-loaded';
    renderOcclusionList(state&&state.status==='ok'?[{view:primaryView,state}]:null);
  }

  /* 다중 비교 푸터 요약: "가림 검사 · 검사 완료 카드/전체 · 총 N개 · 자동 검사 불가 n개" (카드별 결과는 각 카드 메타) */
  function updateCompareOcclusionStatus(note){
    const views=Array.from(compareViews.values());
    const states=views.map(view=>view.occlusion);
    const count=status=>states.filter(state=>state&&state.status===status).length;
    const ok=views.filter(view=>view.occlusion&&view.occlusion.status==='ok');
    const blocked=count('cross-origin')+count('file-origin');
    const manual=count('manual');
    const pending=views.length-ok.length-blocked-manual;
    let text,recheck=true;
    if(!views.length){text='가림 검사 · 비교 기기 없음';recheck=false;}
    else if(!currentUrl){text='가림 검사 · 검사할 페이지 없음 (위험 영역만 표시)';recheck=false;}
    else{
      const total=ok.reduce((sum,view)=>sum+view.occlusion.results.length,0);
      text='가림 검사 · '+ok.length+'/'+views.length+' 검사 · 총 '+total+'개'
        +(blocked?' · '+blocked+'개 자동 검사 불가':'')+(manual?' · '+manual+'개 큰 페이지(다시 검사)':'')+(pending>0?' · '+pending+'개 검사 중':'');
    }
    elements.occlusionText.textContent=text;
    elements.occlusionStatus.title=note;
    elements.occlusionRecheck.hidden=!recheck;
    elements.occlusionCopy.disabled=!currentUrl||!states.some(state=>state&&state.status!=='no-url'&&state.status!=='not-loaded');
    renderOcclusionList(ok.length?views.map(view=>({view,state:view.occlusion})):null);
  }

  /* ------------------------------------------------------------------
   * 가림 검사 리포트 복사(2026-10-12) — 현재 검사 결과 snapshot 을 출력만 한다(판정 · 탐지 · 재검사 로직 재사용, 새 DOM 탐색 없음).
   * buildOcclusionReport(view)  : 환경 + 검사 결과 데이터 객체(나중에 JSON · CSV 출력이 같은 객체를 쓰도록 분리)
   * formatOcclusionReportText() : plain text
   * URL 은 origin + pathname 만(query · hash 는 토큰 · 세션 · 검색어가 있을 수 있어 제외). 요소는 기존 요약 이름만(입력값 · 본문 텍스트 없음)
   * ------------------------------------------------------------------ */
  function formatReportTime(date){
    const pad=n=>String(n).padStart(2,'0');
    return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate())+' '+pad(date.getHours())+':'+pad(date.getMinutes());
  }

  function getReportPage(url){
    if(!url)return null;
    try{const parsed=new URL(url);return{text:parsed.origin+parsed.pathname,trimmed:Boolean(parsed.search||parsed.hash)};}
    catch(error){return null;}
  }

  /* 브라우저 띠가 이 상태에 "있는지"(스위치로 숨긴 경우도 있음으로 본다). 실측 viewport 기기는 Safari 레이아웃의 chrome 값 기준 */
  function getReportBandPresence(view,bands){
    if(bands.side)return{url:false,toolbar:false};
    const state=getState(view);
    const measured=bands.measured&&state&&state.browserViewport&&state.browserViewport[bands.profileId];
    const orientation=getOrientation(view);
    if(measured){
      const chrome=measured[safariLayout]&&measured[safariLayout].chrome&&measured[safariLayout].chrome[orientation]||{};
      return{url:(chrome.urlBar||0)>0,toolbar:(chrome.toolbar||0)>0};
    }
    const profile=browserProfiles[bands.profileId]||{};
    const metrics=profile[orientation]||profile.portrait||{};
    return{url:bands.url>0||(!showAddressBar&&(metrics.urlBar||0)>0),toolbar:bands.toolbar>0||(!showBottomBar&&(metrics.toolbar||0)>0)};
  }

  function buildOcclusionReport(view){
    const device=getDevice(view);
    const state=getState(view);
    const bands=getBrowserBands(view);
    const viewport=getSiteViewport(view);
    const presence=getReportBandPresence(view,bands);
    const check=view.occlusion||{status:'no-url'};
    const report={
      createdAt:new Date(),
      page:getReportPage(currentUrl),
      device:getDeviceName(view)+(device&&device.states.length>1&&state?' · '+state.label:''),
      screen:{width:view.currentWidth,height:view.currentHeight,dpr:getDpr(view)},
      orientation:getOrientationLabel(view),
      browser:{label:bands.label,side:bands.side,
        addressBar:presence.url?{visible:showAddressBar,position:bands.urlPosition==='bottom'?'하단':'상단'}:null,
        toolbar:presence.toolbar?{visible:showBottomBar}:null},
      safari:hasMeasuredViewport(view)?{layout:safariLayout==='top'?'Top':'Compact',viewportFit:viewportFit}:null,
      mode:!bands.side&&(presence.url||presence.toolbar)?uiMode:null,
      viewport:{width:viewport.width,height:viewport.height,visibleHeight:viewport.overlay?viewport.visibleHeight:null},
      breakpoint:getBreakpointRange(viewport.width).label,   /* 다중 비교 리포트에서만 출력 */
      check:{status:check.status}
    };
    if(check.status==='ok'){
      const items=check.results.map(result=>({
        label:result.label,position:result.position,reasons:result.reasons.slice(),
        actual:result.reasons.some(kind=>kind!=='safe'),
        rect:{x:Math.round(result.rect.x-viewport.left),y:Math.round(result.rect.y-viewport.top),w:Math.round(result.rect.w),h:Math.round(result.rect.h)}   /* snapshot 화면 좌표 − iframe 화면 위치 = viewport 기준 CSS px */
      }));
      report.check.items=items;
      report.check.actual=items.filter(item=>item.actual).length;
      report.check.caution=items.length-report.check.actual;
    }else{
      /* 검사 불가 사유는 스크롤 동기화와 같은 사유 문구(scrollAccessReasons) 의 앞부분을 그대로 쓴다 */
      report.check.reason=(scrollAccessReasons[check.status]||check.status).split(' · ')[0];
    }
    return report;
  }

  /* 단일 리포트 = 제목 · 페이지 · 환경 · 결과 · 안내 · 시각. 다중 비교 리포트는 같은 환경 · 결과 줄을 기기마다 반복(formatCompareOcclusionReportText) */
  function formatOcclusionReportText(report){
    const lines=['[Device Preview 가림 검사]'];
    if(report.page)lines.push('페이지: '+report.page.text+(report.page.trimmed?' (쿼리·해시 생략)':''));
    lines.push(...formatReportEnvLines(report,'기기: '));
    lines.push('');
    lines.push(...formatReportCheckLines(report.check,true));
    lines.push('');
    lines.push('검사 시각: '+formatReportTime(report.createdAt));
    return lines.join('\n');
  }

  function formatCompareOcclusionReportText(reports){
    const lines=['[Device Preview 가림 검사 · 다중 비교]'];
    if(reports[0]&&reports[0].page)lines.push('페이지: '+reports[0].page.text+(reports[0].page.trimmed?' (쿼리·해시 생략)':''));
    lines.push('비교 기기: '+reports.length+'개');
    reports.forEach((report,index)=>{
      lines.push('');
      lines.push(...formatReportEnvLines(report,'['+(index+1)+'] '));
      lines.push('Breakpoint QA: '+report.breakpoint);
      lines.push(...formatReportCheckLines(report.check,false));
    });
    lines.push('');
    lines.push('검사 범위: position:fixed · 지금 붙어 있는 position:sticky');
    lines.push('※ safe-area 는 주의 판정입니다.');
    lines.push('※ iframe 안 사이트에는 실제 env(safe-area-inset-*) 가 완전히 재현되지 않습니다.');
    lines.push('');
    lines.push('검사 시각: '+formatReportTime(reports[0]?reports[0].createdAt:new Date()));
    return lines.join('\n');
  }

  function formatReportEnvLines(report,devicePrefix){
    const lines=[];
    lines.push(devicePrefix+report.device+' ('+report.screen.width+' × '+report.screen.height+(report.screen.dpr?' · DPR '+report.screen.dpr:'')+')');
    lines.push('방향: '+report.orientation);
    const browser=[report.browser.label+(report.browser.side?' · 측면 컨트롤':'')];
    if(report.browser.addressBar)browser.push(report.browser.addressBar.visible?'주소창 표시('+report.browser.addressBar.position+')':'주소창 숨김');
    if(report.browser.toolbar)browser.push(report.browser.toolbar.visible?'툴바 표시':'툴바 숨김');
    lines.push('브라우저: '+browser.join(' · '));
    if(report.safari){lines.push('Safari 레이아웃: '+report.safari.layout);lines.push('viewport-fit: '+report.safari.viewportFit);}
    if(report.mode)lines.push('모드: '+(report.mode==='overlay'?'UI 겹침(lvh)':'축소(svh)'));
    lines.push('사이트 viewport: '+report.viewport.width+' × '+report.viewport.height+(report.mode==='overlay'&&report.viewport.visibleHeight!=null?' (가시 높이 '+report.viewport.visibleHeight+')':''));   /* 가시 높이는 UI 겹침 모드 줄이 있을 때만 */
    return lines;
  }

  /* 결과 줄. notes = 검사 범위 · ※ 안내(단일 리포트만 — 다중 비교는 끝에 한 번) */
  function formatReportCheckLines(check,notes){
    const lines=[];
    if(!notes&&(check.status==='not-loaded'||check.status==='no-url')){lines.push('가림 검사: 결과 없음 — '+(check.status==='no-url'?'페이지 없음':'불러오는 중'));return lines;}
    if(check.status==='ok'){
      lines.push('가림 요소: '+check.items.length+' (실제 가림 '+check.actual+' · 주의 '+check.caution+')');
      if(!check.items.length)lines.push('(fixed / 현재 붙어 있는 sticky 중 위험 영역과 겹친 요소 없음)');
      check.items.forEach((item,index)=>{
        lines.push('');
        lines.push((index+1)+'. '+item.label);
        lines.push('   '+item.position+' · '+formatOcclusionReasons(item.reasons)+(item.actual?'':' (주의)'));
        lines.push('   위치(viewport 기준): x '+item.rect.x+', y '+item.rect.y+', '+item.rect.w+' × '+item.rect.h);
      });
      if(notes){
        lines.push('');
        lines.push('검사 범위: position:fixed · 지금 붙어 있는 position:sticky');
        lines.push('※ safe-area 는 주의 판정입니다.');
        lines.push('※ iframe 안 사이트에는 실제 env(safe-area-inset-*) 가 완전히 재현되지 않습니다.');
      }
    }else{
      lines.push('자동 가림 검사: 불가 — '+check.reason);
      lines.push(check.status==='file-origin'?'도구를 file:// 로 열어 페이지 내부 DOM 을 읽을 수 없습니다(Live Server 등 서버로 열어야 검사 가능).':'브라우저 보안 정책상 페이지 내부 DOM 을 읽을 수 없습니다.');
      lines.push('위험 영역은 Device Preview 화면에서 직접 확인하세요.');
    }
    return lines;
  }

  /* 클립보드: API → execCommand → 직접 복사 상자. execCommand 용 임시 textarea 는 도구 문서에만 만들고 원래 포커스로 되돌린다(iframe 은 건드리지 않음) */
  function copyTextWithFallback(text){
    const legacy=()=>{
      const active=document.activeElement;
      const area=document.createElement('textarea');
      area.value=text;area.setAttribute('readonly','');
      area.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(area);
      area.select();
      let ok=false;
      try{ok=document.execCommand('copy');}catch(error){ok=false;}
      area.remove();
      if(active&&typeof active.focus==='function')active.focus();
      return ok;
    };
    if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(text).then(()=>'clipboard',()=>legacy()?'legacy':'blocked');
    return Promise.resolve(legacy()?'legacy':'blocked');
  }

  function setOcclusionCopyBox(text){
    const box=elements.occlusionCopyBox;
    box.hidden=text==null;
    elements.occlusionCopyText.value=text||'';
    if(text!=null){setOcclusionListOpen(false);elements.occlusionCopyText.focus();elements.occlusionCopyText.select();}
  }

  function copyOcclusionReport(){
    let text;
    if(viewMode!=='single'){
      /* 다중 비교: 보이는 카드 각각 최신 검사 한 번 → 카드 순서대로 하나의 리포트 */
      const views=Array.from(compareViews.values()).filter(isOcclusionTarget);
      if(!views.length||!currentUrl)return;
      views.forEach(view=>runOcclusionCheck(view,{manual:true}));
      if(!views.some(view=>view.occlusion&&view.occlusion.status!=='no-url'&&view.occlusion.status!=='not-loaded'))return;
      text=formatCompareOcclusionReportText(views.map(buildOcclusionReport));
    }else{
      const view=primaryView;
      if(!view||!isOcclusionTarget(view))return;
      runOcclusionCheck(view,{manual:true});   /* 복사 직전 최신 검사 한 번 — 화면 · 목록 · 리포트가 같은 snapshot */
      const status=view.occlusion&&view.occlusion.status;
      if(!status||status==='no-url'||status==='not-loaded')return;
      text=formatOcclusionReportText(buildOcclusionReport(view));
    }
    const button=elements.occlusionCopy;
    copyTextWithFallback(text).then(result=>{
      if(result==='blocked'){setOcclusionCopyBox(text);announce('자동 복사가 막혔습니다. 표시된 리포트를 직접 복사해 주세요.');return;}
      setOcclusionCopyBox(null);
      clearTimeout(button.copiedTimer);
      button.textContent='복사됨';
      button.copiedTimer=setTimeout(()=>{button.textContent='리포트 복사';},2000);
      announce('검사 결과를 복사했습니다');
    });
  }

  /* 목록 사유 표기(판정 순서 그대로: 하드웨어 → OS UI → 브라우저 UI → safe-area) */
  const OCCLUSION_LIST_LABELS={hardware:'하드웨어',os:'OS UI',browser:'브라우저 UI',safe:'safe-area'};
  function formatOcclusionReasons(reasons){return OCCLUSION_KINDS.filter(kind=>reasons.indexOf(kind)>=0).map(kind=>OCCLUSION_LIST_LABELS[kind]).join(' + ');}

  /* 결과 목록: 같은 출처 검사 성공일 때만 버튼 표시(0개면 비활성). 검사마다 통째로 다시 만든다(이전 요소 참조를 남기지 않음) */
  /* entries = [{view, state}] — 단일 보기는 1개(그룹 제목 없음, 이전과 같은 목록), 다중 비교는 카드 순서대로 기기별 그룹.
   * 결과 0개인 카드는 그룹을 만들지 않고, 자동 검사 불가 · 큰 페이지 카드는 목록 끝에 이유만 한 줄 */
  function renderOcclusionList(entries){
    const grouped=Boolean(entries)&&viewMode!=='single';
    const okEntries=entries?entries.filter(entry=>entry.state&&entry.state.status==='ok'):[];
    const total=okEntries.reduce((sum,entry)=>sum+entry.state.results.length,0);
    const button=elements.occlusionListBtn;
    button.hidden=!okEntries.length;
    button.disabled=!total;
    const items=[];
    okEntries.forEach(({view,state})=>{
      if(!state.results.length)return;
      const name=getDeviceName(view);
      if(grouped){
        const li=document.createElement('li');
        const title=document.createElement('p');title.className='oi_group';title.textContent=name;
        li.appendChild(title);
        items.push(li);
      }
      state.results.forEach((result,index)=>{
        const li=document.createElement('li');
        const item=document.createElement('button');
        item.type='button';
        item.dataset.index=String(index);
        if(grouped)item.dataset.view=view.deviceId;
        item.setAttribute('aria-label',(grouped?name+' ':'')+(index+1)+'번 '+result.label+', '+result.position+', '+formatOcclusionReasons(result.reasons)+' — 미리보기에서 강조');
        const num=document.createElement('span');num.className='oi_num';num.textContent=String(index+1);
        const label=document.createElement('span');label.className='oi_name';label.textContent=result.label;
        const meta=document.createElement('span');meta.className='oi_meta';meta.textContent=result.position+' · '+formatOcclusionReasons(result.reasons);
        item.append(num,label,meta);
        li.appendChild(item);
        items.push(li);
      });
    });
    if(grouped)entries.forEach(({view,state})=>{
      if(!state||state.status==='ok'||state.status==='no-url'||state.status==='not-loaded')return;
      const li=document.createElement('li');
      const skip=document.createElement('p');skip.className='oi_skip';
      skip.textContent=getDeviceName(view)+' — '+(state.status==='manual'?'큰 페이지 · 다시 검사 필요':'자동 검사 불가 · '+(scrollAccessReasons[state.status]||state.status).split(' · ')[0]);
      li.appendChild(skip);
      items.push(li);
    });
    elements.occlusionItems.replaceChildren(...items);
    elements.occlusionListNote.textContent='';
    if(!total)setOcclusionListOpen(false);
  }

  function setOcclusionListOpen(open,focusButton){
    const show=Boolean(open)&&!elements.occlusionListBtn.hidden&&!elements.occlusionListBtn.disabled;
    elements.occlusionList.hidden=!show;
    elements.occlusionListBtn.setAttribute('aria-expanded',show?'true':'false');
    elements.occlusionListBtn.textContent=show?'결과 닫기':'결과 보기';
    if(!show&&focusButton&&!elements.occlusionListBtn.hidden)elements.occlusionListBtn.focus();
  }

  /* 목록 항목 강조: 요소의 "현재" rect 를 다시 읽어 가림 레이어 위에 약 1.8초 표시. iframe 안은 건드리지 않고 스크롤도 하지 않는다 */
  const OCCLUSION_FOCUS_MS=1800;
  function highlightOcclusionResult(view,index){
    const state=view&&view.occlusion;
    const result=state&&state.status==='ok'?state.results[index]:null;
    const note=elements.occlusionListNote;
    /* 강조는 한 번에 하나: 다른 카드에 남은 강조도 지운다 */
    allViews().forEach(other=>{clearTimeout(other.occlusionFocusTimer);if(other.occlusionFocus){other.occlusionFocus.remove();other.occlusionFocus=null;}});
    const prefix=view&&viewMode!=='single'?getDeviceName(view)+' ':'';
    if(!result||!isOcclusionTarget(view)){note.textContent='요소가 변경됨 · 다시 검사 필요';return;}
    const access=getScrollAccess(view);
    const el=result.el;
    if(!access.accessible||!el||!el.isConnected||el.ownerDocument!==access.win.document){note.textContent=prefix+(index+1)+'번 요소가 변경됨 · 다시 검사 필요';return;}
    const win=access.win,doc=win.document;
    const r=el.getBoundingClientRect();
    const vw=doc.documentElement.clientWidth,vh=doc.documentElement.clientHeight;
    const x0=Math.max(0,r.left),y0=Math.max(0,r.top),x1=Math.min(vw,r.right),y1=Math.min(vh,r.bottom);
    if(r.width<=0||r.height<=0||x1-x0<1||y1-y0<1){note.textContent=prefix+(index+1)+'번 요소가 지금 화면에 보이지 않음 · 다시 검사 필요';return;}
    const viewport=getSiteViewport(view);
    const rect={x:x0+viewport.left,y:y0+viewport.top,w:x1-x0,h:y1-y0};
    const moved=Math.abs(rect.x-result.rect.x)>1||Math.abs(rect.y-result.rect.y)>1||Math.abs(rect.w-result.rect.w)>1||Math.abs(rect.h-result.rect.h)>1;
    const unstuck=result.position==='sticky'&&!isStickyStuck(win.getComputedStyle(el),r,vw,vh);
    const span=document.createElement('span');
    span.className='oe_focus'+(moved||unstuck?' is_stale':'');
    placeOcclusionBox(view,span,rect.x,rect.y,rect.w,rect.h);
    const number=document.createElement('i');number.className='oe_num';number.textContent=String(index+1);span.appendChild(number);
    view.dom.occlusionLayer.appendChild(span);
    view.occlusionFocus=span;
    view.occlusionFocusTimer=setTimeout(()=>{span.remove();if(view.occlusionFocus===span)view.occlusionFocus=null;},OCCLUSION_FOCUS_MS);
    note.textContent=unstuck?prefix+(index+1)+'번 sticky 가 지금은 붙어 있지 않음(현재 위치 표시) · 결과가 오래됨 — 다시 검사 필요'
      :moved?prefix+(index+1)+'번 요소 위치가 검사 이후 바뀜(현재 위치 표시) · 다시 검사 필요':'';
  }

  function setOcclusionEnabled(enabled){
    occlusionEnabled=Boolean(enabled);
    if(primaryView){
      if(occlusionEnabled)visibleViews().forEach(view=>runOcclusionCheck(view,{}));   /* 단일 = primaryView, 다중 비교 = 보이는 카드 각각 */
      else allViews().forEach(resetOcclusionView);
    }
    updateOcclusionStatus();
  }

  /* 동기화 스위치를 켤 때: 첫 접근 가능 카드 기준으로 즉시 정렬 */
  function realignScrollSync(){
    const reference=Array.from(compareViews.values()).find(view=>getSyncAccess(view).mode);
    if(reference)broadcastScroll(reference);
  }

  /* 스위치 활성/비활성 + 안내 문구 + 카드 배지. 접근 가능한 카드가 하나도 없으면 스위치를 끈 상태로 비활성화한다 */
  function updateSyncAvailability(){
    const compare=viewMode==='compare';
    const views=Array.from(compareViews.values());
    const predicted=predictScrollAccess(currentUrl);
    /* direct(같은 출처) · bridge(Scroll Bridge 확장 READY) 둘 다 "동기화 가능". 확장 확인 중(bridge-pending) 은 불러오는 중과 같이 다룬다 */
    const accesses=views.map(view=>getSyncAccess(view));
    const accessibleCount=accesses.filter(access=>access.mode).length;
    const bridgeCount=accesses.filter(access=>access.mode==='bridge').length;
    const loading=accesses.some(access=>access.reason==='not-loaded');
    const checking=accesses.some(access=>access.reason==='bridge-pending');
    const blocked=compare&&Boolean(currentUrl)&&!loading&&!checking&&views.length>0&&accessibleCount===0;
    elements.syncScroll.disabled=blocked;
    elements.syncScroll.checked=syncOptions.scroll&&!blocked;
    views.forEach((view,index)=>{
      const access=accesses[index];
      const badge=view.dom.badge;
      if(!badge)return;
      const show=Boolean(currentUrl)&&!access.mode&&access.reason!=='not-loaded'&&access.reason!=='bridge-pending';
      badge.hidden=!show;
      badge.textContent=show?'동기화 불가':'';
      badge.title=show?'스크롤 동기화 불가 · '+syncAccessReasons[access.reason]:'';
    });
    if(!compare){elements.compareNote.textContent='';elements.compareNote.title='';return;}
    const how=bridgeCount===0?'같은 출처':bridgeCount===accessibleCount?'확장 브리지':'같은 출처 + 확장 브리지';
    let note='';
    if(!currentUrl)note='스크롤 동기화는 이 도구와 같은 출처('+(location.origin==='null'?'file://':location.origin)+')의 페이지에서, 다른 출처 페이지는 Scroll Bridge 확장을 설치하면 동작합니다.';
    else if(predicted==='file-origin')note='도구가 file:// 로 열려 있어 스크롤 동기화를 쓸 수 없습니다. Live Server 등 http 서버로 index.html 을 열고 같은 서버의 페이지를 불러와 주세요.';
    else if(loading)note='불러오는 중…';
    else if(checking&&accessibleCount<views.length)note='스크롤 동기화 확인 중… (Scroll Bridge 확장 응답 대기)';
    else if(accessibleCount===0)note='스크롤 동기화 불가: 다른 출처('+safeOrigin(currentUrl)+')의 페이지는 Scroll Bridge 연결이 필요합니다 — 연결 안 됨 · 확장 설치 및 사이트 접근 권한 확인(사용법.txt 참고).';
    else if(accessibleCount<views.length)note='스크롤 동기화 일부만 가능 ('+accessibleCount+' / '+views.length+', '+how+') · 나머지 카드는 따라오지 않습니다.';
    else note=syncOptions.scroll?'스크롤 동기화 동작 중 ('+how+')':'스크롤 동기화 꺼짐';
    /* 페이지 이동 동기화(2026-10-22): 연결된 브리지가 READY 에 features.navigate 를 알리지 않은 카드가 있으면(구버전 확장) 한 줄 덧붙임.
     * 같은 출처 카드 · 브리지가 없는 카드는 해당 없음(기존 안내 그대로), 버전 문자열은 비교하지 않는다 */
    const navOutdated=Boolean(currentUrl)&&syncOptions.navigate&&views.some(view=>view.bridge&&view.bridge.state==='ready'&&!view.bridge.navigate);
    if(navOutdated)note+=(note?' · ':'')+'페이지 이동: Scroll Bridge 업데이트 필요';
    elements.compareNote.textContent=note;
    elements.compareNote.title=navOutdated?'페이지 이동 동기화는 Scroll Bridge 1.2.0 이상이 필요합니다.':'';
  }

  function safeOrigin(url){try{return new URL(url).origin;}catch(error){return url;}}

  /* 이전 이름 호환 */
  function updateCompareNote(){updateSyncAvailability();}

  /* ------------------------------------------------------------------
   * 사이드바·상태 버튼 렌더
   * ------------------------------------------------------------------ */
  function getDeviceSizeLabel(device){
    if(device.sizeLabel)return device.sizeLabel;
    if(device.states.length>1)return device.states.length+'개 상태';
    const state=device.states[0];
    return state.width+' × '+state.height;
  }

  /* 단일 보기: aria-pressed 토글 버튼 · 다중 비교: label + checkbox (최대 MAX_COMPARE) */
  function createDeviceButton(id,device){
    const compare=viewMode==='compare';
    const button=document.createElement(compare?'label':'button');
    button.className='device_btn'+(compare?' is_check':'');
    button.dataset.device=id;
    if(compare){
      const input=document.createElement('input');
      input.type='checkbox';
      input.className='device_check';
      input.value=id;
      input.setAttribute('aria-describedby','compareCount');
      button.appendChild(input);
    }else{
      button.type='button';
      button.setAttribute('aria-pressed','false');
    }
    const text=document.createElement('span');
    text.className='device_text';
    const name=document.createElement('strong');
    name.textContent=device.name;
    const subtitle=document.createElement('small');
    subtitle.textContent=device.subtitle||device.note||'';
    text.append(name,subtitle);
    const size=document.createElement('span');
    size.className='device_size';
    size.textContent=getDeviceSizeLabel(device);
    button.append(text,size);
    return button;
  }

  function renderDeviceNav(){
    const fragment=document.createDocumentFragment();
    const groupIds=deviceGroups.map(group=>group.id);
    const groups=deviceGroups.concat(Object.keys(devices).some(id=>!groupIds.includes(devices[id].group))?[{id:'__other',label:'기타'}]:[]);
    groups.forEach(group=>{
      const ids=Object.keys(devices).filter(id=>group.id==='__other'?!groupIds.includes(devices[id].group):devices[id].group===group.id);
      if(!ids.length)return;
      const section=document.createElement('section');
      section.className='device_group';
      section.setAttribute('aria-labelledby','deviceGroup-'+group.id);
      if(group.kind)section.dataset.kind=group.kind;   /* generic: 실기기가 아닌 Breakpoint 테스트 그룹 (CSS 가 제목 안내·항목 마감을 구분) */
      const heading=document.createElement('h3');
      heading.id='deviceGroup-'+group.id;
      heading.textContent=group.label;
      if(group.hint){const hint=document.createElement('span');hint.className='group_hint';hint.textContent=group.hint;heading.appendChild(hint);}
      const list=document.createElement('div');
      list.className='device_list';
      ids.forEach(id=>list.appendChild(createDeviceButton(id,devices[id])));
      section.append(heading,list);
      fragment.appendChild(section);
    });
    elements.deviceNav.replaceChildren(fragment);
    elements.deviceButtons=Array.from(elements.deviceNav.querySelectorAll('.device_btn'));
    elements.deviceCount.textContent=String(Object.keys(devices).length);
    updateDeviceButtons();
  }

  function updateDeviceButtons(){
    const compare=viewMode==='compare';
    const full=compareViews.size>=MAX_COMPARE;
    elements.deviceButtons.forEach(button=>{
      const id=button.dataset.device;
      if(compare){
        const input=button.querySelector('.device_check');
        const selected=compareViews.has(id);
        input.checked=selected;
        input.disabled=full&&!selected;
        button.classList.toggle('is_current',selected);
        button.classList.toggle('is_disabled',full&&!selected);
        button.title=full&&!selected?'최대 '+MAX_COMPARE+'개까지 비교할 수 있습니다.':'';
      }else{
        const active=id===primaryView.deviceId;
        button.classList.toggle('is_current',active);
        button.setAttribute('aria-pressed',String(active));
      }
    });
  }

  /* 접힘/펼침 상태 버튼(단일 보기). 기기가 바뀔 때만 다시 만들고, 상태 전환은 updateStateButtons() 로 표시만 바꾼다.
   * 단일 화면 기기·다중 비교에서도 같은 자리에 안내 텍스트를 두어 컨트롤 패널의 영역 배치가 흔들리지 않게 한다. */
  function renderStates(){
    const device=getDevice(primaryView);
    const fragment=document.createDocumentFragment();
    const foldable=viewMode==='single'&&Boolean(device&&device.states.length>1);
    if(foldable){
      device.states.forEach(state=>{
        const button=document.createElement('button');
        button.type='button';
        button.className='state_btn';
        button.dataset.state=state.id;
        button.textContent=state.label;
        button.setAttribute('aria-pressed','false');
        fragment.appendChild(button);
      });
    }else{
      const single=document.createElement('span');
      single.className='state_single';
      single.textContent=viewMode==='compare'?'카드별 설정':'단일 화면';
      fragment.appendChild(single);
    }
    elements.stateList.replaceChildren(fragment);
    elements.foldControls.classList.toggle('is_single',!foldable);
    /* 단일 보기에서 고를 상태가 하나뿐이면 조작할 것이 없으므로 그룹 전체를 숨긴다(2026-11-09). 다중 비교의 "카드별 설정" 안내는 그대로 */
    elements.foldControls.hidden=viewMode==='single'&&!foldable;
    updateStateButtons();
  }

  function updateStateButtons(){
    elements.stateList.querySelectorAll('.state_btn').forEach(button=>{
      const active=button.dataset.state===primaryView.stateId;
      button.classList.toggle('is_current',active);
      button.setAttribute('aria-pressed',String(active));
    });
  }

  /* 실행 환경 검사(2026-10-07): 부모 문서에 임시 overflow:scroll 상자를 만들어 classic 스크롤바 폭(offsetWidth − clientWidth) 을 잰다.
   * overlay 스크롤바 모드(실기기와 같은 배치) 면 0 → 아무것도 표시하지 않고, 0 보다 크면 그 폭만큼 iframe 콘텐츠가 좁아지므로 상단에 한 줄 안내만 띄운다.
   * 감지·안내만 하며 iframe 폭·사이트 CSS 는 건드리지 않는다. UA·브라우저 이름으로 판정하지 않는다 */
  function measureScrollbarWidth(){
    const probe=document.createElement('div');
    probe.style.cssText='position:absolute;top:-9999px;left:-9999px;width:100px;height:100px;overflow:scroll;visibility:hidden';
    document.body.appendChild(probe);
    const width=probe.offsetWidth-probe.clientWidth;
    probe.remove();
    return width;
  }
  function checkScrollbarEnvironment(){
    const width=measureScrollbarWidth();
    elements.envNotice.hidden=!(width>0);
    if(width>0){
      elements.envNoticeText.textContent='테스트 환경 주의: 이 브라우저의 스크롤바가 미리보기 콘텐츠 폭을 '+width+'px 줄이고 있어 실기기와 줄바꿈·배치가 다를 수 있습니다. 전용 Chrome(Go Live)으로 실행해 주세요.';
      elements.envNotice.title='overlay 스크롤바 모드가 아닌 브라우저입니다(측정한 스크롤바 폭 '+width+'px). device_preview 폴더에서 Go Live 로 실행하면 전용 Chrome 이 --enable-features=OverlayScrollbar 로 열립니다.';
    }
  }

  /* 개발용 데이터 검사: 누락·오타를 콘솔에 알리고 동작에는 영향을 주지 않음 */
  function validateDevices(){
    if(typeof console==='undefined')return;
    const warn=message=>console.warn('[반응형 테스트랩] '+message);
    const groupIds=deviceGroups.map(group=>group.id);
    const cutoutTypes=['none','notch','island','hole','dual-hole'];
    const hingeTypes=['horizontal','vertical','gap-vertical'];
    Object.keys(frameProfiles).forEach(id=>{
      const profile=frameProfiles[id];
      if(profile.cutout&&!cutoutTypes.includes(profile.cutout.type))warn('frameProfiles["'+id+'"]: 알 수 없는 cutout.type "'+profile.cutout.type+'"');
      if(!profile.safeArea)warn('frameProfiles["'+id+'"]: safeArea 누락');
      if(!profile.family)warn('frameProfiles["'+id+'"]: family 누락 (neutral 로 표시됨)');
      if(!profile.source)warn('frameProfiles["'+id+'"]: source 메타데이터 누락 (official/derived/photo-measured/approximation 표기 필요)');
    });
    Object.keys(devices).forEach(id=>{
      const device=devices[id];
      const where='devices["'+id+'"]';
      if(!device.name)warn(where+': name 누락');
      if(!groupIds.includes(device.group))warn(where+': group "'+device.group+'" 이(가) deviceGroups 에 없음');
      if(!Array.isArray(device.states)||!device.states.length){warn(where+': states 누락');return;}
      device.states.forEach(state=>{
        const stateWhere=where+'.states["'+state.id+'"]';
        if(!(state.width>0&&state.height>0))warn(stateWhere+': width/height 누락');
        const frame=state.frame||device.frame;
        if(!frameProfiles[frame])warn(stateWhere+': frame "'+frame+'" 이(가) frameProfiles 에 없음');
        const raw=state.browser||device.browser;
        if(raw&&!browserProfiles[browserAliases[raw]||raw])warn(stateWhere+': browser "'+raw+'" 이(가) browserProfiles 에 없음');
        if(state.hinge&&!hingeTypes.includes(state.hinge))warn(stateWhere+': 알 수 없는 hinge "'+state.hinge+'"');
        if(state.orientation&&!['portrait','landscape'].includes(state.orientation))warn(stateWhere+': 알 수 없는 orientation "'+state.orientation+'"');
      });
    });
  }

  /* ------------------------------------------------------------------
   * 렌더: view 하나 → 셸·밴드·힌지·배율. 컨트롤 패널 갱신은 updateControls() 가 담당.
   * ------------------------------------------------------------------ */
  function renderView(view){
    const shell=view.dom.shell;
    shell.style.setProperty('--viewport-width',view.currentWidth+'px');   /* 기기 전체 화면(CSS px) */
    shell.style.setProperty('--viewport-height',view.currentHeight+'px');
    updateFrame(view);
    const siteViewport=updateBrowserChrome(view);
    updateHinge(view);
    updateScale(view);
    view.dom.siteFrame.title=getDeviceName(view)+' 사이트 표시 영역 '+siteViewport.width+' × '+siteViewport.height+' 미리보기';
    if(view.compare)updateCompareItem(view,siteViewport);
    scheduleOcclusionCheck(view,OCCLUSION_RENDER_DELAY);   /* 가림 검사(켜져 있을 때만): iframe 크기 전환이 끝난 뒤 최종 rect 로 */
    return siteViewport;
  }

  function describeView(view,siteViewport){
    const viewport=siteViewport||getSiteViewport(view);
    return getDeviceName(view)+', '+viewport.bands.label+', 전체 화면 '+view.currentWidth+' × '+view.currentHeight+' 픽셀, 사이트 영역 '+viewport.width+' × '+viewport.height+' 픽셀'+(viewport.overlay?' (브라우저 UI 겹침, 가시 높이 '+viewport.visibleHeight+' 픽셀)':'')+', '+getOrientationLabel(view)+', '+view.frameProfile.obstruction+' 프레임';
  }

  function updateControls(){
    const compare=viewMode==='compare';
    const view=getControlView();
    elements.controlPanel.dataset.viewMode=viewMode;
    elements.previewArea.dataset.viewMode=viewMode;
    if(compare){
      const views=Array.from(compareViews.values());
      elements.currentDevice.textContent='다중 비교';
      elements.currentMeta.textContent=views.length?views.map(item=>{const viewport=getSiteViewport(item);return getDeviceName(item)+' '+viewport.width+'×'+viewport.height;}).join(' · '):'왼쪽 목록에서 기기를 선택해 주세요 (최대 '+MAX_COMPARE+'개)';
      elements.presetNote.title='';
      elements.presetNote.textContent='비교 기기 '+views.length+' / '+MAX_COMPARE+' · 공통 제어는 모든 기기에 적용됩니다';
      elements.rotateBtn.setAttribute('aria-pressed',views.length&&views.every(item=>item.rotated)?'true':'false');
    }else{
      const device=getDevice(view);
      const state=getState(view);
      const siteViewport=getSiteViewport(view);
      const physical=getPhysicalResolution(view);
      const keyboardInset=keyboardApplies(view)?getKeyboardInset(view,siteViewport):0;
      const siteLabel=siteViewport.width+' × '+(keyboardInset&&keyboardMode==='resize'?(siteViewport.height-keyboardInset)+' (가상 키보드 '+keyboardInset+')':siteViewport.height+(siteViewport.overlay?' (가시 '+siteViewport.visibleHeight+')':'')+(keyboardInset?' (가상 키보드 '+keyboardInset+' 겹침)':''));
      elements.currentDevice.textContent=getDeviceName(view);
      elements.currentMeta.textContent='사이트 '+siteLabel+(getDpr(view)?' · DPR '+getDpr(view):'')+' · '+getOrientationLabel(view);
      appendBreakpointRange(elements.currentMeta,siteViewport.width);
      elements.presetNote.title=device&&device.noteDetail||'';   /* 상세 근거(근사값 조건) 는 tooltip 으로만 — footer 는 짧은 값(2026-10-16, 현재 MacBook) */
      elements.presetNote.textContent=(physical?'물리 '+physical.width+' × '+physical.height+' · ':'')+(state&&state.note?state.note:device?device.note:'직접 입력한 CSS 화면 · 기기 가림 없음');
      elements.rotateBtn.setAttribute('aria-pressed',view.rotated?'true':'false');
    }
    elements.rotateBtn.disabled=compare?Array.from(compareViews.values()).every(isRotationLocked)&&compareViews.size>0:isRotationLocked(view);
    elements.viewportWidth.value=primaryView.currentWidth;
    elements.viewportHeight.value=primaryView.currentHeight;
    [elements.viewportWidth,elements.viewportHeight,elements.applySize].forEach(el=>{el.disabled=compare;el.title=compare?'직접 크기 입력은 단일 보기에서 사용합니다.':'';});
    elements.uiOverlayToggle.checked=uiMode==='overlay';
    elements.safeAreaBtn.setAttribute('aria-pressed',safeAreaGuide?'true':'false');
    renderBrowserOptions();
    syncUrlPositionControls();
    syncScaleControls();
    updateCompareBar();
    syncSafariDesktop();
    syncKeyboardControls();
  }

  /* 단일 보기 갱신 (기존 진입점 유지) */
  function updatePreview(options){
    const settings=options||{};
    const siteViewport=renderView(primaryView);
    updateControls();
    if(settings.announce!==false)announce(describeView(primaryView,siteViewport)+'으로 변경되었습니다.');
  }

  /* 전역 표시 설정이 바뀌었을 때: 보이는 view 를 모두 다시 그린다 (숨겨진 primaryView 도 함께 맞춰 두어 모드 전환 시 일관되게) */
  function refreshViews(options){
    const settings=options||{};
    if(viewMode==='compare'){
      allViews().forEach(renderView);
      updateControls();
      if(settings.announce!==false)announce(settings.message||('비교 기기 '+compareViews.size+'개에 적용되었습니다.'));
    }else{
      updatePreview(settings);
    }
  }

  function applyBaseSize(view,width,height,keepRotation){
    view.baseWidth=width;
    view.baseHeight=height;
    if(!keepRotation)view.rotated=false;
    view.currentWidth=view.rotated?height:width;
    view.currentHeight=view.rotated?width:height;
  }

  function setViewDevice(view,deviceId,stateId,rotated){
    const device=devices[deviceId];
    if(!device)return false;
    view.deviceId=deviceId;
    view.stateId=device.states.some(state=>state.id===stateId)?stateId:device.states[0].id;
    view.rotated=Boolean(rotated);
    const state=getState(view);
    applyBaseSize(view,state.width,state.height,true);
    return true;
  }

  /* ------------------------------------------------------------------
   * Safari(macOS) 버전 · CSS 호환성 검사(2026-10-15) — 가림 검사와 별개 기능
   *
   * 미리보기는 Chrome(Blink) iframe 이라 Safari 렌더링을 재현하지 않는다. 이 검사는 같은 출처 페이지가 쓰는 CSS 를
   * 선택한 Safari 버전의 지원 데이터(MDN browser-compat-data 에서 Safari macOS 부분만 뽑은 safari-css-data.js, 처음 쓸 때만 불러옴) 와 비교한다.
   * CSS.supports() 는 실행 중인 Chrome 의 지원 여부라 쓰지 않는다.
   *
   * 검사 범위: 읽을 수 있는 스타일시트의 스타일 규칙(중첩 · @media · @supports · @layer · @container 안 포함) · @keyframes 선언 · style 속성,
   *   속성 이름 · 값 키워드 · 값 함수 · 길이 단위 · @규칙 이름 · -webkit- 접두어. 선택자 · @media 기능 · 문맥별 하위 기능(flex 안 gap 등) 은 판정하지 않는다.
   * 한계: Chrome 이 해석하지 못한 선언(다른 브라우저 전용 문법 · Chrome 미지원 -webkit- 속성) 은 CSSOM 에 남지 않아 보이지 않는다.
   *   그래서 "접두어 필요" 항목은 같은 시트 원문에 접두어 선언이 있는지만 추가로 확인하고(있으면 확인 필요로 낮춤) 원문을 따로 해석하지는 않는다.
   * 개인정보: 요소 이름은 tag / id / class(가림 검사와 같은 요약), 값 안의 문자열 · url() 은 지운다. 페이지 본문 · 입력값은 읽지 않는다.
   * ------------------------------------------------------------------ */
  const SAFARI_DESKTOP_ID='mac-safari';
  const COMPAT_ORDER={no:0,prefix:1,partial:2,check:3,nodata:4};
  const COMPAT_LABELS={no:'미지원',prefix:'접두어 필요',partial:'부분 지원',check:'확인 필요',nodata:'데이터 없음'};
  const COMPAT_AT_RULES={CSSContainerRule:'container',CSSLayerBlockRule:'layer',CSSLayerStatementRule:'layer',CSSScopeRule:'scope',CSSStartingStyleRule:'starting-style',CSSPropertyRule:'property',CSSFontPaletteValuesRule:'font-palette-values',CSSCounterStyleRule:'counter-style',CSSFontFeatureValuesRule:'font-feature-values',CSSViewTransitionRule:'view-transition',CSSPositionTryRule:'position-try',CSSFunctionRule:'function'};
  const COMPAT_MAX_ITEMS=300,COMPAT_MAX_RULES=30000,COMPAT_MAX_INLINE=3000;
  let compatDom=null;

  function getCompatDom(){
    if(!compatDom)compatDom={row:document.getElementById('safariVersionRow'),select:document.getElementById('safariVersion'),btn:document.getElementById('compatBtn'),status:document.getElementById('compatStatus'),text:document.getElementById('compatText'),listBtn:document.getElementById('compatListBtn'),recheck:document.getElementById('compatRecheck'),list:document.getElementById('compatList'),note:document.getElementById('compatNote'),items:document.getElementById('compatItems')};
    return compatDom;
  }

  function loadSafariCssData(){
    if(window.DevicePreviewSafariCss)return Promise.resolve(window.DevicePreviewSafariCss);
    if(!safariDataPromise)safariDataPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='safari-css-data.js';
      script.onload=()=>window.DevicePreviewSafariCss?resolve(window.DevicePreviewSafariCss):reject(new Error('데이터가 비어 있습니다'));
      script.onerror=()=>{safariDataPromise=null;reject(new Error('safari-css-data.js 를 불러오지 못했습니다'));};
      document.head.appendChild(script);
    });
    return safariDataPromise;
  }

  function isDesktopSafariView(view){return Boolean(view&&view.frameProfile)&&resolveBrowserId(view)===SAFARI_DESKTOP_ID;}

  /* 버전 행 · 검사 버튼: 단일 보기 + 데스크톱 Safari 일 때만 */
  function syncSafariDesktop(){
    const dom=getCompatDom();
    if(!dom.row)return;
    const available=viewMode==='single'&&isDesktopSafariView(getControlView());
    dom.row.hidden=!available;
    elements.browserControls.dataset.macSafari=available?'true':'false';
    if(!available)setBrowserSettingsOpen(false);
    dom.btn.disabled=!available;
    dom.btn.title=available?'Safari 호환성 검사 — 선택한 Safari 버전의 CSS 지원 데이터(MDN) 로 같은 출처 페이지의 CSS 를 확인합니다. 실제 Safari 렌더링이 아닙니다':'Safari 호환성 검사 — MacBook 에서 Safari 를 고른 단일 보기에서 사용할 수 있습니다';
    if(available&&!dom.select.options.length)loadSafariCssData().then(fillSafariVersions).catch(()=>{});
    updateCompatStatus();
  }

  /* 브라우저 설정 popover(MacBook + Safari): 주소창 · 위치 · 툴바 · UI 겹침의 기존 컨트롤을 그대로 담은 .browser_settings 를 열고 닫기만 한다.
   * 다른 기기에서는 버튼이 숨겨지고 .browser_settings 가 display: contents 라 이 상태와 무관하다. Esc · 바깥 클릭 · 포커스가 밖으로 나가면 닫힘 */
  function setBrowserSettingsOpen(open,returnFocus){
    const btn=document.getElementById('browserSettingsBtn'),panel=document.getElementById('browserSettings');
    if(!btn||!panel)return;
    btn.setAttribute('aria-expanded',open?'true':'false');
    panel.classList.toggle('is_open',open);
    if(returnFocus)btn.focus();
  }
  function bindBrowserSettings(){
    const btn=document.getElementById('browserSettingsBtn'),panel=document.getElementById('browserSettings');
    const isOpen=()=>btn.getAttribute('aria-expanded')==='true';
    btn.addEventListener('click',()=>setBrowserSettingsOpen(!isOpen()));
    [btn,panel].forEach(el=>el.addEventListener('keydown',event=>{if(event.key==='Escape'&&isOpen()){event.preventDefault();setBrowserSettingsOpen(false,true);}}));
    panel.addEventListener('focusout',event=>{if(isOpen()&&event.relatedTarget&&!panel.contains(event.relatedTarget)&&event.relatedTarget!==btn)setBrowserSettingsOpen(false);});
    document.addEventListener('pointerdown',event=>{if(isOpen()&&!panel.contains(event.target)&&!btn.contains(event.target))setBrowserSettingsOpen(false);});
  }

  /* 테스트 상태 프리셋(2026-11-09): 이미 있는 설정을 자주 쓰는 조합으로 한 번에 바꾸는 단축 동작. 프리셋은 상태 snapshot 이 아니라
   * "그 테스트에 필요한 설정만" 바꾸고(기본만 테스트용 표시를 정리), 각 설정은 기존 setter · 계산 함수 · 저장(saveDisplayPreference) 을 그대로 쓴다.
   * 선택 표시는 프리셋 이름을 저장하지 않고 실제 현재 설정이 조건과 맞는지로 판정한다(개별 컨트롤로 바꾸면 자동으로 풀림). 새 저장 키 없음 */
  const keyboardUsable=()=>visibleViews().some(view=>(view.frameProfile&&view.frameProfile.platform)!=='macos');   /* keyboardApplies 와 같은 MacBook 제외 규칙 */
  const keyboardShown=()=>keyboardEnabled&&keyboardUsable();
  function setUiModeValue(mode){
    if(uiMode===mode)return;
    uiMode=mode;
    elements.uiOverlayToggle.checked=uiMode==='overlay';
    refreshViews();
  }
  function setKeyboardPreset(mode){
    if(keyboardMode!==mode){keyboardMode=mode;if(keyboardEnabled)updateAllKeyboards();}
    if(!keyboardEnabled)setKeyboardEnabled(true);
  }
  const TEST_PRESETS={
    basic:{label:'기본',match:()=>uiMode==='shrink'&&!safeAreaGuide&&!keyboardShown()&&!occlusionEnabled,
      apply(){setUiModeValue('shrink');if(safeAreaGuide)setSafeAreaGuide(false);if(keyboardEnabled)setKeyboardEnabled(false);if(occlusionEnabled)setOcclusionEnabled(false);}},
    overlay:{label:'브라우저 UI 겹침',match:()=>uiMode==='overlay',apply(){setUiModeValue('overlay');}},
    safe:{label:'Safe Area',match:()=>safeAreaGuide,apply(){if(!safeAreaGuide)setSafeAreaGuide(true);}},
    'kb-resize':{label:'키보드 · 화면 축소',keyboard:true,match:()=>keyboardShown()&&keyboardMode==='resize',apply(){setKeyboardPreset('resize');}},
    'kb-overlay':{label:'키보드 · 겹침',keyboard:true,match:()=>keyboardShown()&&keyboardMode==='overlay',apply(){setKeyboardPreset('overlay');}},
    occlusion:{label:'가림 영역 검사',match:()=>occlusionEnabled,apply(){if(!occlusionEnabled)setOcclusionEnabled(true);}}
  };
  function getPresetDom(){return {btn:document.getElementById('presetBtn'),menu:document.getElementById('presetMenu')};}
  /* 목록을 열 때마다 현재 설정으로 다시 판정(선택 표시 = aria-current + 체크). 키보드 프리셋은 보이는 화면이 모두 MacBook 이면 비활성(기존 정책) */
  function syncPresetMenu(){
    const dom=getPresetDom();
    dom.menu.querySelectorAll('.preset_item').forEach(item=>{
      const preset=TEST_PRESETS[item.dataset.preset];
      const blocked=Boolean(preset.keyboard)&&!keyboardUsable();
      item.disabled=blocked;
      item.title=blocked?'MacBook 에서는 가상 키보드를 사용하지 않습니다':'';
      if(!blocked&&preset.match())item.setAttribute('aria-current','true');
      else item.removeAttribute('aria-current');
    });
  }
  function setPresetMenuOpen(open,returnFocus){
    const dom=getPresetDom();
    if(!dom.btn)return;
    if(open){setBrowserSettingsOpen(false);setSafariDetailOpen(false);syncPresetMenu();}
    dom.menu.hidden=!open;
    dom.btn.setAttribute('aria-expanded',open?'true':'false');
    if(open){const first=dom.menu.querySelector('.preset_item[aria-current]:not(:disabled)')||dom.menu.querySelector('.preset_item:not(:disabled)');if(first)first.focus();}
    else if(returnFocus)dom.btn.focus();
  }
  function applyTestPreset(id){
    const preset=TEST_PRESETS[id];
    if(!preset||(preset.keyboard&&!keyboardUsable()))return;
    preset.apply();
    saveDisplayPreference();   /* 각 설정이 원래 저장되던 그대로(viewportLabDisplay) — 프리셋 이름은 저장하지 않음 */
    announce('테스트 상태 "'+preset.label+'" 를 적용했습니다.');
  }
  function bindTestPresets(){
    const dom=getPresetDom();
    if(!dom.btn)return;
    const isOpen=()=>!dom.menu.hidden;
    dom.btn.addEventListener('click',()=>setPresetMenuOpen(!isOpen()));
    dom.menu.addEventListener('click',event=>{
      const item=event.target.closest('.preset_item');
      if(!item||item.disabled)return;
      applyTestPreset(item.dataset.preset);
      setPresetMenuOpen(false,true);
    });
    [dom.btn,dom.menu].forEach(el=>el.addEventListener('keydown',event=>{if(event.key==='Escape'&&isOpen()){event.preventDefault();setPresetMenuOpen(false,true);}}));
    /* 위 · 아래 화살표로 항목 이동(Tab 도 그대로 동작) */
    dom.menu.addEventListener('keydown',event=>{
      if(event.key!=='ArrowDown'&&event.key!=='ArrowUp')return;
      const items=Array.from(dom.menu.querySelectorAll('.preset_item:not(:disabled)'));
      const index=items.indexOf(document.activeElement);
      if(!items.length)return;
      event.preventDefault();
      items[(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length].focus();
    });
    dom.menu.addEventListener('focusout',event=>{if(isOpen()&&event.relatedTarget&&!dom.menu.contains(event.relatedTarget)&&event.relatedTarget!==dom.btn)setPresetMenuOpen(false);});
    document.addEventListener('pointerdown',event=>{if(isOpen()&&!dom.menu.contains(event.target)&&!dom.btn.contains(event.target))setPresetMenuOpen(false);});
    window.addEventListener('blur',()=>{if(isOpen())setPresetMenuOpen(false);});   /* 미리보기 iframe 안을 누르면 부모 문서에 pointerdown 이 오지 않는다 — 포커스가 iframe 으로 가며 창 blur */
  }

  /* Safari 상세 설정 popover(2026-11-09): 기존 탭 레이아웃 · viewport-fit 라디오를 그대로 담은 #safariControls 를 열고 닫기만 한다(값 · 저장 · 계산은 기존 change 핸들러).
   * 테스트 상태 프리셋과 같은 동작 — 클릭 토글 · Esc(버튼으로 포커스) · 바깥 클릭 · 포커스가 밖으로 · 창 blur 에서 닫힘, 열면 현재 선택된 라디오로 포커스 */
  function setSafariDetailOpen(open,returnFocus){
    const btn=elements.safariDetailBtn,panel=elements.safariControls;
    if(!btn||!panel)return;
    if(open){setPresetMenuOpen(false);setBrowserSettingsOpen(false);}
    panel.hidden=!open;
    btn.setAttribute('aria-expanded',open?'true':'false');
    if(open){const first=panel.querySelector('.safari_field:not([hidden]) input:checked');if(first)first.focus();}
    else if(returnFocus)btn.focus();
  }
  function bindSafariDetail(){
    const btn=elements.safariDetailBtn,panel=elements.safariControls;
    if(!btn||!panel)return;
    const isOpen=()=>!panel.hidden;
    btn.addEventListener('click',()=>setSafariDetailOpen(!isOpen()));
    [btn,panel].forEach(el=>el.addEventListener('keydown',event=>{if(event.key==='Escape'&&isOpen()){event.preventDefault();setSafariDetailOpen(false,true);}}));
    panel.addEventListener('focusout',event=>{if(isOpen()&&event.relatedTarget&&!panel.contains(event.relatedTarget)&&event.relatedTarget!==btn)setSafariDetailOpen(false);});
    document.addEventListener('pointerdown',event=>{if(isOpen()&&!panel.contains(event.target)&&!btn.contains(event.target))setSafariDetailOpen(false);});
    window.addEventListener('blur',()=>{if(isOpen())setSafariDetailOpen(false);});
  }

  function fillSafariVersions(data){
    const dom=getCompatDom();
    if(!data.versions.includes(safariVersion))safariVersion=data.current;
    const fragment=document.createDocumentFragment();
    data.versions.slice().reverse().forEach(version=>{
      const option=document.createElement('option');
      option.value=version;
      option.textContent='Safari '+version+(version===data.current?' (현재)':'');
      option.selected=version===safariVersion;
      fragment.appendChild(option);
    });
    dom.select.replaceChildren(fragment);
    updateCompatStatus();
  }

  /* 버전 비교: '17.4' → [17,4], '≤15' → [15,0] */
  function parseSafariVersion(value){
    if(typeof value!=='string')return null;
    const match=value.replace('≤','').match(/^(\d+)(?:\.(\d+))?/);
    return match?[Number(match[1]),Number(match[2]||0)]:null;
  }
  function compareSafariVersion(a,b){return a[0]-b[0]||a[1]-b[1];}
  function formatSafariVersion(v){return v[1]?v[0]+'.'+v[1]:String(v[0]);}

  /* 지원 문장 하나의 선택 버전 판정: yes | no | range(≤ 로만 기록) | unknown-version(true) | nodata */
  function safariStatementAt(statement,version){
    const added=statement.a;
    if(added===null||added===undefined)return 'nodata';
    if(added===false||added==='preview'||statement.f)return 'no';
    if(typeof statement.r==='string'){const removed=parseSafariVersion(statement.r);if(removed&&compareSafariVersion(version,removed)>=0)return 'no';}
    if(added===true)return 'unknown-version';
    const since=parseSafariVersion(added);
    if(!since)return 'nodata';
    if(compareSafariVersion(version,since)>=0)return 'yes';
    return String(added).startsWith('≤')?'range':'no';
  }

  /* 기능 하나(지원 문장 배열) 의 판정 — 데이터가 없으면 지원/미지원으로 추측하지 않는다 */
  function judgeSafariFeature(statements,version){
    if(!statements||!statements.length)return{state:'nodata'};
    const plain=statements.filter(s=>!s.p&&!s.n),prefixed=statements.filter(s=>s.p||s.n);
    let hasData=false,range=false,unknownVersion=false;
    for(const statement of plain){
      const at=safariStatementAt(statement,version);
      if(at!=='nodata')hasData=true;
      if(at==='yes')return statement.x?{state:'partial'}:{state:'ok'};
      if(at==='range')range=true;
      if(at==='unknown-version')unknownVersion=true;
    }
    for(const statement of prefixed){
      const at=safariStatementAt(statement,version);
      if(at!=='nodata')hasData=true;
      if(at==='yes')return{state:'prefix',prefix:statement.p||'',altName:statement.n||'',since:parseSafariVersion(statement.a)};
    }
    if(range)return{state:'check',why:'range'};
    if(unknownVersion)return{state:'check',why:'unknown-version'};
    if(!hasData)return{state:'nodata'};
    const later=plain.map(s=>parseSafariVersion(s.a)).filter(v=>v&&compareSafariVersion(v,version)>0).sort(compareSafariVersion)[0];
    return{state:'no',since:later||null};
  }

  /* 속성 이름 판정: 그대로 있으면 그 항목, -webkit- 등 접두어 이름이면 접두어 없는 항목의 같은 접두어 문장 */
  function judgeSafariProperty(data,prop,version){
    if(data.props[prop])return judgeSafariFeature(data.props[prop],version);
    const match=prop.match(/^-(webkit|moz|ms|o)-(.+)$/);
    if(match&&data.props[match[2]]){
      const own=data.props[match[2]].filter(s=>s.p==='-'+match[1]+'-'||s.n===prop).map(s=>({a:s.a,r:s.r,x:s.x,f:s.f}));
      return judgeSafariFeature(own,version);
    }
    return{state:'nodata'};
  }

  /* 선언 cssText → [속성, 값] (괄호 · 따옴표 안의 ; 는 나누지 않음) */
  function splitDeclarations(cssText){
    const out=[];let depth=0,quote='',start=0;
    for(let i=0;i<=cssText.length;i++){
      const ch=cssText[i];
      if(quote){if(ch==='\\')i++;else if(ch===quote)quote='';continue;}
      if(ch==='"'||ch==="'"){quote=ch;continue;}
      if(ch==='(')depth++;else if(ch===')')depth=Math.max(0,depth-1);
      else if((ch===';'&&depth===0)||i===cssText.length){
        const part=cssText.slice(start,i).trim();start=i+1;
        const colon=part.indexOf(':');
        if(colon>0)out.push([part.slice(0,colon).trim().toLowerCase(),part.slice(colon+1).replace(/!important\s*$/i,'').trim()]);
      }
    }
    return out;
  }

  /* 결과에 남기는 값: 문자열 · url() 내용을 지우고 짧게(페이지 텍스트 · 경로가 리포트에 들어가지 않게) */
  function sanitizeCssValue(value){
    const clean=value.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g,'"…"').replace(/url\([^)]*\)/gi,'url(…)');
    return clean.length>90?clean.slice(0,89)+'…':clean;
  }

  /* 값에서 판정할 수 있는 조각: 함수 이름 · 키워드 · 길이 단위 */
  function safariValueFeatures(data,prop,value){
    const base=prop.replace(/^-(webkit|moz|ms|o)-/,'');
    const text=value.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g,' ').replace(/url\([^)]*\)/gi,' ');
    const found=[];const seen=new Set();
    const push=(kind,name,statements)=>{const key=kind+name;if(!statements||seen.has(key))return;seen.add(key);found.push({kind,name,statements});};
    text.replace(/(-?[a-z][a-z0-9-]*)\(/gi,(m,name)=>{push('함수',name.toLowerCase()+'()',data.funcs[name.toLowerCase()]);return m;});
    text.replace(/(?:^|[^a-z0-9.-])-?(?:\d+\.?\d*|\.\d+)([a-z]+)\b/gi,(m,unit)=>{push('단위',unit.toLowerCase(),data.units[unit.toLowerCase()]);return m;});
    text.replace(/(^|[\s,/(])(-?[a-z][a-z0-9-]*)(?=$|[\s,/)])/gi,(m,lead,word)=>{push('값',word.toLowerCase(),data.props[base+'|'+word.toLowerCase()]);return m;});
    return found;
  }

  function compatReason(result,subject){
    const where=subject?subject+' — ':'';
    if(result.state==='no')return where+(result.since?'Safari '+formatSafariVersion(result.since)+'부터 지원':'Safari 에서 지원하지 않음');
    if(result.state==='prefix')return where+(result.altName?result.altName+' 이름으로만 지원':(result.prefix||'-webkit-')+' 접두어로만 지원')+(result.since?'('+formatSafariVersion(result.since)+'부터)':'');
    if(result.state==='partial')return where+'부분 지원 — 동작 차이를 실제 Safari 에서 확인';
    if(result.state==='check')return where+(result.why==='range'?'지원 시작 버전이 범위(≤)로만 기록됨':result.why==='raw-prefix'?'시트에 '+result.rawName+' 선언이 있음 — 같은 규칙에 있는지 확인':'지원 시작 버전 기록 없음');
    return where+'Safari 지원 데이터 없음 — 판정하지 않음';
  }

  async function scanSafariCompat(doc,data,versionText){
    const version=parseSafariVersion(versionText);
    const items=[];const keys=new Set();const prefixSheets=new Map();
    const stats={sheets:0,unreadable:0,rules:0,inline:0,truncated:false};
    const add=item=>{
      const key=item.where+'\u0001'+item.prop+'\u0001'+item.value;
      if(keys.has(key))return;keys.add(key);
      if(items.length>=COMPAT_MAX_ITEMS){stats.truncated=true;return;}
      items.push(item);
    };
    const checkDeclarations=(style,where,ctx,sheet,fullSelector)=>{
      if(!style||!style.cssText)return;
      splitDeclarations(style.cssText).forEach(([prop,value])=>{
        if(prop.startsWith('--'))return;
        let worst=null;
        const propResult=judgeSafariProperty(data,prop,version);
        if(propResult.state!=='ok')worst=Object.assign({subject:''},propResult);
        if(propResult.state!=='no'&&propResult.state!=='nodata'){
          safariValueFeatures(data,prop,value).forEach(feature=>{
            const result=judgeSafariFeature(feature.statements,version);
            if(result.state==='ok')return;
            if(!worst||COMPAT_ORDER[result.state]<COMPAT_ORDER[worst.state])worst=Object.assign({subject:feature.kind+' '+feature.name},result);
          });
        }
        if(!worst)return;
        const item={where,prop,value:sanitizeCssValue(value),state:worst.state,result:worst,subject:worst.subject,ctx,sheet,selector:fullSelector||''};
        if(worst.state==='prefix'&&!worst.subject&&sheet&&sheet.node){item.rawName=(worst.altName||(worst.prefix||'-webkit-')+prop);if(!prefixSheets.has(sheet.node))prefixSheets.set(sheet.node,[]);prefixSheets.get(sheet.node).push(item);}
        add(item);
      });
    };
    const walk=(list,ctx,sheet)=>{
      for(const rule of Array.from(list||[])){
        if(++stats.rules>COMPAT_MAX_RULES){stats.truncated=true;return;}
        const type=rule.constructor&&rule.constructor.name||'';
        if(typeof rule.selectorText==='string'&&rule.style&&type!=='CSSPageRule'){
          checkDeclarations(rule.style,rule.selectorText.length>80?rule.selectorText.slice(0,79)+'…':rule.selectorText,ctx,sheet,rule.selectorText);
          if(rule.cssRules&&rule.cssRules.length)walk(rule.cssRules,ctx,sheet);
          continue;
        }
        if(type==='CSSImportRule'){try{if(rule.styleSheet)walkSheet(rule.styleSheet,ctx);}catch(error){stats.unreadable++;}continue;}
        const atName=COMPAT_AT_RULES[type];
        if(atName){
          const result=judgeSafariFeature(data.at[atName],version);
          if(result.state!=='ok')add({where:'@'+atName,prop:'@'+atName,value:'',state:result.state,result,subject:'',ctx,sheet});
        }
        if(type==='CSSKeyframesRule'){Array.from(rule.cssRules).forEach(frame=>checkDeclarations(frame.style,'@keyframes '+rule.name+' '+frame.keyText,ctx,sheet));continue;}
        if(type==='CSSFontFaceRule'||type==='CSSPropertyRule'||type==='CSSPageRule'||type==='CSSCounterStyleRule'||type==='CSSFontPaletteValuesRule')continue;   /* 서술자(descriptor) 는 판정하지 않음 */
        if(rule.cssRules)walk(rule.cssRules,type==='CSSSupportsRule'?ctx.concat('@supports'):ctx,sheet);
      }
    };
    const walkSheet=(sheet,ctx)=>{
      let rules;
      try{rules=sheet.cssRules;}catch(error){stats.unreadable++;return;}
      stats.sheets++;
      const href=sheet.href;
      const label=href?(()=>{try{return new URL(href).pathname.split('/').pop()||'(스타일시트)';}catch(error){return '(스타일시트)';}})():'<style>';
      walk(rules,ctx,{label,node:sheet.ownerNode||null,href});
    };
    Array.from(doc.styleSheets).forEach(sheet=>walkSheet(sheet,[]));
    /* style 속성(요소 이름은 tag / id / class 요약만) */
    const inline=doc.querySelectorAll('[style]');
    Array.from(inline).slice(0,COMPAT_MAX_INLINE).forEach(el=>{stats.inline++;checkDeclarations(el.style,describeOcclusionElement(el)+' (style 속성)',[],{label:'style 속성',node:null});});
    if(inline.length>COMPAT_MAX_INLINE)stats.truncated=true;
    /* 접두어 필요 항목: Chrome 이 해석하지 못한 -webkit- 선언은 CSSOM 에 남지 않는다. 같은 시트 원문에서 같은 선택자 블록을 찾아
     *   그 블록에 접두어 선언이 있으면 Safari 에서는 문제없으므로 결과에서 뺀다 · 블록을 못 찾고 시트 어딘가에만 있으면 확인 필요로 낮춘다(원문을 해석하지는 않음) */
    const compact=text=>text.toLowerCase().replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s+/g,' ').replace(/\s*([{};:,>+~])\s*/g,'$1').trim();
    const resolved=new Set();
    for(const [node,list] of prefixSheets){
      let text='';
      try{
        if(node.tagName==='STYLE')text=node.textContent||'';
        else if(node.tagName==='LINK'&&node.href)text=await (await fetch(node.href,{cache:'force-cache',credentials:'same-origin'})).text();
      }catch(error){text='';}
      if(!text)continue;
      const raw=compact(text);
      list.forEach(item=>{
        const name=item.rawName.toLowerCase()+':';
        if(!raw.includes(name))return;
        const selector=compact(item.selector||'');
        let found=false,inBlock=false,from=0;
        while(selector&&(from=raw.indexOf(selector+'{',from))>=0){
          const prev=raw[from-1];
          if(from===0||prev==='}'||prev===';'||prev==='{'||prev===','){found=true;const end=raw.indexOf('}',from);if(raw.slice(from,end<0?undefined:end).includes(name))inBlock=true;}
          from+=selector.length+1;
        }
        if(inBlock)resolved.add(item);
        else if(!found){item.state='check';item.result=Object.assign({},item.result,{state:'check',why:'raw-prefix',rawName:item.rawName});}
      });
    }
    if(resolved.size)for(let i=items.length-1;i>=0;i--)if(resolved.has(items[i]))items.splice(i,1);
    items.sort((a,b)=>COMPAT_ORDER[a.state]-COMPAT_ORDER[b.state]);
    const counts={no:0,prefix:0,partial:0,check:0,nodata:0};
    items.forEach(item=>{counts[item.state]++;});
    return{status:'ok',version:versionText,items,counts,stats,source:data.source};
  }

  function runCompatCheck(){
    if(!compatEnabled)return;
    const view=primaryView;
    const versionAtStart=safariVersion;
    if(!currentUrl){compatResult={status:'no-url'};updateCompatStatus();return;}
    const access=getScrollAccess(view);
    if(!access.accessible){compatResult={status:access.reason};updateCompatStatus();return;}
    compatResult={status:'running'};updateCompatStatus();
    loadSafariCssData().then(data=>{
      if(!getCompatDom().select.options.length)fillSafariVersions(data);
      return scanSafariCompat(access.win.document,data,safariVersion||data.current);
    }).then(result=>{if(compatEnabled&&versionAtStart===safariVersion){compatResult=result;updateCompatStatus();}})
      .catch(error=>{compatResult={status:'error',message:error&&error.message||''};updateCompatStatus();});
  }

  function updateCompatStatus(){
    const dom=getCompatDom();
    if(!dom.status)return;
    const available=!dom.btn.disabled;
    const on=compatEnabled&&available;
    dom.btn.setAttribute('aria-pressed',on?'true':'false');
    dom.status.hidden=!on;
    if(!on){setCompatListOpen(false);return;}
    const versionLabel='Safari '+(safariVersion||'');
    const state=compatResult;
    let text,ok=false;
    if(!state||state.status==='no-url')text=versionLabel+' 호환성 · 검사할 페이지 없음';
    else if(state.status==='running')text=versionLabel+' 호환성 · 검사 중';
    else if(state.status==='not-loaded')text=versionLabel+' 호환성 · 불러오는 중';
    else if(state.status==='cross-origin')text=versionLabel+' 호환성 · 자동 검사 불가 · 다른 출처(CSS 를 읽을 수 없음)';
    else if(state.status==='file-origin')text=versionLabel+' 호환성 · 자동 검사 불가 · file:// 로 열린 도구';
    else if(state.status==='error')text=versionLabel+' 호환성 · 지원 데이터를 불러오지 못했습니다';
    else{
      ok=true;
      const total=state.items.length;
      text=total?'Safari '+state.version+' 기준 확인 필요 '+total+(state.stats.truncated?'+':'')+' ('+Object.keys(COMPAT_LABELS).filter(k=>state.counts[k]).map(k=>COMPAT_LABELS[k]+' '+state.counts[k]).join(' · ')+')':'Safari '+state.version+' 기준 확인 가능한 CSS 호환성 문제 없음';
    }
    dom.text.textContent=text;
    dom.status.title='CSS 지원 데이터(MDN browser-compat-data) 기준이며 실제 Safari 렌더링과 차이가 있을 수 있습니다. 미리보기는 Chrome 엔진입니다.';
    dom.listBtn.hidden=!ok;
    dom.recheck.hidden=!state||state.status==='no-url'||state.status==='running';
    renderCompatList(ok?state:null);
  }

  function renderCompatList(state){
    const dom=getCompatDom();
    if(!state){dom.items.replaceChildren();setCompatListOpen(false);return;}
    const s=state.stats;
    dom.note.textContent='Safari '+state.version+' (macOS) 의 CSS 지원 데이터('+state.source.package+' '+state.source.version+') 와 비교한 결과입니다. 실제 Safari 렌더링이 아니며 미리보기는 Chrome 엔진입니다. '+
      '스타일시트 '+s.sheets+'개 · 규칙 '+s.rules+'개 · style 속성 '+s.inline+'개를 검사했습니다'+(s.unreadable?' · 읽을 수 없는 스타일시트 '+s.unreadable+'개(다른 출처)':'')+(s.truncated?' · 많아서 일부만 표시':'')+
      '. Chrome 이 해석하지 못한 선언과 선택자 · @media 기능은 검사하지 않습니다.';
    const fragment=document.createDocumentFragment();
    if(!state.items.length){const li=document.createElement('li');li.textContent='선택한 Safari 버전 기준으로 확인 가능한 CSS 호환성 문제가 발견되지 않았습니다.';fragment.appendChild(li);}
    state.items.forEach(item=>{
      const li=document.createElement('li');
      const badge=document.createElement('span');badge.className='compat_state';badge.dataset.state=item.state;badge.textContent=COMPAT_LABELS[item.state];
      const where=document.createElement('code');where.className='compat_where';where.textContent=item.where;
      const decl=document.createElement('code');decl.className='compat_decl';decl.textContent=item.value?item.prop+': '+item.value:item.prop;
      const reason=document.createElement('span');reason.className='compat_reason';
      reason.textContent=compatReason(item.result,item.subject)+(item.ctx&&item.ctx.includes('@supports')?' · @supports 안':'')+(item.sheet&&item.sheet.label?' · '+item.sheet.label:'');
      li.append(badge,where,decl,reason);
      fragment.appendChild(li);
    });
    dom.items.replaceChildren(fragment);
  }

  function setCompatListOpen(open,focusButton){
    const dom=getCompatDom();
    if(!dom.list)return;
    const show=Boolean(open)&&!dom.listBtn.hidden;
    dom.list.hidden=!show;
    dom.listBtn.setAttribute('aria-expanded',show?'true':'false');
    if(show&&!elements.occlusionList.hidden)setOcclusionListOpen(false);
    if(!show&&focusButton)dom.listBtn.focus();
  }

  function bindCompatControls(){
    const dom=getCompatDom();
    dom.btn.addEventListener('click',()=>{compatEnabled=!compatEnabled;compatResult=null;updateCompatStatus();if(compatEnabled)runCompatCheck();});
    dom.recheck.addEventListener('click',runCompatCheck);
    dom.listBtn.addEventListener('click',()=>setCompatListOpen(dom.list.hidden));
    dom.select.addEventListener('change',()=>{safariVersion=dom.select.value;saveDisplayPreference();compatResult=null;updateCompatStatus();runCompatCheck();});
    [dom.list,dom.listBtn].forEach(el=>el.addEventListener('keydown',event=>{if(event.key==='Escape'&&!dom.list.hidden){event.preventDefault();setCompatListOpen(false,true);}}));
    elements.occlusionListBtn.addEventListener('click',()=>setCompatListOpen(false));   /* 두 목록이 겹치지 않게 */
  }

  /* 회전하지 않는 기기(MacBook — devices[*].rotatable:false) */
  function isRotationLocked(view){const device=getDevice(view);return Boolean(device&&device.rotatable===false);}

  function toggleRotation(view){
    if(isRotationLocked(view))return;
    const previousWidth=view.currentWidth;
    view.currentWidth=view.currentHeight;
    view.currentHeight=previousWidth;
    view.rotated=!view.rotated;
  }

  /* ------------------------------------------------------------------
   * 단일 보기 조작
   * ------------------------------------------------------------------ */
  function selectDevice(deviceId,stateId,options){
    const settings=options||{};
    if(!setViewDevice(primaryView,deviceId,stateId,settings.rotated))return false;
    updateDeviceButtons();
    renderStates();
    updatePreview({announce:settings.announce});
    savePreference();
    return true;
  }

  function selectState(stateId){
    const device=getDevice(primaryView);
    const state=device&&device.states.find(item=>item.id===stateId);
    if(!state)return false;
    primaryView.stateId=stateId;
    applyBaseSize(primaryView,state.width,state.height,false);
    updateStateButtons();
    updatePreview();
    savePreference();
    return true;
  }

  function applyCustomSize(width,height,options){
    const settings=options||{};
    const nextWidth=Number(width);
    const nextHeight=Number(height);
    if(!Number.isInteger(nextWidth)||!Number.isInteger(nextHeight)||nextWidth<240||nextWidth>2560||nextHeight<240||nextHeight>2560){
      setError(elements.sizeError,'너비와 높이는 240~2560 사이의 정수로 입력해 주세요.');
      return false;
    }
    setError(elements.sizeError,'');
    primaryView.deviceId='custom';
    primaryView.stateId='default';
    primaryView.rotated=Boolean(settings.rotated);
    if(scaleMode==='device')scaleMode='fit';
    applyBaseSize(primaryView,nextWidth,nextHeight,true);
    updateDeviceButtons();
    renderStates();
    updatePreview({announce:settings.announce});
    savePreference();
    saveDisplayPreference();
    return true;
  }

  /* 공통 회전: 단일 보기는 primaryView, 다중 비교는 모든 카드 */
  function rotatePreview(){
    if(viewMode==='compare'){
      compareViews.forEach(toggleRotation);
      refreshViews({message:'비교 기기 '+compareViews.size+'개를 회전했습니다.'});
      saveComparePreference();
      return getViewportInfo();
    }
    toggleRotation(primaryView);
    updatePreview();
    savePreference();
    return getViewportInfo();
  }

  /* ------------------------------------------------------------------
   * 불러오기 (모든 view 에 동시 적용)
   * ------------------------------------------------------------------ */
  function loadUrl(value){
    let url;
    try{url=normalizeUrl(value);}catch(error){setError(elements.urlError,error.message);elements.siteUrl.focus();throw error;}
    setError(elements.urlError,'');
    currentUrl=url;
    elements.siteUrl.value=url;
    allViews().forEach(view=>{updateBrowserChrome(view);loadInto(view);});
    elements.loadStatus.classList.remove('is_loaded');
    elements.loadStatus.classList.add('is_loading');
    elements.frameStatus.textContent='사이트 불러오기를 요청했습니다.';
    elements.refreshBtn.disabled=false;
    compareViews.forEach(view=>{view.dom.refresh.disabled=false;});
    updateSyncAvailability();
    elements.openLink.href=url;
    elements.openLink.classList.remove('is_disabled');
    elements.openLink.removeAttribute('aria-disabled');
    elements.openLink.removeAttribute('tabindex');
    updateNavWatch();
    try{localStorage.setItem('viewportLabUrl',url);}catch(error){}
    return url;
  }

  /* URL 과 프리뷰 표시의 분리(2026-09-22): 기기 셸·비교 카드는 URL 과 무관하게 항상 렌더·표시된다(초기 진입 = 기본/저장 기기 + placeholder).
   * URL 이 없으면 loadInto(view) 가 iframe 에 initialPreviewContent(srcdoc placeholder) 를 넣고, URL 이 들어오면 같은 iframe 의 src 로 교체한다.
   * clearUrl(): URL 을 비우면 모든 view 를 placeholder 로 되돌린다. 기기 프레임·선택 상태는 그대로. */
  function clearUrl(){
    currentUrl='';
    elements.siteUrl.value='';
    setError(elements.urlError,'');
    allViews().forEach(view=>{updateBrowserChrome(view);loadInto(view);});
    elements.loadStatus.classList.remove('is_loading','is_loaded');
    elements.frameStatus.textContent='사이트 주소를 입력해 주세요.';
    elements.refreshBtn.disabled=true;
    compareViews.forEach(view=>{view.dom.refresh.disabled=true;});
    updateSyncAvailability();
    elements.openLink.href='#';
    elements.openLink.classList.add('is_disabled');
    elements.openLink.setAttribute('aria-disabled','true');
    elements.openLink.setAttribute('tabindex','-1');
    updateNavWatch();
    try{localStorage.removeItem('viewportLabUrl');}catch(error){}
    announce('사이트 주소를 지웠습니다. 기기 프레임은 유지되고 미리보기는 자리표시 페이지로 돌아갑니다.');
  }

  /* 공통 새로고침: 보이는 view 전부 */
  function refreshPreview(){
    if(!currentUrl)return false;
    visibleViews().forEach(reloadView);
    elements.loadStatus.classList.remove('is_loaded');
    elements.loadStatus.classList.add('is_loading');
    elements.frameStatus.textContent='미리보기를 새로고침하는 중입니다.';
    return true;
  }

  /* ------------------------------------------------------------------
   * 다중 비교
   * ------------------------------------------------------------------ */
  function updateCompareBar(){
    const compare=viewMode==='compare';
    elements.compareBar.hidden=!compare;
    elements.compareGrid.hidden=!compare;
    elements.previewMount.hidden=compare;
    elements.compareEmpty.hidden=!compare||compareViews.size>0;
    elements.compareCount.textContent='비교 기기 '+compareViews.size+' / '+MAX_COMPARE;
    elements.compareGrid.dataset.count=String(compareViews.size);
    updateCompareNote();
  }

  /* Breakpoint QA 구간(2026-11-23): 사이트 viewport 폭을 프로젝트 QA 기준(Breakpoint 테스트 프리셋의 360 / 768 경계) 에 대어 본 구간.
   * 사이트 자체 CSS media query 가 아니다. label = 화면 표시, speech = 스크린 리더 설명 */
  function getBreakpointRange(width){
    if(width<=360)return{label:'≤360',speech:'Breakpoint 테스트 구간: 360픽셀 이하'};
    if(width<768)return{label:'361–767',speech:'Breakpoint 테스트 구간: 361~767픽셀'};
    return{label:'≥768',speech:'Breakpoint 테스트 구간: 768픽셀 이상'};
  }
  /* 메타 글자 뒤에 " · 구간" 을 붙인다 — 보이는 기호는 aria-hidden, 의미는 sr_only 문장으로 */
  function appendBreakpointRange(el,width){
    const range=getBreakpointRange(width);
    const shown=document.createElement('span');
    shown.setAttribute('aria-hidden','true');
    shown.textContent=' · '+range.label;
    const spoken=document.createElement('span');
    spoken.className='sr_only';
    spoken.textContent=' · '+range.speech;
    el.append(shown,spoken);
  }

  function updateCompareItem(view,siteViewport){
    const name=getDeviceName(view);
    const state=getState(view);
    const device=getDevice(view);
    view.dom.name.textContent=name;
    view.dom.meta.textContent='사이트 '+siteViewport.width+' × '+siteViewport.height+' · '+getOrientationLabel(view)+(device&&device.states.length>1&&state?' · '+state.label:'');
    appendBreakpointRange(view.dom.meta,siteViewport.width);
    view.dom.rotate.setAttribute('aria-label',name+' 가로·세로 회전');
    view.dom.rotate.title=name+' 가로·세로 회전';
    view.dom.rotate.setAttribute('aria-pressed',view.rotated?'true':'false');
    view.dom.rotate.disabled=isRotationLocked(view);
    view.dom.refresh.setAttribute('aria-label',name+' 새로고침');
    view.dom.refresh.title=name+' 새로고침';
    view.dom.refresh.disabled=!currentUrl;
    view.dom.remove.setAttribute('aria-label',name+' 비교 목록에서 제거');
    view.dom.remove.title=name+' 비교 목록에서 제거';
    view.dom.stateSelect.value=view.stateId;
  }

  function addCompareView(deviceId,options){
    const settings=options||{};
    const device=devices[deviceId];
    if(!device||compareViews.has(deviceId)||compareViews.size>=MAX_COMPARE)return false;
    const fragment=elements.compareItemTemplate.content.cloneNode(true);
    const item=fragment.querySelector('.compare_item');
    const mount=item.querySelector('.preview_mount');
    const dom=mountShell(mount,false);
    Object.assign(dom,{
      item,head:item.querySelector('.compare_head'),body:item.querySelector('.compare_body'),
      name:item.querySelector('.compare_name'),meta:item.querySelector('.compare_meta_text'),
      stateSelect:item.querySelector('.compare_state'),rotate:item.querySelector('.compare_rotate'),
      refresh:item.querySelector('.compare_refresh'),remove:item.querySelector('.compare_remove'),badge:item.querySelector('.compare_badge'),
      occlusion:item.querySelector('.compare_occlusion')
    });
    const view=createView(dom,{compare:true});
    setViewDevice(view,deviceId,settings.stateId,settings.rotated);
    item.dataset.device=deviceId;
    /* 접힘/펼침 기기는 카드에서 상태를 고를 수 있게 */
    if(device.states.length>1){
      device.states.forEach(state=>{
        const option=document.createElement('option');
        option.value=state.id;
        option.textContent=state.label;
        dom.stateSelect.appendChild(option);
      });
      dom.stateSelect.hidden=false;
      dom.stateSelect.setAttribute('aria-label',device.name+' 화면 상태');
      dom.stateSelect.addEventListener('change',()=>{
        const state=device.states.find(item=>item.id===dom.stateSelect.value);
        if(!state)return;
        view.stateId=state.id;
        applyBaseSize(view,state.width,state.height,false);
        renderView(view);
        updateControls();
        saveComparePreference();
        announce(describeView(view)+'으로 변경되었습니다.');
      });
    }
    dom.rotate.addEventListener('click',()=>{
      if(syncOptions.rotate){
        const next=!view.rotated;
        compareViews.forEach(other=>{if(other.rotated!==next)toggleRotation(other);});
        refreshViews({message:'비교 기기 '+compareViews.size+'개를 '+(next?'가로':'세로')+'로 회전했습니다.'});
      }else{
        toggleRotation(view);
        renderView(view);
        updateControls();
        announce(describeView(view)+'으로 변경되었습니다.');
      }
      saveComparePreference();
    });
    dom.refresh.addEventListener('click',()=>{
      if(!currentUrl)return;
      if(syncOptions.refresh)refreshPreview();
      else{reloadView(view);updateLoadStatus();}
    });
    dom.remove.addEventListener('click',()=>removeCompareView(deviceId,{focusNav:true}));
    compareViews.set(deviceId,view);
    elements.compareGrid.appendChild(fragment);
    loadInto(view);
    updateNavWatch();
    renderView(view);
    /* 열 수가 바뀌면 다른 카드의 맞춤 배율도 달라진다 */
    compareViews.forEach(other=>{if(other!==view)updateScale(other);});
    updateDeviceButtons();
    updateControls();
    if(settings.announce!==false)announce(device.name+' 추가됨. 비교 기기 '+compareViews.size+' / '+MAX_COMPARE+'.');
    saveComparePreference();
    return true;
  }

  function removeCompareView(deviceId,options){
    const settings=options||{};
    const view=compareViews.get(deviceId);
    if(!view)return false;
    view.dom.item.remove();          /* iframe 도 함께 제거되어 언로드 */
    stopScrollBridge(view);          /* 다른 출처 카드의 브리지 재시도 타이머 정리 */
    compareViews.delete(deviceId);
    resetOcclusionView(view);        /* 가림 검사 타이머 · 강조 정리 */
    updateOcclusionStatus();
    updateNavWatch();
    compareViews.forEach(updateScale);
    updateSyncAvailability();
    updateDeviceButtons();
    updateControls();
    if(settings.announce!==false)announce(getDeviceName(view)+' 제거됨. 비교 기기 '+compareViews.size+' / '+MAX_COMPARE+'.');
    if(settings.focusNav){
      const input=elements.deviceNav.querySelector('.device_check[value="'+deviceId+'"]');
      if(input)input.focus();
    }
    saveComparePreference();
    return true;
  }

  function clearCompareViews(){
    compareViews.forEach(view=>view.dom.item.remove());
    const removed=Array.from(compareViews.values());
    compareViews.clear();
    removed.forEach(resetOcclusionView);   /* 가림 검사 타이머 · 강조 정리 */
  }

  function setViewMode(mode,options){
    const settings=options||{};
    if(!['single','compare'].includes(mode))return false;
    const changed=viewMode!==mode;
    viewMode=mode;
    elements.viewModeInputs.forEach(input=>{input.checked=input.value===mode;});
    if(mode==='compare'){
      /* 비교 목록이 비어 있으면 현재 단일 보기 기기로 시작 */
      const seeds=settings.deviceIds&&settings.deviceIds.length?settings.deviceIds:(compareViews.size?[]:(devices[primaryView.deviceId]?[primaryView.deviceId]:[]));
      renderDeviceNav();
      seeds.forEach(id=>{
        const saved=settings.items&&settings.items.find(item=>item.deviceId===id);
        addCompareView(id,{stateId:saved?saved.stateId:(id===primaryView.deviceId?primaryView.stateId:undefined),rotated:saved?saved.rotated:(id===primaryView.deviceId?primaryView.rotated:false),announce:false});
      });
      renderStates();
      allViews().forEach(renderView);
      /* 숨겨지는 단일 셸은 사이트를 놓아 준다(placeholder 로 되돌림 — 네트워크·메모리 중복 방지) */
      if(changed)loadInto(primaryView);
      updateControls();
      if(settings.announce!==false)announce('다중 비교 모드. 비교 기기 '+compareViews.size+' / '+MAX_COMPARE+'. 왼쪽 목록에서 체크해 추가하거나 해제합니다.');
    }else{
      clearCompareViews();
      /* 단일 보기로 돌아오면 현재 URL 을 다시 싣는다(기존 loadInto 경로 그대로) */
      if(changed)loadInto(primaryView);
      renderDeviceNav();
      renderStates();
      updatePreview({announce:false});
      if(changed&&settings.announce!==false)announce('단일 보기 모드. '+describeView(primaryView)+'.');
    }
    if(currentUrl)updateLoadStatus();
    updateNavWatch();
    syncOcclusionViews();   /* 가림 검사: 숨겨진 view 정리 · 보이는 view 검사 예약 */
    saveComparePreference();
    return true;
  }

  /* ------------------------------------------------------------------
   * 저장·복원
   * ------------------------------------------------------------------ */
  function savePreference(){
    try{
      localStorage.setItem('viewportLabDevice',JSON.stringify({deviceId:primaryView.deviceId,stateId:primaryView.stateId,rotated:primaryView.rotated,width:primaryView.baseWidth,height:primaryView.baseHeight}));
    }catch(error){}
  }

  function saveDisplayPreference(){
    try{
      localStorage.setItem('viewportLabDisplay',JSON.stringify({scaleMode,manualScale,showAddressBar,showBottomBar,uiMode,safeAreaGuide,browserByPlatform,urlBarPositionByBrowser,safariLayout,viewportFit,occlusionCheck:occlusionEnabled,safariVersion,keyboardMode,keyboardHeight}));
    }catch(error){}
  }

  function saveComparePreference(){
    try{
      localStorage.setItem('viewportLabCompare',JSON.stringify({
        mode:viewMode,
        items:Array.from(compareViews.values()).map(view=>({deviceId:view.deviceId,stateId:view.stateId,rotated:view.rotated})),
        sync:syncOptions
      }));
    }catch(error){}
  }

  function restoreDisplayPreference(){
    try{
      const saved=JSON.parse(localStorage.getItem('viewportLabDisplay')||'null');
      if(saved&&['device','fit','manual'].includes(saved.scaleMode))scaleMode=saved.scaleMode;
      else if(saved&&saved.scaleMode==='actual'){scaleMode='manual';manualScale=1;}   /* 예전 '100%' 모드 → 수동 100% */
      if(saved&&typeof saved.manualScale==='number'){const percent=clampScalePercent(saved.manualScale*100);if(percent!=null)manualScale=percent/100;}
      if(saved&&typeof saved.showAddressBar==='boolean')showAddressBar=saved.showAddressBar;
      if(saved&&typeof saved.showBottomBar==='boolean')showBottomBar=saved.showBottomBar;
      if(saved&&['shrink','overlay'].includes(saved.uiMode))uiMode=saved.uiMode;
      if(saved&&typeof saved.safeAreaGuide==='boolean')safeAreaGuide=saved.safeAreaGuide;
      if(saved&&SAFARI_LAYOUTS.includes(saved.safariLayout))safariLayout=saved.safariLayout;
      if(saved&&VIEWPORT_FITS.includes(saved.viewportFit))viewportFit=saved.viewportFit;
      if(saved&&typeof saved.occlusionCheck==='boolean')occlusionEnabled=saved.occlusionCheck;
      if(saved&&KEYBOARD_MODES.includes(saved.keyboardMode))keyboardMode=saved.keyboardMode;
      if(saved&&typeof saved.keyboardHeight==='number'&&Number.isFinite(saved.keyboardHeight))keyboardHeight=Math.max(KEYBOARD_MIN,Math.min(900,Math.round(saved.keyboardHeight)));
      if(saved&&typeof saved.safariVersion==='string'&&/^\d+(\.\d+)?$/.test(saved.safariVersion))safariVersion=saved.safariVersion;
      if(saved&&saved.browserByPlatform&&typeof saved.browserByPlatform==='object'){
        Object.keys(saved.browserByPlatform).forEach(platform=>{
          const id=saved.browserByPlatform[platform];
          if(browserProfiles[id])browserByPlatform[platform]=id;
        });
      }
      if(saved&&saved.urlBarPositionByBrowser&&typeof saved.urlBarPositionByBrowser==='object'){
        Object.keys(saved.urlBarPositionByBrowser).forEach(id=>{
          const position=saved.urlBarPositionByBrowser[id];
          if(browserProfiles[id]&&urlBarPositions.includes(position))urlBarPositionByBrowser[id]=position;
        });
      }
    }catch(error){}
    elements.addressBarToggle.checked=showAddressBar;
    elements.bottomBarToggle.checked=showBottomBar;
    elements.uiOverlayToggle.checked=uiMode==='overlay';
    updateOcclusionStatus();   /* 저장된 가림 검사 상태 → 버튼 aria-pressed · 결과 줄(첫 검사는 renderView 가 예약) */
  }

  function restorePreference(){
    try{
      const savedDevice=JSON.parse(localStorage.getItem('viewportLabDevice')||'null');
      if(savedDevice){
        const deviceId=deviceAliases[savedDevice.deviceId]||savedDevice.deviceId;
        const restoreRotated=Boolean(savedDevice.rotated);
        if(deviceId==='custom'&&savedDevice.width&&savedDevice.height)applyCustomSize(savedDevice.width,savedDevice.height,{rotated:restoreRotated,announce:false});
        else if(devices[deviceId])selectDevice(deviceId,savedDevice.stateId,{rotated:restoreRotated,announce:false});
      }
    }catch(error){}
  }

  /* 저장된 URL 복원. 보기 모드(단일/다중 비교) 가 정해진 뒤에 실행해야
   * 비교 모드에서 숨겨질 단일 셸이 사이트를 한 번 요청하는 일이 없다. */
  function restoreSavedUrl(){
    try{
      const savedUrl=localStorage.getItem('viewportLabUrl');
      if(savedUrl){
        elements.siteUrl.value=savedUrl;
        loadUrl(savedUrl);
      }
    }catch(error){}
  }

  function restoreComparePreference(){
    let saved=null;
    try{saved=JSON.parse(localStorage.getItem('viewportLabCompare')||'null');}catch(error){}
    if(saved&&saved.sync){
      ['scroll','rotate','refresh','navigate'].forEach(key=>{if(typeof saved.sync[key]==='boolean')syncOptions[key]=saved.sync[key];});   /* navigate 가 없는 예전 저장값은 기본 ON */
    }
    elements.syncScroll.checked=syncOptions.scroll;
    elements.syncRotate.checked=syncOptions.rotate;
    elements.syncRefresh.checked=syncOptions.refresh;
    elements.syncNavigate.checked=syncOptions.navigate;
    if(saved&&saved.mode==='compare'){
      const items=Array.isArray(saved.items)?saved.items.filter(item=>devices[deviceAliases[item.deviceId]||item.deviceId]).map(item=>Object.assign({},item,{deviceId:deviceAliases[item.deviceId]||item.deviceId})).slice(0,MAX_COMPARE):[];
      setViewMode('compare',{deviceIds:items.map(item=>item.deviceId),items,announce:false});
    }
  }

  /* ------------------------------------------------------------------
   * 외부 노출(WebMCP)
   * ------------------------------------------------------------------ */
  function getViewportInfo(view){
    const target=view||primaryView;
    const siteViewport=getSiteViewport(target);
    const info={
      deviceId:target.deviceId,device:getDeviceName(target),stateId:target.stateId,
      screenWidth:target.currentWidth,screenHeight:target.currentHeight,
      viewportWidth:siteViewport.width,viewportHeight:siteViewport.height,visibleHeight:siteViewport.visibleHeight,
      siteInsets:{top:siteViewport.top,right:siteViewport.right,bottom:siteViewport.bottom,left:siteViewport.left},
      dpr:getDpr(target),physicalResolution:getPhysicalResolution(target),scaleMode,scale:target.scale,
      browserId:siteViewport.bands.profileId,browser:siteViewport.bands.label,showAddressBar,urlBarPosition:siteViewport.bands.urlPosition,showBottomBar,uiMode,safeAreaGuide,
      measuredViewport:siteViewport.measured?{safariLayout:siteViewport.measured.layout,viewportFit:siteViewport.measured.fit,small:siteViewport.measured.small,dynamic:siteViewport.measured.dynamic,large:siteViewport.measured.large,widthMode:siteViewport.measured.widthMode||'full'}:null,
      safeArea:getSafeArea(target),orientation:getOrientation(target),rotated:target.rotated,obstruction:target.frameProfile.obstruction,url:currentUrl||null
    };
    if(!view){
      info.viewMode=viewMode;
      info.sync=Object.assign({},syncOptions);
      info.compare=Array.from(compareViews.values()).map(item=>getViewportInfo(item));
    }
    return info;
  }

  function setBrowserUi(input){
    const settings=input||{};
    const view=getControlView();
    if(settings.browserId){
      if(!browserProfiles[settings.browserId])throw new Error('지원하지 않는 브라우저입니다.');
      browserByPlatform[view.frameProfile.platform||'any']=settings.browserId;
    }
    if(typeof settings.showAddressBar==='boolean'){showAddressBar=settings.showAddressBar;elements.addressBarToggle.checked=showAddressBar;}
    if(settings.urlBarPosition){
      if(!urlBarPositions.includes(settings.urlBarPosition))throw new Error('urlBarPosition 은 top 또는 bottom 만 가능합니다.');
      visibleViews().forEach(item=>{urlBarPositionByBrowser[resolveBrowserId(item)]=settings.urlBarPosition;});
    }
    if(typeof settings.showBottomBar==='boolean'){showBottomBar=settings.showBottomBar;elements.bottomBarToggle.checked=showBottomBar;}
    if(settings.uiMode){
      if(!['shrink','overlay'].includes(settings.uiMode))throw new Error('uiMode 는 shrink 또는 overlay 만 가능합니다.');
      uiMode=settings.uiMode;
    }
    if(typeof settings.safeAreaGuide==='boolean')safeAreaGuide=settings.safeAreaGuide;
    if(settings.safariLayout){
      if(!SAFARI_LAYOUTS.includes(settings.safariLayout))throw new Error('safariLayout 은 compact 또는 top 만 가능합니다.');
      safariLayout=settings.safariLayout;
    }
    if(settings.viewportFit){
      if(!VIEWPORT_FITS.includes(settings.viewportFit))throw new Error('viewportFit 은 auto 또는 cover 만 가능합니다.');
      viewportFit=settings.viewportFit;
    }
    refreshViews({announce:false});
    saveDisplayPreference();
    return getViewportInfo();
  }

  function setCompareDevices(deviceIds){
    const ids=Array.from(new Set((deviceIds||[]).filter(id=>devices[id]))).slice(0,MAX_COMPARE);
    if(!ids.length){setViewMode('single',{announce:false});return getViewportInfo();}
    clearCompareViews();
    setViewMode('compare',{deviceIds:ids,announce:false});
    return getViewportInfo();
  }

  function registerWebMcpTools(){
    const context=document.modelContext;
    if(!context||typeof context.registerTool!=='function')return;
    const lifecycle=new AbortController();
    const register=tool=>{
      try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch(error){}
    };
    register({name:'load_preview',title:'사이트 미리보기 열기',description:'URL을 현재 반응형 테스트 뷰포트(다중 비교 시 모든 기기)에 불러옵니다.',inputSchema:{type:'object',properties:{url:{type:'string'},deviceId:{type:'string',enum:Object.keys(devices)}},required:['url'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute(input){if(input.deviceId)selectDevice(input.deviceId);const url=loadUrl(String(input.url||''));return{...getViewportInfo(),url};}});
    register({name:'select_viewport',title:'기기 뷰포트 선택',description:'단일 보기에서 등록된 모바일·폴더블 기기와 화면 상태를 선택합니다.',inputSchema:{type:'object',properties:{deviceId:{type:'string',enum:Object.keys(devices)},stateId:{type:'string'}},required:['deviceId'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(viewMode==='compare')setViewMode('single',{announce:false});if(!selectDevice(input.deviceId,input.stateId))throw new Error('지원하지 않는 기기입니다.');return getViewportInfo();}});
    register({name:'set_compare_devices',title:'다중 비교 기기 설정',description:'최대 4개 기기를 나란히 비교합니다. 빈 배열이면 단일 보기로 돌아갑니다.',inputSchema:{type:'object',properties:{deviceIds:{type:'array',items:{type:'string',enum:Object.keys(devices)},maxItems:MAX_COMPARE}},required:['deviceIds'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){return setCompareDevices(input.deviceIds);}});
    register({name:'set_custom_viewport',title:'직접 뷰포트 설정',description:'기기 화면 너비와 높이를 CSS 픽셀 단위로 직접 설정합니다(단일 보기).',inputSchema:{type:'object',properties:{width:{type:'integer',minimum:240,maximum:2560},height:{type:'integer',minimum:240,maximum:2560}},required:['width','height'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(viewMode==='compare')setViewMode('single',{announce:false});if(!applyCustomSize(input.width,input.height))throw new Error('뷰포트 범위가 올바르지 않습니다.');return getViewportInfo();}});
    register({name:'rotate_viewport',title:'뷰포트 회전',description:'현재 미리보기(다중 비교 시 모든 기기)의 가로와 세로 방향을 전환합니다.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(){return rotatePreview();}});
    register({name:'set_browser_ui',title:'브라우저 UI 설정',description:'브라우저 종류, 주소창 표시·위치(세로 모드), 툴바 표시, 겹침(overlay) 모드, safe-area 가이드를 설정합니다.',inputSchema:{type:'object',properties:{browserId:{type:'string',enum:Object.keys(browserProfiles)},showAddressBar:{type:'boolean'},urlBarPosition:{type:'string',enum:urlBarPositions},showBottomBar:{type:'boolean'},uiMode:{type:'string',enum:['shrink','overlay']},safeAreaGuide:{type:'boolean'},safariLayout:{type:'string',enum:SAFARI_LAYOUTS},viewportFit:{type:'string',enum:VIEWPORT_FITS}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){return setBrowserUi(input);}});
    register({name:'read_viewport',title:'현재 뷰포트 확인',description:'현재 선택된 기기, 화면 크기, 사이트 영역, 브라우저 UI, 방향, URL, 다중 비교 목록을 확인합니다.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(){return getViewportInfo();}});
    window.addEventListener('beforeunload',()=>lifecycle.abort(),{once:true});
  }

  /* ------------------------------------------------------------------
   * 이벤트
   * ------------------------------------------------------------------ */
  elements.siteForm.addEventListener('submit',event=>{event.preventDefault();if(!elements.siteUrl.value.trim()){if(currentUrl)clearUrl();else setError(elements.urlError,'');return;}try{loadUrl(elements.siteUrl.value);}catch(error){}});
  /* 입력창의 지우기(×) 로 비웠을 때도 placeholder 로 복귀 */
  elements.siteUrl.addEventListener('search',()=>{if(!elements.siteUrl.value.trim()&&currentUrl)clearUrl();});
  elements.deviceNav.addEventListener('click',event=>{
    if(viewMode!=='single')return;
    const button=event.target.closest('.device_btn');
    if(button)selectDevice(button.dataset.device);
  });
  elements.deviceNav.addEventListener('change',event=>{
    const input=event.target.closest('.device_check');
    if(!input||viewMode!=='compare')return;
    if(input.checked){
      if(!addCompareView(input.value)){input.checked=false;announce('최대 '+MAX_COMPARE+'개까지 비교할 수 있습니다.');}
    }else removeCompareView(input.value);
  });
  elements.viewModeInputs.forEach(input=>input.addEventListener('change',()=>{if(input.checked)setViewMode(input.value);}));
  /* 실행 환경 경고의 '실행 방법': 기존 도움말(이 도구에서 확인되는 범위) 을 열고 해당 문단으로 이동. 주소 해시는 바꾸지 않는다 */
  elements.envNoticeLink.addEventListener('click',event=>{
    event.preventDefault();
    if(elements.testNotice)elements.testNotice.open=true;
    const help=document.getElementById('envHelp');
    if(help)help.scrollIntoView({block:'center'});
  });
  elements.stateList.addEventListener('click',event=>{const button=event.target.closest('.state_btn');if(button)selectState(button.dataset.state);});
  elements.applySize.addEventListener('click',()=>applyCustomSize(elements.viewportWidth.value,elements.viewportHeight.value));
  [elements.viewportWidth,elements.viewportHeight].forEach(input=>input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();elements.applySize.click();}}));
  elements.rotateBtn.addEventListener('click',rotatePreview);
  elements.refreshBtn.addEventListener('click',refreshPreview);
  elements.browserSelect.addEventListener('change',()=>{
    const id=elements.browserSelect.value;
    if(!browserProfiles[id])return;
    browserByPlatform[getControlView().frameProfile.platform||'any']=id;
    refreshViews();
    saveDisplayPreference();
  });
  elements.addressBarToggle.addEventListener('change',()=>{showAddressBar=elements.addressBarToggle.checked;refreshViews();saveDisplayPreference();});
  elements.urlPositionInputs.forEach(input=>input.addEventListener('change',()=>{
    if(!input.checked||!urlBarPositions.includes(input.value))return;
    /* 보이는 모든 view 의 브라우저에 같은 위치를 기억시킨다 (다중 비교에서 플랫폼이 섞여도 한 번에 적용) */
    visibleViews().forEach(view=>{urlBarPositionByBrowser[resolveBrowserId(view)]=input.value;});
    refreshViews();
    saveDisplayPreference();
  }));
  elements.bottomBarToggle.addEventListener('change',()=>{showBottomBar=elements.bottomBarToggle.checked;refreshViews();saveDisplayPreference();});
  elements.uiOverlayToggle.addEventListener('change',()=>{uiMode=elements.uiOverlayToggle.checked?'overlay':'shrink';refreshViews();saveDisplayPreference();});
  elements.safariLayoutInputs.forEach(input=>input.addEventListener('change',()=>{if(input.checked&&SAFARI_LAYOUTS.includes(input.value)){safariLayout=input.value;refreshViews();saveDisplayPreference();}}));
  elements.viewportFitInputs.forEach(input=>input.addEventListener('change',()=>{if(input.checked&&VIEWPORT_FITS.includes(input.value)){viewportFit=input.value;refreshViews();saveDisplayPreference();}}));
  elements.occlusionBtn.addEventListener('click',()=>{
    setOcclusionEnabled(!occlusionEnabled);
    saveDisplayPreference();
    announce('가림 검사를 '+(occlusionEnabled?'켰습니다.':'껐습니다.'));
  });
  elements.occlusionRecheck.addEventListener('click',()=>{if(primaryView)visibleViews().forEach(view=>runOcclusionCheck(view,{manual:true}));});   /* 다중 비교 = 보이는 카드 전부(숨은 primaryView 제외) */
  elements.occlusionListBtn.addEventListener('click',()=>{setOcclusionCopyBox(null);setOcclusionListOpen(elements.occlusionList.hidden);});
  elements.occlusionCopy.addEventListener('click',copyOcclusionReport);
  elements.occlusionCopyClose.addEventListener('click',()=>{setOcclusionCopyBox(null);elements.occlusionCopy.focus();});
  elements.occlusionCopyBox.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();setOcclusionCopyBox(null);elements.occlusionCopy.focus();}});
  elements.occlusionItems.addEventListener('click',event=>{const item=event.target.closest('button[data-index]');if(item)highlightOcclusionResult(item.dataset.view?compareViews.get(item.dataset.view):primaryView,Number(item.dataset.index));});
  /* Esc: 목록을 닫고 결과 보기 버튼으로 포커스 복귀 */
  [elements.occlusionList,elements.occlusionListBtn].forEach(el=>el.addEventListener('keydown',event=>{if(event.key==='Escape'&&!elements.occlusionList.hidden){event.preventDefault();setOcclusionListOpen(false,true);}}));
  /* safe-area 가이드 켜기 / 끄기(버튼 · 테스트 상태 프리셋 공통) */
  function setSafeAreaGuide(on){
    safeAreaGuide=Boolean(on);
    allViews().forEach(updateSafeGuides);
    elements.safeAreaBtn.setAttribute('aria-pressed',safeAreaGuide?'true':'false');
  }
  elements.safeAreaBtn.addEventListener('click',()=>{
    setSafeAreaGuide(!safeAreaGuide);
    saveDisplayPreference();
    announce('safe-area 가이드를 '+(safeAreaGuide?'표시합니다.':'숨겼습니다.'));
  });
  /* 표시 배율: ± 는 현재 유효 배율(5% 단위 반올림) 기준, 입력은 change(Enter/blur/화살표) 시 적용, 화면 맞춤·실기기는 모드 전환 */
  const currentScalePercent=()=>Math.round((scaleMode==='manual'?manualScale:getControlView().scale)*100/SCALE_STEP)*SCALE_STEP;
  elements.scaleDownBtn.addEventListener('click',()=>setManualScale(currentScalePercent()-SCALE_STEP));
  elements.scaleUpBtn.addEventListener('click',()=>setManualScale(currentScalePercent()+SCALE_STEP));
  elements.scaleInput.addEventListener('change',()=>{if(!setManualScale(elements.scaleInput.value))elements.scaleInput.value=String(currentScalePercent());});
  elements.scaleInput.addEventListener('keydown',event=>{
    if(event.key==='Enter'){event.preventDefault();elements.scaleInput.blur();}
    else if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();setManualScale(currentScalePercent()+(event.key==='ArrowUp'?SCALE_STEP:-SCALE_STEP));}
  });
  elements.scaleFitBtn.addEventListener('click',()=>setScaleMode('fit'));
  elements.scaleDeviceBtn.addEventListener('click',()=>setScaleMode('device'));
  /* 기기만 보기(2026-10-15): body 상태 class 하나로 주변 UI 를 숨긴다(CSS). 배율 모드는 바꾸지 않고, 스테이지 크기 변화에 맞춰 기존 updateAllScales() 만 다시 부른다.
   * 같은 버튼이 전용 보기에서는 우측 상단 "전체 UI 보기" 로 쓰인다. Esc 로도 나온다. 상태는 저장하지 않는다(새로 열면 일반 화면) */
  const deviceOnlyBtn=document.getElementById('deviceOnlyBtn');
  const deviceOnlyLabel=deviceOnlyBtn.querySelector('.device_only_label');
  function setDeviceOnly(on){
    document.body.classList.toggle('is_device_only',on);
    deviceOnlyBtn.setAttribute('aria-pressed',on?'true':'false');
    deviceOnlyLabel.textContent=on?'전체 UI 보기':'기기만 보기';
    deviceOnlyBtn.title=on?'전체 UI 보기 — 숨긴 UI 를 다시 표시 (Esc)':'기기만 보기 — 주변 UI 를 숨기고 미리보기를 창 전체로';
    updateAllScales();
  }
  deviceOnlyBtn.addEventListener('click',()=>setDeviceOnly(!document.body.classList.contains('is_device_only')));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.defaultPrevented&&document.body.classList.contains('is_device_only')){event.preventDefault();setDeviceOnly(false);deviceOnlyBtn.focus();}});
  bindCompatControls();
  bindBrowserSettings();
  bindKeyboardControls();
  bindTestPresets();
  bindSafariDetail();
  bindCaptureControls();
  elements.syncScroll.addEventListener('change',()=>{syncOptions.scroll=elements.syncScroll.checked;if(syncOptions.scroll)realignScrollSync();updateSyncAvailability();saveComparePreference();announce('스크롤 동기화를 '+(syncOptions.scroll?'켰습니다.':'껐습니다.'));});
  elements.syncRotate.addEventListener('change',()=>{syncOptions.rotate=elements.syncRotate.checked;saveComparePreference();});
  elements.syncRefresh.addEventListener('change',()=>{syncOptions.refresh=elements.syncRefresh.checked;saveComparePreference();});
  elements.syncNavigate.addEventListener('change',()=>{syncOptions.navigate=elements.syncNavigate.checked;updateNavWatch();updateSyncAvailability();saveComparePreference();announce('페이지 이동 동기화를 '+(syncOptions.navigate?'켰습니다.':'껐습니다.'));});

  /* ------------------------------------------------------------------
   * 스크린샷(2026-11-02): 브라우저 탭 캡처(getDisplayMedia · preferCurrentTab) 로 이 탭의 실제 렌더 픽셀을 받아
   * 단일 보기 = 기기 셸(측면 키 · 힌지 커버 · 그림자 포함), 다중 비교 = 비교 카드 전체 영역만 잘라 PNG 로 저장한다.
   * 다른 출처 iframe 도 화면에 그려진 픽셀 그대로 들어간다(iframe DOM 을 읽지 않음 · 확장 · 라이브러리 없음).
   * 해상도 = 화면에 그려진 크기 × devicePixelRatio. 화면보다 큰 해상도를 요청하면 Chrome 이 탭을 HiDPI 로 바꿔
   * iframe 에 resize 이벤트가 생기므로 화면과 같은 해상도만 요청한다. viewport · iframe · 셸 · 배율 계산은 건드리지 않는다.
   * 영역이 보이는 범위보다 크면(100% · 실기기 배율) 스테이지를 스크롤하며 나눠 찍어 이어 붙이고, 끝나면 스크롤을 되돌린다.
   * ------------------------------------------------------------------ */
  const CAPTURE_BAND=16;   /* 스크롤 가능한 상자의 오른쪽 · 아래 16px 은 쓰지 않는다 — 프로그램 스크롤 때 나타나는 overlay 스크롤바가 찍히지 않게 */
  let capturing=false;
  let captureMessageTimer=0;
  function captureSupported(){return Boolean(window.isSecureContext&&navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia);}
  function rectOf(r){return {left:r.left,top:r.top,right:r.right,bottom:r.bottom};}
  function rectUnion(list){return list.reduce((a,r)=>a?{left:Math.min(a.left,r.left),top:Math.min(a.top,r.top),right:Math.max(a.right,r.right),bottom:Math.max(a.bottom,r.bottom)}:rectOf(r),null);}
  function rectIntersect(a,b){const r={left:Math.max(a.left,b.left),top:Math.max(a.top,b.top),right:Math.min(a.right,b.right),bottom:Math.min(a.bottom,b.bottom)};return r.right>r.left&&r.bottom>r.top?r:null;}
  function rectShift(r,dx,dy){return {left:r.left+dx,top:r.top+dy,right:r.right+dx,bottom:r.bottom+dy};}
  /* box-shadow 의 바깥 퍼짐(inset 제외) — 화면에 그려진 배율을 곱해 화면 px 로 */
  function shadowExtent(el,scale){
    const ext={left:0,top:0,right:0,bottom:0};
    const value=getComputedStyle(el).boxShadow;
    if(!value||value==='none')return ext;
    value.split(/,(?![^(]*\))/).forEach(part=>{
      if(/inset/.test(part))return;
      const [x=0,y=0,blur=0,spread=0]=(part.replace(/rgba?\([^)]*\)/g,'').match(/-?[\d.]+px/g)||[]).map(parseFloat);
      const reach=blur+spread;
      ext.left=Math.max(ext.left,reach-x);ext.right=Math.max(ext.right,reach+x);ext.top=Math.max(ext.top,reach-y);ext.bottom=Math.max(ext.bottom,reach+y);
    });
    Object.keys(ext).forEach(key=>{ext[key]*=scale;});
    return ext;
  }
  /* 캡처 영역: core = 반드시 찍혀야 하는 부분(셸 · mount · 측면 키 · 힌지 커버 / 비교 카드), all = core + 셸 그림자(보이는 만큼) */
  function getCaptureTarget(){
    const viewRects=view=>{
      const core=[view.dom.mount.getBoundingClientRect(),view.dom.shell.getBoundingClientRect()];
      view.dom.shell.querySelectorAll('.side_key,.hinge_body').forEach(el=>{const r=el.getBoundingClientRect();if(r.width&&r.height&&getComputedStyle(el).display!=='none')core.push(r);});
      const s=view.dom.shell.getBoundingClientRect();const e=shadowExtent(view.dom.shell,s.width/view.dom.shell.offsetWidth||view.scale);
      return {core,shadow:{left:s.left-e.left,top:s.top-e.top,right:s.right+e.right,bottom:s.bottom+e.bottom}};
    };
    if(viewMode==='compare'){
      const items=Array.from(compareViews.values()).filter(view=>!view.dom.item.hidden);
      if(!items.length)return null;
      const parts=items.map(view=>{const r=viewRects(view);r.core.push(view.dom.item.getBoundingClientRect());return r;});
      const core=rectUnion(parts.flatMap(p=>p.core));
      return {anchor:items[0].dom.item,core,all:rectUnion([core].concat(parts.map(p=>p.shadow)))};
    }
    const r=viewRects(primaryView);const core=rectUnion(r.core);
    return {anchor:primaryView.dom.shell,core,all:rectUnion([core,r.shadow])};
  }
  /* 스크롤 상자들(안쪽 → 바깥, 마지막은 문서) */
  function getCaptureScrollers(el){
    const list=[];
    for(let p=el.parentElement;p&&p!==document.body&&p!==document.documentElement;p=p.parentElement){
      const cs=getComputedStyle(p);
      if(/(auto|scroll)/.test(cs.overflowX+cs.overflowY))list.push(p);
    }
    list.push(document.scrollingElement||document.documentElement);
    return list;
  }
  /* 스크롤 상자의 보이는 안쪽 상자(스크롤바 띠 제외) */
  function scrollerBox(el){
    const root=el===document.scrollingElement||el===document.documentElement;
    const r=root?{left:0,top:0}:el.getBoundingClientRect();
    /* transform 안쪽 요소(셸 안 .screen_wrap 등) 는 client 값이 변환 전 px 라 그려진 배율을 곱한다(캡처 화질 확대 때 보이는 범위가 작게 잡히지 않게) */
    const sx=root||!el.offsetWidth?1:r.width/el.offsetWidth,sy=root||!el.offsetHeight?1:r.height/el.offsetHeight;
    const left=r.left+(root?0:el.clientLeft*sx),top=r.top+(root?0:el.clientTop*sy);
    const width=root?document.documentElement.clientWidth:el.clientWidth*sx,height=root?document.documentElement.clientHeight:el.clientHeight*sy;
    return {left,top,right:left+width-(el.scrollHeight>el.clientHeight?CAPTURE_BAND:0),bottom:top+height-(el.scrollWidth>el.clientWidth?CAPTURE_BAND:0)};
  }
  /* 영역이 지금 화면에 보일 수 있는 범위: 창 ∩ overflow 조상들의 안쪽 상자 */
  function getCaptureClip(el){
    let clip={left:0,top:0,right:captureRegion?captureRegion.w:innerWidth,bottom:captureRegion?captureRegion.h:innerHeight};
    for(let p=el.parentElement;p&&clip;p=p.parentElement){
      if(p===document.body||p===document.documentElement){clip=rectIntersect(clip,scrollerBox(document.scrollingElement||document.documentElement));break;}
      const cs=getComputedStyle(p);
      if(cs.overflowX!=='visible'||cs.overflowY!=='visible')clip=rectIntersect(clip,scrollerBox(p));
    }
    return clip;
  }
  /* 스크롤 상자의 전체 내용 범위(화면 좌표) — 스크롤해서 볼 수 있는 한계 */
  function scrollContentBox(el){
    const root=el===document.scrollingElement||el===document.documentElement;
    const r=root?{left:0,top:0}:el.getBoundingClientRect();
    const left=r.left+(root?0:el.clientLeft)-el.scrollLeft,top=r.top+(root?0:el.clientTop)-el.scrollTop;
    return {left,top,right:left+el.scrollWidth,bottom:top+el.scrollHeight};
  }
  /* 화면 좌표의 사각형이 보이도록 스크롤 상자들을 안쪽부터 최소한으로 움직인다 */
  function revealCaptureRect(anchor,offset,scrollers){
    scrollers.forEach(el=>{
      const a=anchor.getBoundingClientRect();
      const sub={left:a.left+offset.left,top:a.top+offset.top,right:a.left+offset.right,bottom:a.top+offset.bottom};
      const box=scrollerBox(el);
      const delta=(lo,hi,boxLo,boxHi)=>lo<boxLo?lo-boxLo:hi>boxHi?Math.min(hi-boxHi,lo-boxLo):0;
      const dx=delta(sub.left,sub.right,box.left,box.right),dy=delta(sub.top,sub.bottom,box.top,box.bottom);
      if(dx)el.scrollLeft+=dx;
      if(dy)el.scrollTop+=dy;
    });
  }
  /* since 이후에 찍힌 프레임이 올 때까지 기다린다(내용이 그대로면 새 프레임이 안 올 수 있어 timeout 후 현재 프레임 사용) */
  function waitCaptureFrame(video,since,timeout){
    return new Promise(resolve=>{
      let done=false,count=0;
      const finish=ok=>{if(!done){done=true;clearTimeout(timer);resolve(ok);}};
      const timer=setTimeout(()=>finish(false),timeout);
      if(!video.requestVideoFrameCallback){setTimeout(()=>finish(true),250);return;}
      const step=(now,meta)=>{
        if(done)return;
        if(meta.captureTime!=null?meta.captureTime>=since:++count>=2)finish(true);
        else video.requestVideoFrameCallback(step);
      };
      video.requestVideoFrameCallback(step);
    });
  }
  const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  /* 탭 캡처가 시작되면 Chrome 공유 안내 막대만큼 창 높이가 바뀌어 화면 맞춤 배율이 다시 계산된다 — 영역 · 프레임 크기가 멈출 때까지 기다림 */
  async function waitCaptureStable(video){
    let last='',same=0;
    const start=performance.now();
    while(performance.now()-start<4000){
      await new Promise(resolve=>setTimeout(resolve,60));
      const target=getCaptureTarget();
      const key=[innerWidth,innerHeight,video.videoWidth,video.videoHeight].concat(target?[target.core.left,target.core.top,target.core.right,target.core.bottom].map(v=>Math.round(v*4)):[]).join(',');
      if(video.videoWidth&&key===last){if(++same>=6)return true;}else{same=0;last=key;}
    }
    return false;
  }
  /* 탭 화면이 프레임 안에 놓인 위치 · 배율 — 프레임 크기는 짝수여야 해서(I420) 창 크기가 홀수 px 이면 Chrome 이 내용을 비율대로 줄여
   * 가운데 놓고 남는 1~2px 을 검게 채운다(위치 · 크기는 짝수로 내림). 같은 규칙으로 계산해야 오른쪽 · 아래로 갈수록 생기는 1~2px 어긋남이 없다 */
  function getCaptureContentBox(video){
    const vw=video.videoWidth,vh=video.videoHeight,iw=innerWidth,ih=innerHeight;
    if(captureRegion)return{x:0,y:0,kx:vw/captureRegion.w,ky:vh/captureRegion.h};   /* Region Capture: 프레임 = 창 왼쪽 위 짝수 영역(1:1) */
    const s=Math.min(vw/iw,vh/ih);
    const w=Math.min(vw,Math.round(iw*s))&~1,h=Math.min(vh,Math.round(ih*s))&~1;
    return {x:Math.floor((vw-w)/2)&~1,y:Math.floor((vh-h)/2)&~1,kx:w/iw,ky:h/ih};
  }
  function captureFileName(){
    const d=new Date(),p=n=>String(n).padStart(2,'0');
    const stamp=`${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    if(viewMode==='compare')return `device-preview-compare-${stamp}.png`;
    const view=primaryView,device=getDevice(view);
    const slug=text=>String(text).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    let name=device?slug(device.name):`custom-${view.baseWidth}x${view.baseHeight}`;
    if(device&&(!name||/[^\x00-\x7f]/.test(device.name)))name=slug(view.deviceId);   /* 한글 이름(Breakpoint 테스트) 은 기기 id 로 */
    if(device&&device.states.length>1)name+='-'+slug(view.stateId);
    if(view.rotated)name+='-rotated';
    return `device-preview-${name}-${stamp}.png`;
  }
  function showCaptureMessage(text){
    announce(text);
    const status=elements.frameStatus,previous=status.textContent;
    status.textContent=text;
    clearTimeout(captureMessageTimer);
    captureMessageTimer=setTimeout(()=>{if(status.textContent===text)status.textContent=previous;},4000);
  }
  /* 화면 캡처(2026-11-02): Device Preview 화면에 보이는 기기 셸 / 비교 카드 전체를 한 장으로. 2026-11-03 부터 버튼은 풀페이지(captureFullPage) 에 연결 —
   * 이 함수는 화면 그대로의 캡처가 다시 필요할 때를 위해 남겨 둔다(조각 이어 붙이기 · 프레임 좌표 계산은 풀페이지와 같은 함수를 쓴다) */
  async function captureScreenshot(){
    const btn=elements.captureBtn;
    if(capturing||!captureSupported())return;
    if(!getCaptureTarget()){showCaptureMessage('캡처할 기기가 없습니다.');return;}
    const focused=document.activeElement;   /* 버튼을 비활성화하기 전에 — 끝나면 여기로 포커스를 돌려준다 */
    capturing=true;btn.disabled=true;btn.setAttribute('aria-busy','true');
    let stream=null,video=null;
    const scrollers=[],saved=[];
    try{
      const cap=await openTabCapture();   /* 클릭 처리의 첫 await(사용자 활성화) */
      if(!cap)return;
      stream=cap.stream;video=cap.video;
      const target=getCaptureTarget();
      if(!target){showCaptureMessage('캡처할 기기가 없습니다.');return;}
      const fit=cap.fit;
      const kx=fit.kx,ky=fit.ky;
      const anchor=target.anchor;
      getCaptureScrollers(anchor).forEach(el=>{scrollers.push(el);saved.push([el.scrollLeft,el.scrollTop]);});
      const a0=anchor.getBoundingClientRect();
      /* 기준 요소 왼쪽 위 기준 좌표(스크롤해도 그대로). 그림자가 스크롤 영역 밖까지 번지면 어떤 스크롤로도 보이지 않으므로 스크롤 내용 범위로 자른다 */
      const reach=rectShift(scrollContentBox(scrollers[0]),-a0.left,-a0.top);
      const core=rectShift(target.core,-a0.left,-a0.top),region=rectIntersect(rectShift(target.all,-a0.left,-a0.top),reach)||core;
      const clip0=getCaptureClip(anchor);
      if(!clip0){showCaptureMessage('기기가 화면에 보이지 않아 캡처하지 못했습니다.');return;}
      const tileW=Math.max(40,Math.floor(clip0.right-clip0.left)-2),tileH=Math.max(40,Math.floor(clip0.bottom-clip0.top)-2);   /* 보이는 범위보다 2px 작게 — 아래 1px 겹침이 늘 보이는 범위 안에 들어가게 */
      const k=kx;
      const canvas=document.createElement('canvas');
      canvas.width=Math.round((region.right-region.left)*k);canvas.height=Math.round((region.bottom-region.top)*k);
      const ctx=canvas.getContext('2d');
      ctx.imageSmoothingEnabled=false;   /* 화면 px 와 1:1 이라 보간이 필요 없다 — 보간하면 보이는 범위 경계 바깥 1px(패널 테두리 등) 이 섞여 이음선이 된다 */
      ctx.fillStyle=getComputedStyle(elements.previewStage).backgroundColor||'#fff';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      let complete=true,first=true;
      for(let ty=region.top;ty<region.bottom;ty+=tileH){
        for(let tx=region.left;tx<region.right;tx+=tileW){
          const tile={left:tx,top:ty,right:Math.min(tx+tileW,region.right),bottom:Math.min(ty+tileH,region.bottom)};
          const tileCore=rectIntersect(tile,core);
          const before=scrollers.map(el=>el.scrollLeft+','+el.scrollTop).join('|');
          revealCaptureRect(anchor,tile,scrollers);
          const moved=scrollers.map(el=>el.scrollLeft+','+el.scrollTop).join('|')!==before;
          if(moved||first){const since=performance.now();await nextPaint();await waitCaptureFrame(video,since,first?300:1200);first=false;}
          const a=anchor.getBoundingClientRect();
          const screenTile=rectShift(tile,a.left,a.top);
          const clip=getCaptureClip(anchor)||{left:0,top:0,right:0,bottom:0};
          const visible=rectIntersect(screenTile,clip);
          if(tileCore){const sc=rectShift(tileCore,a.left,a.top);if(!visible||visible.left>sc.left+1||visible.top>sc.top+1||visible.right<sc.right-1||visible.bottom<sc.bottom-1)complete=false;}
          if(!visible)continue;
          /* 이웃 조각과 1px 겹쳐 그린다 — 소수 경계에서 생기는 밝은 이음선 방지(겹치는 부분은 같은 화면이라 그대로) */
          const piece=rectIntersect({left:visible.left-1,top:visible.top-1,right:visible.right+1,bottom:visible.bottom+1},rectIntersect(clip,rectShift(region,a.left,a.top))||visible)||visible;
          ctx.drawImage(video,fit.x+piece.left*kx,fit.y+piece.top*ky,(piece.right-piece.left)*kx,(piece.bottom-piece.top)*ky,
            (piece.left-a.left-region.left)*k,(piece.top-a.top-region.top)*k,(piece.right-piece.left)*k,(piece.bottom-piece.top)*k);
        }
      }
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      if(!blob){showCaptureMessage('이미지를 만들지 못했습니다.');return;}
      const link=document.createElement('a');
      link.href=URL.createObjectURL(blob);link.download=captureFileName();
      document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(link.href),2000);
      showCaptureMessage(complete?`스크린샷을 저장했습니다 (${canvas.width} × ${canvas.height}).`:`스크린샷을 저장했습니다 — 화면 밖에 있어 일부를 찍지 못했습니다 (${canvas.width} × ${canvas.height}).`);
    }finally{
      scrollers.forEach((el,i)=>{el.scrollLeft=saved[i][0];el.scrollTop=saved[i][1];});
      if(stream)stream.getTracks().forEach(track=>track.stop());
      if(video)video.srcObject=null;
      document.querySelectorAll('.capture_region, .capture_tick').forEach(el=>el.remove());captureRegion=null;   /* openTabCapture 가 만든 표시(이 함수는 closeTabCapture 를 쓰지 않음) */
      document.body.classList.remove('is_capturing');
      if(scrollers.length){await nextPaint();scrollers.forEach((el,i)=>{el.scrollLeft=saved[i][0];el.scrollTop=saved[i][1];});}   /* 공유 안내 막대가 사라지며 창 높이가 돌아온 뒤 한 번 더 */
      capturing=false;btn.disabled=false;btn.removeAttribute('aria-busy');
      if(focused&&focused.isConnected&&typeof focused.focus==='function')focused.focus({preventScroll:true});
    }
  }
  /* 탭 캡처 시작(두 스크린샷 공통): 공유 창 → 이 탭인지 확인 → video 재생 → 공유 안내 막대로 바뀐 배치가 멈출 때까지 대기.
   * 취소 · 실패면 안내하고 null. 클릭 처리에서 다른 await 보다 먼저 불러야 한다(getDisplayMedia 는 사용자 활성화가 필요 — 이 함수 안에서 await 없이 바로 호출된다) */
  async function openTabCapture(){
    const dpr=window.devicePixelRatio||1;
    const width=Math.round(innerWidth*dpr),height=Math.round(innerHeight*dpr);
    let stream;
    try{
      /* 이 탭을 기본 선택으로 하고 다른 창 · 화면은 고르지 않게 한다 */
      /* 마우스 커서 제외: 표준 cursor 제약을 브라우저가 지원할 때만(Chrome 156 은 미지원 — getSupportedConstraints().cursor false, settings 'motion') */
      const cursor=navigator.mediaDevices.getSupportedConstraints().cursor?{cursor:'never'}:{};
      stream=await navigator.mediaDevices.getDisplayMedia({video:{width:{ideal:width,max:width},height:{ideal:height,max:height},frameRate:{ideal:30},...cursor},audio:false,preferCurrentTab:true,selfBrowserSurface:'include',surfaceSwitching:'exclude',monitorTypeSurfaces:'exclude'});
    }catch(error){
      showCaptureMessage(error&&error.name==='NotAllowedError'?'스크린샷을 취소했습니다.':'화면 캡처를 시작하지 못했습니다.');
      return null;
    }
    const track=stream.getVideoTracks()[0];
    const video=document.createElement('video');
    const cap={stream,video};
    /* 다른 탭 · 창을 골랐으면 중단 — Region Capture 는 이 탭을 찍는 트랙에만 cropTo 를 허용한다 */
    let thisTab=track.getSettings().displaySurface!=='monitor'&&track.getSettings().displaySurface!=='window';
    if(thisTab&&window.CropTarget&&track.cropTo){
      try{await track.cropTo(await CropTarget.fromElement(document.body));await track.cropTo(null);}catch(error){thisTab=false;}
    }
    if(!thisTab){closeTabCapture(cap);showCaptureMessage('지금 보고 있는 이 탭을 선택해야 스크린샷을 저장할 수 있습니다.');return null;}
    document.body.classList.add('is_capturing');
    video.muted=true;video.playsInline=true;video.srcObject=stream;
    await video.play();
    await waitCaptureStable(video);
    cap.tick=document.createElement('i');   /* 새 프레임을 만들기 위한 화면 구석 1px 표시(styles.css .capture_tick) */
    cap.tick.className='capture_tick';
    cap.tick.setAttribute('aria-hidden','true');
    document.body.appendChild(cap.tick);
    /* 트랙 프레임을 직접 읽는다(풀페이지): 문서에 붙지 않은 video 는 누가 읽기 전까지 새 프레임 · requestVideoFrameCallback 을 주지 않아
     * 스크롤 직후 이전 화면이 잘릴 수 있다(다른 출처 iframe 에서 실측). 가장 최근 프레임과 도착 시각만 보관한다 */
    if(window.MediaStreamTrackProcessor){
      try{
        cap.reader=new MediaStreamTrackProcessor({track}).readable.getReader();
        cap.latest=null;cap.latestAt=0;cap.latestShot=0;cap.clockOffset=Infinity;
        (async()=>{
          try{
            for(;;){
              const {value,done}=await cap.reader.read();
              if(done)break;
              const previous=cap.latest;
              cap.latest=value;cap.latestAt=performance.now();
              /* VideoFrame.timestamp = 캡처 시각(µs, 별도 단조 시계) — 도착 시각과의 최소 차로 performance.now() 기준에 맞춘다 */
              const stamp=value.timestamp/1000;
              cap.clockOffset=Math.min(cap.clockOffset,cap.latestAt-stamp);
              cap.latestStamp=stamp;
              if(previous)previous.close();
            }
          }catch(error){}
        })();
      }catch(error){cap.reader=null;}
    }
    if(cap.reader)await cropCaptureRegion(cap,track);
    const fit=cap.reader&&cap.latest?getCaptureContentBox({videoWidth:cap.latest.displayWidth,videoHeight:cap.latest.displayHeight}):getCaptureContentBox(video);
    if(!fit.kx||Math.abs(fit.kx-fit.ky)/fit.kx>.02){closeTabCapture(cap);showCaptureMessage('캡처 화면 크기가 맞지 않아 저장하지 않았습니다. 이 탭을 다시 선택해 주세요.');return null;}
    cap.fit=fit;
    return cap;
  }
  /* 1:1 프레임(2026-11-05 캡처 화질): 창 크기가 홀수 장치 px 이면 Chrome 이 탭 화면을 짝수 크기 프레임에 맞춰 다시 샘플링해
   * (실측 — 창 높이 793 → 프레임 792, 세로 0.9987배) 1px 선 · 작은 글자 · 이미지가 통째로 흐려진다. 창 왼쪽 위에 짝수 장치 px 크기의
   * 투명 고정 요소(.capture_region) 를 두고 Region Capture(cropTo) 로 그 영역만 받으면 프레임 1px = 화면 장치 1px.
   * 등록한 요소가 한 번 그려진 뒤에 cropTo 해야 프레임이 온다(실측). 1.5초 안에 그 크기 프레임이 안 오면 자르지 않고 이전 방식 */
  let captureRegion=null;   /* Region Capture 영역 {w, h}(CSS px, 창 왼쪽 위 기준) */
  async function cropCaptureRegion(cap,track){
    if(!window.CropTarget||!track.cropTo)return;
    const dpr=window.devicePixelRatio||1;
    const want=[Math.floor(innerWidth*dpr+1e-3)&~1,Math.floor(innerHeight*dpr+1e-3)&~1];
    const el=document.createElement('i');
    el.className='capture_region';
    el.setAttribute('aria-hidden','true');
    el.style.width=want[0]/dpr+'px';el.style.height=want[1]/dpr+'px';
    document.body.appendChild(el);
    const bump=()=>{cap.tick.dataset.on=cap.tick.dataset.on==='1'?'0':'1';};
    try{
      const target=await CropTarget.fromElement(el);
      for(let i=0;i<3;i++){bump();await nextPaint();}
      await track.cropTo(target);
      const since=performance.now(),end=since+1500;
      while(performance.now()<end){
        bump();await nextPaint();await sleep(30);
        const frame=cap.latest;
        if(frame&&cap.latestAt>since&&frame.displayWidth===want[0]&&frame.displayHeight===want[1]){
          cap.region=el;captureRegion={w:want[0]/dpr,h:want[1]/dpr};
          cap.clockOffset=cap.latestAt-cap.latestStamp;   /* 자른 뒤 프레임 시각 기준을 다시 잡는다(waitSliceFrame) */
          return;
        }
      }
      await track.cropTo(null);
    }catch(error){
      try{await track.cropTo(null);}catch(e){}
    }
    el.remove();
  }
  function closeTabCapture(cap){
    if(!cap)return;
    if(cap.region){cap.region.remove();cap.region=null;captureRegion=null;}
    if(cap.tick){cap.tick.remove();cap.tick=null;}
    if(cap.reader)cap.reader.cancel().catch(()=>{});
    if(cap.latest){cap.latest.close();cap.latest=null;}
    cap.stream.getTracks().forEach(track=>track.stop());
    cap.video.srcObject=null;
  }
  /* since 이후에 도착한 프레임을 기다린다(내용이 그대로면 새 프레임이 오지 않으므로 timeout 뒤 가장 최근 프레임을 쓴다) */
  async function waitTrackFrame(cap,since,timeout){
    if(!cap.reader){await waitCaptureFrame(cap.video,since,timeout);return;}
    const end=performance.now()+timeout;
    while(cap.latestAt<since&&performance.now()<end)await sleep(16);
  }
  /* 지금 잘라 쓸 프레임과 그 프레임 기준 좌표 변환. release() 로 돌려준다 */
  function takeTrackFrame(cap){
    if(cap.reader&&cap.latest){
      const frame=cap.latest.clone();
      return{source:frame,fit:getCaptureContentBox({videoWidth:frame.displayWidth,videoHeight:frame.displayHeight}),release:()=>frame.close()};
    }
    return{source:cap.video,fit:getCaptureContentBox(cap.video),release:()=>{}};
  }
  function saveCapturePng(canvas,name){
    return new Promise(resolve=>canvas.toBlob(blob=>{
      if(!blob){resolve(false);return;}
      const link=document.createElement('a');
      link.href=URL.createObjectURL(blob);link.download=name;
      document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(link.href),2000);
      resolve(true);
    },'image/png'));
  }

  /* ------------------------------------------------------------------
   * 풀페이지 스크린샷(2026-11-03, 스크린샷 버튼의 기본 동작)
   *
   * 기기마다 사이트 viewport(iframe 폭 · 높이 · breakpoint · 방향) 를 그대로 둔 채 문서(document) 를 위에서 아래로 스크롤하며
   * iframe 영역만 잘라 한 장의 긴 PNG 로 잇는다 — 기기 프레임 · 상태바 · 주소창 · 그림자는 넣지 않는다. 다중 비교는 카드마다 따로 PNG.
   * 탭 캡처는 한 번만 승인받아 모든 기기에 쓰고, 끝나면 트랙을 멈춘다.
   *   스크롤 · 높이: 같은 출처 = 문서 직접 · 다른 출처 = Scroll Bridge 1.3.0 의 capture 메시지(px 위치 적용 · 문서 높이 · 고정 띠 높이 — 숫자만).
   *     단일 보기의 다른 출처 iframe 은 평소 브리지가 없어 캡처할 때만 연결하고 끝나면 정리한다.
   *   조각: 화면 px 와 1:1 로 잘라(보간 없음 — iframe 가장자리는 안쪽으로 반올림해 베젤 색이 섞이지 않게) 세로로 잇는다.
   *     마지막 조각은 문서 끝(scrollHeight − clientHeight) 에 맞추고 이미 이은 부분은 다시 넣지 않는다. 조각마다 문서 높이를 다시 읽어
   *     lazy-load 로 길어진 만큼 계속하되 FULL_MAX_SLICES 조각 · 출력 높이 FULL_MAX_HEIGHT · 면적 FULL_MAX_PIXELS 에서 멈춘다.
   *   fixed / sticky: 사이트를 바꾸지 않는다. 화면 위 · 아래 가장자리에 붙은 고정 요소의 높이(띠) 만큼 이어 붙일 범위를 줄여
   *     위 띠는 첫 조각에만 · 아래 띠는 마지막 조각에만 남게 한다(그 뒤에 가려진 내용은 이웃 조각에서 가져옴). 화면 가운데 · 옆에 떠 있는
   *     고정 요소와 키 큰 고정 요소(높이 40% 초과) 는 조각마다 반복될 수 있다.
   *   캡처 중에는 그 기기만 사이트 위에 겹치는 Device Preview 표시(띠 · 컷아웃 · 접힘선 · 가이드 · 가상 키보드 · Duo UI) 를 숨기고
   *     화면 마스크를 푼다(CSS data-capture, 배치 변화 없음). 스크롤 · 페이지 이동 동기화 전파는 잠근다(syncOptions 는 그대로).
   *   끝나면(취소 · 오류 포함) 문서 스크롤 · 스테이지 스크롤 · 표시를 되돌린다. 내부 overflow 영역은 건드리지 않는다.
   * ------------------------------------------------------------------ */
  const FULL_MAX_SLICES=100;
  const FULL_MAX_HEIGHT=32000;        /* 출력 PNG 높이 상한(px) — Chrome 캔버스 한 변 한계 32767 안 */
  const FULL_MAX_PIXELS=60000000;     /* 출력 PNG 면적 상한(px) — 캔버스 · 조각 메모리 */
  const FULL_SETTLE_MS=250;           /* 스크롤 뒤 렌더 안정화(저해상도 → 원래 해상도 다시 그리기 · 짧은 애니메이션 · lazy 이미지) */
  /* 캡처 화질(2026-11-05): 목표 출력 px / 사이트 CSS px. 캡처하는 동안만 그 기기 셸의 시각 transform 을 키워 Chrome 이 iframe 을
   * 더 높은 배율로 다시 그리게 하고(실측 — 단순 확대가 아닌 재래스터, 같은 출처 · 다른 출처 같음) 그 화면 px 를 1:1 로 잇는다.
   * iframe CSS 크기 · innerWidth / innerHeight · media query · 저장 배율(view.scale) 은 그대로. 문서가 길어 한계를 넘으면 낮은 배율부터 고른다 */
  const CAPTURE_QUALITY=[2,1.7,1.4,1];
  let captureLock=false;              /* 캡처 중 스크롤 · 페이지 이동 동기화 전파 잠금 */
  let captureReqSeq=0;
  const captureReplies=new Map();     /* 브리지 capture 응답 대기 req → {view, resolve} */
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  /* 화면 위 · 아래 가장자리에 붙은 fixed / (지금 붙어 있는) sticky 요소의 띠 높이(CSS px). Scroll Bridge 의 fixedBands() 와 같은 규칙 */
  function measureFixedBands(win){
    const doc=win.document,root=doc.scrollingElement||doc.documentElement;
    const h=root.clientHeight,w=root.clientWidth;
    const list=doc.body?doc.body.getElementsByTagName('*'):[];
    const start=performance.now();
    let top=0,bottom=0;
    for(let i=0;i<list.length;i++){
      if((i&255)===0&&performance.now()-start>80)return{top:0,bottom:0};   /* 아주 큰 문서는 띠 보정 없이 */
      const cs=win.getComputedStyle(list[i]);
      if(cs.position!=='fixed'&&cs.position!=='sticky')continue;
      if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)===0)continue;
      const r=list[i].getBoundingClientRect();
      if(r.width<1||r.height<1||r.bottom<=0||r.top>=h||r.right<=0||r.left>=w||r.height>h*.4)continue;
      if(cs.position==='sticky'){
        const stuckTop=cs.top!=='auto'&&Math.abs(r.top-parseFloat(cs.top))<=1;
        const stuckBottom=cs.bottom!=='auto'&&Math.abs(h-r.bottom-parseFloat(cs.bottom))<=1;
        if(!stuckTop&&!stuckBottom)continue;
      }
      if(r.bottom<=h*.45)top=Math.max(top,Math.ceil(r.bottom));
      else if(r.top>=h*.55)bottom=Math.max(bottom,Math.ceil(h-r.top));
    }
    return h-top-bottom<Math.max(40,h*.15)?{top:0,bottom:0}:{top,bottom};   /* 띠를 빼고 한 조각에 40px · 화면의 15% 이상 남을 때만 보정(가로 휴대폰의 헤더 + sticky + 하단 내비도 포함되게) */
  }
  function readDocMetrics(win){
    const root=win.document.scrollingElement||win.document.documentElement;
    const bands=measureFixedBands(win);
    return{top:root.scrollTop,left:root.scrollLeft,height:root.scrollHeight,clientHeight:root.clientHeight,clientWidth:root.clientWidth,bandTop:bands.top,bandBottom:bands.bottom};
  }
  function sanitizeCaptureMetrics(value){
    const num=key=>value&&typeof value[key]==='number'&&Number.isFinite(value[key])?Math.max(0,value[key]):0;
    return{top:num('top'),left:num('left'),height:num('height'),clientHeight:num('clientHeight'),clientWidth:num('clientWidth'),bandTop:num('bandTop'),bandBottom:num('bandBottom')};
  }
  function bridgeCapture(view,message){
    return new Promise((resolve,reject)=>{
      const req='c'+(++captureReqSeq);
      const timer=setTimeout(()=>{captureReplies.delete(req);reject(new Error('bridge-timeout'));},4000);
      captureReplies.set(req,{view,resolve:metrics=>{clearTimeout(timer);resolve(metrics);}});
      postToBridge(view,'capture',Object.assign({req},message));
    });
  }
  /* 문서 스크롤 수단: 같은 출처 = 직접, 다른 출처 = capture 를 알린 브리지. 없으면 null */
  function makeDocDriver(view){
    const win=getSameOriginWindow(view);
    if(win){
      const painted=()=>Promise.race([new Promise(resolve=>win.requestAnimationFrame(()=>win.requestAnimationFrame(resolve))),sleep(200)]);
      return{
        metrics:async()=>readDocMetrics(win),
        scroll:async(top,left)=>{
          try{win.scrollTo({top,left,behavior:'instant'});}catch(error){win.scrollTo(left,top);}   /* instant: 사이트의 scroll-behavior: smooth 와 무관하게 바로 */
          await painted();
          return readDocMetrics(win);
        }
      };
    }
    if(view.bridge&&view.bridge.state==='ready'&&view.bridge.capture)return{
      metrics:()=>bridgeCapture(view,{op:'metrics'}),
      scroll:(top,left)=>bridgeCapture(view,{op:'scroll',top,left})
    };
    return null;
  }
  /* 단일 보기의 다른 출처 iframe: 캡처할 때만 브리지를 연결한다(READY 까지 최대 3.5초) */
  function connectCaptureBridge(view){
    startScrollBridge(view);
    const bridge=view.bridge,start=performance.now();
    return new Promise(resolve=>{
      const check=()=>{
        if(view.bridge!==bridge||bridge.state==='none'||performance.now()-start>3500){resolve(false);return;}
        if(bridge.state==='ready'){resolve(true);return;}
        setTimeout(check,50);
      };
      check();
    });
  }
  function captureNameFor(view,kind,stamp){
    const device=getDevice(view);
    const slug=text=>String(text).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    let name=device?slug(device.name):`custom-${view.baseWidth}x${view.baseHeight}`;
    if(device&&(!name||/[^\x00-\x7f]/.test(device.name)))name=slug(view.deviceId);   /* 한글 이름(Breakpoint 테스트) 은 기기 id 로 */
    if(device&&device.states.length>1)name+='-'+slug(view.stateId);
    if(view.rotated)name+='-rotated';
    return `device-preview-${name}-${kind}-${stamp}.png`;
  }
  function captureStamp(){
    const d=new Date(),p=n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }
  /* 스크롤 직후: 짧게 안정화한 뒤 지금 화면 그대로의 새 프레임을 받는다.
   * 탭 캡처는 화면이 바뀔 때만 프레임을 보내는데, 스크롤 직후의 중간 상태(저해상도로 먼저 그린 화면 등) 를 마지막으로 보내고 멈추는 경우가 있다(실측 —
   * 마지막 프레임이 실제 화면과 4~5행 어긋남). 그래서 안정화 뒤 화면 구석의 1px 표시(.capture_tick) 를 바꿔 새 프레임을 만들게 하고,
   * 그 변경 이후(다음 requestAnimationFrame 뒤) 에 찍힌 프레임만 쓴다 — 프레임은 탭 전체를 담으므로 그 순간의 iframe 화면이 들어 있다 */
  async function waitSliceFrame(cap){
    await sleep(FULL_SETTLE_MS);
    if(!cap.reader||!cap.tick){await nextPaint();await waitCaptureFrame(cap.video,performance.now(),300);return;}
    cap.tick.dataset.on=cap.tick.dataset.on==='1'?'0':'1';
    const mark=await new Promise(resolve=>requestAnimationFrame(()=>resolve(performance.now())));
    const end=performance.now()+800;
    while(!(cap.latest&&cap.latestStamp+cap.clockOffset>=mark+4)&&performance.now()<end)await sleep(10);
  }
  /* iframe 의 화면 px 상자(안쪽으로 반올림) — 조각 열 · 행 0 의 기준 */
  function frameCaptureBox(frame,fit){
    const r=frame.getBoundingClientRect();
    /* 창 크기가 홀수 px 이라 Chrome 이 프레임을 비율대로 줄였으면(kx · ky ≠ DPR) 경계 1px 이 이웃 색과 섞인다 → 이음선 · 가장자리에서 1px 씩 덜 쓴다 */
    /* 2026-11-05: 배율 변환된 iframe 은 가장자리 1px 이 안티앨리어싱으로 배경과 섞이고, 영상 프레임은 색을 2×2 px 묶음(4:2:0) 으로 담아
     * 그 옆 1px 까지 번진다(Region Capture 1:1 프레임에서 실측). 홀수 px 가장자리도 같은 번짐 → 이 경우들에도 같은 보정 */
    const dpr=window.devicePixelRatio||1;
    const scale=r.height/(frame.offsetHeight||1);
    const x0=Math.ceil(fit.x+r.left*fit.kx-1e-3),y0=Math.ceil(fit.y+r.top*fit.ky-1e-3),x1=Math.floor(fit.x+r.right*fit.kx+1e-3),y1=Math.floor(fit.y+r.bottom*fit.ky+1e-3);
    const trim=Math.abs(fit.kx-dpr)>1e-4||Math.abs(fit.ky-dpr)>1e-4||Math.abs(scale-1)>1e-4||(x0|y0|x1|y1)&1?1:0;
    return{r,trim,x0,y0,x1,y1,scale};
  }
  /* 현재 문서 위치의 iframe 화면에서 조각 행 [rowA, rowB) · 열 [0, width) 를 잘라 pieces 에 넣는다(행 · 열 = iframe 화면 px 상자 x0 / y0 기준 정수).
   * iframe 이 보이는 범위보다 크면(100% · 실기기) 스테이지를 스크롤하며 나눠 찍는다. 다 덮지 못하면 false */
  async function grabFrameRows(cap,frame,rowA,rowB,width,outBase,pieces,scrollers,snap){
    let fit=takeTrackFrame(cap);fit.release();fit=fit.fit;
    let clip0=getCaptureClip(frame);
    if(!clip0){
      /* 캡처 배율로 커진 기기의 화면 상자가 스테이지 보이는 범위 밖(아래 · 오른쪽) 에 있으면 이 줄의 시작 부분이 보이게 먼저 스크롤 */
      const box=frameCaptureBox(frame,fit);
      revealCaptureRect(frame,{left:(box.x0-fit.x)/fit.kx-box.r.left-2,top:(box.y0+rowA-fit.y)/fit.ky-box.r.top-2,right:(box.x1-fit.x)/fit.kx-box.r.left+2,bottom:(box.y0+rowB-fit.y)/fit.ky-box.r.top+2},scrollers);
      await waitSliceFrame(cap);
      fit=takeTrackFrame(cap);fit.release();fit=fit.fit;
      clip0=getCaptureClip(frame);
      if(!clip0)return false;
    }
    const tileW=Math.max(40,Math.floor((clip0.right-clip0.left)*fit.kx)-6),tileH=Math.max(40,Math.floor((clip0.bottom-clip0.top)*fit.ky)-6);   /* 화면 px — 보이는 범위보다 6px 작게(아래 2px 여유 · 반올림) */
    let complete=true;
    for(let ra=rowA;ra<rowB;ra+=tileH){
      const rb=Math.min(ra+tileH,rowB);
      for(let ca=0;ca<width;ca+=tileW){
        const cb=Math.min(ca+tileW,width);
        let box=frameCaptureBox(frame,fit);
        /* 이 조각(화면 px) 이 보이게 스크롤 — revealCaptureRect 는 iframe 기준 CSS 좌표 */
        const css={left:(box.x0+ca-fit.x)/fit.kx-box.r.left,top:(box.y0+ra-fit.y)/fit.ky-box.r.top,right:(box.x0+cb-fit.x)/fit.kx-box.r.left,bottom:(box.y0+rb-fit.y)/fit.ky-box.r.top};
        const before=scrollers.map(el=>el.scrollLeft+','+el.scrollTop).join('|');
        revealCaptureRect(frame,{left:css.left-2,top:css.top-2,right:css.right+2,bottom:css.bottom+2},scrollers);   /* 보이는 범위 가장자리에 딱 붙이면 안쪽 반올림으로 1px 이 빠진다 */
        const moved=scrollers.map(el=>el.scrollLeft+','+el.scrollTop).join('|')!==before;
        if((snap&&snap())||moved)await waitSliceFrame(cap);   /* 스크롤 직후 첫 프레임은 이전 화면일 수 있어 안정화까지 */
        const shot=takeTrackFrame(cap);
        fit=shot.fit;
        box=frameCaptureBox(frame,fit);
        const clip=getCaptureClip(frame);
        if(!clip){shot.release();complete=false;continue;}
        const sx=Math.max(box.x0+ca,box.x0+box.trim,Math.ceil(fit.x+clip.left*fit.kx-1e-3)),ex=Math.min(box.x0+cb,box.x1-box.trim,Math.floor(fit.x+clip.right*fit.kx+1e-3));
        const sy=Math.max(box.y0+ra,Math.ceil(fit.y+clip.top*fit.ky-1e-3)),ey=Math.min(box.y0+rb,box.y1,Math.floor(fit.y+clip.bottom*fit.ky+1e-3));
        if(sx>Math.max(box.x0+ca,box.x0+box.trim)||sy>box.y0+ra||ex<Math.min(box.x0+cb,box.x1-box.trim)||ey<Math.min(box.y0+rb,box.y1))complete=false;   /* 조각 일부가 화면 밖 */
        if(ex>sx&&ey>sy)pieces.push({bitmap:await createImageBitmap(shot.source,sx,sy,ex-sx,ey-sy),x:sx-box.x0,y:outBase+(sy-box.y0)});
        shot.release();
      }
    }
    return complete;
  }
  /* 문서 크기(CSS px) 가 출력 한계 안에 들어가는 가장 높은 화질 배율(최소 1) */
  function pickCaptureQuality(cssWidth,cssHeight,below){
    for(const q of CAPTURE_QUALITY){
      if(below&&q>=below)continue;
      const w=Math.ceil(cssWidth*q),h=Math.ceil(cssHeight*q);
      if(h<=FULL_MAX_HEIGHT&&w*h<=FULL_MAX_PIXELS)return q;
    }
    return 1;
  }
  /* 기기 하나의 풀페이지 캡처 → canvas(또는 건너뛴 이유 · 더 낮은 화질로 다시 찍을 배율 retry) */
  async function captureViewFullPage(cap,view,onSlice,qualityCap){
    const driver=makeDocDriver(view);
    if(!driver)return{skip:'access'};
    const frame=view.dom.siteFrame,shell=view.dom.shell;
    const scrollers=getCaptureScrollers(frame);
    const stageSaved=scrollers.map(el=>[el.scrollLeft,el.scrollTop]);
    let start=null;
    const pieces=[];
    let truncated=false,complete=true,covered=0,width=0,f=0,slices=0,trim=0,docHeight=0,quality=0,raised=false,snap=null;
    const shellTransform=shell.style.transform;
    try{
      start=await driver.metrics();
      shell.dataset.capture='site';   /* 사이트 위에 겹치는 표시 숨김 · 화면 마스크 해제 · 셸 transition 끔(styles.css) */
      let m=await driver.scroll(0,start.left);
      await waitSliceFrame(cap);
      {
        let shot=takeTrackFrame(cap);shot.release();
        let box=frameCaptureBox(frame,shot.fit);
        /* 화질: 지금 그려진 배율(셸 배율 × 캡처 px / CSS px — 실제 프레임 크기 기준) 이 목표보다 낮으면 캡처하는 동안만 셸을 키운다 */
        const k=shot.fit.ky,current=box.scale*k;
        quality=Math.min(qualityCap||Infinity,pickCaptureQuality(frame.offsetWidth,Math.max(m.height,m.clientHeight)));
        if(quality>current+1e-3){
          const s=quality/k,fit=shot.fit;
          let tx=0,ty=0;
          shell.style.transform=`scale(${s})`;
          /* 조각마다(스테이지 스크롤 뒤) iframe 왼쪽 위를 짝수 화면 px 에 오게 2 화면 px 미만만 옮긴다 —
           * 안쪽 반올림으로 폭 · 높이가 줄지 않고, 가장자리가 영상 색 묶음(2×2) 경계와 맞아 베젤 색이 섞이지 않는다 */
          snap=()=>{
            const r=frame.getBoundingClientRect();
            const px=fit.x+r.left*fit.kx,py=fit.y+r.top*fit.ky;
            const ex=2*Math.ceil((px-1e-3)/2)-px,ey=2*Math.ceil((py-1e-3)/2)-py;
            if(ex<1e-3&&ey<1e-3)return false;
            tx+=ex/fit.kx;ty+=ey/fit.ky;
            shell.style.transform=`translate(${tx}px, ${ty}px) scale(${s})`;
            return true;
          };
          await nextPaint();
          snap();
          raised=true;
          await waitSliceFrame(cap);
          await waitSliceFrame(cap);   /* 확대 뒤 첫 프레임은 낮은 배율 타일이 남아 있을 수 있어 한 번 더 */
          shot=takeTrackFrame(cap);shot.release();
          box=frameCaptureBox(frame,shot.fit);
        }else{
          quality=current;
        }
        width=box.x1-box.x0;
        f=box.scale*shot.fit.ky;   /* 문서 CSS px → 출력 px */
      }
      const maxRows=Math.min(FULL_MAX_HEIGHT,Math.floor(FULL_MAX_PIXELS/Math.max(1,width)));
      let first=true;
      for(;;){
        const h=m.clientHeight,t=m.top;
        const last=t>=Math.max(0,m.height-h)-.5;
        const shot=takeTrackFrame(cap);shot.release();
        const box=frameCaptureBox(frame,shot.fit);
        trim=Math.max(trim,box.trim);
        const rowsInSlice=box.y1-box.y0-(last?0:box.trim);   /* 이어 붙일 아래 경계 1px 은 다음 조각에서(섞인 행 제외) */
        const off=Math.round(t*f);
        const wantA=first?0:Math.round((t+m.bandTop)*f);
        if(wantA>covered+1)complete=false;   /* 위 띠가 바뀌어 사이가 빔(되돌릴 수 없는 위치) */
        const outA=first?0:Math.max(covered,off+box.trim);   /* 위 경계 1px 도 제외 — 다음 위치를 그만큼 위로 잡아 빈 행이 없다 */
        if(!first&&off+box.trim>covered)complete=false;
        let outB=last?off+rowsInSlice:Math.min(off+rowsInSlice,Math.round((t+h-m.bandBottom)*f)-(m.bandBottom?2:0));   /* 고정 요소 가장자리 2행은 영상 색 번짐(4:2:0) 이 있어 이웃 조각에서 */
        if(outB>maxRows){outB=maxRows;truncated=true;}
        if(outB>outA&&!await grabFrameRows(cap,frame,outA-off,outB-off,width,off,pieces,scrollers,snap))complete=false;
        covered=Math.max(covered,outB);
        docHeight=Math.max(m.height,h);
        slices++;
        if(onSlice)onSlice(slices);
        if(truncated)break;
        if(last){
          /* 끝에 닿은 뒤 lazy-load 로 길어졌으면 계속 */
          await sleep(300);
          const again=await driver.metrics();
          if(again.height<=t+h+1)break;
          m=again;
        }
        if(slices>=FULL_MAX_SLICES){truncated=true;break;}
        first=false;
        const docCovered=covered/f;
        let next=Math.max(t+1,Math.floor(docCovered-m.bandTop-(trim+1+(m.bandTop?2:0))/f));
        m=await driver.scroll(next,start.left);
        /* 새로 붙은 sticky 등으로 위 띠가 커졌으면 그만큼 위로 다시 */
        if(m.top+m.bandTop+(m.bandTop?(trim+2)/f:0)>docCovered+.5&&m.top<Math.max(0,m.height-m.clientHeight)-.5){
          next=Math.max(t+1,Math.floor(docCovered-m.bandTop-(trim+1+(m.bandTop?2:0))/f));
          if(next<m.top)m=await driver.scroll(next,start.left);
        }
        if(m.top<=t)break;   /* 더 내려가지 않음(문서가 줄었음) */
        await waitSliceFrame(cap);
      }
    }finally{
      shell.style.transform=shellTransform;   /* 캡처 전용 배율 되돌림(view.scale · --preview-scale 은 처음부터 그대로) */
      if(start)try{await driver.scroll(start.top,start.left);}catch(error){}
      delete shell.dataset.capture;
      scrollers.forEach((el,i)=>{el.scrollLeft=stageSaved[i][0];el.scrollTop=stageSaved[i][1];});
    }
    /* lazy-load 등으로 문서가 길어져 높인 화질에서 한계에 걸렸으면 한 단계 낮은 배율로 다시 찍는다(1 에서도 넘으면 기존처럼 잘라 저장) */
    if(truncated&&raised&&quality>1&&slices<FULL_MAX_SLICES){
      pieces.forEach(piece=>piece.bitmap.close());
      return{retry:pickCaptureQuality(frame.offsetWidth,docHeight,quality)};
    }
    if(!pieces.length||!width||!covered)return{skip:'empty'};
    /* 마지막 조각은 iframe 가장자리를 안쪽으로 반올림해 문서 끝 1~2행이 모자랄 수 있다 → 높이를 문서 높이 × 배율로 맞추고 마지막 행으로 채운다 */
    const fullRows=truncated?covered:Math.round(docHeight*f);
    const extra=fullRows>covered&&fullRows-covered<=3?fullRows-covered:0;
    const canvas=document.createElement('canvas');
    canvas.width=width;canvas.height=covered+extra;
    const ctx=canvas.getContext('2d');
    ctx.imageSmoothingEnabled=false;
    pieces.forEach(piece=>{ctx.drawImage(piece.bitmap,piece.x,piece.y);piece.bitmap.close();});
    if(trim&&width>4){ctx.drawImage(canvas,2,0,1,covered,0,0,2,covered);ctx.drawImage(canvas,width-3,0,1,covered,width-2,0,2,covered);}   /* 덜 쓰거나 섞인 좌우 끝 2열(소수 위치의 안쪽 반올림 · 비정수 DPR) 은 바로 안쪽 열로 채움 */
    if(extra)ctx.drawImage(canvas,0,covered-1,width,1,0,covered,width,extra);   /* 덜 쓴 좌우 끝(왼쪽 1 · 오른쪽 최대 2 — 소수 위치의 안쪽 반올림) 은 바로 옆 열로 채움 */
    return{canvas,truncated,complete,slices,quality:f};
  }
  /* 캡처 중 마우스 차단(2026-11-06): 풀페이지 캡처는 실제 렌더 픽셀을 찍으므로, 마우스가 iframe 위에 있으면 :hover 상태가 들어가고
   * 문서 · 스테이지 스크롤과 캡처 배율 확대로 마우스 아래를 지나가는 요소마다 조각별로 다른 hover 가 생긴다(실측 — 같은 출처 · 다른 출처 모두).
   * 부모 문서에 창 전체를 덮는 투명 상자(.capture_shield) 를 두어 hit-test 가 iframe 에 닿지 않게 한다 — 사이트 CSS · DOM · iframe 크기 · 위치는 그대로,
   * 그리는 것이 없어 PNG 에 나타나지 않는다. 캡처 시작 전 기존 hover 가 풀렸는지 프레임 단위로 확인한다 */
  function addCaptureShield(){
    const el=document.createElement('i');
    el.className='capture_shield';
    el.setAttribute('aria-hidden','true');
    document.body.appendChild(el);
    return el;
  }
  async function waitHoverCleared(views){
    const hovered=()=>views.some(view=>{
      if(view.dom.siteFrame.matches(':hover'))return true;   /* 부모 쪽 판정(다른 출처 공통) */
      const win=getSameOriginWindow(view);
      try{return Boolean(win&&win.document.querySelector(':hover'));}catch(error){return false;}
    });
    for(let i=0;i<30&&hovered();i++)await nextPaint();   /* 최대 약 1초 — 브라우저가 상자를 넣은 뒤 hover 를 다시 계산할 때까지 */
    await nextPaint();   /* hover 가 풀린 화면이 한 번 그려진 뒤 */
  }
  async function captureFullPage(){
    const btn=elements.captureBtn;
    if(capturing||!captureSupported())return;
    if(!currentUrl){showCaptureMessage('캡처할 페이지가 없습니다. 사이트 주소를 입력해 주세요.');return;}
    const views=viewMode==='compare'
      ?Array.from(compareViews.values()).filter(view=>!view.dom.item.hidden).sort((a,b)=>a.dom.item.compareDocumentPosition(b.dom.item)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1)
      :[primaryView];
    if(!views.length){showCaptureMessage('캡처할 기기가 없습니다.');return;}
    /* 승인 창을 띄우기 전에 캡처할 수 없는 카드를 가린다(단일 보기의 다른 출처는 승인 뒤 브리지 연결로 판정) */
    const skipped=[];
    const reason=view=>{
      if(!view.loaded)return'불러오는 중';
      if(getSameOriginWindow(view))return'';
      if(predictScrollAccess(currentUrl)==='file-origin')return'file://';
      if(view===primaryView&&viewMode!=='compare')return'';
      if(!view.bridge||view.bridge.state!=='ready')return'다른 출처 · Scroll Bridge 연결 안 됨';
      return view.bridge.capture?'':'다른 출처 · Scroll Bridge 1.3.0 필요';
    };
    let targets=views.filter(view=>{const why=reason(view);if(why)skipped.push(getDeviceName(view)+': '+why);return!why;});
    if(!targets.length){showCaptureMessage('풀페이지 캡처할 수 있는 기기가 없습니다 — '+skipped.join(' · '));return;}
    const focused=document.activeElement;
    const statusBefore=elements.frameStatus.textContent;   /* 진행 문구를 지운 뒤 결과 문구가 4초 뒤 이 문구로 돌아가게 */
    capturing=true;btn.disabled=true;btn.setAttribute('aria-busy','true');
    let cap=null,bridgeStarted=false,saved=0,shield=null;
    captureScaleHold=true;
    try{
      shield=addCaptureShield();   /* 동기 — getDisplayMedia 의 사용자 활성화에 영향 없음 */
      cap=await openTabCapture();   /* 클릭 처리의 첫 await — 승인은 한 번 */
      if(!cap)return;
      const single=targets[0]===primaryView&&viewMode!=='compare';
      if(single&&!getSameOriginWindow(primaryView)){
        bridgeStarted=true;
        if(!await connectCaptureBridge(primaryView)||!primaryView.bridge.capture){
          showCaptureMessage('풀페이지 캡처를 하지 못했습니다 — 다른 출처 페이지는 Scroll Bridge 1.3.0 이상이 필요합니다.');
          return;
        }
      }
      captureLock=true;
      await waitHoverCleared(targets);
      const stamp=captureStamp();
      for(let i=0;i<targets.length;i++){
        const view=targets[i];
        const label=`풀페이지 캡처 중 · ${getDeviceName(view)}${targets.length>1?` (${i+1}/${targets.length})`:''}`;
        elements.frameStatus.textContent=label;
        let result;
        try{
          result=await captureViewFullPage(cap,view,count=>{elements.frameStatus.textContent=label+` · 조각 ${count}`;});
          for(let tries=0;result.retry&&tries<3;tries++)result=await captureViewFullPage(cap,view,count=>{elements.frameStatus.textContent=label+` · ${result.retry}× 다시 · 조각 ${count}`;},result.retry);
        }
        catch(error){result={skip:'error'};}
        if(!result.canvas){skipped.push(getDeviceName(view)+': '+(result.skip==='access'?'스크롤할 수 없음':'캡처 실패'));continue;}
        const ok=await saveCapturePng(result.canvas,captureNameFor(view,'full',stamp));
        if(!ok){skipped.push(getDeviceName(view)+': 이미지를 만들지 못함');continue;}
        saved++;
        if(result.truncated)skipped.push(getDeviceName(view)+': 최대 높이에서 잘림');
        else if(!result.complete)skipped.push(getDeviceName(view)+': 일부 영역을 찍지 못함');
        if(i<targets.length-1)await sleep(250);   /* 여러 파일 다운로드 간격 */
      }
      elements.frameStatus.textContent=statusBefore;
      const note=skipped.length?' — '+skipped.join(' · '):'';
      showCaptureMessage(saved?`풀페이지 스크린샷 ${saved}개를 저장했습니다${note}`:`풀페이지 스크린샷을 저장하지 못했습니다${note}`);
    }finally{
      if(elements.frameStatus.textContent.startsWith('풀페이지 캡처 중'))elements.frameStatus.textContent=statusBefore;   /* 오류로 끝난 경우 */
      closeTabCapture(cap);
      if(shield)shield.remove();
      document.body.classList.remove('is_capturing');
      if(bridgeStarted)stopScrollBridge(primaryView);
      captureScaleHold=false;
      updateAllScales();   /* 캡처 중 바뀐 스테이지 크기(공유 막대) 에 맞춰 한 번 */
      await sleep(250);   /* 되돌린 스크롤의 늦은 scroll 이벤트(16ms 묶음) 가 다른 카드로 전파되지 않게 잠금을 조금 늦게 푼다 */
      captureLock=false;
      capturing=false;btn.disabled=false;btn.removeAttribute('aria-busy');
      if(focused&&focused.isConnected&&typeof focused.focus==='function')focused.focus({preventScroll:true});
    }
  }
  function bindCaptureControls(){
    const btn=elements.captureBtn;
    if(!captureSupported()){
      btn.disabled=true;
      btn.title=window.isSecureContext?'스크린샷 저장 — 이 브라우저는 탭 캡처를 지원하지 않습니다':'스크린샷 저장 — localhost · 127.0.0.1 · https 로 연 경우에만 사용할 수 있습니다';
      return;
    }
    btn.addEventListener('click',captureFullPage);
  }

  /* ------------------------------------------------------------------
   * 초기화
   * ------------------------------------------------------------------ */
  if('ResizeObserver'in window)new ResizeObserver(()=>updateAllScales()).observe(elements.previewStage);else window.addEventListener('resize',()=>updateAllScales());
  validateDevices();
  checkScrollbarEnvironment();
  primaryView=createView(mountShell(elements.previewMount,true));
  loadInto(primaryView);
  renderDeviceNav();
  restoreDisplayPreference();
  renderStates();
  updatePreview({announce:false});
  restorePreference();
  restoreComparePreference();
  restoreSavedUrl();
  registerWebMcpTools();
})();

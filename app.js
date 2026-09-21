(function(){
  'use strict';

  /* ==================================================================
   * 데이터
   *
   * frameProfiles  : 기기 프레임. 레이어별 값을 세로 기준으로 적고, 가로는 JS 가 반시계 90° 회전 규칙으로 계산한다.
   *   family                 : 형상 언어(바디 마감·측면 키·스피커 등 CSS 분기 키). iphone-modern | iphone-classic | galaxy-bar | pixel | fold | flip | duo | ipad-classic | ipad-modern | neutral
   *   controls               : 전면 디테일. homeButton{size,ring,bottom} · speaker{width,height,top} · camera/sensor{size, top,offsetX}(상단 베젤) 또는 {size, edge:'right'|'left', offset, inset}(긴 변 베젤, offset 은 화면 중심에서 변을 따라 아래(+)/위(−), inset 은 바디 가장자리에서 중심까지 — 생략 시 베젤 중앙)
   *                            keys[{type:'volume'|'power', edge:'top'|'right'|'bottom'|'left', start, length}](세로 기준 변·시작·길이 px, 지정하면 family 기본 키 대신 사용) · port{edge,width,height}(USB-C 등 커넥터 슬롯).
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

    /* iPhone 12/13/14 (390×844): 바디 146.7×71.5mm(Apple), 활성영역 64.6×139.8mm(6.06" 2532×1170) → 6.04px/mm */
    'iphone-notch':{family:'iphone-modern',top:21,right:21,bottom:21,left:21,ring:8,radius:66,screenRadius:47,platform:'ios',obstruction:'상단 노치',
      cutout:{type:'notch',width:168,height:33,top:0,align:'center'},
      safeArea:{top:47,right:0,bottom:34,left:0},safeAreaLandscape:{top:0,right:47,bottom:21,left:47},homeIndicator:true,homeIndicatorWidth:134,
      source:{body:'official: iPhone 13 146.7×71.5mm (Apple tech specs)',bezel:'derived: (71.5−64.6)/2=3.45mm → 21px',radius:'photo-measured: Commons "IPhone 12 Blue.svg" 바디 코너 14.2/93.06(폭 비율 0.153) → 66px',screenRadius:'derived: 커뮤니티 측정 _displayCornerRadius 47.33pt (벡터 실측 46.2px 일치)',cutout:'derived: iPhone 12 노치 210×32pt(벡터 실측) × Apple 발표 "20% 축소" → 168×33',controls:'photo-measured(측면 키 위치만)',statusBar:'official: iOS safe-area 47/34/21/47'}},

    /* iPhone SE 2·3세대 (375×667): 바디 138.4×67.3mm(Apple), 활성영역 58.5×104.05mm(4.7" 16:9) → 6.41px/mm */
    'iphone-se':{family:'iphone-classic',top:110,right:28,bottom:110,left:28,ring:10,radius:65,screenRadius:0,platform:'ios',obstruction:'화면 밖 홈 버튼·카메라',
      cutout:{type:'none'},safeArea:{top:20,right:0,bottom:0,left:0},safeAreaLandscape:{top:0,right:0,bottom:0,left:0},homeIndicator:false,
      controls:{homeButton:{size:67,ring:3,bottom:21},speaker:{width:74,height:7,top:55},camera:{size:15,top:50,offsetX:-69},sensor:{size:10,top:25}},
      source:{body:'official: 138.4×67.3mm (Apple tech specs 111866)',bezel:'derived: 측면 (67.3−58.5)/2=4.4mm → 28px · 상하 (138.4−104.05)/2=17.2mm → 110px',radius:'photo-measured: Commons "IPhone SE (2nd generation) white vector.svg" rect ry 66.0 / 바디 폭 439.4 (0.150) → 65px',screenRadius:'official: 4.7" LCD 각진 코너 (0)',cutout:'n/a',controls:'photo-measured(같은 파일): 홈 버튼 r 34.13→외경 10.45mm(67px)·내경 9.3mm(60px)·중심 하단에서 8.5mm(55px) · 스피커 75.9×7.1→74×7px 중심 상단 9.1mm · 카메라 r 7.74→15px 중심 x −10.7mm · 센서 점 r 4.9→10px',statusBar:'official: iOS 상태바 20pt'}},

    /* iPhone 14 Pro Max / 15 Plus / 16 Plus (430×932): 바디 160.7×77.6mm(Apple, 14 Pro Max), 활성영역 71.2×154.3mm(6.69") → 6.04px/mm */
    'iphone-dynamic':{family:'iphone-modern',top:19,right:19,bottom:19,left:19,ring:8,radius:74,screenRadius:55,platform:'ios',obstruction:'다이내믹 아일랜드',
      cutout:{type:'island',width:126,height:37,top:11,align:'center'},
      safeArea:{top:59,right:0,bottom:34,left:0},safeAreaLandscape:{top:0,right:59,bottom:21,left:59},homeIndicator:true,homeIndicatorWidth:134,
      source:{body:'official: iPhone 14 Pro Max 160.7×77.6mm',bezel:'derived: (77.6−71.2)/2=3.2mm → 19px',radius:'derived: 화면 코너 + 베젤 (동심 가정) 55+19=74',screenRadius:'derived: 커뮤니티 측정 _displayCornerRadius 55pt',cutout:'derived: 커뮤니티 측정 Dynamic Island 126×37pt, 상단 11pt (14 Pro)',controls:'n/a',statusBar:'official: iOS safe-area 59/34/21/59'}},

    /* iPhone 16/17/18 Pro (402×874): 해상도 2622×1206 official(Apple 18 Pro specs). 바디 mm 는 16 Pro 149.6×71.5 (18 Pro 미확인), 활성영역 66.6×144.7mm(6.27") → 6.04px/mm */
    'iphone-dynamic-pro':{family:'iphone-modern',top:15,right:15,bottom:15,left:15,ring:8,radius:77,screenRadius:62,platform:'ios',obstruction:'다이내믹 아일랜드',
      cutout:{type:'island',width:126,height:37,top:11,align:'center'},
      safeArea:{top:62,right:0,bottom:34,left:0},safeAreaLandscape:{top:0,right:62,bottom:21,left:62},homeIndicator:true,homeIndicatorWidth:134,
      source:{body:'derived: iPhone 16 Pro 149.6×71.5mm 준용 (18 Pro 치수 미확인)',bezel:'derived: (71.5−66.6)/2=2.45mm → 15px',radius:'derived: 동심 가정 62+15=77',screenRadius:'derived: 커뮤니티 측정 iPhone 16 Pro _displayCornerRadius 62pt (18 Pro 미확인)',cutout:'derived: Dynamic Island 126×37pt (14 Pro 측정값 준용)',controls:'n/a',statusBar:'derived: iPhone 16 Pro safe-area top 62pt (18 Pro 미확인)'}},

    /* Galaxy S25 (360×780): 바디 146.9×70.5mm(Samsung), 활성영역 66.0×143.0mm(6.2" 2340×1080) → 5.45px/mm. 렌더: Commons "Galaxy S25 Black (front).png" 1024×1536, 7.0px/mm */
    'galaxy-bar':{family:'galaxy-bar',top:11,right:12,bottom:11,left:12,ring:5,radius:36,screenRadius:24,platform:'android',obstruction:'상단 펀치홀 카메라',
      cutout:{type:'hole',width:19,height:19,top:17,align:'center'},
      safeArea:{top:38,right:0,bottom:24,left:0},safeAreaLandscape:{top:24,right:0,bottom:16,left:38},homeIndicator:true,homeIndicatorWidth:108,
      source:{body:'official: Galaxy S25 146.9×70.5mm',bezel:'derived: 측면 (70.5−66.0)/2=2.25mm → 12px · 상하 1.95mm → 11px (렌더 실측 2.5mm/14px 와 15% 내 일치)',radius:'photo-measured: 바디 코너 45~49px/7.0 = 6.4~7.0mm → 36px',screenRadius:'photo-measured: 화면 코너 ≈30px/7.0 = 4.3mm → 24px',cutout:'photo-measured: 홀 지름 24px/7.0=3.4mm → 19px · 중심 화면 상단에서 4.9mm → 27px(top 17)',controls:'approximation: 측면 키',statusBar:'derived: Android 상태바는 컷아웃 하단(36.5px)+여백 → 38px · 하단 제스처 바 24px approximation'}},

    /* Pixel 9/10 (412×923): 바디 152.8×72.0mm(Google, Pixel 9), 활성영역 64.7×146.1mm(6.3" 2424×1080) → 6.37px/mm. 렌더: Commons "Google Pixel 9 (Obsidian) front.svg" (10px/mm) */
    'android-hole':{family:'pixel',top:22,right:22,bottom:22,left:22,ring:8,radius:64,screenRadius:54,platform:'android',obstruction:'상단 펀치홀 카메라',
      cutout:{type:'hole',width:30,height:30,top:18,align:'center'},
      safeArea:{top:52,right:0,bottom:24,left:0},safeAreaLandscape:{top:24,right:0,bottom:16,left:52},homeIndicator:true,homeIndicatorWidth:108,
      source:{body:'official: Pixel 9 152.8×72.0mm (Pixel 10 동일 치수)',bezel:'derived: (72.0−64.7)/2=3.45mm → 22px (렌더 실측 3.4mm 일치)',radius:'photo-measured: 바디 코너(스쿼클) ≈10mm → 64px',screenRadius:'photo-measured: 화면 코너 ≈8.5mm → 54px',cutout:'photo-measured: 홀 지름 4.75mm → 30px · 중심 화면 상단에서 5.2mm → 33px(top 18)',controls:'approximation: 측면 키',statusBar:'derived: 컷아웃 하단 48px+여백 → 52px · 하단 제스처 바 24px approximation'}},

    /* Galaxy Z Flip8 접힘(FlexWindow 316×349): 접힌 바디 75.4×85.7mm(Samsung, official), 커버 native 1048×948 · 대각선 104.8mm(4.1형) 342ppi(official, 한국 뉴스룸·samsung.com/sec) → 세로 기준 width×height 로 정규화하면 948×1048(derived-orientation) → 활성영역 70.4×77.8mm → 4.49px/mm.
     * 렌더 실측: samsung.com "galaxy-z-flip8-features-colors-design.jpg"(2048×1232, 접힘 정면, 5.93px/mm — 화면 418×461px 비율 1.103 = 공식 1.1055 와 0.2% 내 일치).
     * 구조(photo): 힌지가 위(스파인 2.5mm, 양옆 1.4mm 안쪽, 끝 r 1.1mm) · 카메라 2개 가로 배치 우하단 + 플래시는 카메라 왼쪽 · 디스플레이가 렌즈 주위를 감싼다(렌즈 = 화면 안의 홀).
     * 코너: 힌지 쪽 위 코너는 거의 각짐(바디 r 0.3mm · 화면 r 0.5mm), 아래 코너 바디 r 7.0mm · 화면 r 4.7mm. 베젤 = 프레임 1.35mm + 검은 유리 1.15mm.
     * UI(뉴스룸 First Look "dl9.jpg" Samsung Health 커버 앱 사진): 상태바 없음, 앱 콘텐츠는 카메라 위에서 끝나고 하단 밴드의 내비게이션 바가 카메라 왼쪽에 놓임 → safeArea.bottom = 카메라 영역(69.5) + 여백. */
    'flip8-cover':{family:'flip',top:13,right:11,bottom:10,left:11,ring:6,radius:{tl:2,tr:2,br:31,bl:31},screenRadius:{tl:2,tr:2,br:21,bl:21},platform:'android',obstruction:'우하단 듀얼 카메라·플래시',
      hingeBody:{type:'spine',side:'top',width:12,inset:6,radius:5},
      /* dual-hole: [플래시][렌즈][렌즈] 가로 배치 상자. bottom/offset 은 상자의 아래·오른쪽 가장자리 거리(세로 기준). lens/ring/lensGap/flash/flashGap 으로 상자 크기와 홀 위치가 정해진다 */
      cutout:{type:'dual-hole',align:'right',offset:10,bottom:10,lens:59,ring:4,lensGap:5,flash:18,flashGap:12},
      display:{mask:'holes'},   /* 디스플레이 마스크 = 코너별 둥근 사각형 − 렌즈·플래시 홀 (실제 가시 영역). 하드웨어(.screen_cutout) 는 마스크 밖 별개 레이어 */
      safeArea:{top:0,right:0,bottom:72,left:0},safeAreaLandscape:{top:24,right:72,bottom:16,left:0},homeIndicator:true,homeIndicatorWidth:72,homeIndicatorCenter:76,
      source:{nativePhysicalResolution:'official: 1048×948 (Samsung 뉴스룸 한국·samsung.com/sec 스펙 표기 · 글로벌 영문 뉴스룸 사양표는 948 x 1048 순서로 인쇄) · 대각선 104.8mm official',renderedPhysicalResolution:'derived-orientation: 948×1048 — 프로그램이 세로(portrait) 기준 width×height 로 정규화한 값, official 원문값 아님',cssViewport:'derived: 948×1048 ÷ DPR 3 = 316×349.3 (DPR 3 가정 · Samsung 은 CSS 폭·DPR 을 공개하지 않음)',visibleArea:'photo-measured: 코너 r 0.5/4.7mm 와 렌즈 2개·플래시 홀을 뺀 영역 (Samsung: "actual viewable area is less due to the rounded corners and camera hole")',
        body:'official: 접힘 75.4×85.7×13.1mm',bezel:'derived: 측면 (75.4−70.4)/2=2.5mm → 11px (렌더 실측 15px/5.93=2.53mm 일치) · 상단 패널 2.9mm → 13px · 하단 2.3mm → 10px (렌더 실측 비율을 공식 높이에 맞춤)',ring:'photo-measured: 프레임 8px/5.93=1.35mm → 6px',
        radius:'photo-measured: 아래 코너 r 41.4px=7.0mm → 31px (우하단 원 맞춤 rms 0.28, 좌하단은 손가락에 가려 대칭 가정) · 위(힌지 쪽) 코너 r≈1.5px=0.25mm → 2px',screenRadius:'photo-measured: 아래 코너 r≈28px=4.7mm → 21px · 위 코너 r 2~3px=0.5mm → 2px',
        hingeBody:'photo-measured: 힌지 스파인 15px=2.5mm → 12px · 양옆 안쪽 8px=1.35mm → 6px · 끝 r 6.5px=1.1mm → 5px',
        cutout:'photo-measured: 렌즈 외경 78px=13.2mm → 59px · 링 4px · 렌즈 간격 6px=1.0mm → 5px · 중심 간격 84px=14.2mm → 64px · 우측 렌즈 중심이 화면 우측·하단 가장자리에서 각 52~53px=8.9mm → 40px · 플래시 외경(테 포함) 24px=4.0mm → 18px, 중심이 좌측 렌즈 중심에서 66px=11.1mm → 50px 왼쪽 (First Look 사진 dl8 의 비율 렌즈 간격/지름 0.08 일치)',
        cameraDiameter:'photo-measured: 13.2mm (위 cutout 참조)',controls:'approximation: 측면 키(사진상 접힘 우측 변 상단부에 볼륨·전원)',
        statusBar:'verified: 뉴스룸 First Look dl9.jpg(커버 앱) 에 상태바 없음 → 0 · 하단 밴드 72 = 렌즈 상단까지 69.5 + 여백 derived(내비게이션 바가 카메라 왼쪽에 놓이는 사진 구조) · 제스처 바 위치·폭(중심 76, 폭 72) approximation · 가로 상태바 24/하단 16 은 다른 Android 프로필 준용(approximation)'}},

    /* Galaxy Z Flip8 펼침 (360×840): 바디 75.4×166.9mm(Samsung official), 메인 native 2520×1080 · 대각선 174.1mm(6.9형) 400ppi(official) → 세로 기준 정규화 1080×2520(derived-orientation) → 활성영역 68.6×160.0mm → 5.25px/mm.
     * 렌더: 뉴스룸 보도자료 "Launch_dl3F.jpg"(1440×960, 펼침 정면·후면, 3.6px/mm 저해상도 — 상단부만 보임) 로 펀치홀·상단 베젤만 확인. 코너·측면 키는 미측정 */
    'flip8-open':{family:'flip',top:18,right:18,bottom:18,left:18,ring:6,radius:40,screenRadius:22,platform:'android',obstruction:'상단 펀치홀·접힘선',
      cutout:{type:'hole',width:19,height:19,top:10,align:'center'},
      safeArea:{top:32,right:0,bottom:24,left:0},safeAreaLandscape:{top:24,right:0,bottom:16,left:32},homeIndicator:true,homeIndicatorWidth:108,
      source:{nativePhysicalResolution:'official: 2520×1080 (Samsung 뉴스룸 한국·samsung.com/sec 스펙 표기 · 글로벌 영문 뉴스룸 사양표는 1080 x 2520 순서로 인쇄) · 대각선 174.1mm official',renderedPhysicalResolution:'derived-orientation: 1080×2520 — 프로그램이 세로(portrait) 기준 width×height 로 정규화한 값, official 원문값 아님',cssViewport:'derived: 1080×2520 ÷ DPR 3 = 360×840 (DPR 3 가정 · Samsung 은 CSS 폭·DPR 을 공개하지 않음)',body:'official: 펼침 75.4×166.9mm',bezel:'derived: 측면 (75.4−68.6)/2=3.4mm → 18px · 상하 (166.9−160.0)/2=3.45mm → 18px (400ppi 기준 활성영역; 렌더 상단 frame+glass ≈3.9mm 저해상도 참고)',radius:'derived: 동심 가정 22+18=40',screenRadius:'approximation: Galaxy S25 실측(4.3mm) 준용 → 22px (렌더 저해상도라 미측정)',cutout:'photo-measured(저해상도 3.6px/mm, ±0.3mm): 홀 지름 13~14px=3.7mm → 19px · 중심 화면 상단에서 13.5px=3.75mm → 20px(top 10)',controls:'approximation',statusBar:'derived: 컷아웃 하단 29px+여백 → 32px · 하단 24px approximation'}},

    /* Flex(반접힘): 펼침 프로필에서 유도. 아래 코너는 힌지라 각짐 */
    'flip8-flex':{family:'flip',top:18,right:18,bottom:22,left:18,ring:6,radius:{tl:40,tr:40,br:8,bl:8},screenRadius:{tl:22,tr:22,br:0,bl:0},platform:'android',obstruction:'상단 펀치홀·하단 힌지',
      cutout:{type:'hole',width:19,height:19,top:10,align:'center'},
      safeArea:{top:32,right:0,bottom:0,left:0},safeAreaLandscape:{top:24,right:0,bottom:0,left:32},homeIndicator:false,
      source:{body:'derived: flip8-open 준용',bezel:'derived: flip8-open 준용, 하단은 힌지 approximation',radius:'derived: 상단 flip8-open · 하단 approximation(힌지)',screenRadius:'derived: 상단 flip8-open · 하단 0(화면이 접힘선까지 이어짐)',cutout:'derived: flip8-open 준용',controls:'approximation',statusBar:'derived: flip8-open 준용'}},

    /* Galaxy Z Fold8 접힘(커버 416×657): 접힌 바디 81.9×123.9mm(Samsung), 커버 활성영역 74.7×118.0mm(5.5" 1972×1248) → 5.57px/mm */
    'fold8-cover':{family:'fold',top:16,right:20,bottom:16,left:20,ring:6,radius:44,screenRadius:24,platform:'android',obstruction:'상단 펀치홀 카메라',
      cutout:{type:'hole',width:19,height:19,top:17,align:'center'},
      safeArea:{top:38,right:0,bottom:24,left:0},safeAreaLandscape:{top:24,right:0,bottom:16,left:38},homeIndicator:true,homeIndicatorWidth:108,
      source:{body:'official: 접힘 81.9×123.9mm',bezel:'derived: 측면 (81.9−74.7)/2=3.6mm → 20px · 상하 2.95mm → 16px',radius:'derived: 동심 가정 24+20=44',screenRadius:'approximation: Galaxy S25 실측 준용 → 24px',cutout:'derived: Galaxy S25 실측 홀 준용',controls:'approximation',statusBar:'derived: 컷아웃 하단+여백 38px'}},

    /* Galaxy Z Fold8 펼침 (816×616): 바디 161.4×123.9mm(Samsung), 활성영역 154.1×116.3mm(7.6" 2448×1848) → 5.30px/mm */
    'fold8-open':{family:'fold',top:20,right:19,bottom:20,left:19,ring:6,radius:35,screenRadius:16,platform:'android',obstruction:'우측 상단 카메라·접힘선',
      cutout:{type:'hole',width:18,height:18,top:15,align:'right',offset:15},
      safeArea:{top:38,right:0,bottom:24,left:0},safeAreaLandscape:{top:24,right:0,bottom:16,left:0},homeIndicator:true,homeIndicatorWidth:140,
      source:{body:'official: 펼침 161.4×123.9mm',bezel:'derived: 측면 (161.4−154.1)/2=3.65mm → 19px · 상하 3.8mm → 20px',radius:'derived: 동심 가정 16+19=35',screenRadius:'approximation: 렌더 미확보 (좁은 코너)',cutout:'approximation: 우상단 카메라 위치·크기 미측정',controls:'approximation',statusBar:'derived: 컷아웃 기준 38px'}},

    /* iPhone Duo 접힘(외부 466×678): 접힌 바디 84.1×117.8mm(Apple specs), 외부 화면 5.36" 표준 사각형(Apple) 2034×1398 → 77.1×112.2mm → 6.04px/mm.
     * 렌더 실측: Apple 뉴스룸 "Apple-iPhone-Duo-display-sizes-260909.jpg"(3840×2160 원본, 9.48px/mm; 화면 종횡비 1.455 = 공식 2034/1398 일치).
     * 구조: 힌지 쪽(왼쪽) 코너는 거의 각지고 바깥쪽은 크게 둥근 비대칭. 바디(패널) 바깥 힌지 쪽에 힌지 커버(스파인) 가 별도로 보인다 → hingeBody.
     * 패널 폭 = 84.1 − 스파인 1.9 = 82.2mm, 베젤 (82.2−77.1)/2 = 2.55mm → 15px · 상하 (117.8−112.2)/2 = 2.8mm → 17px */
    'duo-outer':{family:'duo',top:17,right:15,bottom:17,left:15,ring:4,radius:{tl:5,tr:75,br:75,bl:5},screenRadius:{tl:8,tr:60,br:60,bl:8},platform:'ios',obstruction:'우상단 카메라',
      hingeBody:{type:'spine',side:'left',width:12,inset:7,radius:8},
      cutout:{type:'hole',width:36,height:36,top:30,align:'right',offset:30},
      safeArea:{top:0,right:92,bottom:0,left:0},safeAreaLandscape:{top:0,right:0,bottom:0,left:92},homeIndicator:false,
      source:{body:'official: 접힘 84.1×117.8mm (Apple iPhone Duo specs) · 외부 1398×2034 official',bezel:'derived: 패널 좌우 (84.1−1.9−77.1)/2=2.55mm → 15px · 상하 2.8mm → 17px (렌더 실측 2.3~2.6mm 일치)',radius:'photo-measured(위 파일): 힌지 쪽 r 8px/9.48=0.84mm → 5px · 바깥쪽 r 118px=12.4mm → 75px',screenRadius:'photo-measured: 힌지 쪽 r 12px=1.27mm → 8px · 바깥쪽 r 94.5px=10.0mm → 60px',hingeBody:'photo-measured: 스파인 폭 18px=1.9mm → 12px · 상하 안쪽 11px=1.16mm → 7px · 코너 r 13px=1.37mm → 8px (하단은 손에 가려 상단과 대칭 가정)',ring:'photo-measured: 정면 금속 테 0.5~1.0mm → 4px',cutout:'photo-measured: 홀 Ø57px=6.0mm → 36px · 중심 화면 상단·우측 가장자리에서 각 75px=7.9mm → 48px (top 30 / right offset 30)',controls:'approximation: Touch ID 측면 버튼',statusBar:'official(HIG): 상태바·Dynamic Island·툴바·탭바가 카메라 쪽 세로 축에 배치 → statusBarProfiles.duo + frameProfiles.statusBar 오버라이드 참조 · safe-area 우측 92 = 측면 열(축 48 + 반폭 22 + 여백 22) derived · 홈 인디케이터는 공식 이미지에 없음(approximation)'}},

    /* iPhone Duo 펼침(내부 890×626): 바디 164.6×117.8mm(Apple specs), 내부 화면 7.58" 표준 사각형(Apple) 2670×1878 → 157.5×110.8mm → 5.65px/mm.
     * 렌더 실측(같은 파일, 열린 기기 9.48px/mm): 화면 1050×1493px = 110.8×157.5mm 로 공식과 일치. 4코너 모두 대칭(힌지 쪽 각진 코너는 펼치면 중앙 접합부로 숨음).
     * 단일 폴딩 화면 + 세로 접힘선(분리 영역 없음). 힌지 커버는 정면에서 보이지 않고 테두리 접합선(≈0.5mm) 만 보임 → hingeBody seam */
    'duo-inner':{family:'duo',top:20,right:20,bottom:20,left:20,ring:4,radius:72,screenRadius:52,platform:'ios',obstruction:'언더 디스플레이 카메라·접힘선',
      hingeBody:{type:'seam',size:3},
      cutout:{type:'none'},safeArea:{top:0,right:89,bottom:0,left:0},safeAreaLandscape:{top:0,right:0,bottom:0,left:0},homeIndicator:false,
      source:{body:'official: 펼침 164.6×117.8mm (Apple iPhone Duo specs) · 내부 2670×1878 official',bezel:'derived: 좌우 (164.6−157.5)/2=3.55mm → 20px · 상하 (117.8−110.8)/2=3.5mm → 20px (렌더 실측 3.4~3.9mm)',radius:'photo-measured: 바디 코너 r 118~124px/9.48=12.4~13.1mm → 72px (4코너 동일)',screenRadius:'photo-measured: 화면 코너 r 88px=9.3mm → 52px (4코너 동일, 동심 52+20=72 일치)',hingeBody:'photo-measured: 정면에서는 힌지 커버가 보이지 않고 테두리 접합선 ≈5px=0.5mm 만 확인 → seam 3px',ring:'photo-measured: 정면 금속 테 ≈0.5mm → 4px',crease:'approximation: 공식 이미지에서는 접힘선이 검출되지 않음(나노 텍스처) — 위치 표시용 2px 희미한 선',cutout:'official: 언더 디스플레이 카메라 (Apple)',controls:'n/a',statusBar:'official(HIG): 펼침(가로형) 은 카메라 쪽(우측) 세로 축에 상태 클러스터·컨트롤, 세로로 돌리면 표준 가로 바 → statusBarProfiles.duo 참조 · safe-area 우측 89 = 측면 열(축 45 + 22 + 22) derived · 홈 인디케이터는 공식 이미지에 없음(approximation)'}},

    /* iPad 9.7" 홈 버튼형 (768×1024): iPad 6세대(2018) 바디 240.0×169.5mm(Apple), 활성영역 147.8×197.1mm(9.7" 4:3) → 5.20px/mm */
    'ipad-home':{family:'ipad-classic',top:112,right:56,bottom:112,left:56,ring:8,radius:57,screenRadius:0,platform:'any',obstruction:'화면 밖 홈 버튼·카메라',
      cutout:{type:'none'},safeArea:{top:20,right:0,bottom:0,left:0},safeAreaLandscape:{top:20,right:0,bottom:0,left:0},homeIndicator:false,
      controls:{homeButton:{size:57,ring:3,bottom:28},camera:{size:10,top:51,offsetX:0}},
      source:{body:'official: iPad 6세대 240.0×169.5mm',bezel:'derived: 측면 (169.5−147.8)/2=10.85mm → 56px · 상하 (240−197.1)/2=21.45mm → 112px',radius:'approximation: 렌더 미확보 (≈11mm 추정)',screenRadius:'official: 각진 코너 (0)',cutout:'n/a',controls:'approximation: 홈 버튼 ≈11mm(57px) 하단 베젤 중앙 · 전면 카메라 상단 베젤 중앙 (미측정)',statusBar:'official: iPadOS 상태바 20pt, 홈 인디케이터 없음'}},

    /* iPad Air 11 (M4, 2026) 세로 820×1180: 바디 247.6×178.5×6.1mm · native 2360×1640 264ppi · 대각선 10.86"(27.59cm) 모두 Apple tech specs(support.apple.com/126471, official).
     * 활성영역(derived): 공식 대각선 275.9mm ÷ 2873.8px = 0.0960mm/px → 226.6×157.4mm → 5.21px/mm(CSS). 베젤 = (178.5−157.4)/2 = 10.55 · (247.6−226.6)/2 = 10.5mm → 55px 4변 동일.
     * 렌더 실측(photo-measured): Apple tech specs 정면 렌더 "ipad-air-11-inch-m4.png"(1000×1000, 3.37px/mm, 11" 정면) — 바디 코너 r 45px=13.4mm(rms 0.64; 동심 검산 3.0+10.5=13.5 일치) · 화면 코너 r 10px=3.0±0.3mm ·
     *   카메라(긴 변 우측 베젤 중앙선, 화면 중심에서 위로 32px=9.5mm) · 조도 센서(아래로 33px=9.8mm) · 볼륨 버튼(우측 변, 위에서 19.0mm 부터 20.8mm) · 상단 버튼/Touch ID(상단 변, 우측 끝에서 12.5~30mm).
     *   교차 확인: Apple 뉴스룸 13" 렌더 "Apple-iPad-Air-M4-multitasking-260302"(5.55px/mm) 화면 코너 r 18px=3.2mm 일치, 상태바 텍스트 중심 2.9mm(≈15pt) → 상태바 28pt.
     * 카메라가 가로 긴 변(Apple: "Landscape 12MP Center Stage camera") → 세로 기준 오른쪽 베젤, 가로(반시계) 에서는 상단 중앙 왼쪽. */
    'ipad-air-11':{family:'ipad-modern',top:55,right:55,bottom:55,left:55,ring:5,radius:70,screenRadius:18,platform:'ios',obstruction:'긴 변 베젤 카메라·홈 인디케이터',
      cutout:{type:'none'},safeArea:{top:30,right:0,bottom:20,left:0},safeAreaLandscape:{top:30,right:0,bottom:20,left:0},homeIndicator:true,homeIndicatorWidth:300,
      controls:{camera:{size:15,edge:'right',offset:-49},sensor:{size:7,edge:'right',offset:51},
        keys:[{type:'volume',edge:'right',start:99,length:48},{type:'volume',edge:'right',start:159,length:48},{type:'power',edge:'top',start:774,length:93}],
        port:{edge:'bottom',width:47,height:3}},
      source:{nativePhysicalResolution:'official: 2360×1640 (Apple tech specs 126471 "2360-by-1640-pixel resolution at 264 ppi") · 대각선 10.86"/27.59cm official',
        renderedPhysicalResolution:'derived-orientation: 1640×2360 — 세로(portrait) 프리뷰 기준 width×height 로 정규화, official 원문값 아님',
        cssViewport:'derived: 820×1180 @DPR 2 — iPad Air 11 (M4) 실기기에서 직접 검증한 값이 아님. 동일 해상도·패널(2360×1640 264ppi) 의 이전 모델 iPad Air 11" (M2) 레퍼런스(Use Your Loaf "iPad 2024 Screen Sizes" 2024-05-13: 820×1180 pt @2x, 2360÷2=1180 정합) 를 준용(inferred). Apple 공식 pt 표기는 확인하지 못함(HIG Layout 표 현재 미게시) → 실제 M4 에서 innerWidth / innerHeight / devicePixelRatio 확인 시 verified 로 승격',
        body:'official: 247.6×178.5×6.1mm',bezel:'derived: 공식 대각선 기준 활성영역 226.6×157.4mm → 4변 10.5mm → 55px (렌더 실측 33~35px/3.37=9.8~10.4mm 일치)',ring:'photo-measured: 전면 금속 테 2~4px/3.37 ≈ 0.6~1.2mm → 5px',
        radius:'photo-measured: 바디 코너 r 45px/3.37=13.4mm → 70px (동심 검산 18+55=73 과 오차 내)',screenRadius:'photo-measured: 화면 코너 r 10px=3.0±0.3mm → 16px ≈ 커뮤니티 참고값 18pt 와 오차 내 → 18px (13" 렌더 실측 3.2mm 일치)',cutout:'n/a',
        controls:'photo-measured: 카메라 중심 화면 중심 위 9.5mm → −49px (13" 렌더 −9.5mm 일치), Ø 11" 렌더 2.4mm / 13" 렌더 링 포함 3.1mm → 15px · 센서 아래 9.8mm → +51px, Ø≈1.5mm → 7px · 볼륨 2개 우측 변 19.0mm 부터 20.8mm(각 9.3 + 틈 2.2 는 approximation 분할) → start 99/159, 길이 48 · 상단 버튼 상단 변 우측 끝 12.5~30mm → start 774 길이 93 · USB-C 하단 변 중앙(official: tech specs Buttons and Connectors), 폭 9mm→47px approximation',
        statusBar:'photo-measured(13" 뉴스룸 multitasking 렌더 1.06px/pt · apple.com iPadOS 27 hero 11" 0.74px/pt 교차, 두 모델 264ppi 동일): 시간 텍스트 중심 상단에서 15.1pt(hero 14.9) · 숫자 높이 12.3pt → 글꼴 ≈17pt · 100% 숫자 9.4pt → ≈13pt · 배터리 24.5×11pt · Wi-Fi 12.6×8pt · 여백 좌 14 / 우 16pt → 상태바 높이 30 은 중심 대칭 가정 approximation(iPadOS 26/27 공식 수치 없음) · 홈 인디케이터 20pt 는 M4 실기기 직접 검증값이 아니라 홈 인디케이터형 iPad 계열 공통 UIKit safe-area 기준을 준용(derived; 실기기 env(safe-area-inset-bottom) 확인 시 verified), 폭 300 approximation(렌더에 미표시)'}},

    /* Galaxy Tab S11 (11.0형) 세로 800×1280: 바디 253.8×165.3×5.5mm · native 2560×1600 · 대각선 278.1mm(전체 직사각형)/276.2mm(둥근 모서리) — Samsung 뉴스룸 2025-09-04 사양표 + samsung.com/sec (official).
     * 활성영역(derived): 278.1mm ÷ 3018.6px = 0.09213mm/px → 235.9×147.4mm → 5.43px/mm(CSS). 베젤 = (165.3−147.4)/2 = 8.95 · (253.8−235.9)/2 = 8.95mm → 49px (Samsung "7.8mm bezel" 은 프레임 제외 검은 유리 폭으로 해석).
     * 렌더 실측(photo-measured): samsung.com US 갤러리 "us-galaxy-tab-s11-sm-x730-sm-x730nzaaxar-550443947"(2052×1641 투명 PNG, 가로 정면, 5.80px/mm) — 바디 코너 r 56~57px=9.75mm · 화면 코너 r 19px=3.3mm · 베젤 50~55px=8.6~9.5mm ·
     *   카메라 긴 변 베젤 중앙(수평), 바디 가장자리에서 28.6px=4.9mm, Ø≈11px=1.9mm · 노치 없음 · 상단 변(가로 기준) 키 2개: 46.5mm 부터 20.2mm(볼륨 추정) / 76.7mm 부터 13.3mm(전원 추정) · USB-C 는 측면 렌더 550443968 에서 짧은 변 중앙.
     * 카메라가 긴 변(가로 상단) → 세로 기준 오른쪽 베젤, 가로(반시계) 에서 상단 중앙. 가로 상단 변의 키는 세로에서 오른쪽 변(위에서 같은 거리). */
    'galaxy-tab-s11':{family:'galaxy-tab',top:49,right:49,bottom:49,left:49,ring:4,radius:53,screenRadius:18,platform:'android',obstruction:'긴 변 베젤 카메라',
      cutout:{type:'none'},safeArea:{top:24,right:0,bottom:24,left:0},safeAreaLandscape:{top:24,right:0,bottom:24,left:0},homeIndicator:true,homeIndicatorWidth:200,
      controls:{camera:{size:10,edge:'right',offset:0,inset:27},
        keys:[{type:'volume',edge:'right',start:252,length:110},{type:'power',edge:'right',start:416,length:72}],
        port:{edge:'bottom',width:49,height:3}},
      source:{nativePhysicalResolution:'official: 2560×1600 (Samsung Global Newsroom 2025-09-04 사양표 "11.0-inch, 2560 x 1600" · samsung.com/sec) · 대각선 278.1mm 전체 직사각형 / 276.2mm 둥근 모서리 official',
        renderedPhysicalResolution:'derived-orientation: 1600×2560 — 세로(portrait) 프리뷰 기준 width×height 로 정규화, official 원문값 아님',
        cssViewport:'derived: 800×1280 @DPR 2 — S11 실기기에서 직접 검증한 값이 아님. 동일 해상도·밀도 패널(2560×1600 274ppi) 의 전작 Galaxy Tab S9 가 800×1280 CSS @2 로 보고된 외부 레퍼런스(1440px.com "Android Tablets Screen Sizes") 를 준용(inferred). Samsung 공식 CSS 폭·DPR 표기 없음 → 실기기 innerWidth/devicePixelRatio 확인 시 verified 로 승격',
        body:'official: 253.8×165.3×5.5mm',bezel:'derived: 공식 대각선 기준 활성영역 235.9×147.4mm → 4변 8.95mm → 49px (렌더 실측 8.6~9.5mm 일치 · Samsung 각주 "7.8mm" 는 유리 베젤 폭)',ring:'photo-measured: 전면 금속 테 ≈4px/5.80=0.7mm → 4px',
        radius:'photo-measured: 바디 코너 r 56~57px/5.80=9.75mm → 53px (rms 0.4~1.0)',screenRadius:'photo-measured: 화면 코너 r 19px=3.3mm → 18px (우하단 rms 0.28)',cutout:'n/a: 노치 없음 (베젤 안 카메라)',
        controls:'photo-measured: 카메라 긴 변 베젤 수평 중앙, 바디 가장자리에서 4.9mm → inset 27, Ø1.9mm → 10px · 키(가로 상단 변 → 세로 오른쪽 변): 46.5mm 부터 20.2mm → start 252 길이 110(볼륨, 길이로 추정) / 76.7mm 부터 13.3mm → start 416 길이 72(전원, 추정) · USB-C 짧은 변 중앙(측면 렌더 550443968), 폭 9mm→49px approximation',
        statusBar:'approximation: One UI 8 태블릿 상태바 24dp(Android 표준) · 하단 제스처 바 24 (One UI 기본 3버튼 내비 48dp 일 수 있음) — 높이 값은 android-tablet-* browserProfiles 에서 관리'}},

    /* Galaxy Tab S11 Ultra (14.6형) 세로 924×1480: 바디 326.3×208.5×5.1mm · native 2960×1848 · 대각선 369.9mm(전체 직사각형)/367.2mm(둥근 모서리) — Samsung 뉴스룸 2025-09-04 + samsung.com/uk 스펙 (official). "narrow 5.2mm bezels" official.
     * 활성영역(derived): 369.9mm ÷ 3489.6px = 0.10600mm/px → 313.8×195.9mm → 4.72px/mm(CSS). 베젤 = (208.5−195.9)/2 = 6.3 · (326.3−313.8)/2 = 6.25mm → 30px (5.2mm 유리 + ≈1.1mm 프레임).
     * 렌더 실측(photo-measured): samsung.com US 갤러리 "us-galaxy-tab-s11-ultra-sm-x930-sm-x930nzaaxar-548666708"(2052×1641, 가로 정면, 4.48px/mm) — 바디 코너 r 44~45px=9.9mm · 화면 코너 r 20px=4.5mm · 베젤 28~29px=6.3~6.5mm ·
     *   상단 중앙 완만한 노치: 화면 안 깊이 12.5px=2.8mm, 폭 59px=13.2mm · 카메라 노치 위 베젤 안, 바디 가장자리에서 24px=5.4mm, Ø≈10px=2.2mm · 키: 46.9mm 부터 20mm / 77mm 부터 12.7mm (S11 과 같은 위치) · USB-C 짧은 변 중앙(측면 렌더 548666728).
     * S11 과의 차이: 베젤 8.95 → 6.3mm, 카메라가 베젤에 다 들어가지 않아 화면에 wave 노치, 화면 코너 3.3 → 4.5mm, 후면 듀얼 카메라. */
    'galaxy-tab-s11-ultra':{family:'galaxy-tab',top:30,right:30,bottom:30,left:30,ring:3,radius:47,screenRadius:21,platform:'android',obstruction:'긴 변 상단 wave 노치·카메라',
      cutout:{type:'notch',shape:'wave',edge:'right',depth:13,length:62,offset:0},
      safeArea:{top:24,right:0,bottom:24,left:0},safeAreaLandscape:{top:24,right:0,bottom:24,left:0},homeIndicator:true,homeIndicatorWidth:220,
      controls:{camera:{size:10,edge:'right',offset:0,inset:25},
        keys:[{type:'volume',edge:'right',start:221,length:94},{type:'power',edge:'right',start:363,length:60}],
        port:{edge:'bottom',width:42,height:3}},
      source:{nativePhysicalResolution:'official: 2960×1848 (Samsung Global Newsroom 2025-09-04 사양표 "14.6-inch, 2960 x 1848" · samsung.com/uk "2960 x 1848 (WQXGA+)") · 대각선 369.9mm 전체 직사각형 / 367.2mm 둥근 모서리 official',
        renderedPhysicalResolution:'derived-orientation: 1848×2960 — 세로(portrait) 프리뷰 기준 width×height 로 정규화, official 원문값 아님',
        cssViewport:'derived: 924×1480 @DPR 2 — S11 Ultra 실기기에서 직접 검증한 값이 아님. 동일 해상도·밀도 패널(2960×1848 239ppi) 의 전작 Galaxy Tab S9 Ultra·S10 Ultra 가 924×1480 CSS @2 로 보고된 외부 레퍼런스(1440px.com "Android Tablets Screen Sizes") 를 준용(inferred). Samsung 공식 CSS 폭·DPR 표기 없음 → 실기기 확인 시 verified 로 승격',
        body:'official: 326.3×208.5×5.1mm',bezel:'derived: 공식 대각선 기준 활성영역 313.8×195.9mm → 4변 6.25~6.3mm → 30px (렌더 실측 6.3~6.5mm · Samsung official "5.2mm bezels" 는 유리 베젤 폭)',ring:'photo-measured: 전면 금속 테 ≈3px/4.48=0.7mm → 3px',
        radius:'photo-measured: 바디 코너 r 44~45px/4.48=9.9mm → 47px (rms 0.5~0.75)',screenRadius:'photo-measured: 화면 코너 r 20px=4.5mm → 21px (우하단 rms 0.38)',
        cutout:'photo-measured: 상단 중앙 완만한 노치 깊이 12.5px=2.8mm → 13px · 폭 59px=13.2mm → 62px (반타원 근사, shape wave) · Samsung 각주 "actual viewable area is less due to the rounded corners and the camera hole"',
        controls:'photo-measured: 카메라 노치 위 베젤 안, 바디 가장자리에서 5.4mm → inset 25, Ø2.2mm → 10px · 키(가로 상단 변 → 세로 오른쪽 변): 46.9mm 부터 20mm → start 221 길이 94(볼륨 추정) / 77mm 부터 12.7mm → start 363 길이 60(전원 추정) · USB-C 짧은 변 중앙(측면 렌더 548666728), 폭 9mm→42px approximation',
        statusBar:'approximation: One UI 8 태블릿 상태바 24dp(Android 표준, 노치 깊이 13 을 덮음) · 하단 제스처 바 24 (3버튼 내비 48dp 일 수 있음) — 높이 값은 android-tablet-* browserProfiles 에서 관리'}}
  };
  Object.keys(frameProfiles).forEach(key=>{frameProfiles[key].id=key;});

  /* OS 상태바(시간·신호·Wi-Fi·배터리) 프로필.
   * 세 레이어를 분리한다: 컷아웃(노치·아일랜드·펀치홀) = frameProfiles.cutout(기기 하드웨어), 상태바 = 여기(OS), 주소창·툴바 = browserProfiles(브라우저 UI).
   * 프레임 platform 으로 기본 프로필을 고르고 frameProfiles[*].statusBar 로 항목을 덮어쓴다(예: iPhone SE 의 compact).
   *   icons        : 오른쪽 아이콘 순서.  cellularStyle : bars(iOS) | wedge(Android)
   *   padding      : 좌·우 기본 여백(px). 좌/우 정렬 컷아웃이 있으면 JS 가 그만큼 더 띄운다. */
  const statusBarProfiles={
    ios:{platform:'ios',time:'9:41',icons:['cellular','wifi','battery'],cellularStyle:'bars',batteryLevel:.82,padding:{left:30,right:26}},
    android:{platform:'android',time:'12:30',icons:['wifi','cellular','battery'],cellularStyle:'wedge',batteryLevel:.82,padding:{left:16,right:14}},
    generic:{platform:'generic',time:'12:30',icons:['wifi','battery'],cellularStyle:'wedge',batteryLevel:.82,padding:{left:16,right:14}}
  };
  /* iPhone Duo(iOS 27) 코너 상태 클러스터. Apple 뉴스룸(official): "The status bar includes a circular, flexible system that nestles into the corner of the screen,
   * showing relevant information like Wi-Fi, cellular strength, battery, and more." · HIG "Designing for iPhone Duo"(official): 카메라 쪽 세로 축에 위→아래로
   * Dynamic Island → 상태바 → 툴바 → 탭바. 가로형 상태바 밴드를 쓰지 않고(.band_status 높이 0) .status_cluster 를 코너에 띄운다.
   * 구성(뉴스룸 이미지 photo-measured): 시간 → 링(아래가 트인 호, 안쪽 Wi-Fi) → 링 하단 틈에 셀룰러 점 4개(링 중심선 원 위, 아래 기준 ±10.5° · ±31°).
   * 링 호가 배터리 잔량을 나타내는지는 미확인(approximation: 호 길이 고정 = 이미지 실측 244°). 값(px) 은 frameProfiles[*].statusBar 가 화면별로 덮어쓴다. */
  statusBarProfiles.duo={platform:'duo',layout:'corner',time:'9:41',icons:['wifi','cellular','battery'],cellularStyle:'dots',batteryLevel:.82,
    ring:{size:40,stroke:3,arcGap:116,wifiWidth:27,dotSize:4,dotAngles:[-31,-10.5,10.5,31]},timeSize:16,axis:48,timeCenter:92,ringCenter:129};
  frameProfiles['iphone-se'].statusBar={compact:true};
  frameProfiles['ipad-home'].statusBar={platform:'ios',compact:true};
  /* One UI 8 태블릿 상태바(approximation: 공식 UI 스크린샷 미확보): Android 프로필 그대로, 태블릿은 가로에서도 글꼴·아이콘을 줄이지 않는다 */
  frameProfiles['galaxy-tab-s11'].statusBar={platform:'android',fixedSize:true,fontSize:13,iconSize:11,source:'approximation: One UI 8 태블릿 상태바 — 시간 좌측·아이콘 우측(Android 프로필), 글꼴 13/아이콘 11 은 Android 프로필 기본값 준용'};
  frameProfiles['galaxy-tab-s11-ultra'].statusBar={platform:'android',fixedSize:true,fontSize:13,iconSize:11,source:'approximation: galaxy-tab-s11 과 동일'};
  /* iPadOS 26/27 상태바(photo-measured, Apple 뉴스룸 13" 렌더): 좌 "9:41 AM  Wed Apr 1" · 우 Wi-Fi · 배터리 % · 배터리. 가로에서도 같은 크기(fixedSize) */
  frameProfiles['ipad-air-11'].statusBar={platform:'ios',time:'9:41 AM\u2002Wed Apr 1',icons:['wifi','battery'],batteryText:true,batteryLevel:1,padding:{left:14,right:16},fixedSize:true,fontSize:17,iconSize:11,
    source:'photo-measured: "Apple-iPad-Air-M4-multitasking-260302_big.jpg.large_2x"(1.06px/pt) 시간 숫자 높이 13px=12.3pt → 글꼴 17(SF 숫자 높이 ≈0.705em) · 100% 숫자 10px=9.4pt → 글꼴 ≈13(.78em) · 배터리 26×11.7px=24.5×11pt → 아이콘 11 · Wi-Fi 13×8.3px=12.6×8pt(.78배) · 좌 여백 15px=14pt · 우 17px=16pt · apple.com iPadOS 27 hero(11") 숫자 높이 9px/0.738=12.2pt, 중심 14.9pt 일치'};
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
    'ios-safari':{label:'Safari',platform:'ios',urlBarPosition:'bottom',
      portrait:{statusBar:null,urlBar:50,toolbar:49,homeIndicator:null},
      landscape:{statusBar:0,urlBar:40,toolbar:0,homeIndicator:null,sideInset:'safe-area'}},
    'ios-chrome':{label:'Chrome (iOS)',platform:'ios',urlBarPosition:'top',
      portrait:{statusBar:null,urlBar:52,toolbar:48,homeIndicator:null},
      landscape:{statusBar:0,urlBar:44,toolbar:0,homeIndicator:null,sideInset:'safe-area'}},
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
    /* 홈 인디케이터형 iPad(iPadOS 26/27) Safari: 상단 탭 바+주소 필드 한 줄. 상태바 높이는 프레임 safeArea.top(28, iPad Air 렌더 실측) 을 쓰고,
     * 홈 인디케이터 영역(20) 은 iPad Safari 가 웹 콘텐츠를 그 아래까지 펼치므로 밴드 0(overlay) — safe-area 가이드로만 표시. 탭 바 높이 50 은 iPadOS 15~18 컴팩트 탭 바 준용(approximation, Liquid Glass 툴바 실측 미확보) */
    'ipados-safari':{label:'Safari (iPadOS)',platform:'ios',urlBarPosition:'top',
      portrait:{statusBar:null,urlBar:50,toolbar:0,homeIndicator:0},
      landscape:{statusBar:null,urlBar:50,toolbar:0,homeIndicator:0}},
    /* iPhone Duo(iOS 27) Safari. HIG(official): 툴바·탭바·내비게이션이 카메라 쪽 세로 축(측면 열) 에 놓이고, 내부 화면을 세로로 든 경우만 표준 가로 바.
     * layout:'side' 상태에서는 가로 밴드(상태바·URL·툴바·홈) 를 쓰지 않고 .side_controls 를 콘텐츠 위에 띄운다(뉴스룸 Netflix·Slack 이미지처럼 콘텐츠가 전체 화면).
     *   → 사이트 뷰포트 = 화면 전체. 실제 Safari 의 웹 뷰포트 인셋은 미확인(approximation) 이라 축소/겹침 모드 구분이 없다. safe-area 가이드로 측면 열 영역을 확인할 것.
     *   주소창 표시 스위치 = 상단 그룹(뒤로 원형 + 캡슐 3: 정보·공유·검색), 툴바 스위치 = 하단 캡슐(4). 주소(URL) 필드는 공식 자료에서 확인되지 않아 그리지 않는다.
     * 측면 열 값(photo-measured, 뉴스룸 multitasking 이미지의 Safari 창): 원형 Ø44 · 캡슐 폭 44 · 항목 간격 47 · 원형↔캡슐 13 · 하단 여백 21. 상단 시작 = 클러스터 아래(gap 22: Netflix 이미지 실측) 는 Safari 전체 화면 이미지가 없어 approximation.
     * exclusive: Duo 기기의 기본 브라우저일 때만 목록에 노출. standardFallback: 표준 가로 바 상태에서 쓰는 프로필(밴드만 차용, 상태바 밴드는 0). */
    'duo-safari':{label:'Safari (iPhone Duo)',platform:'ios',urlBarPosition:'bottom',layout:'side',exclusive:true,standardFallback:'ios-safari',
      portrait:{statusBar:0,urlBar:0,toolbar:0,homeIndicator:0},
      landscape:{statusBar:0,urlBar:0,toolbar:0,homeIndicator:0},
      side:{circle:44,capsule:44,pitch:47,gap:13,clusterGap:22,bottomMargin:21,top:['back'],topCapsule:['info','share','search'],bottomCapsule:['compass','compose','select','window']}}
  };
  const urlBarPositions=['top','bottom'];
  /* 이전 데이터 호환: 예전 browser 키 → 새 프로필 */
  const browserAliases={phone:'android-chrome',compact:'android-chrome',tablet:'tablet-chrome'};
  const defaultBrowserId='android-chrome';

  const deviceGroups=[
    {id:'base',label:'기준 폭'},
    {id:'phone',label:'주요 스마트폰'},
    {id:'fold',label:'폴더블·듀얼스크린'},
    {id:'tablet',label:'태블릿 경계'}
  ];
  /* localStorage 에 남은 예전 기기 id → 현재 id */
  const deviceAliases={'z-flip':'z-flip8','tablet-1024':'tablet-768'};   /* 'iPad 9.7형 가로' 프리셋은 회전 기능으로 대체(2026-09-21 제거) */

  const devices={
    'mobile-320':{name:'최소 모바일',group:'base',subtitle:'작은 화면·최소폭 점검',note:'320px 최소폭·작은 화면 점검',source:'iPhone SE 1세대·소형 Android 공통 최소폭',
      frame:'neutral',browser:'android-chrome',dpr:2,states:[{id:'default',label:'기본',width:320,height:568,diagonal:4,physicalWidth:640,physicalHeight:1136}]},
    'mobile-360':{name:'Galaxy S25',group:'base',subtitle:'Galaxy 바형 기준',note:'360 × 780 CSS 화면 · 펀치홀 가림 포함',source:'official: 6.2" 2340 × 1080, DPR 3 → 360 × 780 · 바디 146.9 × 70.5mm (Samsung)',
      frame:'galaxy-bar',browser:'android-chrome',dpr:3,states:[{id:'default',label:'기본',width:360,height:780,diagonal:6.2,physicalWidth:1080,physicalHeight:2340}]},
    'android-generic-360':{name:'Android 20:9 범용',group:'base',subtitle:'실기기 아님 · 360폭 20:9',note:'360 × 800 범용 CSS 화면 · 기기 가림 없음',source:'approximation: 범용 프리셋(20:9). 특정 기기 재현 아님',
      frame:'neutral',browser:'android-chrome',dpr:3,states:[{id:'default',label:'기본',width:360,height:800,diagonal:6.1,physicalWidth:1080,physicalHeight:2400}]},
    'mobile-390':{name:'iPhone 기본',group:'base',subtitle:'iPhone 12·13·14 기준',note:'390 × 844 기준 · 상단 노치 가림 포함',source:'official: iPhone 12/13/14 6.1" 2532 × 1170, DPR 3 · 바디 146.7 × 71.5mm (13)',
      frame:'iphone-notch',browser:'ios-safari',dpr:3,states:[{id:'default',label:'기본',width:390,height:844,diagonal:6.1,physicalWidth:1170,physicalHeight:2532}]},
    'mobile-430':{name:'대형 모바일',group:'base',subtitle:'iPhone 14 Pro Max·15/16 Plus',note:'430 × 932 기준 · 다이내믹 아일랜드 가림 포함',source:'official: 6.7" 2796 × 1290, DPR 3 · 바디 160.7 × 77.6mm (14 Pro Max)',
      frame:'iphone-dynamic',browser:'ios-safari',dpr:3,states:[{id:'default',label:'기본',width:430,height:932,diagonal:6.7,physicalWidth:1290,physicalHeight:2796}]},
    'iphone-se':{name:'iPhone SE',group:'phone',subtitle:'홈 버튼형 (2·3세대)',note:'홈 버튼·상하단 베젤을 포함한 iPhone SE 프레임',source:'official: iPhone SE 2/3세대 4.7" 1334 × 750, DPR 2 · 바디 138.4 × 67.3mm',
      frame:'iphone-se',browser:'ios-safari',dpr:2,states:[{id:'default',label:'기본',width:375,height:667,diagonal:4.7,physicalWidth:750,physicalHeight:1334}]},
    'iphone-pro':{name:'iPhone 18 Pro',group:'phone',subtitle:'다이내믹 아일랜드',note:'402 × 874 CSS 화면 · 다이내믹 아일랜드 가림 포함',source:'official: 6.3" 2622 × 1206, DPR 3 → 402 × 874 (Apple iPhone 18 Pro tech specs)',
      frame:'iphone-dynamic-pro',browser:'ios-safari',dpr:3,states:[{id:'default',label:'기본',width:402,height:874,diagonal:6.3,physicalWidth:1206,physicalHeight:2622}]},
    pixel:{name:'Google Pixel 10',group:'phone',subtitle:'중앙 펀치홀 카메라',note:'412 × 923 CSS 화면 · 중앙 펀치홀 가림 포함',source:'official: 6.3" 2424 × 1080, DPR 2.625 → 412 × 923 · 바디 152.8 × 72.0mm (Pixel 9/10)',
      frame:'android-hole',browser:'android-chrome',dpr:2.625,states:[{id:'default',label:'기본',width:412,height:923,diagonal:6.3,physicalWidth:1080,physicalHeight:2424}]},
    'z-flip8':{name:'Galaxy Z Flip8',group:'fold',subtitle:'커버·펼침·Flex',note:'Galaxy Z Flip8 공개 디스플레이 사양 기준',source:'official: 커버 4.1형(104.8mm) native 1048 × 948 342ppi · 메인 6.9형(174.1mm) native 2520 × 1080 400ppi · 바디 펼침 75.4 × 166.9 × 6.1 / 접힘 75.4 × 85.7 × 13.1mm (Samsung 뉴스룸 2026-07-22) · 프로그램 세로 기준 948 × 1048 / 1080 × 2520 은 derived-orientation, CSS 316 × 349 / 360 × 840 은 DPR 3 가정(derived)',
      browser:'android-chrome',dpr:3,states:[
      /* physicalWidth/Height 는 세로 기준 정규화 값(derived-orientation). Samsung 공식 native 표기는 1048×948 → frameProfiles['flip8-cover'].source 참조 */
      {id:'cover',label:'커버 화면',width:316,height:349,diagonal:4.1,physicalWidth:948,physicalHeight:1048,frame:'flip8-cover',note:'FlexWindow 316 × 349 CSS 화면(native 1048 × 948 → 세로 정규화 948 × 1048 ÷ DPR 3, derived) · 힌지 위 · 우하단 듀얼 카메라·플래시 홀 · 하단 내비게이션 밴드'},
      /* physicalWidth/Height 는 세로 기준 정규화 값(derived-orientation). Samsung 공식 native 표기는 2520×1080 → frameProfiles['flip8-open'].source 참조 */
      {id:'open',label:'펼침',width:360,height:840,diagonal:6.9,physicalWidth:1080,physicalHeight:2520,frame:'flip8-open',hinge:'horizontal',hingeSize:3,note:'메인 화면 360 × 840 CSS 화면(native 2520 × 1080 → 세로 정규화 1080 × 2520 ÷ DPR 3, derived) · 펀치홀과 접힘선 포함'},
      /* Flex: 펼친 화면의 상단 절반. 물리값은 width×dpr 로 자동 계산(1080 × 1260), 실기기 배율은 전체 화면 기준(scaleWidth/Height). */
      {id:'flex',label:'Flex 90°',width:360,height:420,diagonal:6.9,scaleWidth:360,scaleHeight:840,frame:'flip8-flex',hinge:'horizontal',hingeSize:8,hingePosition:99,note:'펼친 화면 상단 절반 점검용 360 × 420 · 실제 Flex Mode는 실기기 확인 필요'}
    ]},
    'z-fold':{name:'Galaxy Z Fold8',group:'fold',subtitle:'커버·펼침',note:'Galaxy Z Fold8 공개 물리 해상도와 DPR 3 기준',source:'official: 커버 5.5" 1972 × 1248 · 메인 7.6" 2448 × 1848, DPR 3 · 바디 펼침 161.4 × 123.9 / 접힘 81.9 × 123.9mm (Samsung, GSMArena)',
      browser:'android-chrome',dpr:3,states:[
      {id:'cover',label:'커버 화면',width:416,height:657,diagonal:5.5,physicalWidth:1248,physicalHeight:1972,frame:'fold8-cover',note:'커버 화면 416 × 657 CSS 화면 · 펀치홀 포함'},
      {id:'open',label:'펼침',width:816,height:616,diagonal:7.6,physicalWidth:2448,physicalHeight:1848,orientation:'portrait',browser:'tablet-chrome',frame:'fold8-open',hinge:'vertical',hingeSize:4,note:'메인 화면 816 × 616 CSS 화면 · 카메라와 접힘선 포함'}
    ]},
    'iphone-duo':{name:'iPhone Duo',group:'fold',subtitle:'북 타입 폴더블 (2026)',note:'단일 7.6" 폴딩 내부 화면 + 접힘선 · 외부 5.4" · 힌지 쪽 각진 코너',source:'official: 외부 5.4" 1398 × 2034 · 내부 7.6" 2670 × 1878, DPR 3 · 바디 펼침 164.6 × 117.8 / 접힘 84.1 × 117.8mm · 표준 사각형 대각선 5.36" / 7.58" (Apple iPhone Duo specs)',
      browser:'ios-safari',dpr:3,states:[
      {id:'outer',label:'접힘 · 외부',width:466,height:678,diagonal:5.36,physicalWidth:1398,physicalHeight:2034,frame:'duo-outer',browser:'duo-safari',uiLayout:{natural:'side',rotated:'side'},note:'외부 화면 466 × 678 CSS 화면 · 우상단 카메라 · 코너 상태 클러스터·측면 컨트롤(iOS 27)'},
      {id:'inner',label:'펼침 · 내부',width:890,height:626,diagonal:7.58,physicalWidth:2670,physicalHeight:1878,orientation:'portrait',browser:'duo-safari',uiLayout:{natural:'side',rotated:'bars'},frame:'duo-inner',hinge:'vertical',hingeSize:2,note:'내부 화면 890 × 626 CSS 화면 · 단일 폴딩 화면 · 코너 상태 클러스터·측면 컨트롤, 세로로 돌리면 표준 가로 바(iOS 27)'}
    ]},
    /* physicalWidth/Height 는 세로 기준 정규화 값(derived-orientation). Apple 공식 native 표기는 2360×1640 → frameProfiles['ipad-air-11'].source 참조. dpr 2 는 M2 동일 패널 레퍼런스 준용(derived, M4 실기기 미검증) */
    'ipad-air-11':{name:'iPad Air 11',group:'tablet',subtitle:'M4 (2026) · 홈 인디케이터형',note:'iPad Air 11 (M4) 820 × 1180 CSS 화면 · 긴 변 카메라 · 상태바 28 · 홈 인디케이터 20',source:'official: 2360 × 1640 px 264ppi · 대각선 10.86"(27.59cm) · 바디 247.6 × 178.5 × 6.1mm (Apple tech specs 126471) · CSS 820 × 1180 @2 는 동일 패널 이전 모델(M2) 레퍼런스 준용(derived, M4 실기기 미검증)',
      frame:'ipad-air-11',browser:'ipados-safari',dpr:2,states:[{id:'default',label:'기본',width:820,height:1180,diagonal:10.86,physicalWidth:1640,physicalHeight:2360}]},
    /* physicalWidth/Height 는 세로 기준 정규화 값(derived-orientation). Samsung 공식 native 표기는 2560×1600 / 2960×1848 → frameProfiles source 참조. dpr 2 는 동일 패널 전작(Tab S9 / S9·S10 Ultra) 레퍼런스 준용(derived, 실기기 미검증) */
    'galaxy-tab-s11':{name:'Galaxy Tab S11',group:'tablet',subtitle:'11.0형 · One UI 8',note:'Galaxy Tab S11 800 × 1280 CSS 화면 · 긴 변 카메라(노치 없음) · Android 상태바 24 · 제스처 바 24',source:'official: 2560 × 1600 · 278.1mm(11.0형, 둥근 모서리 276.2mm) · 바디 253.8 × 165.3 × 5.5mm (Samsung 뉴스룸 2025-09-04, samsung.com/sec) · CSS 800 × 1280 @2 는 동일 패널 전작 Tab S9 레퍼런스 준용(derived, 실기기 미검증)',
      frame:'galaxy-tab-s11',browser:'android-tablet-chrome',dpr:2,states:[{id:'default',label:'기본',width:800,height:1280,diagonal:10.95,physicalWidth:1600,physicalHeight:2560}]},
    'galaxy-tab-s11-ultra':{name:'Galaxy Tab S11 Ultra',group:'tablet',subtitle:'14.6형 · wave 노치',note:'Galaxy Tab S11 Ultra 924 × 1480 CSS 화면 · 긴 변 상단 wave 노치·카메라 · Android 상태바 24 · 제스처 바 24',source:'official: 2960 × 1848 · 369.9mm(14.6형, 둥근 모서리 367.2mm) · 바디 326.3 × 208.5 × 5.1mm · 베젤 5.2mm (Samsung 뉴스룸 2025-09-04, samsung.com/uk) · CSS 924 × 1480 @2 는 동일 패널 전작 Tab S9/S10 Ultra 레퍼런스 준용(derived, 실기기 미검증)',
      frame:'galaxy-tab-s11-ultra',browser:'android-tablet-chrome',dpr:2,states:[{id:'default',label:'기본',width:924,height:1480,diagonal:14.56,physicalWidth:1848,physicalHeight:2960}]},
    'tablet-768':{name:'iPad 9.7형 [레거시]',group:'tablet',subtitle:'홈 버튼형 · 태블릿 전환점',note:'iPad 9.7형(홈 버튼) 768 × 1024 · 모바일→태블릿 전환 경계 · 회전하면 1024 × 768(PC 전환 직전 점검)',source:'official: iPad 6세대 9.7" 2048 × 1536, DPR 2 → 768 × 1024 · 바디 240.0 × 169.5mm (Apple)',
      frame:'ipad-home',browser:'ipad-safari',dpr:2,states:[{id:'default',label:'기본',width:768,height:1024,diagonal:9.7,physicalWidth:1536,physicalHeight:2048}]},
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
    foldControls:document.getElementById('foldControls'),stateList:document.getElementById('stateList'),viewportWidth:document.getElementById('viewportWidth'),
    viewportHeight:document.getElementById('viewportHeight'),applySize:document.getElementById('applySize'),sizeError:document.getElementById('sizeError'),
    browserSelect:document.getElementById('browserSelect'),addressBarToggle:document.getElementById('addressBarToggle'),bottomBarToggle:document.getElementById('bottomBarToggle'),
    urlPositionControls:document.getElementById('urlPositionControls'),urlPositionInputs:Array.from(document.querySelectorAll('input[name="urlPosition"]')),
    uiOverlayToggle:document.getElementById('uiOverlayToggle'),safeAreaBtn:document.getElementById('safeAreaBtn'),
    rotateBtn:document.getElementById('rotateBtn'),refreshBtn:document.getElementById('refreshBtn'),scaleModeInputs:Array.from(document.querySelectorAll('input[name="scaleMode"]')),scaleValue:document.getElementById('scaleValue'),
    openLink:document.getElementById('openLink'),previewArea:document.getElementById('previewArea'),previewStage:document.getElementById('previewStage'),previewMount:document.getElementById('previewMount'),
    compareBar:document.getElementById('compareBar'),compareCount:document.getElementById('compareCount'),compareNote:document.getElementById('compareNote'),
    compareGrid:document.getElementById('compareGrid'),compareEmpty:document.getElementById('compareEmpty'),
    introScreen:document.getElementById('introScreen'),introUrlBtn:document.getElementById('introUrlBtn'),introSkipBtn:document.getElementById('introSkipBtn'),
    syncScroll:document.getElementById('syncScroll'),syncRotate:document.getElementById('syncRotate'),syncRefresh:document.getElementById('syncRefresh'),
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
  const syncOptions={scroll:true,rotate:true,refresh:true};
  const compareViews=new Map();
  let primaryView=null;

  let scaleMode='device';
  let showAddressBar=true;
  let showBottomBar=true;
  let uiMode='shrink';        /* shrink: UI 높이만큼 사이트 영역 축소(svh) · overlay: UI 를 콘텐츠 위에 겹침(lvh) */
  let safeAreaGuide=false;
  let browserByPlatform={};   /* 플랫폼별 사용자 브라우저 선택 { ios:'ios-chrome', ... } */
  let urlBarPositionByBrowser={}; /* 브라우저별 세로 모드 주소창 위치 선택 { 'ios-safari':'top', ... } · 없으면 프로필 기본값 */
  let currentUrl='';
  let introDismissed=false;   /* 시작 화면을 "기기 프레임 먼저 보기" 로 닫았는지 (저장하지 않음, 세션 한정) */

  function setError(element,message){element.textContent=message;element.hidden=!message;}
  function announce(message){elements.viewportStatus.textContent=message;}
  function allViews(){return [primaryView].concat(Array.from(compareViews.values()));}
  function visibleViews(){return viewMode==='compare'?Array.from(compareViews.values()):[primaryView];}
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
      browserUrl:shell.querySelector('.browser_url'),hingeLine:shell.querySelector('.hinge_line'),
      statusCluster:shell.querySelector('.status_cluster'),clusterTime:shell.querySelector('.cluster_time'),clusterRing:shell.querySelector('.cluster_ring'),
      dynamicIsland:shell.querySelector('.dynamic_island'),sideControls:shell.querySelector('.side_controls'),
      statusTime:shell.querySelector('.status_time'),batteryFill:shell.querySelector('.battery_fill'),statusPercent:shell.querySelector('.status_percent'),
      keyVolume:shell.querySelector('.key_volume'),keyVolumeB:shell.querySelector('.key_volume_b'),keyPower:shell.querySelector('.key_power'),
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

  function createView(dom,extra){
    const view=Object.assign({
      dom,deviceId:'mobile-390',stateId:'default',rotated:false,
      baseWidth:390,baseHeight:844,currentWidth:390,currentHeight:844,
      frameProfile:frameProfiles.neutral,frameInsets:{top:14,right:14,bottom:14,left:14},
      scale:1,loaded:false,compare:false,ignoreScrollUntil:0
    },extra||{});
    dom.siteFrame.addEventListener('load',()=>onFrameLoad(view));
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
    return frameProfiles[state&&state.frame||device&&device.frame]||frameProfiles.neutral;
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

  /* UI 레이아웃: 'side'(카메라 쪽 세로 축 — iPhone Duo) | 'bars'(표준 가로 밴드). 프로필이 side 를 지원할 때 state.uiLayout 이 자세별로 정한다 */
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
    const side=layout==='side';
    const safe=getSafeArea(view);
    const status=metrics.statusBar==null?safe.top:metrics.statusBar;
    const home=view.frameProfile.homeIndicator===false?0:(metrics.homeIndicator==null?safe.bottom:metrics.homeIndicator);
    const sideInset=metrics.sideInset==='safe-area';
    return{
      profileId,label:profile.label,platform:view.frameProfile.platform||'any',
      status,home,
      url:showAddressBar?metrics.urlBar:0,
      urlPosition:resolveUrlBarPosition(view,profileId,barsOrientation),
      urlPositionLocked:barsOrientation==='landscape'||side,
      urlPositionLockReason:side?'side':(barsOrientation==='landscape'?'landscape':''),
      toolbar:showBottomBar?metrics.toolbar:0,
      left:sideInset?safe.left:0,
      right:sideInset?safe.right:0,
      side,sideEdge:side?getControlEdge(view):null,styleId
    };
  }

  /* 사이트(iframe) 뷰포트.
   * shrink : 모든 UI 밴드를 뺀 가시 영역 = iframe 크기 (svh 상황)
   * overlay: 항상 남는 상태바·홈 인디케이터만 빼고 URL 바·툴바는 콘텐츠 위에 겹침 (lvh 상황, 100vh 가림 확인) */
  function getSiteViewport(view){
    const bands=getBrowserBands(view);
    const overlay=uiMode==='overlay';
    const urlTop=bands.urlPosition==='top'?bands.url:0;
    const urlBottom=bands.urlPosition==='bottom'?bands.url:0;
    const top=bands.status+(overlay?0:urlTop);
    const bottom=bands.home+(overlay?0:urlBottom+bands.toolbar);
    const width=Math.max(80,view.currentWidth-bands.left-bands.right);
    const height=Math.max(80,view.currentHeight-top-bottom);
    const visibleHeight=Math.max(80,view.currentHeight-bands.status-bands.url-bands.toolbar-bands.home);
    return{width,height,visibleHeight,top,bottom,left:bands.left,right:bands.right,urlTop,urlBottom,overlay,bands};
  }

  function getDisplayUrl(){
    if(!currentUrl)return'example.com';
    try{
      const url=new URL(currentUrl);
      const path=url.pathname==='/'?'':url.pathname;
      return(url.host+path).slice(0,64);
    }catch(error){return currentUrl;}
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
    wrap.style.setProperty('--url-top-row',(viewport.overlay?0:viewport.urlTop)+'px');
    wrap.style.setProperty('--url-bottom-row',(viewport.overlay?0:viewport.urlBottom)+'px');
    wrap.style.setProperty('--toolbar-row',(viewport.overlay?0:bands.toolbar)+'px');
    wrap.style.setProperty('--home-row',bands.home+'px');
    wrap.style.setProperty('--url-height',bands.url+'px');
    wrap.style.setProperty('--toolbar-height',bands.toolbar+'px');
    wrap.style.setProperty('--side-left',bands.left+'px');
    wrap.style.setProperty('--side-right',bands.right+'px');
    wrap.style.setProperty('--home-indicator-width',(view.frameProfile.homeIndicatorWidth||134)+'px');
    /* 홈 인디케이터 중심: 하단 컷아웃 옆에 놓이는 기기(Flip8 커버) 는 세로에서 homeIndicatorCenter(px), 그 외·가로는 중앙 */
    const indicatorCenter=view.frameProfile.homeIndicatorCenter;
    wrap.style.setProperty('--home-indicator-center',indicatorCenter!=null&&getOrientation(view)==='portrait'?indicatorCenter+'px':'50%');
    view.dom.bandStatus.hidden=bands.status===0;
    view.dom.bandUrl.hidden=bands.url===0;
    view.dom.bandToolbar.hidden=bands.toolbar===0;
    view.dom.bandHome.hidden=bands.home===0;
    view.dom.browserUrl.textContent=getDisplayUrl();
    wrap.dataset.uiLayout=bands.side?'side':'bars';
    updateStatusBar(view);
    updateSideControls(view,bands);
    return viewport;
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
    const need=()=>top.length*side.circle+(top.length&&capsule.length?side.gap:0)+capsule.length*side.pitch+(bottom.length&&(top.length||capsule.length)?side.gap:0)+bottom.length*side.pitch;
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

  /* OS 상태바: 플랫폼 프로필 → 시간·아이콘 순서·배터리 잔량·컷아웃 회피 여백. 밴드 높이는 getBrowserBands() 의 status 값 */
  function getStatusBarProfile(view){
    const frame=view.frameProfile;
    const override=frame.statusBar||{};
    const base=statusBarProfiles[override.platform||frame.platform]||statusBarProfiles.generic;
    const merged=Object.assign({},base,override);
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
    wrap.dataset.cellularStyle=profile.cellularStyle||'bars';
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
    /* 고정 크기 상태바(iPad): 가로에서도 글꼴·아이콘 크기를 줄이지 않는다 */
    wrap.dataset.statusFixed=profile.fixedSize?'true':'false';
    wrap.style.setProperty('--status-font',(profile.fontSize||16)+'px');
    wrap.style.setProperty('--status-icon',(profile.iconSize||12)+'px');
    /* 좌/우 정렬 컷아웃(예: Fold 펼침 우상단 카메라) 과 아이콘이 겹치지 않도록 여백 확보. 가로 모드는 컷아웃이 왼쪽 세로 가장자리라 영향 없음 */
    const cutout=view.frameProfile.cutout;
    const landscape=getOrientation(view)==='landscape';
    let padLeft=profile.padding?profile.padding.left:16;
    let padRight=profile.padding?profile.padding.right:14;
    let bandPadRight=0;   /* URL 바·툴바 내용이 비켜날 오른쪽 여백(측면 컷아웃이 밴드 행과 겹칠 때만) */
    const geometry=cutout&&cutout.type&&cutout.type!=='none'?getCutoutGeometry(view,view.frameProfile,landscape):null;
    if(geometry&&!landscape&&cutout.bottom==null){
      const extent=(cutout.offset||0)+geometry.box.width+8;
      if(cutout.align==='left')padLeft=Math.max(padLeft,extent);
      if(cutout.align==='right')padRight=Math.max(padRight,extent);
    }else if(geometry&&landscape&&cutout.bottom!=null&&cutout.align==='right'){
      /* 세로 우하단 컷아웃(Flip8 커버 카메라) 은 가로에서 우상단 → 상태바 오른쪽 아이콘과 상단 URL 바 내용이 카메라 열을 비켜난다 */
      const extent=cutout.bottom+geometry.box.width+8;
      padRight=Math.max(padRight,extent);
      bandPadRight=extent;
    }
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
    elements.urlPositionControls.title=sideLocked?'iPhone Duo 측면 컨트롤 배치에서는 주소창 위치를 바꿀 수 없습니다(공식 자료에 주소 필드 없음).':(locked?'가로 모드에서는 주소창이 상단에 고정됩니다.':(showAddressBar?'':'주소창을 켜면 위치를 바꿀 수 있습니다.'));
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
  function syncScaleControls(){
    const view=getControlView();
    const deviceInput=elements.scaleModeInputs.find(input=>input.value==='device');
    const hasDeviceScale=Boolean(getPhysicalScale(view));
    if(deviceInput)deviceInput.disabled=!hasDeviceScale;
    if(scaleMode==='device'&&!hasDeviceScale)scaleMode='fit';
    elements.scaleModeInputs.forEach(input=>{input.checked=input.value===scaleMode;});
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
    const frameWidth=view.currentWidth+view.frameInsets.left+view.frameInsets.right+extent.left+extent.right;
    const frameHeight=view.currentHeight+view.frameInsets.top+view.frameInsets.bottom+extent.top+extent.bottom;
    const physical=getPhysicalScale(view);
    const mode=scaleMode==='device'&&!physical?'fit':scaleMode;
    let scale=1;
    if(mode==='fit'){
      const area=getFitArea(view);
      scale=Math.min(1,area.width/frameWidth,area.height/frameHeight);
      scale=Math.max(view.compare?.12:.18,scale);
    }else if(mode==='device'){
      scale=physical||1;
    }
    view.scale=scale;
    view.dom.shell.style.setProperty('--preview-scale',String(scale));
    view.dom.shell.style.left=extent.left?Math.round(extent.left*scale)+'px':'';
    view.dom.shell.style.top=extent.top?Math.round(extent.top*scale)+'px':'';
    view.dom.mount.style.width=Math.ceil(frameWidth*scale)+'px';    /* 올림: 변환된 셸이 mount 를 넘지 않게 */
    view.dom.mount.style.height=Math.ceil(frameHeight*scale)+'px';
  }

  function updateAllScales(){
    syncScaleControls();
    visibleViews().forEach(updateScale);
    elements.scaleValue.textContent=Math.round(getControlView().scale*100)+'%';
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
    /* 데이터 기반 측면 키(controls.keys): 있으면 family 기본 위치 대신 변·시작·길이로 놓는다. type 별 요소: volume → .key_volume, 두 번째 volume → .key_volume_b, power → .key_power */
    const keys=Array.isArray(controls.keys)?controls.keys:null;
    shell.dataset.keys=keys?'custom':'family';
    const keyElements={volume:[view.dom.keyVolume,view.dom.keyVolumeB],power:[view.dom.keyPower]};
    const used=new Set();
    if(keys)keys.forEach(key=>{
      const pool=keyElements[key.type]||[];
      const el=pool.find(candidate=>candidate&&!used.has(candidate));
      if(!el)return;
      used.add(el);
      el.dataset.edge=edgeFor(key.edge||'right');
      el.style.setProperty('--key-start',startFor(key.edge||'right',key.start||0,key.length||0)+'px');
      el.style.setProperty('--key-length',(key.length||0)+'px');
    });
    [view.dom.keyVolume,view.dom.keyVolumeB,view.dom.keyPower].forEach(el=>{if(el&&!used.has(el)){delete el.dataset.edge;el.style.removeProperty('--key-start');el.style.removeProperty('--key-length');}});
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
    ['tl','tr','br','bl'].forEach(corner=>{
      shell.style.setProperty('--body-'+corner,body[corner]+'px');
      shell.style.setProperty('--screen-'+corner,screen[corner]+'px');
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

  function updateSafeGuides(view){
    const safe=getSafeArea(view);
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

  const initialPreviewContent='<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}html,body{height:100%}body{margin:0;display:grid;place-items:center;padding:6vmin;color:#5b6473;background:#f6f8fb;font-family:-apple-system,"Apple SD Gothic Neo",Roboto,"Noto Sans KR",system-ui,sans-serif;-webkit-font-smoothing:antialiased}.ph{display:grid;justify-items:center;gap:clamp(8px,2.6vmin,16px);text-align:center;word-break:keep-all}.ph svg{display:block;width:clamp(28px,11vmin,56px);height:clamp(28px,11vmin,56px);color:#a4adba;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}.ph p{margin:0}.ph .m{color:#3b4453;font-size:clamp(13px,4.2vmin,20px);font-weight:600;line-height:1.45;letter-spacing:-.02em}.ph .s{color:#8a94a3;font-size:clamp(11px,3vmin,13px);line-height:1.5}@media(max-height:200px){.ph .s{display:none}}</style></head><body><main class="ph"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.8 5.4 3.8 8.5S14.5 17.9 12 20.5M12 3.5C9.5 6.1 8.2 8.9 8.2 12s1.3 5.9 3.8 8.5"/></svg><p class="m">URL을 입력하면<br>이 화면에 사이트가 표시됩니다.</p><p class="s">상단 주소창에 URL을 입력해 주세요.</p></main></body></html>';

  /* view 에 현재 URL(없으면 안내 화면) 을 로드. iframe 은 재생성하지 않고 src 만 바꾼다 */
  function loadInto(view){
    const frame=view.dom.siteFrame;
    view.loaded=false;
    if(!currentUrl){frame.removeAttribute('src');frame.srcdoc=initialPreviewContent;return;}
    frame.removeAttribute('srcdoc');
    frame.src=currentUrl;
  }

  function reloadView(view){
    if(!currentUrl)return false;
    view.loaded=false;
    view.dom.siteFrame.src=currentUrl;
    return true;
  }

  function onFrameLoad(view){
    if(currentUrl&&view.dom.siteFrame.getAttribute('src')===currentUrl)view.loaded=true;
    if(view.compare)attachScrollSync(view);
    updateLoadStatus();
  }

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
   *        외부 도메인(cross-origin) 은 접근 시 SecurityError 가 나므로 리스너를 붙이지 않고,
   *        스위치를 비활성화해 사용자에게 이유를 보여준다. 우회 코드는 두지 않는다.
   *        (같은 문제를 Chrome Extension content script 로 풀 수 있는 구조는 사용법.txt 참고)
   * ------------------------------------------------------------------ */
  const scrollAccessReasons={
    'same-origin':'같은 출처 · 동기화 가능',
    'cross-origin':'다른 출처 · 브라우저 정책상 스크롤 접근 불가',
    'file-origin':'file:// 로 열린 도구 · 서버(Live Server 등) 로 열어야 동기화 가능',
    'not-loaded':'불러오는 중'
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

  function broadcastScroll(source){
    const win=getSameOriginWindow(source);
    if(!win)return;
    const ratio=getScrollRatio(win);
    compareViews.forEach(other=>{if(other!==source)applyScrollRatio(other,ratio);});
  }

  /* iframe load 마다 호출. 문서가 새로 생기면(새로고침·URL 변경) 리스너도 사라지므로 문서 기준으로 다시 붙인다 */
  function attachScrollSync(view){
    const access=getScrollAccess(view);
    view.scrollAccess=access.reason;
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
    /* 새로 추가·새로고침된 카드는 이미 스크롤된 다른 카드 위치에 맞춘다 */
    if(syncOptions.scroll){
      const reference=Array.from(compareViews.values()).find(other=>other!==view&&getScrollAccess(other).accessible);
      if(reference)applyScrollRatio(view,getScrollRatio(getSameOriginWindow(reference)));
    }
  }

  /* 동기화 스위치를 켤 때: 첫 접근 가능 카드 기준으로 즉시 정렬 */
  function realignScrollSync(){
    const reference=Array.from(compareViews.values()).find(view=>getScrollAccess(view).accessible);
    if(reference)broadcastScroll(reference);
  }

  /* 스위치 활성/비활성 + 안내 문구 + 카드 배지. 접근 가능한 카드가 하나도 없으면 스위치를 끈 상태로 비활성화한다 */
  function updateSyncAvailability(){
    const compare=viewMode==='compare';
    const views=Array.from(compareViews.values());
    const predicted=predictScrollAccess(currentUrl);
    const accesses=views.map(view=>getScrollAccess(view));
    const accessibleCount=accesses.filter(access=>access.accessible).length;
    const loading=accesses.some(access=>access.reason==='not-loaded');
    const blocked=compare&&Boolean(currentUrl)&&!loading&&views.length>0&&accessibleCount===0;
    elements.syncScroll.disabled=blocked;
    elements.syncScroll.checked=syncOptions.scroll&&!blocked;
    views.forEach((view,index)=>{
      const access=accesses[index];
      const badge=view.dom.badge;
      if(!badge)return;
      const show=Boolean(currentUrl)&&!access.accessible&&access.reason!=='not-loaded';
      badge.hidden=!show;
      badge.textContent=show?'동기화 불가':'';
      badge.title=show?'스크롤 동기화 불가 · '+scrollAccessReasons[access.reason]:'';
    });
    if(!compare){elements.compareNote.textContent='';return;}
    let note='';
    if(!currentUrl)note='스크롤 동기화는 이 도구와 같은 출처('+(location.origin==='null'?'file://':location.origin)+')의 페이지를 열었을 때 동작합니다.';
    else if(predicted==='file-origin')note='도구가 file:// 로 열려 있어 스크롤 동기화를 쓸 수 없습니다. Live Server 등 http 서버로 index.html 을 열고 같은 서버의 페이지를 불러와 주세요.';
    else if(loading)note='불러오는 중…';
    else if(accessibleCount===0)note='스크롤 동기화 불가: 다른 출처('+safeOrigin(currentUrl)+')의 페이지는 브라우저 보안 정책상 스크롤을 읽거나 옮길 수 없습니다. 같은 출처('+location.origin+') 페이지에서만 동작합니다.';
    else if(accessibleCount<views.length)note='스크롤 동기화 일부만 가능 ('+accessibleCount+' / '+views.length+') · 다른 출처 카드는 따라오지 않습니다.';
    else note=syncOptions.scroll?'스크롤 동기화 동작 중 (같은 출처)':'스크롤 동기화 꺼짐';
    elements.compareNote.textContent=note;
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
      const heading=document.createElement('h3');
      heading.id='deviceGroup-'+group.id;
      heading.textContent=group.label;
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
    updateStateButtons();
  }

  function updateStateButtons(){
    elements.stateList.querySelectorAll('.state_btn').forEach(button=>{
      const active=button.dataset.state===primaryView.stateId;
      button.classList.toggle('is_current',active);
      button.setAttribute('aria-pressed',String(active));
    });
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
      elements.presetNote.textContent='비교 기기 '+views.length+' / '+MAX_COMPARE+' · 공통 제어는 모든 기기에 적용됩니다';
      elements.rotateBtn.setAttribute('aria-pressed',views.length&&views.every(item=>item.rotated)?'true':'false');
    }else{
      const device=getDevice(view);
      const state=getState(view);
      const siteViewport=getSiteViewport(view);
      const physical=getPhysicalResolution(view);
      const siteLabel=siteViewport.width+' × '+siteViewport.height+(siteViewport.overlay?' (가시 '+siteViewport.visibleHeight+')':'');
      elements.currentDevice.textContent=getDeviceName(view);
      elements.currentMeta.textContent='화면 '+view.currentWidth+' × '+view.currentHeight+' · 사이트 '+siteLabel+(getDpr(view)?' · DPR '+getDpr(view):'')+' · '+getOrientationLabel(view);
      elements.presetNote.textContent=(physical?'물리 '+physical.width+' × '+physical.height+' · ':'')+(state&&state.note?state.note:device?device.note:'직접 입력한 CSS 화면 · 기기 가림 없음');
      elements.rotateBtn.setAttribute('aria-pressed',view.rotated?'true':'false');
    }
    elements.viewportWidth.value=primaryView.currentWidth;
    elements.viewportHeight.value=primaryView.currentHeight;
    [elements.viewportWidth,elements.viewportHeight,elements.applySize].forEach(el=>{el.disabled=compare;el.title=compare?'직접 크기 입력은 단일 보기에서 사용합니다.':'';});
    elements.uiOverlayToggle.checked=uiMode==='overlay';
    elements.safeAreaBtn.setAttribute('aria-pressed',safeAreaGuide?'true':'false');
    renderBrowserOptions();
    syncUrlPositionControls();
    syncScaleControls();
    elements.scaleValue.textContent=Math.round(view.scale*100)+'%';
    updateCompareBar();
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

  function toggleRotation(view){
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
    try{localStorage.setItem('viewportLabUrl',url);}catch(error){}
    updateIntro();
    return url;
  }

  /* 시작 화면: URL 이 없고 닫지 않았을 때만 스테이지 위에 표시. 기기 셸은 레이아웃을 유지한 채 visibility 로만 숨긴다(배율·측정 로직 무관) */
  function updateIntro(){
    if(!elements.introScreen)return;
    const show=!currentUrl&&!introDismissed;
    elements.introScreen.hidden=!show;
    elements.previewStage.classList.toggle('is_intro',show);
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

  function updateCompareItem(view,siteViewport){
    const name=getDeviceName(view);
    const state=getState(view);
    const device=getDevice(view);
    view.dom.name.textContent=name;
    view.dom.meta.textContent='사이트 '+siteViewport.width+' × '+siteViewport.height+' · '+getOrientationLabel(view)+(device&&device.states.length>1&&state?' · '+state.label:'');
    view.dom.rotate.setAttribute('aria-label',name+' 가로·세로 회전');
    view.dom.rotate.title=name+' 가로·세로 회전';
    view.dom.rotate.setAttribute('aria-pressed',view.rotated?'true':'false');
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
      refresh:item.querySelector('.compare_refresh'),remove:item.querySelector('.compare_remove'),badge:item.querySelector('.compare_badge')
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
    compareViews.delete(deviceId);
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
    compareViews.clear();
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
      updateControls();
      if(settings.announce!==false)announce('다중 비교 모드. 비교 기기 '+compareViews.size+' / '+MAX_COMPARE+'. 왼쪽 목록에서 체크해 추가하거나 해제합니다.');
    }else{
      clearCompareViews();
      renderDeviceNav();
      renderStates();
      updatePreview({announce:false});
      if(changed&&settings.announce!==false)announce('단일 보기 모드. '+describeView(primaryView)+'.');
    }
    if(currentUrl)updateLoadStatus();
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
      localStorage.setItem('viewportLabDisplay',JSON.stringify({scaleMode,showAddressBar,showBottomBar,uiMode,safeAreaGuide,browserByPlatform,urlBarPositionByBrowser}));
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
      if(saved&&['device','fit','actual'].includes(saved.scaleMode))scaleMode=saved.scaleMode;
      if(saved&&typeof saved.showAddressBar==='boolean')showAddressBar=saved.showAddressBar;
      if(saved&&typeof saved.showBottomBar==='boolean')showBottomBar=saved.showBottomBar;
      if(saved&&['shrink','overlay'].includes(saved.uiMode))uiMode=saved.uiMode;
      if(saved&&typeof saved.safeAreaGuide==='boolean')safeAreaGuide=saved.safeAreaGuide;
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
      const savedUrl=localStorage.getItem('viewportLabUrl');
      if(savedUrl)elements.siteUrl.value=savedUrl;
    }catch(error){}
  }

  function restoreComparePreference(){
    let saved=null;
    try{saved=JSON.parse(localStorage.getItem('viewportLabCompare')||'null');}catch(error){}
    if(saved&&saved.sync){
      ['scroll','rotate','refresh'].forEach(key=>{if(typeof saved.sync[key]==='boolean')syncOptions[key]=saved.sync[key];});
    }
    elements.syncScroll.checked=syncOptions.scroll;
    elements.syncRotate.checked=syncOptions.rotate;
    elements.syncRefresh.checked=syncOptions.refresh;
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
    register({name:'set_browser_ui',title:'브라우저 UI 설정',description:'브라우저 종류, 주소창 표시·위치(세로 모드), 툴바 표시, 겹침(overlay) 모드, safe-area 가이드를 설정합니다.',inputSchema:{type:'object',properties:{browserId:{type:'string',enum:Object.keys(browserProfiles)},showAddressBar:{type:'boolean'},urlBarPosition:{type:'string',enum:urlBarPositions},showBottomBar:{type:'boolean'},uiMode:{type:'string',enum:['shrink','overlay']},safeAreaGuide:{type:'boolean'}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){return setBrowserUi(input);}});
    register({name:'read_viewport',title:'현재 뷰포트 확인',description:'현재 선택된 기기, 화면 크기, 사이트 영역, 브라우저 UI, 방향, URL, 다중 비교 목록을 확인합니다.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(){return getViewportInfo();}});
    window.addEventListener('beforeunload',()=>lifecycle.abort(),{once:true});
  }

  /* ------------------------------------------------------------------
   * 이벤트
   * ------------------------------------------------------------------ */
  elements.siteForm.addEventListener('submit',event=>{event.preventDefault();try{loadUrl(elements.siteUrl.value);}catch(error){}});
  /* 시작 화면: 입력창을 복제하지 않고 상단 주소창으로 포커스만 옮긴다 */
  if(elements.introUrlBtn)elements.introUrlBtn.addEventListener('click',()=>{
    elements.siteForm.scrollIntoView({block:'nearest'});
    elements.siteUrl.focus();
    elements.siteUrl.select();
  });
  if(elements.introSkipBtn)elements.introSkipBtn.addEventListener('click',()=>{introDismissed=true;updateIntro();});
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
  elements.safeAreaBtn.addEventListener('click',()=>{
    safeAreaGuide=!safeAreaGuide;
    allViews().forEach(updateSafeGuides);
    elements.safeAreaBtn.setAttribute('aria-pressed',safeAreaGuide?'true':'false');
    saveDisplayPreference();
    announce('safe-area 가이드를 '+(safeAreaGuide?'표시합니다.':'숨겼습니다.'));
  });
  elements.scaleModeInputs.forEach(input=>input.addEventListener('change',()=>{if(!input.checked)return;scaleMode=input.value;updateAllScales();saveDisplayPreference();announce('미리보기 표시 배율이 '+elements.scaleValue.textContent+'로 변경되었습니다.');}));
  elements.syncScroll.addEventListener('change',()=>{syncOptions.scroll=elements.syncScroll.checked;if(syncOptions.scroll)realignScrollSync();updateSyncAvailability();saveComparePreference();announce('스크롤 동기화를 '+(syncOptions.scroll?'켰습니다.':'껐습니다.'));});
  elements.syncRotate.addEventListener('change',()=>{syncOptions.rotate=elements.syncRotate.checked;saveComparePreference();});
  elements.syncRefresh.addEventListener('change',()=>{syncOptions.refresh=elements.syncRefresh.checked;saveComparePreference();});

  /* ------------------------------------------------------------------
   * 초기화
   * ------------------------------------------------------------------ */
  if('ResizeObserver'in window)new ResizeObserver(()=>updateAllScales()).observe(elements.previewStage);else window.addEventListener('resize',()=>updateAllScales());
  validateDevices();
  primaryView=createView(mountShell(elements.previewMount,true));
  loadInto(primaryView);
  renderDeviceNav();
  restoreDisplayPreference();
  renderStates();
  updatePreview({announce:false});
  restorePreference();
  restoreComparePreference();
  updateIntro();
  registerWebMcpTools();
})();

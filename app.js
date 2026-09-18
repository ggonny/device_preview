(function(){
  'use strict';

  /* ==================================================================
   * 데이터
   *
   * frameProfiles  : 기기 프레임. 베젤 inset·모서리·컷아웃·safe-area 를 세로 기준으로 적고,
   *                  가로는 JS 가 반시계 90° 회전 규칙으로 계산한다(safeAreaLandscape 로 덮어쓸 수 있음).
   *   cutout.type  : none | notch | island | hole | dual-hole
   *   cutout.align : center | left | right  (offset 은 정렬 가장자리에서의 거리)
   *   platform     : ios | android | any    (브라우저 선택 목록 필터에 사용)
   *
   * browserProfiles: 브라우저 UI 를 밴드(statusBar / urlBar / toolbar / homeIndicator) 높이로 정의.
   *                  statusBar·homeIndicator 가 null 이면 프레임 safeArea 값을 사용한다.
   *                  sideInset:'safe-area' 이면 가로에서 좌우 safe-area 만큼 사이트 폭이 줄어든다(iOS Safari 기본 동작).
   *   urlBarPosition : 세로 모드 주소창 기본 위치(top|bottom). 사용자가 UI 에서 바꾸면 브라우저별로 기억한다.
   *                    가로 모드는 실제 브라우저처럼 항상 상단이며, 상태바(컷아웃 영역) 는 기기 영역이므로 주소창은 그 아래에서 시작한다.
   *
   * devices        : 기기 프리셋. 새 기기는 여기에만 추가하면 사이드바·카운트·WebMCP enum 에 자동 반영된다.
   *   width/height : 기기 전체 CSS 화면(px). 브라우저 UI 를 뺀 값이 실제 사이트 뷰포트가 된다.
   *   orientation  : 기본 자세(portrait|landscape). 생략 시 width>=height 로 판정. 펼친 폴더블처럼
   *                  가로형 비율이지만 세로로 드는 기기는 'portrait' 로 명시한다.
   *   hinge        : horizontal | vertical | gap-vertical(듀얼스크린 물리 간격)
   * ================================================================== */

  const frameProfiles={
    neutral:{top:14,right:14,bottom:14,left:14,radius:28,screenRadius:16,platform:'any',obstruction:'없음',
      cutout:{type:'none'},safeArea:{top:0,right:0,bottom:0,left:0},homeIndicator:false},
    'iphone-notch':{top:10,right:10,bottom:10,left:10,radius:48,screenRadius:39,platform:'ios',obstruction:'상단 노치',
      cutout:{type:'notch',width:160,height:33,top:0,align:'center'},
      safeArea:{top:47,right:0,bottom:34,left:0},safeAreaLandscape:{top:0,right:47,bottom:21,left:47},homeIndicator:true,homeIndicatorWidth:134},
    'iphone-se':{top:64,right:14,bottom:64,left:14,radius:38,screenRadius:4,platform:'ios',obstruction:'화면 밖 홈 버튼·카메라',
      cutout:{type:'none'},safeArea:{top:20,right:0,bottom:0,left:0},safeAreaLandscape:{top:0,right:0,bottom:0,left:0},homeIndicator:false},
    'iphone-dynamic':{top:9,right:9,bottom:9,left:9,radius:49,screenRadius:41,platform:'ios',obstruction:'다이내믹 아일랜드',
      cutout:{type:'island',width:126,height:37,top:11,align:'center'},
      safeArea:{top:59,right:0,bottom:34,left:0},safeAreaLandscape:{top:0,right:59,bottom:21,left:59},homeIndicator:true,homeIndicatorWidth:134},
    'android-hole':{top:10,right:10,bottom:10,left:10,radius:38,screenRadius:30,platform:'android',obstruction:'상단 펀치홀 카메라',
      cutout:{type:'hole',width:20,height:20,top:12,align:'center'},
      safeArea:{top:40,right:0,bottom:24,left:0},safeAreaLandscape:{top:24,right:0,bottom:16,left:36},homeIndicator:true,homeIndicatorWidth:108},
    'flip8-cover':{top:12,right:12,bottom:12,left:12,radius:37,screenRadius:29,platform:'android',obstruction:'FlexWindow 듀얼 카메라',
      cutout:{type:'dual-hole',width:116,height:44,top:18,align:'left',offset:18},
      safeArea:{top:0,right:0,bottom:0,left:0},homeIndicator:false},
    'flip8-open':{top:10,right:10,bottom:10,left:10,radius:39,screenRadius:31,platform:'android',obstruction:'상단 펀치홀·접힘선',
      cutout:{type:'hole',width:16,height:16,top:11,align:'center'},
      safeArea:{top:30,right:0,bottom:24,left:0},safeAreaLandscape:{top:24,right:0,bottom:16,left:30},homeIndicator:true,homeIndicatorWidth:108},
    'flip8-flex':{top:10,right:10,bottom:16,left:10,radius:34,screenRadius:28,platform:'android',obstruction:'상단 펀치홀·하단 힌지',
      cutout:{type:'hole',width:16,height:16,top:11,align:'center'},
      safeArea:{top:30,right:0,bottom:0,left:0},safeAreaLandscape:{top:24,right:0,bottom:0,left:30},homeIndicator:false},
    'fold8-cover':{top:10,right:10,bottom:10,left:10,radius:36,screenRadius:28,platform:'android',obstruction:'상단 펀치홀 카메라',
      cutout:{type:'hole',width:16,height:16,top:11,align:'center'},
      safeArea:{top:30,right:0,bottom:24,left:0},safeAreaLandscape:{top:24,right:0,bottom:16,left:30},homeIndicator:true,homeIndicatorWidth:108},
    'fold8-open':{top:11,right:11,bottom:11,left:11,radius:30,screenRadius:21,platform:'android',obstruction:'우측 상단 카메라·접힘선',
      cutout:{type:'hole',width:16,height:16,top:15,align:'right',offset:15},
      safeArea:{top:30,right:0,bottom:24,left:0},safeAreaLandscape:{top:24,right:0,bottom:16,left:0},homeIndicator:true,homeIndicatorWidth:140},
    'duo-outer':{top:9,right:9,bottom:9,left:9,radius:42,screenRadius:34,platform:'ios',obstruction:'상단 Center Stage 카메라',
      cutout:{type:'hole',width:20,height:20,top:12,align:'center'},
      safeArea:{top:54,right:0,bottom:34,left:0},safeAreaLandscape:{top:0,right:54,bottom:21,left:54},homeIndicator:true,homeIndicatorWidth:134},
    'duo-inner':{top:11,right:11,bottom:11,left:11,radius:31,screenRadius:23,platform:'ios',obstruction:'언더 디스플레이 카메라·접힘선',
      cutout:{type:'none'},safeArea:{top:24,right:0,bottom:20,left:0},safeAreaLandscape:{top:24,right:0,bottom:20,left:0},homeIndicator:true,homeIndicatorWidth:140},
    tablet:{top:14,right:14,bottom:14,left:14,radius:27,screenRadius:14,platform:'any',obstruction:'없음',
      cutout:{type:'none'},safeArea:{top:24,right:0,bottom:20,left:0},safeAreaLandscape:{top:24,right:0,bottom:20,left:0},homeIndicator:true,homeIndicatorWidth:140}
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
  frameProfiles['iphone-se'].statusBar={compact:true};

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
    'ipad-safari':{label:'Safari (iPad)',platform:'ios',urlBarPosition:'top',
      portrait:{statusBar:null,urlBar:50,toolbar:0,homeIndicator:null},
      landscape:{statusBar:null,urlBar:50,toolbar:0,homeIndicator:null}}
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
  const deviceAliases={'z-flip':'z-flip8'};

  const devices={
    'mobile-320':{name:'최소 모바일',group:'base',subtitle:'작은 화면·최소폭 점검',note:'320px 최소폭·작은 화면 점검',source:'iPhone SE 1세대·소형 Android 공통 최소폭',
      frame:'neutral',browser:'android-chrome',dpr:2,states:[{id:'default',label:'기본',width:320,height:568,diagonal:4,physicalWidth:640,physicalHeight:1136}]},
    'mobile-360':{name:'Android 기본',group:'base',subtitle:'가장 좁은 실무 기준',note:'Android 실무 최소폭 점검값',source:'Galaxy S 시리즈 기본 해상도 모드(1080 × 2400, DPR 3)',
      frame:'neutral',browser:'android-chrome',dpr:3,states:[{id:'default',label:'기본',width:360,height:800,diagonal:6.1,physicalWidth:1080,physicalHeight:2400}]},
    'mobile-390':{name:'iPhone 기본',group:'base',subtitle:'일반형 iPhone 기준',note:'390 × 844 기준 · 상단 노치 가림 포함',source:'iPhone 12/13/14 공통 CSS 뷰포트',
      frame:'iphone-notch',browser:'ios-safari',dpr:3,states:[{id:'default',label:'기본',width:390,height:844,diagonal:6.1,physicalWidth:1170,physicalHeight:2532}]},
    'mobile-430':{name:'대형 모바일',group:'base',subtitle:'Max·Ultra급 점검',note:'430 × 932 기준 · 다이내믹 아일랜드 가림 포함',source:'iPhone 14 Pro Max / 15 Plus 계열 CSS 뷰포트',
      frame:'iphone-dynamic',browser:'ios-safari',dpr:3,states:[{id:'default',label:'기본',width:430,height:932,diagonal:6.7,physicalWidth:1290,physicalHeight:2796}]},
    'iphone-se':{name:'iPhone SE',group:'phone',subtitle:'홈 버튼형 화면',note:'홈 버튼·상하단 베젤을 포함한 iPhone SE형 프레임',source:'iPhone SE 2/3세대 · 750 × 1334, DPR 2',
      frame:'iphone-se',browser:'ios-safari',dpr:2,states:[{id:'default',label:'기본',width:375,height:667,diagonal:4.7,physicalWidth:750,physicalHeight:1334}]},
    'iphone-pro':{name:'iPhone 18 Pro',group:'phone',subtitle:'다이내믹 아일랜드',note:'402 × 873 CSS 화면 · 다이내믹 아일랜드 가림 포함',source:'물리 1206 × 2619, DPR 3 환산',
      frame:'iphone-dynamic',browser:'ios-safari',dpr:3,states:[{id:'default',label:'기본',width:402,height:873,diagonal:6.3,physicalWidth:1206,physicalHeight:2619}]},
    pixel:{name:'Google Pixel 10',group:'phone',subtitle:'중앙 펀치홀 카메라',note:'412 × 923 CSS 화면 · 중앙 펀치홀 가림 포함',source:'물리 1080 × 2424, DPR 2.625 환산',
      frame:'android-hole',browser:'android-chrome',dpr:2.625,states:[{id:'default',label:'기본',width:412,height:923,diagonal:6.3,physicalWidth:1080,physicalHeight:2424}]},
    'z-flip8':{name:'Galaxy Z Flip8',group:'fold',subtitle:'커버·펼침·Flex',note:'Galaxy Z Flip8 공개 디스플레이 사양 기준',source:'커버 948 × 1048 · 메인 1080 × 2520, DPR 3 환산',
      browser:'android-chrome',dpr:3,states:[
      {id:'cover',label:'커버 화면',width:316,height:349,diagonal:4.1,physicalWidth:948,physicalHeight:1048,frame:'flip8-cover',note:'FlexWindow 316 × 349 CSS 화면 · 듀얼 카메라 가림 포함'},
      {id:'open',label:'펼침',width:360,height:840,diagonal:6.9,physicalWidth:1080,physicalHeight:2520,frame:'flip8-open',hinge:'horizontal',hingeSize:3,note:'메인 화면 360 × 840 CSS 화면 · 펀치홀과 접힘선 포함'},
      /* Flex: 펼친 화면의 상단 절반. 물리값은 width×dpr 로 자동 계산(1080 × 1260), 실기기 배율은 전체 화면 기준(scaleWidth/Height). */
      {id:'flex',label:'Flex 90°',width:360,height:420,diagonal:6.9,scaleWidth:360,scaleHeight:840,frame:'flip8-flex',hinge:'horizontal',hingeSize:8,hingePosition:99,note:'펼친 화면 상단 절반 점검용 360 × 420 · 실제 Flex Mode는 실기기 확인 필요'}
    ]},
    'z-fold':{name:'Galaxy Z Fold8',group:'fold',subtitle:'커버·펼침',note:'Galaxy Z Fold8 공개 물리 해상도와 DPR 3 기준',source:'커버 1248 × 1972 · 메인 2448 × 1848, DPR 3 환산',
      browser:'android-chrome',dpr:3,states:[
      {id:'cover',label:'커버 화면',width:416,height:657,diagonal:5.5,physicalWidth:1248,physicalHeight:1972,frame:'fold8-cover',note:'커버 화면 416 × 657 CSS 화면 · 펀치홀 포함'},
      {id:'open',label:'펼침',width:816,height:616,diagonal:7.6,physicalWidth:2448,physicalHeight:1848,orientation:'portrait',browser:'tablet-chrome',frame:'fold8-open',hinge:'vertical',hingeSize:4,note:'메인 화면 816 × 616 CSS 화면 · 카메라와 접힘선 포함'}
    ]},
    'iphone-duo':{name:'iPhone Duo',group:'fold',subtitle:'외부·내부 화면',note:'공식 물리 해상도와 DPR 3 기준',source:'외부 1398 × 2034 · 내부 2670 × 1878, DPR 3 환산',
      browser:'ios-safari',dpr:3,states:[
      {id:'outer',label:'접힘 · 외부',width:466,height:678,diagonal:5.4,physicalWidth:1398,physicalHeight:2034,frame:'duo-outer',note:'외부 화면 466 × 678 CSS 화면 · Center Stage 카메라 가림 포함'},
      {id:'inner',label:'펼침 · 내부',width:890,height:626,diagonal:7.6,physicalWidth:2670,physicalHeight:1878,orientation:'portrait',browser:'ipad-safari',frame:'duo-inner',hinge:'vertical',hingeSize:3,note:'내부 화면 890 × 626 CSS 화면 · 중앙 접힘선 포함'}
    ]},
    'tablet-768':{name:'소형 태블릿',group:'tablet',subtitle:'모바일→태블릿 전환점',note:'모바일에서 태블릿으로 전환되는 경계 점검',source:'iPad mini/9.7형 계열 768 × 1024, DPR 2',
      frame:'tablet',browser:'tablet-chrome',dpr:2,states:[{id:'default',label:'기본',width:768,height:1024,diagonal:9.7,physicalWidth:1536,physicalHeight:2048}]},
    'tablet-1024':{name:'태블릿 가로',group:'tablet',subtitle:'PC 전환 직전 점검',note:'1040px 전후 PC 전환 직전 점검',source:'768 × 1024 태블릿의 가로 자세',
      frame:'tablet',browser:'tablet-chrome',dpr:2,states:[{id:'default',label:'기본',width:1024,height:768,diagonal:9.7,physicalWidth:2048,physicalHeight:1536}]}
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
      statusTime:shell.querySelector('.status_time'),batteryFill:shell.querySelector('.battery_fill'),
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
    if(platform==='any'||profileId===getDefaultBrowserId(view))return true;
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
  function resolveUrlBarPosition(view,profileId){
    if(getOrientation(view)==='landscape')return 'top';
    const chosen=urlBarPositionByBrowser[profileId];
    if(urlBarPositions.includes(chosen))return chosen;
    const profile=browserProfiles[profileId];
    return profile&&urlBarPositions.includes(profile.urlBarPosition)?profile.urlBarPosition:'top';
  }

  function getBrowserBands(view){
    const profileId=resolveBrowserId(view);
    const profile=browserProfiles[profileId];
    const orientation=getOrientation(view);
    const metrics=profile[orientation]||profile.portrait;
    const safe=getSafeArea(view);
    const status=metrics.statusBar==null?safe.top:metrics.statusBar;
    const home=view.frameProfile.homeIndicator===false?0:(metrics.homeIndicator==null?safe.bottom:metrics.homeIndicator);
    const sideInset=metrics.sideInset==='safe-area';
    return{
      profileId,label:profile.label,platform:view.frameProfile.platform||'any',
      status,home,
      url:showAddressBar?metrics.urlBar:0,
      urlPosition:resolveUrlBarPosition(view,profileId),
      urlPositionLocked:orientation==='landscape',
      toolbar:showBottomBar?metrics.toolbar:0,
      left:sideInset?safe.left:0,
      right:sideInset?safe.right:0
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
    wrap.dataset.browser=bands.profileId;
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
    view.dom.bandStatus.hidden=bands.status===0;
    view.dom.bandUrl.hidden=bands.url===0;
    view.dom.bandToolbar.hidden=bands.toolbar===0;
    view.dom.bandHome.hidden=bands.home===0;
    view.dom.browserUrl.textContent=getDisplayUrl();
    updateStatusBar(view);
    return viewport;
  }

  /* OS 상태바: 플랫폼 프로필 → 시간·아이콘 순서·배터리 잔량·컷아웃 회피 여백. 밴드 높이는 getBrowserBands() 의 status 값 */
  function getStatusBarProfile(view){
    const frame=view.frameProfile;
    const override=frame.statusBar||{};
    const base=statusBarProfiles[override.platform||frame.platform]||statusBarProfiles.generic;
    return Object.assign({},base,override);
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
      icon.hidden=index<0;
      icon.style.order=index<0?'':String(index);
    });
    if(dom.batteryFill){
      const level=Math.max(0,Math.min(1,profile.batteryLevel==null?.82:profile.batteryLevel));
      dom.batteryFill.setAttribute('width',String(Math.round(19*level*10)/10));
    }
    /* 좌/우 정렬 컷아웃(예: Fold 펼침 우상단 카메라) 과 아이콘이 겹치지 않도록 여백 확보. 가로 모드는 컷아웃이 왼쪽 세로 가장자리라 영향 없음 */
    const cutout=view.frameProfile.cutout;
    const landscape=getOrientation(view)==='landscape';
    let padLeft=profile.padding?profile.padding.left:16;
    let padRight=profile.padding?profile.padding.right:14;
    if(!landscape&&cutout&&cutout.type&&cutout.type!=='none'){
      const extent=(cutout.offset||0)+(cutout.width||0)+8;
      if(cutout.align==='left')padLeft=Math.max(padLeft,extent);
      if(cutout.align==='right')padRight=Math.max(padRight,extent);
    }
    wrap.style.setProperty('--status-pad-left',padLeft+'px');
    wrap.style.setProperty('--status-pad-right',padRight+'px');
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
    elements.urlPositionControls.title=locked?'가로 모드에서는 주소창이 상단에 고정됩니다.':(showAddressBar?'':'주소창을 켜면 위치를 바꿀 수 있습니다.');
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
    const frameWidth=view.currentWidth+view.frameInsets.left+view.frameInsets.right;
    const frameHeight=view.currentHeight+view.frameInsets.top+view.frameInsets.bottom;
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
    shell.style.setProperty('--frame-radius',profile.radius+'px');
    shell.style.setProperty('--screen-radius',profile.screenRadius+'px');
    updateCutout(view,profile,landscape);
    updateSafeGuides(view);
  }

  /* 컷아웃 위치는 현재 화면 크기 기준 px 로 계산. 가로는 세로 기준값을 반시계 90° 회전:
   * 상단 가장자리 → 왼쪽 가장자리, 우상단 모서리 → 좌상단 모서리, 좌상단 모서리 → 좌하단 모서리 */
  function updateCutout(view,profile,landscape){
    const shell=view.dom.shell;
    const cutout=profile.cutout&&profile.cutout.type&&profile.cutout.type!=='none'?profile.cutout:null;
    shell.dataset.cutout=cutout?cutout.type:'none';
    if(!cutout)return;
    const offset=cutout.offset||0;
    let width,height,left,top;
    if(!landscape){
      width=cutout.width;height=cutout.height;top=cutout.top||0;
      left=cutout.align==='left'?offset:cutout.align==='right'?view.currentWidth-offset-width:(view.currentWidth-width)/2;
    }else{
      width=cutout.height;height=cutout.width;left=cutout.top||0;
      top=cutout.align==='right'?offset:cutout.align==='left'?view.currentHeight-offset-height:(view.currentHeight-height)/2;
    }
    shell.style.setProperty('--cutout-width',Math.round(width)+'px');
    shell.style.setProperty('--cutout-height',Math.round(height)+'px');
    shell.style.setProperty('--cutout-left',Math.round(left)+'px');
    shell.style.setProperty('--cutout-top',Math.round(top)+'px');
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

  const initialPreviewContent='<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;padding:clamp(20px,6vw,56px);min-height:100vh;display:grid;place-items:center;color:#233044;background:#f8fafc;font-family:system-ui,sans-serif}.wrap{width:min(100%,560px)}.tag{display:inline-block;padding:5px 9px;color:#0b5bc6;background:#e8f2ff;border-radius:999px;font-size:12px;font-weight:700}h1{margin:14px 0 8px;font-size:clamp(24px,8vw,42px);line-height:1.15;letter-spacing:-.04em}p{margin:0;color:#667085;font-size:15px;line-height:1.7}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:28px}.grid span{height:72px;background:linear-gradient(135deg,#d8e8ff,#edf5ff);border:1px solid #b8d3f6;border-radius:12px}@media(max-width:380px){.grid{grid-template-columns:1fr}.grid span{height:48px}}</style></head><body><main class="wrap"><span class="tag">READY</span><h1>테스트할 사이트를 연결해 주세요.</h1><p>위 주소창에 URL을 입력한 뒤 왼쪽 기기와 회전 버튼을 눌러 반응형 변화를 확인할 수 있습니다.</p><div class="grid" aria-hidden="true"><span></span><span></span><span></span></div></main></body></html>';

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
    return url;
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
  registerWebMcpTools();
})();

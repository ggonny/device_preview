(function(){
  'use strict';

  const frameProfiles={
    neutral:{id:'neutral',top:14,right:14,bottom:14,left:14,radius:28,screenRadius:16,obstruction:'없음'},
    'iphone-notch':{id:'iphone-notch',top:10,right:10,bottom:10,left:10,radius:48,screenRadius:39,obstruction:'상단 노치'},
    'iphone-se':{id:'iphone-se',top:64,right:14,bottom:64,left:14,radius:38,screenRadius:4,obstruction:'화면 밖 홈 버튼·카메라'},
    'iphone-dynamic':{id:'iphone-dynamic',top:9,right:9,bottom:9,left:9,radius:49,screenRadius:41,obstruction:'다이내믹 아일랜드'},
    'android-hole':{id:'android-hole',top:10,right:10,bottom:10,left:10,radius:38,screenRadius:30,obstruction:'상단 펀치홀 카메라'},
    'flip8-cover':{id:'flip8-cover',top:12,right:12,bottom:12,left:12,radius:37,screenRadius:29,obstruction:'FlexWindow 듀얼 카메라'},
    'flip8-open':{id:'flip8-open',top:10,right:10,bottom:10,left:10,radius:39,screenRadius:31,obstruction:'상단 펀치홀·접힘선'},
    'flip8-flex':{id:'flip8-flex',top:10,right:10,bottom:16,left:10,radius:34,screenRadius:28,obstruction:'상단 펀치홀·하단 힌지'},
    'fold8-cover':{id:'fold8-cover',top:10,right:10,bottom:10,left:10,radius:36,screenRadius:28,obstruction:'상단 펀치홀 카메라'},
    'fold8-open':{id:'fold8-open',top:11,right:11,bottom:11,left:11,radius:30,screenRadius:21,obstruction:'우측 상단 카메라·접힘선'},
    'duo-outer':{id:'duo-outer',top:9,right:9,bottom:9,left:9,radius:42,screenRadius:34,obstruction:'상단 Center Stage 카메라'},
    'duo-inner':{id:'duo-inner',top:11,right:11,bottom:11,left:11,radius:31,screenRadius:23,obstruction:'언더 디스플레이 카메라·접힘선'},
    tablet:{id:'tablet',top:14,right:14,bottom:14,left:14,radius:27,screenRadius:14,obstruction:'없음'}
  };

  const browserProfiles={
    phone:{portrait:{top:76,bottom:52},landscape:{top:58,bottom:46}},
    compact:{portrait:{top:68,bottom:48},landscape:{top:52,bottom:42}},
    tablet:{portrait:{top:70,bottom:50},landscape:{top:60,bottom:46}}
  };

  const devices={
    'mobile-320':{name:'최소 모바일',note:'320px 최소폭·작은 화면 점검',frame:'neutral',browser:'compact',dpr:2,states:[{id:'default',label:'기본',width:320,height:568,diagonal:4,physicalWidth:640,physicalHeight:1136}]},
    'mobile-360':{name:'Android 기본',note:'Android 실무 최소폭 점검값',frame:'neutral',browser:'phone',dpr:3,states:[{id:'default',label:'기본',width:360,height:800,diagonal:6.1,physicalWidth:1080,physicalHeight:2400}]},
    'mobile-390':{name:'iPhone 기본',note:'390 × 844 기준 · 상단 노치 가림 포함',frame:'iphone-notch',browser:'phone',dpr:3,states:[{id:'default',label:'기본',width:390,height:844,diagonal:6.1,physicalWidth:1170,physicalHeight:2532}]},
    'mobile-430':{name:'대형 모바일',note:'430 × 932 기준 · 다이내믹 아일랜드 가림 포함',frame:'iphone-dynamic',browser:'phone',dpr:3,states:[{id:'default',label:'기본',width:430,height:932,diagonal:6.7,physicalWidth:1290,physicalHeight:2796}]},
    'iphone-se':{name:'iPhone SE',note:'홈 버튼·상하단 베젤을 포함한 iPhone SE형 프레임',frame:'iphone-se',browser:'compact',dpr:2,states:[{id:'default',label:'기본',width:375,height:667,diagonal:4.7,physicalWidth:750,physicalHeight:1334}]},
    'iphone-pro':{name:'iPhone 18 Pro',note:'402 × 873 CSS 화면 · 다이내믹 아일랜드 가림 포함',frame:'iphone-dynamic',browser:'phone',dpr:3,states:[{id:'default',label:'기본',width:402,height:873,diagonal:6.3,physicalWidth:1206,physicalHeight:2619}]},
    pixel:{name:'Google Pixel 10',note:'412 × 923 CSS 화면 · 중앙 펀치홀 가림 포함',frame:'android-hole',browser:'phone',dpr:2.625,states:[{id:'default',label:'기본',width:412,height:923,diagonal:6.3,physicalWidth:1080,physicalHeight:2424}]},
    'z-flip8':{name:'Galaxy Z Flip8',note:'Galaxy Z Flip8 공개 디스플레이 사양 기준',browser:'phone',dpr:3,states:[
      {id:'cover',label:'커버 화면',width:316,height:349,diagonal:4.1,physicalWidth:948,physicalHeight:1048,browser:'compact',frame:'flip8-cover',note:'FlexWindow 316 × 349 CSS 화면 · 듀얼 카메라 가림 포함'},
      {id:'open',label:'펼침',width:360,height:840,diagonal:6.9,physicalWidth:1080,physicalHeight:2520,frame:'flip8-open',hinge:'horizontal',hingeSize:3,note:'메인 화면 360 × 840 CSS 화면 · 펀치홀과 접힘선 포함'},
      {id:'flex',label:'Flex 90°',width:360,height:420,diagonal:6.9,physicalWidth:1080,physicalHeight:2520,scaleWidth:360,scaleHeight:840,browser:'compact',frame:'flip8-flex',hinge:'horizontal',hingeSize:8,hingePosition:99,note:'펼친 화면 상단 절반 점검용 360 × 420 · 실제 Flex Mode는 실기기 확인 필요'}
    ]},
    'z-fold':{name:'Galaxy Z Fold8',note:'Galaxy Z Fold8 공개 물리 해상도와 DPR 3 기준',browser:'phone',dpr:3,states:[
      {id:'cover',label:'커버 화면',width:416,height:657,diagonal:5.5,physicalWidth:1248,physicalHeight:1972,frame:'fold8-cover',note:'커버 화면 416 × 657 CSS 화면 · 펀치홀 포함'},
      {id:'open',label:'펼침',width:816,height:616,diagonal:7.6,physicalWidth:2448,physicalHeight:1848,browser:'tablet',frame:'fold8-open',hinge:'vertical',hingeSize:4,note:'메인 화면 816 × 616 CSS 화면 · 카메라와 접힘선 포함'}
    ]},
    'iphone-duo':{name:'iPhone Duo',note:'공식 물리 해상도와 DPR 3 기준',browser:'phone',dpr:3,states:[
      {id:'outer',label:'접힘 · 외부',width:466,height:678,diagonal:5.4,physicalWidth:1398,physicalHeight:2034,frame:'duo-outer',note:'외부 화면 466 × 678 CSS 화면 · Center Stage 카메라 가림 포함'},
      {id:'inner',label:'펼침 · 내부',width:890,height:626,diagonal:7.6,physicalWidth:2670,physicalHeight:1878,browser:'tablet',frame:'duo-inner',hinge:'vertical',hingeSize:3,note:'내부 화면 890 × 626 CSS 화면 · 중앙 접힘선 포함'}
    ]},
    'tablet-768':{name:'소형 태블릿',note:'모바일에서 태블릿으로 전환되는 경계 점검',frame:'tablet',browser:'tablet',dpr:2,states:[{id:'default',label:'기본',width:768,height:1024,diagonal:9.7,physicalWidth:1536,physicalHeight:2048}]},
    'tablet-1024':{name:'태블릿 가로',note:'1040px 전후 PC 전환 직전 점검',frame:'tablet',browser:'tablet',dpr:2,states:[{id:'default',label:'기본',width:1024,height:768,diagonal:9.7,physicalWidth:2048,physicalHeight:1536}]}
  };

  const elements={
    siteForm:document.getElementById('siteForm'),siteUrl:document.getElementById('siteUrl'),urlError:document.getElementById('urlError'),
    deviceButtons:Array.from(document.querySelectorAll('.device_btn')),currentDevice:document.getElementById('currentDevice'),currentMeta:document.getElementById('currentMeta'),
    foldControls:document.getElementById('foldControls'),stateList:document.getElementById('stateList'),viewportWidth:document.getElementById('viewportWidth'),
    viewportHeight:document.getElementById('viewportHeight'),applySize:document.getElementById('applySize'),sizeError:document.getElementById('sizeError'),
    addressBarToggle:document.getElementById('addressBarToggle'),bottomBarToggle:document.getElementById('bottomBarToggle'),
    rotateBtn:document.getElementById('rotateBtn'),refreshBtn:document.getElementById('refreshBtn'),scaleModeInputs:Array.from(document.querySelectorAll('input[name="scaleMode"]')),scaleValue:document.getElementById('scaleValue'),
    openLink:document.getElementById('openLink'),previewStage:document.getElementById('previewStage'),previewMount:document.getElementById('previewMount'),
    deviceShell:document.getElementById('deviceShell'),screenWrap:document.getElementById('screenWrap'),siteView:document.getElementById('siteView'),siteFrame:document.getElementById('siteFrame'),
    browserTop:document.getElementById('browserTop'),browserBottom:document.getElementById('browserBottom'),browserUrl:document.getElementById('browserUrl'),frameStatus:document.getElementById('frameStatus'),
    loadStatus:document.querySelector('.load_status'),presetNote:document.getElementById('presetNote'),viewportStatus:document.getElementById('viewportStatus')
  };

  let selectedDeviceId='mobile-390';
  let selectedStateId='default';
  let currentWidth=390;
  let currentHeight=844;
  let rotated=false;
  let scaleMode='device';
  let showAddressBar=true;
  let showBottomBar=true;
  let currentUrl='';
  let currentFrameProfile=frameProfiles['iphone-notch'];
  let currentFrameInsets={top:10,right:10,bottom:10,left:10};

  function getDevice(){return devices[selectedDeviceId]||null;}
  function getState(){
    const device=getDevice();
    return device?device.states.find(state=>state.id===selectedStateId)||device.states[0]:null;
  }
  function getOrientation(){return currentWidth>=currentHeight?'가로':'세로';}
  function setError(element,message){element.textContent=message;element.hidden=!message;}

  function getDpr(){
    const device=getDevice();
    const state=getState();
    return state&&state.dpr?state.dpr:device&&device.dpr?device.dpr:null;
  }

  function getPhysicalResolution(){
    const state=getState();
    if(!state)return null;
    const dpr=getDpr();
    let width=state.physicalWidth||dpr&&Math.round(state.width*dpr);
    let height=state.physicalHeight||dpr&&Math.round(state.height*dpr);
    if(!width||!height)return null;
    if(rotated){const previousWidth=width;width=height;height=previousWidth;}
    return{width,height};
  }

  function getPhysicalScale(){
    const state=getState();
    if(!state||!state.diagonal)return null;
    const width=state.scaleWidth||state.width;
    const height=state.scaleHeight||state.height;
    return 96*state.diagonal/Math.hypot(width,height);
  }

  function getBrowserMetrics(){
    const device=getDevice();
    const state=getState();
    const profileName=state&&state.browser||device&&device.browser||'phone';
    const profile=browserProfiles[profileName]||browserProfiles.phone;
    return currentWidth>=currentHeight?profile.landscape:profile.portrait;
  }

  function getSiteViewport(){
    const metrics=getBrowserMetrics();
    const top=showAddressBar?metrics.top:0;
    const bottom=showBottomBar?metrics.bottom:0;
    return{width:currentWidth,height:Math.max(80,currentHeight-top-bottom),top,bottom};
  }

  function getDisplayUrl(){
    if(!currentUrl)return'example.com';
    try{
      const url=new URL(currentUrl);
      const path=url.pathname==='/'?'':url.pathname;
      return(url.host+path).slice(0,64);
    }catch(error){return currentUrl;}
  }

  function updateBrowserChrome(){
    const viewport=getSiteViewport();
    elements.browserTop.hidden=!showAddressBar;
    elements.browserBottom.hidden=!showBottomBar;
    elements.browserUrl.textContent=getDisplayUrl();
    elements.screenWrap.style.setProperty('--browser-top-height',viewport.top+'px');
    elements.screenWrap.style.setProperty('--browser-bottom-height',viewport.bottom+'px');
    return viewport;
  }

  function syncScaleControls(){
    const deviceInput=elements.scaleModeInputs.find(input=>input.value==='device');
    const hasDeviceScale=Boolean(getPhysicalScale());
    if(deviceInput)deviceInput.disabled=!hasDeviceScale;
    if(scaleMode==='device'&&!hasDeviceScale)scaleMode='fit';
    elements.scaleModeInputs.forEach(input=>{input.checked=input.value===scaleMode;});
  }

  function rotateInsets(profile){
    return{top:profile.right,right:profile.bottom,bottom:profile.left,left:profile.top};
  }

  function updateFrame(state){
    const device=getDevice();
    const profile=frameProfiles[state&&state.frame||device&&device.frame]||frameProfiles.neutral;
    const landscape=currentWidth>=currentHeight;
    const insets=landscape?rotateInsets(profile):{top:profile.top,right:profile.right,bottom:profile.bottom,left:profile.left};
    currentFrameProfile=profile;
    currentFrameInsets=insets;
    elements.deviceShell.dataset.frame=profile.id;
    elements.deviceShell.dataset.orientation=landscape?'landscape':'portrait';
    elements.deviceShell.style.setProperty('--frame-top',insets.top+'px');
    elements.deviceShell.style.setProperty('--frame-right',insets.right+'px');
    elements.deviceShell.style.setProperty('--frame-bottom',insets.bottom+'px');
    elements.deviceShell.style.setProperty('--frame-left',insets.left+'px');
    elements.deviceShell.style.setProperty('--frame-radius',profile.radius+'px');
    elements.deviceShell.style.setProperty('--screen-radius',profile.screenRadius+'px');
  }

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

  function buildInitialPreview(){
    const content='<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;padding:clamp(20px,6vw,56px);min-height:100vh;display:grid;place-items:center;color:#233044;background:#f8fafc;font-family:system-ui,sans-serif}.wrap{width:min(100%,560px)}.tag{display:inline-block;padding:5px 9px;color:#0b5bc6;background:#e8f2ff;border-radius:999px;font-size:12px;font-weight:700}h1{margin:14px 0 8px;font-size:clamp(24px,8vw,42px);line-height:1.15;letter-spacing:-.04em}p{margin:0;color:#667085;font-size:15px;line-height:1.7}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:28px}.grid span{height:72px;background:linear-gradient(135deg,#d8e8ff,#edf5ff);border:1px solid #b8d3f6;border-radius:12px}@media(max-width:380px){.grid{grid-template-columns:1fr}.grid span{height:48px}}</style></head><body><main class="wrap"><span class="tag">READY</span><h1>테스트할 사이트를 연결해 주세요.</h1><p>위 주소창에 URL을 입력한 뒤 왼쪽 기기와 회전 버튼을 눌러 반응형 변화를 확인할 수 있습니다.</p><div class="grid" aria-hidden="true"><span></span><span></span><span></span></div></main></body></html>';
    elements.siteFrame.srcdoc=content;
  }

  function updateDeviceButtons(){
    elements.deviceButtons.forEach(button=>{
      const active=button.dataset.device===selectedDeviceId;
      button.classList.toggle('is_current',active);
      button.setAttribute('aria-pressed',String(active));
    });
  }

  function renderStates(){
    const device=getDevice();
    if(!device||device.states.length<2){elements.foldControls.hidden=true;elements.stateList.replaceChildren();return;}
    const fragment=document.createDocumentFragment();
    device.states.forEach(state=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='state_btn'+(state.id===selectedStateId?' is_current':'');
      button.dataset.state=state.id;
      button.textContent=state.label;
      button.setAttribute('aria-pressed',state.id===selectedStateId?'true':'false');
      fragment.appendChild(button);
    });
    elements.stateList.replaceChildren(fragment);
    elements.foldControls.hidden=false;
  }

  function updateHinge(state){
    let hinge=state&&state.hinge?state.hinge:'none';
    if(rotated&&hinge==='vertical')hinge='horizontal';
    else if(rotated&&hinge==='horizontal')hinge='vertical';
    elements.deviceShell.dataset.hinge=hinge;
    elements.deviceShell.dataset.shape=state&&state.shape?state.shape:'';
    elements.deviceShell.style.setProperty('--hinge-size',(state&&state.hingeSize?state.hingeSize:2)+'px');
    elements.deviceShell.style.setProperty('--hinge-position',(state&&state.hingePosition?state.hingePosition:50)+'%');
  }

  function updatePreview(options){
    const settings=options||{};
    const device=getDevice();
    const state=getState();
    elements.viewportWidth.value=currentWidth;
    elements.viewportHeight.value=currentHeight;
    elements.deviceShell.style.setProperty('--viewport-width',currentWidth+'px');
    elements.deviceShell.style.setProperty('--viewport-height',currentHeight+'px');
    updateFrame(state);
    const siteViewport=updateBrowserChrome();
    const physical=getPhysicalResolution();
    elements.currentDevice.textContent=device?device.name:'직접 설정';
    elements.currentMeta.textContent='화면 '+currentWidth+' × '+currentHeight+' · 사이트 '+siteViewport.width+' × '+siteViewport.height+(getDpr()?' · DPR '+getDpr():'')+' · '+getOrientation();
    elements.presetNote.textContent=(physical?'물리 '+physical.width+' × '+physical.height+' · ':'')+(state&&state.note?state.note:device?device.note:'직접 입력한 CSS 화면 · 기기 가림 없음');
    elements.siteFrame.title=(device?device.name:'직접 설정')+' 사이트 표시 영역 '+siteViewport.width+' × '+siteViewport.height+' 미리보기';
    updateHinge(state);
    updateScale();
    if(settings.announce!==false)elements.viewportStatus.textContent=(device?device.name:'직접 설정')+', 전체 화면 '+currentWidth+' × '+currentHeight+' 픽셀, 사이트 영역 '+siteViewport.width+' × '+siteViewport.height+' 픽셀, '+getOrientation()+', '+currentFrameProfile.obstruction+' 프레임으로 변경되었습니다.';
  }

  function selectDevice(deviceId,stateId){
    const device=devices[deviceId];
    if(!device)return false;
    selectedDeviceId=deviceId;
    selectedStateId=device.states.some(state=>state.id===stateId)?stateId:device.states[0].id;
    rotated=false;
    const state=getState();
    currentWidth=state.width;
    currentHeight=state.height;
    updateDeviceButtons();
    renderStates();
    updatePreview();
    savePreference();
    return true;
  }

  function selectState(stateId){
    const device=getDevice();
    const state=device&&device.states.find(item=>item.id===stateId);
    if(!state)return false;
    selectedStateId=stateId;
    rotated=false;
    currentWidth=state.width;
    currentHeight=state.height;
    renderStates();
    updatePreview();
    savePreference();
    return true;
  }

  function applyCustomSize(width,height){
    const nextWidth=Number(width);
    const nextHeight=Number(height);
    if(!Number.isInteger(nextWidth)||!Number.isInteger(nextHeight)||nextWidth<240||nextWidth>2560||nextHeight<240||nextHeight>2560){
      setError(elements.sizeError,'너비와 높이는 240~2560 사이의 정수로 입력해 주세요.');
      return false;
    }
    setError(elements.sizeError,'');
    selectedDeviceId='custom';
    selectedStateId='default';
    rotated=false;
    if(scaleMode==='device')scaleMode='fit';
    currentWidth=nextWidth;
    currentHeight=nextHeight;
    updateDeviceButtons();
    renderStates();
    updatePreview();
    saveDisplayPreference();
    return true;
  }

  function rotatePreview(){
    const previousWidth=currentWidth;
    currentWidth=currentHeight;
    currentHeight=previousWidth;
    rotated=!rotated;
    updatePreview();
    return getViewportInfo();
  }

  function updateScale(){
    syncScaleControls();
    const frameWidth=currentWidth+currentFrameInsets.left+currentFrameInsets.right;
    const frameHeight=currentHeight+currentFrameInsets.top+currentFrameInsets.bottom;
    let scale=1;
    if(scaleMode==='fit'){
      const availableWidth=Math.max(220,elements.previewStage.clientWidth-76);
      const availableHeight=Math.max(300,elements.previewStage.clientHeight-76);
      scale=Math.min(1,availableWidth/frameWidth,availableHeight/frameHeight);
      scale=Math.max(.18,scale);
    }else if(scaleMode==='device'){
      scale=getPhysicalScale()||1;
    }
    elements.deviceShell.style.setProperty('--preview-scale',String(scale));
    elements.previewMount.style.width=Math.round(frameWidth*scale)+'px';
    elements.previewMount.style.height=Math.round(frameHeight*scale)+'px';
    elements.scaleValue.textContent=Math.round(scale*100)+'%';
  }

  function loadUrl(value){
    let url;
    try{url=normalizeUrl(value);}catch(error){setError(elements.urlError,error.message);elements.siteUrl.focus();throw error;}
    setError(elements.urlError,'');
    currentUrl=url;
    elements.siteUrl.value=url;
    updateBrowserChrome();
    elements.siteFrame.removeAttribute('srcdoc');
    elements.loadStatus.classList.remove('is_loaded');
    elements.loadStatus.classList.add('is_loading');
    elements.frameStatus.textContent='사이트 불러오기를 요청했습니다.';
    elements.siteFrame.src=url;
    elements.refreshBtn.disabled=false;
    elements.openLink.href=url;
    elements.openLink.classList.remove('is_disabled');
    elements.openLink.removeAttribute('aria-disabled');
    elements.openLink.removeAttribute('tabindex');
    try{localStorage.setItem('viewportLabUrl',url);}catch(error){}
    return url;
  }

  function refreshPreview(){
    if(!currentUrl)return false;
    elements.loadStatus.classList.remove('is_loaded');
    elements.loadStatus.classList.add('is_loading');
    elements.frameStatus.textContent='미리보기를 새로고침하는 중입니다.';
    elements.siteFrame.src=currentUrl;
    return true;
  }

  function savePreference(){
    try{localStorage.setItem('viewportLabDevice',JSON.stringify({deviceId:selectedDeviceId,stateId:selectedStateId}));}catch(error){}
  }

  function saveDisplayPreference(){
    try{localStorage.setItem('viewportLabDisplay',JSON.stringify({scaleMode,showAddressBar,showBottomBar}));}catch(error){}
  }

  function restoreDisplayPreference(){
    try{
      const saved=JSON.parse(localStorage.getItem('viewportLabDisplay')||'null');
      if(saved&&['device','fit','actual'].includes(saved.scaleMode))scaleMode=saved.scaleMode;
      if(saved&&typeof saved.showAddressBar==='boolean')showAddressBar=saved.showAddressBar;
      if(saved&&typeof saved.showBottomBar==='boolean')showBottomBar=saved.showBottomBar;
    }catch(error){}
    elements.addressBarToggle.checked=showAddressBar;
    elements.bottomBarToggle.checked=showBottomBar;
    syncScaleControls();
  }

  function restorePreference(){
    try{
      const savedDevice=JSON.parse(localStorage.getItem('viewportLabDevice')||'null');
      if(savedDevice&&savedDevice.deviceId==='z-flip')savedDevice.deviceId='z-flip8';
      if(savedDevice&&devices[savedDevice.deviceId])selectDevice(savedDevice.deviceId,savedDevice.stateId);
      const savedUrl=localStorage.getItem('viewportLabUrl');
      if(savedUrl)elements.siteUrl.value=savedUrl;
    }catch(error){}
  }

  function getViewportInfo(){
    const device=getDevice();
    const siteViewport=getSiteViewport();
    return{deviceId:selectedDeviceId,device:device?device.name:'직접 설정',stateId:selectedStateId,screenWidth:currentWidth,screenHeight:currentHeight,viewportWidth:siteViewport.width,viewportHeight:siteViewport.height,dpr:getDpr(),physicalResolution:getPhysicalResolution(),scaleMode,showAddressBar,showBottomBar,orientation:currentWidth>=currentHeight?'landscape':'portrait',obstruction:currentFrameProfile.obstruction,url:currentUrl||null};
  }

  function registerWebMcpTools(){
    const context=document.modelContext;
    if(!context||typeof context.registerTool!=='function')return;
    const lifecycle=new AbortController();
    const register=tool=>{
      try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch(error){}
    };
    register({name:'load_preview',title:'사이트 미리보기 열기',description:'URL을 현재 반응형 테스트 뷰포트에 불러옵니다.',inputSchema:{type:'object',properties:{url:{type:'string'},deviceId:{type:'string',enum:Object.keys(devices)}},required:['url'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute(input){if(input.deviceId)selectDevice(input.deviceId);const url=loadUrl(String(input.url||''));return{...getViewportInfo(),url};}});
    register({name:'select_viewport',title:'기기 뷰포트 선택',description:'등록된 모바일·폴더블 기기와 화면 상태를 선택합니다.',inputSchema:{type:'object',properties:{deviceId:{type:'string',enum:Object.keys(devices)},stateId:{type:'string'}},required:['deviceId'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!selectDevice(input.deviceId,input.stateId))throw new Error('지원하지 않는 기기입니다.');return getViewportInfo();}});
    register({name:'set_custom_viewport',title:'직접 뷰포트 설정',description:'CSS 뷰포트 너비와 높이를 픽셀 단위로 직접 설정합니다.',inputSchema:{type:'object',properties:{width:{type:'integer',minimum:240,maximum:2560},height:{type:'integer',minimum:240,maximum:2560}},required:['width','height'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!applyCustomSize(input.width,input.height))throw new Error('뷰포트 범위가 올바르지 않습니다.');return getViewportInfo();}});
    register({name:'rotate_viewport',title:'뷰포트 회전',description:'현재 미리보기의 가로와 세로 방향을 전환합니다.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(){return rotatePreview();}});
    register({name:'read_viewport',title:'현재 뷰포트 확인',description:'현재 선택된 기기, 화면 크기, 방향, URL을 확인합니다.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(){return getViewportInfo();}});
    window.addEventListener('beforeunload',()=>lifecycle.abort(),{once:true});
  }

  elements.siteForm.addEventListener('submit',event=>{event.preventDefault();try{loadUrl(elements.siteUrl.value);}catch(error){}});
  elements.deviceButtons.forEach(button=>button.addEventListener('click',()=>selectDevice(button.dataset.device)));
  elements.stateList.addEventListener('click',event=>{const button=event.target.closest('.state_btn');if(button)selectState(button.dataset.state);});
  elements.applySize.addEventListener('click',()=>applyCustomSize(elements.viewportWidth.value,elements.viewportHeight.value));
  [elements.viewportWidth,elements.viewportHeight].forEach(input=>input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();elements.applySize.click();}}));
  elements.rotateBtn.addEventListener('click',rotatePreview);
  elements.refreshBtn.addEventListener('click',refreshPreview);
  elements.addressBarToggle.addEventListener('change',()=>{showAddressBar=elements.addressBarToggle.checked;updatePreview();saveDisplayPreference();});
  elements.bottomBarToggle.addEventListener('change',()=>{showBottomBar=elements.bottomBarToggle.checked;updatePreview();saveDisplayPreference();});
  elements.scaleModeInputs.forEach(input=>input.addEventListener('change',()=>{if(!input.checked)return;scaleMode=input.value;updateScale();saveDisplayPreference();elements.viewportStatus.textContent='미리보기 표시 배율이 '+elements.scaleValue.textContent+'로 변경되었습니다.';}));
  elements.siteFrame.addEventListener('load',()=>{if(!currentUrl||elements.siteFrame.getAttribute('src')!==currentUrl)return;elements.loadStatus.classList.remove('is_loading');elements.loadStatus.classList.add('is_loaded');elements.frameStatus.textContent='불러오기 요청이 완료되었습니다. 화면이 비어 있으면 iframe 차단 안내를 확인해 주세요.';});

  if('ResizeObserver'in window)new ResizeObserver(updateScale).observe(elements.previewStage);else window.addEventListener('resize',updateScale);
  buildInitialPreview();
  restoreDisplayPreference();
  renderStates();
  updatePreview({announce:false});
  restorePreference();
  registerWebMcpTools();
})();

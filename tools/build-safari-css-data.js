/* Safari(macOS) CSS 호환성 데이터 생성기 — Device Preview "Safari 호환성 검사" 용
 *
 * 입력: MDN browser-compat-data(BCD) 의 data.json (npm 패키지 @mdn/browser-compat-data, CC0-1.0)
 * 출력: ../safari-css-data.js  (window.DevicePreviewSafariCss = {...})
 *
 * 사용:
 *   npm pack @mdn/browser-compat-data          → mdn-browser-compat-data-<버전>.tgz
 *   tar -xzf mdn-browser-compat-data-<버전>.tgz → package/data.json
 *   node tools/build-safari-css-data.js package/data.json
 *
 * 뽑는 것(Safari 데스크톱 = BCD 의 "safari" 만, Safari iOS · Technology Preview 제외):
 *   versions : 출시된(retired · current) Safari 15 이상 버전 목록
 *   props    : css.properties.<속성>  +  css.properties.<속성>.<값 키워드>   ("속성" / "속성|값")
 *   at       : css.at-rules.<이름>                                         ("container" 등, @ 없이)
 *   funcs    : css.types 아래 함수 이름(clamp · oklch · color-mix · conic-gradient …)
 *   units    : css.types.length 의 단위(dvh · cqw · lh …)
 * 각 항목 값은 Safari 지원 문장 배열: [{a:version_added, r:version_removed, p:prefix, n:alternative_name, x:partial, f:flags}]
 * (값이 없는 키는 생략). 문서 설명(notes) 은 넣지 않는다.
 */
const fs=require('fs'),path=require('path');
const input=process.argv[2];
if(!input){console.error('사용: node tools/build-safari-css-data.js <BCD data.json 경로>');process.exit(1);}
const bcd=JSON.parse(fs.readFileSync(input,'utf8'));
const KEY=/^-?[a-z][a-z0-9-]*$/;   /* 값 글자로 판정할 수 있는 키(키워드 · 함수 · 단위 이름) — flex_context 같은 문맥 키는 제외 */

function statements(node){
  const support=node&&node.__compat&&node.__compat.support&&node.__compat.support.safari;
  if(support===undefined)return null;
  const list=Array.isArray(support)?support:[support];
  return list.map(s=>{
    const o={a:s.version_added};
    if(s.version_removed)o.r=s.version_removed;
    if(s.prefix)o.p=s.prefix;
    if(s.alternative_name)o.n=s.alternative_name;
    if(s.partial_implementation)o.x=1;
    if(s.flags)o.f=1;
    return o;
  });
}

const rel=bcd.browsers.safari.releases;
const num=v=>v.split('.').map(Number);
const versions=Object.keys(rel).filter(v=>['retired','current'].includes(rel[v].status)&&num(v)[0]>=15)
  .sort((a,b)=>{const x=num(a),y=num(b);return x[0]-y[0]||(x[1]||0)-(y[1]||0);});
const current=Object.keys(rel).find(v=>rel[v].status==='current');

const props={};
for(const [name,node] of Object.entries(bcd.css.properties)){
  const s=statements(node);if(s)props[name]=s;
  for(const [sub,child] of Object.entries(node)){
    if(sub==='__compat'||!KEY.test(sub))continue;
    const cs=statements(child);if(cs)props[name+'|'+sub]=cs;
  }
}
const at={};
for(const [name,node] of Object.entries(bcd.css['at-rules'])){const s=statements(node);if(s)at[name]=s;}

const funcs={};
(function walk(node,depth){
  for(const [key,child] of Object.entries(node)){
    if(key==='__compat'||!child||typeof child!=='object')continue;
    if(KEY.test(key)&&!(key in funcs)){const s=statements(child);if(s)funcs[key]=s;}
    if(depth<4)walk(child,depth+1);
  }
})(bcd.css.types,0);

const units={};
const UNIT_GROUPS={viewport_percentage_units_dynamic:['dvh','dvw','dvi','dvb','dvmin','dvmax'],viewport_percentage_units_small:['svh','svw','svi','svb','svmin','svmax'],viewport_percentage_units_large:['lvh','lvw','lvi','lvb','lvmin','lvmax'],container_query_length_units:['cqw','cqh','cqi','cqb','cqmin','cqmax']};
for(const [key,node] of Object.entries(bcd.css.types.length)){
  if(key==='__compat')continue;
  const s=statements(node);if(!s)continue;
  (UNIT_GROUPS[key]||(KEY.test(key)||key==='Q'?[key]:[])).forEach(u=>{units[u]=s;});
}

const data={
  source:{package:'@mdn/browser-compat-data',version:bcd.__meta.version,timestamp:bcd.__meta.timestamp,license:'CC0-1.0',browser:'safari (macOS)'},
  versions,current,props,at,funcs,units
};
const out=path.join(__dirname,'..','safari-css-data.js');
const body='/* 자동 생성 파일 — 직접 고치지 말 것. tools/build-safari-css-data.js 로 다시 만든다.\n'+
  ' * 출처: MDN browser-compat-data '+bcd.__meta.version+' ('+bcd.__meta.timestamp.slice(0,10)+', CC0-1.0) — Safari(macOS) CSS 지원 데이터만 추출 */\n'+
  'window.DevicePreviewSafariCss='+JSON.stringify(data)+';\n';
fs.writeFileSync(out,body);
console.log('versions',versions.length,versions[0]+'~'+versions[versions.length-1],'current',current,'| props',Object.keys(props).length,'at',Object.keys(at).length,'funcs',Object.keys(funcs).length,'units',Object.keys(units).length,'| bytes',Buffer.byteLength(body));

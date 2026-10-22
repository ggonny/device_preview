/* Device Preview Scroll Bridge (content script, 2026-10-16)
 *
 * 하는 일: Device Preview(부모 페이지) 의 다중 비교 카드 iframe 안에서, 이 문서의 스크롤 비율만 부모와 주고받는다.
 *   ratio = scrollTop / (scrollHeight − clientHeight)  — app.js getScrollRatio() 와 같은 계산(document.scrollingElement 기준)
 * 하지 않는 일: 페이지 본문 · 입력값 · 속성 · URL 을 읽거나 보내지 않는다. 저장소 · 네트워크 · 백그라운드 없음.
 *
 * 평소에는 아무것도 하지 않는다. 아래 조건을 모두 만족하는 hello 를 받은 문서에서만 스크롤 리스너를 붙인다.
 *   - 이 문서가 최상위 창의 바로 아래 iframe(부모 = 최상위)
 *   - 메시지 출처 창이 부모(event.source === window.parent)
 *   - 부모 origin 이 로컬 개발 서버(localhost · 127.0.0.1 · [::1], Live Server 등)
 *   - 메시지 형식(type · session · view · nonce) 이 맞음
 */
(() => {
  if (window === window.top) return;   /* 최상위 페이지에서는 동작하지 않는다 */

  const PREFIX = 'device-preview:scroll-bridge:';
  const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
  let link = null;          /* { session, view, nonce, origin } — hello 를 받은 뒤에만 */
  let lastApplied = null;   /* 프로그램이 넣은 위치(되돌림 루프 방지) */
  let ignoreUntil = 0;      /* 프로그램 스크롤 뒤 150ms 동안 무시 */
  let pending = false;

  const isToken = value => typeof value === 'string' && value.length > 0 && value.length <= 64;
  const clamp = value => (typeof value === 'number' && Number.isFinite(value)) ? Math.min(1, Math.max(0, value)) : 0;

  function isAllowedParent(origin) {
    try {
      const url = new URL(origin);
      return /^https?:$/.test(url.protocol) && LOCAL_HOSTS.includes(url.hostname);
    } catch (error) {
      return false;
    }
  }

  function scrollRoot() {
    return document.scrollingElement || document.documentElement;
  }

  function getRatio() {
    const doc = scrollRoot();
    if (!doc) return { x: 0, y: 0 };
    const maxY = doc.scrollHeight - doc.clientHeight;
    const maxX = doc.scrollWidth - doc.clientWidth;
    return { y: maxY > 0 ? doc.scrollTop / maxY : 0, x: maxX > 0 ? doc.scrollLeft / maxX : 0 };
  }

  function send(type, extra) {
    if (!link) return;
    window.parent.postMessage(Object.assign({ type: PREFIX + type, session: link.session, view: link.view, nonce: link.nonce }, extra), link.origin);
  }

  function applyRatio(ratio) {
    const doc = scrollRoot();
    if (!doc) return;
    const maxY = Math.max(0, doc.scrollHeight - doc.clientHeight);
    const maxX = Math.max(0, doc.scrollWidth - doc.clientWidth);
    const top = Math.round(clamp(ratio.y) * maxY);
    const left = Math.round(clamp(ratio.x) * maxX);
    lastApplied = { top, left };
    ignoreUntil = performance.now() + 150;
    window.scrollTo(left, top);
  }

  function onScroll() {
    if (!link) return;
    const doc = scrollRoot();
    if (lastApplied && doc && doc.scrollTop === lastApplied.top && doc.scrollLeft === lastApplied.left) return;   /* 프로그램 스크롤의 메아리 */
    if (performance.now() < ignoreUntil) return;
    if (pending) return;
    pending = true;
    setTimeout(() => { pending = false; send('scroll', { ratio: getRatio() }); }, 16);   /* 16ms 단위로 묶어서 전달(app.js 와 같은 간격) */
  }

  window.addEventListener('message', event => {
    if (event.source !== window.parent || window.parent !== window.top) return;
    const data = event.data;
    if (!data || typeof data !== 'object' || typeof data.type !== 'string' || !data.type.startsWith(PREFIX)) return;
    if (!isAllowedParent(event.origin)) return;
    const type = data.type.slice(PREFIX.length);
    if (type === 'hello') {
      if (!isToken(data.session) || !isToken(data.view) || !isToken(data.nonce)) return;
      const first = !link;
      link = { session: data.session, view: data.view, nonce: data.nonce, origin: event.origin };
      if (first) window.addEventListener('scroll', onScroll, { passive: true });
      send('ready', { ratio: getRatio() });
      return;
    }
    if (!link || data.session !== link.session || data.view !== link.view || data.nonce !== link.nonce || event.origin !== link.origin) return;
    if (type === 'apply' && data.ratio && typeof data.ratio === 'object') applyRatio(data.ratio);
  });
})();

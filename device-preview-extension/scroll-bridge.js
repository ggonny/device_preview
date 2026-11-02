/* Device Preview Scroll Bridge (content script, 2026-10-16)
 *
 * 하는 일: Device Preview(부모 페이지) 의 다중 비교 카드 iframe 안에서, 이 문서의 스크롤 비율만 부모와 주고받는다.
 *   ratio = scrollTop / (scrollHeight − clientHeight)  — app.js getScrollRatio() 와 같은 계산(document.scrollingElement 기준)
 *   1.1.0(2026-10-22): 사용자가 스크롤한 내부 overflow 요소도 같은 비율로 주고받는다(targetType 'element' + tag/id/class 로 만든 식별자).
 *   1.2.0(2026-10-22): 페이지 이동 동기화 — 부모가 watch 를 켠 동안 이 문서의 현재 URL 을 알리고, 부모가 보낸 같은 origin URL 로 이동한다.
 * 하지 않는 일: 페이지 본문 · 입력값 · 속성을 읽거나 보내지 않는다(URL 은 페이지 이동 동기화에만 쓰고 저장하지 않음). 저장소 · 네트워크 · 백그라운드 없음.
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

  /* ---- 내부 overflow 요소 스크롤(2026-10-22) — app.js 의 같은 이름 함수와 같은 규칙 ----
   * 실제로 스크롤된 요소만(capture 리스너), 식별은 고유 id → 고유 tag.class → 형제 중 하나로만 맞는 제한 구조 path.
   * tag / id / class 외의 내용은 읽지 않는다. 하나로 정해지지 않으면 보내지 않고, 받은 key 로 못 찾으면 적용하지 않는다. */
  const KEY_DEPTH = 8;
  const KEY_CLASSES = 4;
  const KEY_NAME = /^-?[A-Za-z_][\w-]{0,63}$/;
  const KEY_TAG = /^[a-z][a-z0-9-]{0,31}$/;
  const KEY_STATE = /^(is|has)[-_]/;
  const elementApplied = new WeakMap();   /* element → { top, left, until } */
  const elementPending = new WeakSet();

  const keyStep = el => ({ tag: el.localName, cls: Array.from(el.classList).filter(name => KEY_NAME.test(name) && !KEY_STATE.test(name)).slice(0, KEY_CLASSES) });
  const keySelector = step => step.tag + step.cls.map(name => '.' + CSS.escape(name)).join('');
  function uniqueById(id) {
    const list = document.querySelectorAll('#' + CSS.escape(id));
    return list.length === 1 ? list[0] : null;
  }
  function uniqueChild(parent, step) {
    const selector = keySelector(step);
    const list = Array.from(parent.children).filter(child => child.matches(selector));
    return list.length === 1 ? list[0] : null;
  }

  function sanitizeKey(key) {
    const isName = value => typeof value === 'string' && KEY_NAME.test(value);
    const toStep = step => step && typeof step === 'object' && typeof step.tag === 'string' && KEY_TAG.test(step.tag)
      && Array.isArray(step.cls) && step.cls.length <= KEY_CLASSES && step.cls.every(isName) ? { tag: step.tag, cls: step.cls.slice() } : null;
    if (!key || typeof key !== 'object') return null;
    if ('id' in key) return isName(key.id) ? { id: key.id } : null;
    if ('sel' in key) { const step = toStep(key.sel); return step ? { sel: step } : null; }
    if (!Array.isArray(key.path) || key.path.length > KEY_DEPTH || !(key.anchor === null || isName(key.anchor))) return null;
    const path = key.path.map(toStep);
    return path.every(Boolean) ? { anchor: key.anchor, path } : null;
  }

  function makeKey(el) {
    const isUniqueId = node => node.id && KEY_NAME.test(node.id) && uniqueById(node.id) === node;
    try {
      if (isUniqueId(el)) return { id: el.id };
      const own = keyStep(el);
      const list = document.querySelectorAll(keySelector(own));
      if (list.length === 1 && list[0] === el) return sanitizeKey({ sel: own });
      const path = [];
      let node = el;
      while (node !== document.body) {
        const parent = node.parentElement;
        if (!parent || path.length >= KEY_DEPTH) return null;
        const step = keyStep(node);
        if (uniqueChild(parent, step) !== node) return null;
        path.unshift(step);
        node = parent;
        if (node !== document.body && isUniqueId(node)) return sanitizeKey({ anchor: node.id, path });
      }
      return sanitizeKey({ anchor: null, path });
    } catch (error) {
      return null;
    }
  }

  function resolveKey(key) {
    try {
      if (key.id) return uniqueById(key.id);
      if (key.sel) { const list = document.querySelectorAll(keySelector(key.sel)); return list.length === 1 ? list[0] : null; }
      let node = key.anchor ? uniqueById(key.anchor) : document.body;
      for (const step of key.path) {
        if (!node) return null;
        node = uniqueChild(node, step);
      }
      return node;
    } catch (error) {
      return null;
    }
  }

  function getElementRatio(el) {
    const maxY = el.scrollHeight - el.clientHeight;
    const maxX = el.scrollWidth - el.clientWidth;
    return { y: maxY > 0 ? el.scrollTop / maxY : null, x: maxX > 0 ? el.scrollLeft / maxX : null };   /* 스크롤 가능한 축만(불가 축 = null) */
  }

  function applyElement(target, ratio) {
    const key = sanitizeKey(target);
    const el = key && resolveKey(key);
    if (!el || el === scrollRoot() || el === document.documentElement) return;   /* 못 찾으면 건너뜀(문서에 대신 적용하지 않음) */
    /* 전달되지 않은 축(null) 은 현재 위치 유지 */
    const top = typeof ratio.y !== 'number' ? el.scrollTop : Math.round(clamp(ratio.y) * Math.max(0, el.scrollHeight - el.clientHeight));
    const left = typeof ratio.x !== 'number' ? el.scrollLeft : Math.round(clamp(ratio.x) * Math.max(0, el.scrollWidth - el.clientWidth));
    if (Math.abs(el.scrollTop - top) < 1 && Math.abs(el.scrollLeft - left) < 1) return;   /* 이미 그 위치 */
    elementApplied.set(el, { top, left, until: performance.now() + 150 });
    el.scrollTo(left, top);
  }

  function onElementScroll(event) {
    if (!link) return;
    const el = event.target;
    if (!el || el.nodeType !== 1 || el === scrollRoot() || el === document.documentElement) return;   /* 문서 스크롤은 onScroll */
    const applied = elementApplied.get(el);
    if (applied) {
      if (Math.abs(el.scrollTop - applied.top) < 1 && Math.abs(el.scrollLeft - applied.left) < 1) { elementApplied.delete(el); return; }   /* 메아리를 받으면 기록을 지움 */
      if (performance.now() < applied.until) return;
    }
    if (elementPending.has(el)) return;
    elementPending.add(el);
    setTimeout(() => {
      elementPending.delete(el);
      if (!el.isConnected) return;
      const key = makeKey(el);
      const ratio = getElementRatio(el);
      if (key && (ratio.x !== null || ratio.y !== null)) send('scroll', { targetType: 'element', target: key, ratio });
    }, 16);
  }

  function onScroll() {
    if (!link) return;
    const doc = scrollRoot();
    if (lastApplied && doc && doc.scrollTop === lastApplied.top && doc.scrollLeft === lastApplied.left) return;   /* 프로그램 스크롤의 메아리 */
    if (performance.now() < ignoreUntil) return;
    if (pending) return;
    pending = true;
    setTimeout(() => { pending = false; send('scroll', { targetType: 'document', ratio: getRatio() }); }, 16);   /* 16ms 단위로 묶어서 전달(app.js 와 같은 간격) */
  }

  /* ---- 페이지 이동 동기화(1.2.0, 2026-10-22) ----
   * watch: 부모가 켜 둔 동안만 이 문서의 location.href 를 250ms 마다 비교해 바뀌면 알린다(pushState · replaceState · hash · 뒤로/앞으로).
   *        새 문서로 바뀌는 이동은 새 문서의 READY 가 url 을 알린다. 페이지 본문 · 입력값은 읽지 않고 URL 만 보낸다.
   * navigate: 부모가 보낸 URL 이 이 문서와 같은 origin 일 때만 location.replace(브라우저 기본 이동 — hash 만 다르면 같은 문서 안 이동, 탭 기록을 늘리지 않아 뒤로/앞으로가 사용자가 이동한 카드 기준으로 동작). */
  let watchTimer = 0;
  let watchedUrl = '';
  function setUrlWatch(on) {
    if (on && !watchTimer) {
      watchedUrl = location.href;
      send('location', { url: watchedUrl });   /* 켤 때 지금 주소 = 부모의 기준값 */
      watchTimer = setInterval(() => {
        const url = location.href;
        if (url === watchedUrl) return;
        watchedUrl = url;
        send('location', { url });
      }, 250);
    } else if (!on && watchTimer) {
      clearInterval(watchTimer);
      watchTimer = 0;
    }
  }
  function navigateTo(value) {
    if (typeof value !== 'string' || value.length > 8192) return;
    let url;
    try { url = new URL(value); } catch (error) { return; }
    if (!/^https?:$/.test(url.protocol) || url.origin !== location.origin || url.href === location.href) return;
    location.replace(url.href);
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
      if (first) {
        window.addEventListener('scroll', onScroll, { passive: true });
        document.addEventListener('scroll', onElementScroll, { capture: true, passive: true });   /* 요소 scroll 은 버블링되지 않아 capture 로 받는다 */
      }
      /* element · navigate 지원을 알려야 부모가 요소 적용 · 페이지 이동을 보낸다. url = 이 문서의 현재 주소(페이지 이동 동기화용) */
      send('ready', { ratio: getRatio(), features: { element: true, navigate: true }, url: location.href });
      return;
    }
    if (!link || data.session !== link.session || data.view !== link.view || data.nonce !== link.nonce || event.origin !== link.origin) return;
    if (type === 'watch') { setUrlWatch(data.navigate === true); return; }
    if (type === 'navigate') { navigateTo(data.url); return; }
    if (type !== 'apply' || !data.ratio || typeof data.ratio !== 'object') return;
    if (data.targetType === 'element') applyElement(data.target, data.ratio);
    else applyRatio(data.ratio);
  });
})();

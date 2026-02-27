(() => {
  // --- roda só na tela de busca e evita múltiplas execuções ---
  if (!/\/maps\/search\//.test(location.pathname)) return;
  if (window.__gmapsExtractorRunning) return;
  window.__gmapsExtractorRunning = true;

  const log = (...a) => console.log('%c[GMaps Extractor]', 'color:#10b981;font-weight:700', ...a);
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const visible = (el) => !!el && el.offsetWidth > 0 && el.offsetHeight > 0;
  log('content.js iniciado em /maps/search/.');

  // ---------- helpers gerais ----------
  const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || '';
  const onlyDigits = (s) => (s || '').replace(/[^\d]/g, '');
  function formatBRPhone(raw){
    let d = onlyDigits(raw);
    if (d.startsWith('55') && (d.length === 12 || d.length === 13)) d = d.slice(2);
    if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return d;
  }
  function waitForAny(selectors = [], timeout = 4000) {
    return new Promise((resolve) => {
      const start = Date.now();
      (function tick(){
        for (const sel of selectors) { const el = document.querySelector(sel); if (el) return resolve(el); }
        if (Date.now() - start >= timeout) return resolve(null);
        setTimeout(tick, 120);
      })();
    });
  }

  // ---------- storage ----------
  const getWebhook = () => new Promise((resolve) => {
    try { chrome.storage?.local?.get('gmaps_extractor_webhook', (res) => resolve(res?.gmaps_extractor_webhook || '')); }
    catch { resolve(''); }
  });
  const setWebhook = (url) => new Promise((resolve) => {
    try { chrome.storage?.local?.set({ gmaps_extractor_webhook: url }, () => resolve(true)); }
    catch { resolve(false); }
  });
  const getLeads = () => new Promise((resolve) => {
    try { chrome.storage?.local?.get('gmaps_leads', (res) => resolve(Array.isArray(res?.gmaps_leads) ? res.gmaps_leads : [])); }
    catch { resolve([]); }
  });
  const setLeads = (arr) => new Promise((resolve) => {
    try { chrome.storage?.local?.set({ gmaps_leads: arr }, () => resolve(true)); }
    catch { resolve(false); }
  });

  // ---------- achar painel + scroll ----------
  function findScrollableFromFeed() {
    const feed = document.querySelector('#pane div[role="feed"], div[role="feed"]');
    if (!feed) return null;
    let p = feed;
    for (let i = 0; i < 6 && p; i++) {
      const cs = getComputedStyle(p);
      const scrollable = p.scrollHeight > p.clientHeight + 10 || /(auto|scroll)/.test(cs.overflowY);
      if (scrollable && visible(p)) return p;
      p = p.parentElement;
    }
    return null;
  }
  function findByCandidates() {
    const sels = ['#pane .m6QErb.DxyBCb', '#pane .m6QErb', 'div[role="feed"]'];
    for (const sel of sels) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        const cs = getComputedStyle(el);
        const scrollable = el.scrollHeight > el.clientHeight + 10 || /(auto|scroll)/.test(cs.overflowY);
        if (scrollable && visible(el)) return el;
      }
    }
    return null;
  }
  function backToTopBtn() {
    return document.querySelector('#pane button[aria-label*="Voltar ao início" i], #pane button[aria-label*="Back to top" i]');
  }
  function isLoading() {
    return !!document.querySelector('#pane [role="progressbar"], #pane [aria-busy="true"], #pane svg[aria-label*="Carregando" i], #pane svg[aria-label*="Loading" i]');
  }
  async function waitPaneAndPanel() {
    for (let i = 0; i < 80; i++) { if (document.querySelector('#pane')) break; await sleep(250); }
    for (let i = 0; i < 140; i++) {
      const p = findScrollableFromFeed() || findByCandidates();
      if (p) return p;
      await sleep(250);
    }
    return null;
  }
  async function autoScrollAll(panel) {
    let lastHeight = 0, stableRounds = 0;
    const step = () => panel.scrollBy(0, Math.max(400, panel.clientHeight * 0.9));
    const clickMore = () => {
      const b = document.querySelector('#pane button[aria-label*="Mais" i], #pane button[aria-label*="More" i], #pane button[jsaction*="pane.results.moreResults"]');
      if (b && !b.disabled) b.click();
    };

    for (let round = 0; round < 480; round++) {
      if (visible(backToTopBtn())) { log('Detectei "Voltar ao início" → fim do feed.'); break; }
      step(); clickMore(); await sleep(380);
      if (isLoading()) { let w = 0; while (isLoading() && w < 14) { await sleep(260); w++; } }
      const h = panel.scrollHeight;
      if (h <= lastHeight + 5) { stableRounds++; log(`scroll estável (${stableRounds}/10)`); if (stableRounds >= 10) break; }
      else { stableRounds = 0; }
      lastHeight = h;
    }
    panel.scrollTop = panel.scrollHeight;
    log('Auto-scroll concluído.');
  }

  // ---------- coleta de HREFs dos cards (ignora patrocinados) ----------
  function collectFeedHrefs(panel) {
    const anchors = Array.from(panel.querySelectorAll('a.hfpxzc[href*="/maps/place/"]'));
    const fall    = Array.from(panel.querySelectorAll('div[role="article"] a[href*="/maps/place/"]'));
    const all = [...anchors, ...fall];
    const isAd = (el) =>
      el.closest('[data-result-ad="1"], [jsaction*="ad"]') ||
      Array.from(el.closest('div')?.querySelectorAll('span, div') || []).some(n => /Patrocinado/i.test(n.textContent || ''));
    const seen = new Set(), hrefs = [];
    for (const a of all) {
      const href = a.href;
      if (!href || seen.has(href)) continue;
      if (isAd(a)) continue;
      seen.add(href);
      hrefs.push(href);
    }
    return hrefs;
  }

  // ---------- helpers de extração (página do perfil) ----------
  function getPhone() {
    // 1) <a href="tel:..."> (texto e href)
    const a = document.querySelector('#pane a[href^="tel:"]');
    if (a) {
      const txt = (a.textContent || '').trim();
      if (txt) {
        const m = txt.match(/^\(\d{2}\)\s*\d{4,5}-\d{4}$/);
        if (m) return m[0];
      }
      const rawHref = decodeURIComponent((a.getAttribute('href') || '').replace(/^tel:/, ''));
      const fmtHref = formatBRPhone(rawHref);
      if (fmtHref) return fmtHref;
    }
    // 2) Botão com data-item-id "phone..."
    const btn = document.querySelector('#pane button[data-item-id^="phone"], #pane div[role="button"][data-item-id^="phone"]');
    if (btn) {
      const di = btn.getAttribute('data-item-id') || '';
      let raw = di.split(':').slice(-1)[0];
      let fmt = formatBRPhone(raw);
      if (fmt) return fmt;
      const digits = onlyDigits(di);
      if (digits) { fmt = formatBRPhone(digits); if (fmt) return fmt; }
    }
    // 3) Linhas de info (igual ao Python)
    const blocks = Array.from(document.querySelectorAll('#pane div.Io6YTe.fontBodyMedium.kR99db.fdkmkc'))
      .map(d => (d.textContent || '').trim())
      .filter(Boolean);
    for (const t of blocks) {
      const m = t.match(/^\(\d{2}\)\s*\d{4,5}-\d{4}$/);
      if (m) return m[0];
    }
    // 4) Fallback no texto da página (igual ao Python)
    const bodyText = document.body.innerText || document.body.textContent || '';
    const found = bodyText.match(/\(\d{2}\)\s*\d{4,5}-\d{4}/);
    return found ? found[0] : '';
  }

  function getAddress() {
    const d1 = getText('button[data-item-id="address"] div[aria-hidden="true"]');
    if (d1) return d1;
    const blocks = Array.from(document.querySelectorAll('div.Io6YTe.fontBodyMedium.kR99db.fdkmkc')).map(d => d.textContent.trim());
    for (const t of blocks) { if (t.includes(',') && /\d/.test(t) && !/^localizado/i.test(t)) return t; }
    return '';
  }

  function getWebsite() {
    const direct = document.querySelector('a[data-item-id="authority"], button[data-item-id="authority"] ~ a[href^="http"]');
    if (direct?.href) return direct.href;
    const bad = /(google|whatsapp|wa\.me|googleusercontent|support\.google)/i;
    const a = Array.from(document.querySelectorAll('a[href^="http"]')).find(x => !bad.test(x.href) && !/\/maps\//.test(x.href));
    return a?.href || '';
  }

  // rating e reviews priorizando EXATAMENTE os seletores do Python
  const getRating = () => {
    const el = document.querySelector("div.F7nice span[aria-hidden='true']");
    if (el && el.textContent) return el.textContent.trim();
    const ariaNode = document.querySelector('#pane [aria-label*="estrela" i], #pane [aria-label*="classifica" i], #pane [aria-label*="rating" i]');
    if (ariaNode) {
      const m = (ariaNode.getAttribute('aria-label') || '').match(/(\d+[,.]\d+)/);
      if (m) return m[1].replace(',', '.').replace(/\.0$/, '');
    }
    const near = document.querySelector('#pane div.F7nice') || document.querySelector('#pane [data-review-id], #pane [aria-label*="avalia" i]');
    if (near) {
      const m = (near.textContent || '').match(/(\d+[,.]\d+)/);
      if (m) return m[1].replace(',', '.');
    }
    return '';
  };

  const getReviews = () => {
    let el = document.querySelector("div.F7nice span[aria-label$='avaliações']");
    if (!el) el = document.querySelector("div.F7nice span[aria-label$='avaliações' i]");
    if (el) {
      const lbl = el.getAttribute('aria-label') || el.textContent || '';
      const digits = lbl.replace(/\D/g, '');
      if (digits) return digits;
    }
    let n = document.querySelector('#pane [aria-label*="avalia" i], #pane [aria-label*="review" i]');
    if (n) {
      const lbl = n.getAttribute('aria-label') || n.textContent || '';
      const digits = lbl.replace(/\D/g, '');
      if (digits) return digits;
    }
    const near = document.querySelector('#pane div.F7nice') || document.querySelector('#pane [data-review-id]');
    if (near) {
      const m = (near.textContent || '').match(/\(?\b\d{1,6}\b\)?/);
      if (m) return m[0].replace(/\D/g, '');
    }
    return '';
  };

  const getEspecial = () => Array.from(document.querySelectorAll('button.DkEaL'))
    .map(b => b.textContent.trim()).filter(Boolean).join(', ');

  // aguarda troca do cabeçalho ao abrir um perfil
  function waitPlaceHeaderChanged(prev, timeout = 15000) {
    return new Promise((resolve) => {
      const start = Date.now();
      const obs = new MutationObserver(() => {
        const name = getText('h1.DUwDvf');
        if (name && name !== prev) { obs.disconnect(); resolve(name); }
        if (Date.now() - start > timeout) { obs.disconnect(); resolve(getText('h1.DUwDvf')); }
      });
      obs.observe(document.body, { subtree: true, childList: true, characterData: true });
    });
  }

  async function gotoAndExtract(href, idx) {
    const prev = getText('h1.DUwDvf');
    history.pushState(null, '', href);
    window.dispatchEvent(new Event('popstate'));
    await waitPlaceHeaderChanged(prev);

    await waitForAny([
      "div.F7nice span[aria-hidden='true']",
      "div.F7nice span[aria-label$='avaliações']",
      '#pane a[href^="tel:"]',
      '#pane button[data-item-id="address"]',
      '#pane [aria-label*="avalia" i]'
    ], 3200);

    await sleep(200);

    const lead = {
      idx,
      nome_empresa: getText('h1.DUwDvf'),
      telefone: getPhone(),
      endereco: getAddress(),
      website: getWebsite(),
      rating: getRating(),
      reviews: getReviews(),
      especialidades: getEspecial()
    };
    log(`[${idx}]`, lead.nome_empresa, '— ⭐', lead.rating, '—', lead.reviews, 'reviews');
    return lead;
  }

  // ---------- overlays (apenas no Maps) ----------
  function ensureOverlayCSS() {
    if (document.getElementById('gmaps-extractor-style')) return;
    const css = `
      .gmapsx-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;z-index:999999;}
      .gmapsx-modal{width:min(520px,94vw);background:#151923;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:18px;box-shadow:0 30px 80px rgba(0,0,0,.5);color:#e7ecf3;font:500 14px/1.45 Inter,system-ui,-apple-system,Segoe UI,Roboto;}
      .gmapsx-modal header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
      .gmapsx-modal h3{margin:0;font-size:18px}
      .gmapsx-modal .close{border:none;background:transparent;color:#9aa4b2;font-size:22px;cursor:pointer}
      .gmapsx-modal .body{padding:8px 2px}
      .gmapsx-modal label{display:block;font-size:12px;color:#9aa4b2;margin:0 0 6px 2px}
      .gmapsx-modal input[type="text"]{width:100%;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:#0e1118;color:#e7ecf3;outline:none}
      .gmapsx-modal .actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
      .gmapsx-btn{cursor:pointer;border:1px solid rgba(255,255,255,.12);background:linear-gradient(225deg, rgba(240,242,255,.18) 5%, rgba(255,255,255,.08) 43%, rgba(255,255,255,.03) 68%);color:#fff;padding:10px 14px;border-radius:999px;font-weight:700}
      .gmapsx-btn.primary{background:linear-gradient(225deg, rgba(82,189,133,.9), rgba(45,212,191,.85));border-color:transparent}
      .gmapsx-btn.danger{border-color:rgba(239,68,68,.45);color:#fecaca;background:transparent}
      .gmapsx-toast{position:fixed;right:18px;bottom:18px;background:#0e141b;border:1px solid rgba(255,255,255,.08);color:#cde7d8;padding:10px 12px;border-radius:10px;opacity:0;transform:translateY(8px);transition:opacity .15s, transform .15s;z-index:999999}
      .gmapsx-toast.show{opacity:1;transform:translateY(0)}
    `;
    const style = document.createElement('style');
    style.id = 'gmaps-extractor-style';
    style.textContent = css;
    document.documentElement.appendChild(style);
  }
  function toast(msg, ok=true) {
    let t = document.getElementById('gmapsx-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'gmapsx-toast';
      t.className = 'gmapsx-toast';
      document.body.appendChild(t);
    }
    t.style.borderColor = ok ? 'rgba(82,189,133,.5)' : 'rgba(239,68,68,.45)';
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(()=> t.classList.remove('show'), 2400);
  }

  function showSendOverlay(leadsCount) {
    ensureOverlayCSS();
    let back = document.getElementById('gmapsx-send-backdrop');
    if (back) back.remove();

    back = document.createElement('div');
    back.id = 'gmapsx-send-backdrop';
    back.className = 'gmapsx-backdrop';

    const modal = document.createElement('div');
    modal.className = 'gmapsx-modal';
    modal.innerHTML = `
      <header>
        <h3>Enviar para Webhook</h3>
        <button class="close" aria-label="Fechar">×</button>
      </header>
      <div class="body">
        <div style="margin-bottom:8px;color:#9aa4b2">Foram coletados <b>${leadsCount}</b> leads. Informe seu webhook para enviar agora.</div>
        <label for="gmapsx-input">URL do webhook</label>
        <input id="gmapsx-input" type="text" placeholder="https://seu-dominio.com/webhook/receber">
      </div>
      <div class="actions">
        <button class="gmapsx-btn" id="gmapsx-cancel">Cancelar</button>
        <button class="gmapsx-btn primary" id="gmapsx-send">Enviar</button>
      </div>
    `;
    back.appendChild(modal);
    document.body.appendChild(back);

    const input = modal.querySelector('#gmapsx-input');
    const closeBtn = modal.querySelector('.close');
    const btnCancel = modal.querySelector('#gmapsx-cancel');
    const btnSend = modal.querySelector('#gmapsx-send');

    // pré-carrega webhook salvo
    getWebhook().then(url => { if (url && input) input.value = url; });

    const close = () => back.remove();

    closeBtn.onclick = close;
    btnCancel.onclick = close;
    back.addEventListener('click', (e)=> { if (e.target === back) close(); });

    btnSend.onclick = async () => {
      const url = (input.value || '').trim();
      if (!url) { toast('Informe uma URL de webhook.', false); input.focus(); return; }
      try {
        const u = new URL(url);
        if (!['http:','https:'].includes(u.protocol)) throw new Error('invalid');
      } catch { toast('URL inválida.', false); input.focus(); return; }

      // lê os leads salvos
      const leads = await getLeads();
      if (!leads.length) { toast('Nenhum lead salvo para enviar.', false); return; }

      // desabilita durante envio
      btnSend.disabled = true;
      btnSend.textContent = 'Enviando…';

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leads)
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);

        // persiste webhook para as próximas vezes
        await setWebhook(url);

        toast(`Enviado com sucesso (${leads.length})!`);
        close();

        // depois do sucesso, pergunta se deseja limpar
        showClearOverlay(leads.length);
      } catch (e) {
        toast('Falha ao enviar (verifique CORS/URL).', false);
      } finally {
        btnSend.disabled = false;
        btnSend.textContent = 'Enviar';
      }
    };
  }

  function showClearOverlay(leadsCount) {
    ensureOverlayCSS();
    let back = document.getElementById('gmapsx-clear-backdrop');
    if (back) back.remove();

    back = document.createElement('div');
    back.id = 'gmapsx-clear-backdrop';
    back.className = 'gmapsx-backdrop';

    const modal = document.createElement('div');
    modal.className = 'gmapsx-modal';
    modal.innerHTML = `
      <header>
        <h3>Limpar os dados?</h3>
        <button class="close" aria-label="Fechar">×</button>
      </header>
      <div class="body">
        <div style="margin-bottom:8px;color:#9aa4b2">
          Você acabou de enviar <b>${leadsCount}</b> leads com sucesso.<br>
          <b>Deseja limpar os dados salvos</b> para evitar envio duplicado?
        </div>
      </div>
      <div class="actions">
        <button class="gmapsx-btn" id="gmapsx-no">Não</button>
        <button class="gmapsx-btn primary" id="gmapsx-yes">Sim (Recomendado)</button>
      </div>
    `;
    back.appendChild(modal);
    document.body.appendChild(back);

    const closeBtn = modal.querySelector('.close');
    const btnNo = modal.querySelector('#gmapsx-no');
    const btnYes = modal.querySelector('#gmapsx-yes');

    const close = () => back.remove();

    closeBtn.onclick = close;
    btnNo.onclick = close;
    back.addEventListener('click', (e)=> { if (e.target === back) close(); });

    btnYes.onclick = async () => {
      btnYes.disabled = true;
      btnYes.textContent = 'Limpando…';
      const ok = await setLeads([]);
      if (ok) toast('Leads apagados com sucesso!');
      else toast('Não foi possível apagar os leads.', false);
      close();
    };
  }

  // ---------- fluxo principal ----------
  async function run() {
    try {
      const panel = await waitPaneAndPanel();
      if (!panel) { log('Painel não encontrado. Abortando.'); return; }
      await autoScrollAll(panel);
      const hrefs = collectFeedHrefs(panel);
      log('Cards únicos para extrair:', hrefs.length);

      const leads = [];
      for (let i = 0; i < hrefs.length; i++) {
        try {
          const lead = await gotoAndExtract(hrefs[i], i + 1);
          if (lead?.nome_empresa) leads.push(lead);
          await sleep(550); // respiro entre perfis (balanceado)
        } catch (e) {
          log('Erro ao extrair', i + 1, e.message);
        }
      }

      await setLeads(leads);
      toast(`Extração concluída (${leads.length}).`, true);

      // ao final da extração, oferece envio para webhook (apenas no Maps)
      showSendOverlay(leads.length);

    } catch (e) {
      log('Erro geral:', e.message);
    }
  }

  run();
})();

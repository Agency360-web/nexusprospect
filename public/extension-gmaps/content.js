(() => {
    // --- Roda só na tela de busca e evita múltiplas execuções ---
    if (!/\/maps\/search\//.test(location.pathname)) return;
    if (window.__gmapsExtractorRunning) return;
    window.__gmapsExtractorRunning = true;

    // ========== CONFIG SUPABASE ==========
    const SUPABASE_URL = 'https://vdwhijmbelfnmpodpptn.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_3oXn9vwEMcq4EyUQEaqj4A_FkltJ8xv';

    const log = (...a) => console.log('%c[Nexus360 Extractor]', 'color:#10b981;font-weight:700', ...a);
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const visible = (el) => !!el && el.offsetWidth > 0 && el.offsetHeight > 0;
    log('content.js iniciado em /maps/search/.');

    // ---------- helpers gerais ----------
    const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || '';
    const onlyDigits = (s) => (s || '').replace(/[^\d]/g, '');
    function formatBRPhone(raw) {
        let d = onlyDigits(raw);
        if (d.startsWith('55') && (d.length === 12 || d.length === 13)) d = d.slice(2);
        if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
        if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
        return d;
    }
    function waitForAny(selectors = [], timeout = 4000) {
        return new Promise((resolve) => {
            const start = Date.now();
            (function tick() {
                for (const sel of selectors) { const el = document.querySelector(sel); if (el) return resolve(el); }
                if (Date.now() - start >= timeout) return resolve(null);
                setTimeout(tick, 120);
            })();
        });
    }

    // ---------- Supabase Auth ----------
    async function getAuth() {
        return new Promise((resolve) => {
            try {
                chrome.storage?.local?.get(['nexus360_token', 'nexus360_user_id'], (res) => {
                    resolve({
                        token: res?.nexus360_token || '',
                        userId: res?.nexus360_user_id || ''
                    });
                });
            } catch {
                resolve({ token: '', userId: '' });
            }
        });
    }

    // Enviar lead individual ao Supabase
    async function sendLeadToSupabase(lead, auth, searchTerm) {
        if (!auth.token || !auth.userId) {
            log('Sem autenticação. Lead não enviado.');
            return false;
        }

        const payload = {
            name: lead.nome_empresa,
            phone: lead.telefone ? onlyDigits(lead.telefone) : null,
            company: lead.nome_empresa,
            company_site: lead.website || null,
            address: lead.endereco || null,
            rating: lead.rating || null,
            reviews: lead.reviews || null,
            specialties: lead.especialidades || null,
            source: 'google_maps',
            search_term: searchTerm,
            user_id: auth.userId,
        };

        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${auth.token}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errText = await res.text();
                log('Erro ao enviar lead:', res.status, errText);
                return false;
            }
            return true;
        } catch (e) {
            log('Erro de rede ao enviar lead:', e.message);
            return false;
        }
    }

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

    // ---------- coleta de HREFs dos cards ----------
    function collectFeedHrefs(panel) {
        const anchors = Array.from(panel.querySelectorAll('a.hfpxzc[href*="/maps/place/"]'));
        const fall = Array.from(panel.querySelectorAll('div[role="article"] a[href*="/maps/place/"]'));
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

    // ---------- helpers de extração ----------
    function getPhone() {
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
        const btn = document.querySelector('#pane button[data-item-id^="phone"], #pane div[role="button"][data-item-id^="phone"]');
        if (btn) {
            const di = btn.getAttribute('data-item-id') || '';
            let raw = di.split(':').slice(-1)[0];
            let fmt = formatBRPhone(raw);
            if (fmt) return fmt;
            const digits = onlyDigits(di);
            if (digits) { fmt = formatBRPhone(digits); if (fmt) return fmt; }
        }
        const blocks = Array.from(document.querySelectorAll('#pane div.Io6YTe.fontBodyMedium.kR99db.fdkmkc'))
            .map(d => (d.textContent || '').trim())
            .filter(Boolean);
        for (const t of blocks) {
            const m = t.match(/^\(\d{2}\)\s*\d{4,5}-\d{4}$/);
            if (m) return m[0];
        }
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

    // ---------- overlay de progresso ----------
    function createProgressOverlay() {
        const style = document.createElement('style');
        style.textContent = `
      .nexus-progress{position:fixed;bottom:20px;right:20px;width:360px;background:#151923;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:16px;box-shadow:0 20px 60px rgba(0,0,0,.5);color:#e7ecf3;font:500 13px/1.4 Inter,system-ui;z-index:999999}
      .nexus-progress h4{margin:0 0 8px;font-size:15px;font-weight:800}
      .nexus-progress .bar-bg{height:8px;background:rgba(255,255,255,.08);border-radius:99px;overflow:hidden;margin:8px 0}
      .nexus-progress .bar-fill{height:100%;background:linear-gradient(90deg,#52bd85,#2dd4bf);border-radius:99px;transition:width .3s}
      .nexus-progress .stats{display:flex;gap:12px;font-size:11px;color:#9aa4b2;margin-top:6px}
      .nexus-progress .stats b{color:#e7ecf3}
    `;
        document.head.appendChild(style);

        const div = document.createElement('div');
        div.className = 'nexus-progress';
        div.innerHTML = `
      <h4>🔍 Nexus360 — Extraindo Leads</h4>
      <div style="font-size:12px;color:#9aa4b2" id="nexus-status">Preparando...</div>
      <div class="bar-bg"><div class="bar-fill" id="nexus-bar" style="width:0%"></div></div>
      <div class="stats">
        <span>Extraídos: <b id="nexus-count">0</b></span>
        <span>Total: <b id="nexus-total">—</b></span>
        <span>Salvos: <b id="nexus-saved">0</b></span>
        <span>Falhas: <b id="nexus-failed">0</b></span>
      </div>
    `;
        document.body.appendChild(div);
        return {
            setStatus: (s) => { document.getElementById('nexus-status').textContent = s; },
            setCount: (c) => { document.getElementById('nexus-count').textContent = c; },
            setTotal: (t) => { document.getElementById('nexus-total').textContent = t; },
            setSaved: (s) => { document.getElementById('nexus-saved').textContent = s; },
            setFailed: (f) => { document.getElementById('nexus-failed').textContent = f; },
            setProgress: (p) => { document.getElementById('nexus-bar').style.width = `${p}%`; },
            finish: (msg) => {
                document.getElementById('nexus-status').textContent = msg;
                document.getElementById('nexus-bar').style.width = '100%';
                document.getElementById('nexus-bar').style.background = 'linear-gradient(90deg,#52bd85,#34d399)';
                setTimeout(() => div.remove(), 15000);
            }
        };
    }

    // ---------- fluxo principal ----------
    async function run() {
        const auth = await getAuth();
        if (!auth.token || !auth.userId) {
            log('Usuário não autenticado no Nexus360. Abra o sistema e clique em "Sincronizar Extensão".');
            return;
        }

        // Extrair termo de busca da URL
        const urlPath = decodeURIComponent(location.pathname);
        const searchTerm = urlPath.replace('/maps/search/', '').replace(/\//g, ' ').trim();

        const ui = createProgressOverlay();
        ui.setStatus('Buscando painel de resultados...');

        try {
            const panel = await waitPaneAndPanel();
            if (!panel) { ui.finish('❌ Painel não encontrado.'); return; }

            ui.setStatus('Rolando feed para carregar todos os resultados...');
            await autoScrollAll(panel);

            const hrefs = collectFeedHrefs(panel);
            log('Cards únicos para extrair:', hrefs.length);
            ui.setTotal(hrefs.length);
            ui.setStatus(`Extraindo ${hrefs.length} leads...`);

            let saved = 0, failed = 0;

            for (let i = 0; i < hrefs.length; i++) {
                try {
                    const lead = await gotoAndExtract(hrefs[i], i + 1);
                    ui.setCount(i + 1);
                    ui.setProgress(Math.round(((i + 1) / hrefs.length) * 100));
                    ui.setStatus(`Extraindo ${i + 1}/${hrefs.length}: ${lead.nome_empresa || '...'}`);

                    if (lead?.nome_empresa) {
                        const ok = await sendLeadToSupabase(lead, auth, searchTerm);
                        if (ok) { saved++; ui.setSaved(saved); }
                        else { failed++; ui.setFailed(failed); }
                    }

                    await sleep(550);
                } catch (e) {
                    log('Erro ao extrair', i + 1, e.message);
                    failed++;
                    ui.setFailed(failed);
                }
            }

            ui.finish(`✅ Concluído! ${saved} leads salvos no Nexus360.`);
            log(`Extração finalizada. ${saved} salvos, ${failed} falhas.`);

        } catch (e) {
            log('Erro geral:', e.message);
            ui.finish('❌ Erro durante extração.');
        }
    }

    run();
})();

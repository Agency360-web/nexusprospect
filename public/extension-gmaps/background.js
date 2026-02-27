// ================================================
// Nexus360 — Background Service Worker
// Detecta Google Maps e injeta content.js
// ================================================

const SEARCH_RE = /^https:\/\/www\.google\.(com|com\.br)\/maps\/search\//;

// Abre popup ao clicar no ícone
chrome.action.onClicked.addListener(() => {
    // O popup é aberto automaticamente pelo manifest
});

// Verifica se o usuário está autenticado
async function isAuthenticated() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['nexus360_token', 'nexus360_user_id'], (res) => {
            resolve(!!(res?.nexus360_token && res?.nexus360_user_id));
        });
    });
}

// Executa content.js na tab do Google Maps
function bootIfNeeded(tabId) {
    chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
            if (window.__gmapsExtractorBooted) return 'exists';
            window.__gmapsExtractorBooted = true;
            return 'boot';
        }
    }).then(async ([res]) => {
        if (res && res.result === 'boot') {
            const auth = await isAuthenticated();
            if (!auth) {
                console.warn('[Nexus360] Usuário não autenticado. Extensão não iniciará.');
                return;
            }
            chrome.scripting.executeScript({
                target: { tabId },
                files: ['content.js']
            }).catch(err => console.warn('inject err:', err.message));
        }
    }).catch(err => console.warn('flag err:', err.message));
}

// Quando a página termina de carregar
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && SEARCH_RE.test(tab.url)) {
        bootIfNeeded(tabId);
    }
});

// SPA do Maps - navegação via History API
chrome.webNavigation.onHistoryStateUpdated.addListener(({ tabId, url, frameId }) => {
    if (frameId === 0 && url && SEARCH_RE.test(url)) bootIfNeeded(tabId);
}, {
    url: [
        { hostEquals: 'www.google.com', pathPrefix: '/maps/search/' },
        { hostEquals: 'www.google.com.br', pathPrefix: '/maps/search/' }
    ]
});

chrome.webNavigation.onCompleted.addListener(({ tabId, url, frameId }) => {
    if (frameId === 0 && url && SEARCH_RE.test(url)) bootIfNeeded(tabId);
}, {
    url: [
        { hostEquals: 'www.google.com', pathPrefix: '/maps/search/' },
        { hostEquals: 'www.google.com.br', pathPrefix: '/maps/search/' }
    ]
});

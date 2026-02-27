(async () => {
  const get = (keys) => new Promise(res => chrome.storage.local.get(keys, res));
  const { gmaps_api_key, gmaps_api_key_valid } = await get(['gmaps_api_key', 'gmaps_api_key_valid']);

  if (!gmaps_api_key || !gmaps_api_key_valid) {
    // sem chave válida → volta para autenticação
    location.replace(chrome.runtime.getURL('auth.html'));
    throw new Error('API key inválida ou ausente — redirecionando para auth.');
  }
})();



// Helpers
const $ = (sel) => document.querySelector(sel);
const toast = (msg, ok = true) => {
  const el = $('#toast');
  el.textContent = msg;
  el.style.borderColor = ok ? 'rgba(82,189,133,.5)' : 'rgba(239,68,68,.45)';
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2600);
};

const WEBHOOK_KEY = 'gmaps_extractor_webhook';

function getWebhook() {
  return localStorage.getItem(WEBHOOK_KEY) || '';
}
function setWebhook(url) {
  localStorage.setItem(WEBHOOK_KEY, url);
  // sincroniza com chrome.storage.local para o content.js também enxergar
  try { chrome?.storage?.local?.set({ gmaps_extractor_webhook: url }); } catch {}
  renderWebhookStatus();
}

function renderWebhookStatus() {
  const url = getWebhook();
  const dot = $('#webhookDot');
  const txt = $('#webhookStatus');
  if (url) {
    dot.classList.add('ok'); dot.classList.remove('err');
    txt.textContent = '';
    txt.title = url;
  } else {
    dot.classList.remove('ok'); dot.classList.add('err');
    txt.textContent = 'Webhook não definido';
    txt.title = '';
  }
}

// ---- chrome.storage helpers ----
function getLeads() {
  return new Promise((resolve) => {
    try {
      chrome.storage?.local?.get('gmaps_leads', (res) => {
        resolve(Array.isArray(res?.gmaps_leads) ? res.gmaps_leads : []);
      });
    } catch {
      resolve([]);
    }
  });
}
function setLeads(arr) {
  return new Promise((resolve) => {
    try {
      chrome.storage?.local?.set({ gmaps_leads: arr }, () => resolve(true));
    } catch {
      resolve(false);
    }
  });
}

// Modal controls (apenas salvar webhook)
const modal = document.getElementById('modalBackdrop');

function openModal() {
  const input = $('#webhookInput');
  if (input) input.value = getWebhook();
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
  setTimeout(() => input && input.focus(), 80);
}
function closeModal() {
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
}

// Validate URL
function isValidUrl(u) {
  try {
    const x = new URL(u);
    return ['http:', 'https:'].includes(x.protocol);
  } catch { return false; }
}

// Abre o Google Maps pesquisando o termo
function openMapsWithTerm() {
  const termo = $('#termInput').value.trim();
  if (!termo) { toast('Informe um termo para extrair.', false); $('#termInput').focus(); return; }
  const q = encodeURIComponent(termo);
  const url = `https://www.google.com/maps/search/${q}`;
  if (typeof chrome !== 'undefined' && chrome?.tabs?.create) chrome.tabs.create({ url });
  else window.open(url, '_blank');
}

// Salvar webhook (não envia leads por aqui)
function saveWebhookOnly() {
  const input = $('#webhookInput');
  const url = (input?.value || '').trim();
  if (!url) { toast('Informe uma URL de webhook.', false); input?.focus(); return; }
  if (!isValidUrl(url)) { toast('URL inválida. Verifique a URL.', false); input?.focus(); return; }
  setWebhook(url);
  toast('Webhook salvo!');
  closeModal();
}

// Limpar dados salvos (gmaps_leads)
async function clearLeads() {
  const ok = confirm('Tem certeza que deseja apagar todos os leads salvos?');
  if (!ok) return;

  const success = await setLeads([]);
  if (success) {
    toast('Leads apagados com sucesso!');
  } else {
    toast('Não foi possível apagar os leads.', false);
  }
}

// Wire-up
window.addEventListener('DOMContentLoaded', () => {
  renderWebhookStatus();

  const btnEdit    = document.getElementById('editWebhookBtn');
  const btnSave    = document.getElementById('saveWebhookBtn');
  const btnCancel  = document.getElementById('cancelModalBtn');
  const btnClose   = document.getElementById('closeModalBtn');
  const btnExtract = document.getElementById('extractBtn');
  const btnClear   = document.getElementById('clearBtn');
  const termInput  = document.getElementById('termInput');

  // “Definir webhook” só abre modal de salvar
  btnEdit?.addEventListener('click', openModal);

  // Modal: apenas salvar webhook
  btnSave?.addEventListener('click', saveWebhookOnly);
  btnCancel?.addEventListener('click', closeModal);
  btnClose?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // Abrir maps (extrair)
  btnExtract?.addEventListener('click', openMapsWithTerm);
  termInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') openMapsWithTerm(); });

  // Limpar dados
  btnClear?.addEventListener('click', clearLeads);
});

const WEBHOOK_URL = 'https://webhook.iaevolua.com/webhook/fe5718e5-b35e-41aa-b7ff-ada887';
const STORAGE_KEYS = {
  API_KEY: 'gmaps_api_key',
  API_KEY_VALID: 'gmaps_api_key_valid'
};

const $ = (s) => document.querySelector(s);
const input = $('#apiKey');
const feedback = $('#feedback');
const btnValidar = $('#btnValidar');
const btnCancelar = $('#btnCancelar');

function setMsg(html, ok = null) {
  feedback.innerHTML = html || ''; // agora interpreta HTML
  feedback.classList.remove('ok', 'err');
  if (ok === true) feedback.classList.add('ok');
  if (ok === false) feedback.classList.add('err');
}


async function saveState(key, valid) {
  return new Promise((resolve) => {
    chrome.storage.local.set({
      [STORAGE_KEYS.API_KEY]: key,
      [STORAGE_KEYS.API_KEY_VALID]: !!valid
    }, () => resolve(true));
  });
}

function isChaveAtiva(val) {
  // Considera vários formatos de retorno
  if (val === true) return true;
  if (val === 1 || val === '1') return true;
  const s = String(val ?? '').trim().toLowerCase();
  return s === 'ok' || s === 'true' || s === 'ativo' || s === 'ativa';
}

async function validar() {
  const key = (input.value || '').trim();
  if (!key) {
    setMsg('Informe sua Licença.', false);
    input.focus();
    return;
  }

  setMsg('Validando sua chave...', null);
  btnValidar.disabled = true;

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        origem: 'chrome_extension',
        timestamp: Date.now()
      })
    });

    if (!res.ok) {
      setMsg(`Erro ao validar (HTTP ${res.status}).`, false);
    } else {
      const data = await res.json().catch(() => ({}));
      const ativa = isChaveAtiva(data?.chave_ativa);
      if (ativa) {
        await saveState(key, true);
        setMsg('Chave ativa! Redirecionando...', true);
        // Redireciona para a interface
        const url = chrome.runtime.getURL('interface.html');
        location.replace(url);
        return;
} else {
  await saveState('', false);
setMsg(
  `<span style="color:#ef4444; display:flex; align-items:center; gap:6px;">
    ❌ <span>Chave inválida. 
      <a href="https://pay.kiwify.com.br/eiqRApI" target="_blank" style="color:#3b82f6; text-decoration:none;">Compre sua licença aqui</a>.
    </span>
  </span>`,
  false
);

}

    }
  } catch (e) {
    setMsg('Falha de rede ao validar a chave. Tente novamente.', false);
  } finally {
    btnValidar.disabled = false;
  }
}

btnValidar.addEventListener('click', validar);
btnCancelar.addEventListener('click', () => {
  // Volta para interface, ela vai forçar o redirect de volta pra auth se não estiver válida
  const url = chrome.runtime.getURL('interface.html');
  location.href = url;
});

window.addEventListener('DOMContentLoaded', () => {
  input.focus();
});

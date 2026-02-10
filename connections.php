<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Integração WhatsApp</title>
    <style>
        /* Basic Reset & Styles */
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f3f4f6;
            color: #1f2937;
            margin: 0;
            padding: 20px;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        h1 {
            color: #111827;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }

        /* Blocks */
        .hidden {
            display: none !important;
        }

        /* Create Block */
        #createBlock {
            text-align: center;
            padding: 40px;
            border: 2px dashed #d1d5db;
            border-radius: 8px;
            color: #6b7280;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            padding: 10px 20px;
            font-weight: 600;
            border-radius: 6px;
            cursor: pointer;
            border: none;
            transition: background-color 0.2s;
            text-decoration: none;
        }

        .btn-primary {
            background-color: #3b82f6;
            color: white;
        }

        .btn-primary:hover {
            background-color: #2563eb;
        }

        .btn-primary:disabled {
            background-color: #93c5fd;
            cursor: not-allowed;
        }

        .btn-danger {
            background-color: #ef4444;
            color: white;
        }

        .btn-danger:hover {
            background-color: #dc2626;
        }

        .btn-secondary {
            background-color: #e5e7eb;
            color: #374151;
        }

        .btn-secondary:hover {
            background-color: #d1d5db;
        }

        /* Instance Card */
        #cardInstance {
            padding: 20px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        /* Badges */
        .instance-badge {
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 600;
        }

        .badge-success {
            background-color: #10b981;
            color: white;
        }

        .badge-warning {
            background-color: #f59e0b;
            color: white;
        }

        .badge-danger {
            background-color: #ef4444;
            color: white;
        }

        /* QR Code */
        #qrcodeContainer {
            text-align: center;
            margin: 20px 0;
            padding: 20px;
            background: #f9fafb;
            border-radius: 8px;
        }

        #qrcodeImage {
            max-width: 250px;
            width: 100%;
            border: 1px solid #ddd;
            padding: 10px;
            background: white;
        }

        .info-row {
            margin: 10px 0;
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid #f3f4f6;
            padding-bottom: 5px;
        }

        .info-label {
            font-weight: 600;
            color: #4b5563;
        }

        .actions {
            margin-top: 20px;
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }
    </style>
</head>

<body>

    <div class="container">
        <h1>Integração WhatsApp</h1>

        <!-- Create Connection Block -->
        <div id="createBlock">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"
                style="margin-bottom: 20px; color: #9ca3af;">
                <path
                    d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z">
                </path>
            </svg>
            <h2>Nenhuma conexão ativa</h2>
            <p>Conecte seu WhatsApp para enviar mensagens automaticamente.</p>
            <button class="btn btn-primary" onclick="createConnection()" id="btnConnect">Conectar Agora</button>
        </div>

        <!-- Instance Card -->
        <div id="cardInstance" class="hidden">
            <div class="card-header">
                <h2 style="margin:0;">Minha Conexão</h2>
                <span id="statusBadge" class="instance-badge badge-warning">Carregando...</span>
            </div>

            <div id="qrcodeContainer" class="hidden">
                <p>Escaneie o QR Code abaixo com seu WhatsApp:</p>
                <img id="qrcodeImage" src="" alt="QR Code WhatsApp">
                <br><br>
                <button class="btn btn-secondary" onclick="refreshQR()">Atualizar QR Code</button>
            </div>

            <div class="info-group">
                <div class="info-row">
                    <span class="info-label">ID da Instância:</span>
                    <span id="instanceName">-</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Criado em:</span>
                    <span id="createdAt">-</span>
                </div>
            </div>

            <div class="actions">
                <button class="btn btn-secondary" onclick="updateStatus()">Atualizar Status</button>
                <button class="btn btn-danger" onclick="deleteConnection()">Desconectar</button>
            </div>
        </div>
    </div>

    <script>
        let pollingInterval = null;

        window.addEventListener('DOMContentLoaded', () => {
            checkConnection();
            startPolling();
        });

        window.addEventListener('beforeunload', () => {
            if (pollingInterval) clearInterval(pollingInterval);
        });

        async function fetchJSON(url, options = {}) {
            options.headers = {
                ...options.headers,
                'Content-Type': 'application/json'
            };
            options.credentials = 'same-origin'; // Important for session cookie

            try {
                const response = await fetch(url, options);
                if (response.status === 401) {
                    showToast('Sessão expirada, faça login novamente.', 'error');
                    // Optional: redirect to login
                    return null;
                }
                const data = await response.json();
                return { ok: response.ok, status: response.status, data };
            } catch (error) {
                console.error('Fetch error:', error);
                showToast('Erro de conexão com o servidor.', 'error');
                return null;
            }
        }

        async function checkConnection() {
            const result = await fetchJSON('/api/connection-me.php');
            if (!result) return;

            const { ok, data } = result;

            if (ok) {
                if (data.exists) {
                    showInstance(data);
                } else {
                    showCreate();
                }
            } else {
                // Handle error, maybe show create if 404
                showCreate();
            }
        }

        function showCreate() {
            document.getElementById('createBlock').classList.remove('hidden');
            document.getElementById('cardInstance').classList.add('hidden');
            document.getElementById('qrcodeContainer').classList.add('hidden');
        }

        function showInstance(data) {
            document.getElementById('createBlock').classList.add('hidden');
            document.getElementById('cardInstance').classList.remove('hidden');

            document.getElementById('instanceName').innerText = data.instance;
            document.getElementById('createdAt').innerText = data.created_at;

            // Logic for QR Code
            // Showing QR code if status is connecting or close, AND we have valid base64
            const needsQR = (data.live_state === 'close' || data.live_state === 'connecting') && data.qrcode;

            if (needsQR) {
                document.getElementById('qrcodeContainer').classList.remove('hidden');
                // Ensure base64 prefix if missing
                let src = data.qrcode;
                if (!src.startsWith('data:image')) {
                    src = 'data:image/png;base64,' + src;
                }
                document.getElementById('qrcodeImage').src = src;
            } else {
                document.getElementById('qrcodeContainer').classList.add('hidden');
            }

            setBadge(data.live_state);
        }

        function setBadge(state) {
            const badge = document.getElementById('statusBadge');
            badge.className = 'instance-badge'; // Reset

            if (state === 'open') {
                badge.classList.add('badge-success');
                badge.innerText = 'Conectado';
            } else if (state === 'connecting') {
                badge.classList.add('badge-warning');
                badge.innerText = 'Conectando...';
            } else {
                badge.classList.add('badge-danger');
                badge.innerText = 'Desconectado';
            }
        }

        async function createConnection() {
            const btn = document.getElementById('btnConnect');
            btn.disabled = true;
            btn.innerText = 'Criando...';

            try {
                const result = await fetchJSON('/api/connection-create.php', { method: 'POST' });
                if (result && result.ok && result.data.success) {
                    showToast(result.data.message || 'Conexão criada com sucesso!', 'success');
                    checkConnection();
                    startPolling();
                } else {
                    showToast(result?.data?.message || 'Erro ao criar conexão.', 'error');
                }
            } finally {
                btn.disabled = false;
                btn.innerText = 'Conectar Agora';
            }
        }

        async function deleteConnection() {
            if (!confirm('Tem certeza que deseja desconectar? Isso irá remover a instância do WhatsApp.')) {
                return;
            }

            if (pollingInterval) clearInterval(pollingInterval); // Stop polling immediately

            const result = await fetchJSON('/api/connection-delete.php', { method: 'DELETE' });

            if (result && result.ok && result.data.success) {
                showToast('Conexão removida.', 'success');
                checkConnection(); // Should switch to create view
            } else {
                showToast(result?.data?.message || 'Erro ao remover conexão.', 'error');
                startPolling(); // Resume polling if failed
            }
        }

        async function refreshQR() {
            const result = await fetchJSON('/api/qr-get.php');
            if (result && result.ok && result.data.success) {
                let src = result.data.qrcode;
                if (!src.startsWith('data:image')) {
                    src = 'data:image/png;base64,' + src;
                }
                document.getElementById('qrcodeImage').src = src;
                showToast('QR Code atualizado.', 'success');
            } else {
                showToast('Erro ao atualizar QR Code.', 'error');
            }
        }

        function updateStatus() {
            checkConnection();
            showToast('Verificando status...', 'info');
        }

        function startPolling() {
            if (pollingInterval) clearInterval(pollingInterval);
            pollingInterval = setInterval(() => {
                checkConnection(); // Silent update
            }, 6000);
        }

        function showToast(message, type) {
            // Simple alert for now, or create a toast element
            // For better UX without external libraries:
            const toast = document.createElement('div');
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.right = '20px';
            toast.style.padding = '10px 20px';
            toast.style.borderRadius = '4px';
            toast.style.color = 'white';
            toast.style.zIndex = '1000';
            toast.style.transition = 'opacity 0.5s';

            if (type === 'success') toast.style.backgroundColor = '#10b981';
            else if (type === 'error') toast.style.backgroundColor = '#ef4444';
            else toast.style.backgroundColor = '#3b82f6';

            toast.innerText = message;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 500);
            }, 3000);
        }
    </script>

</body>

</html>
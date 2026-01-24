import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QrCode, RefreshCw, Smartphone, AlertTriangle, CheckCircle2, Wifi } from 'lucide-react';

interface InstanceStatus {
    instanceId: string;
    status: 'disconnected' | 'connecting' | 'connected';
}

const WhatsAppConnectPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const instanceUrl = searchParams.get('instanceUrl');
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'idle' | 'loading' | 'qr_ready' | 'connected' | 'error'>('idle');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');

    // Polling Ref
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (instanceUrl && token) {
            initializeConnection();
        } else {
            setStatus('error');
            setErrorMessage('URL da instância ou Token não foram fornecidos.');
        }

        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, [instanceUrl, token]);

    const initializeConnection = async () => {
        try {
            setStatus('loading');
            await connectInstance();
            startPolling();
        } catch (error: any) {
            console.error(error);
            setStatus('error');
            setErrorMessage(error.message || 'Erro ao inicializar conexão.');
        }
    };

    const connectInstance = async () => {
        if (!instanceUrl || !token) return;

        try {
            const cleanUrl = instanceUrl.replace(/\/$/, '');
            console.log('Initiating connection to:', cleanUrl);

            // According to UAZAPI docs: POST /instance/connect
            const response = await fetch(`${cleanUrl}/instance/connect`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'token': token
                },
                body: JSON.stringify({}) // Empty body to trigger QR Code generation
            });

            const data = await response.json().catch(() => ({}));
            console.log('Connect response:', data);

            if (!response.ok) {
                const msg = data?.message || data?.error || '';

                // Handle specific UAZAPI states
                if (typeof msg === 'string' && (msg.includes('Connection still in progress') || msg.includes('QR Code not ready'))) {
                    console.log('Connection in progress, starting polling...');
                    setStatus('loading');
                    startPolling();
                    return;
                } else if (typeof msg === 'string' && msg.includes('Instance already connected')) {
                    console.log('Instance already connected');
                    setStatus('connected');
                    setConnectionStatus('connected');
                    return;
                }

                throw new Error(msg || 'Erro na requisição de conexão');
            }

            // Immediately check status to get the freshest QR code
            // The connect endpoint might return one, but /status is the source of truth for updates
            handleQrCodeData(data);
            startPolling();

        } catch (error: any) {
            console.error('Connection initialization error:', error);
            throw new Error('Falha ao contactar servidor: ' + error.message);
        }
    };

    const handleQrCodeData = (data: any) => {
        // Safe extraction of QR Code from various common API formats
        let qrValue: string | null = null;

        if (data?.base64 && typeof data.base64 === 'string') {
            qrValue = data.base64;
        } else if (data?.qrcode && typeof data.qrcode === 'string') {
            qrValue = data.qrcode;
        } else if (data?.qr && typeof data.qr === 'string') {
            qrValue = data.qr;
        } else if (typeof data === 'string' && data.length > 50 && data.includes('data:image')) {
            qrValue = data;
        }

        if (qrValue) {
            setQrCode(qrValue);
            setStatus('qr_ready');
        }
    };

    const checkStatus = async () => {
        if (!instanceUrl || !token) return;

        try {
            const cleanUrl = instanceUrl.replace(/\/$/, '');
            const response = await fetch(`${cleanUrl}/instance/status`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'token': token
                }
            });

            if (response.ok) {
                const data = await response.json();
                // console.log('Status poll:', data); // Uncomment for debugging if needed

                const currentStatus = data.status || 'disconnected';
                setConnectionStatus(currentStatus);

                // Update QR if available in status response
                handleQrCodeData(data);

                if (currentStatus === 'connected') {
                    setStatus('connected');
                    if (pollInterval.current) clearInterval(pollInterval.current);
                } else if (currentStatus === 'disconnected' && status === 'connected') {
                    // Start over if disconnected
                    setStatus('idle');
                }
            }
        } catch (error) {
            console.error("Status Poll Error", error);
        }
    };

    const startPolling = () => {
        if (pollInterval.current) clearInterval(pollInterval.current);
        checkStatus(); // Initial check
        pollInterval.current = setInterval(checkStatus, 2000); // Poll every 2s for faster feedback
    };

    // Explicit refresh logic
    const handleRefresh = () => {
        initializeConnection();
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                        <div className="absolute right-[-20%] top-[-20%] w-[50%] h-[150%] bg-emerald-500 blur-[100px] rounded-full mix-blend-screen"></div>
                    </div>

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                            <Smartphone className="text-emerald-400" size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Conectar WhatsApp</h1>
                        <p className="text-slate-400 text-sm">Escaneie o QR Code para sincronizar</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8">
                    {status === 'error' && (
                        <div className="bg-slate-900 text-[#ffd700] p-4 rounded-xl flex items-start gap-3 mb-6">
                            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <span className="font-bold block mb-1">Erro na Conexão</span>
                                {errorMessage}
                            </div>
                        </div>
                    )}

                    {status === 'connected' ? (
                        <div className="text-center py-12 animate-in fade-in zoom-in-95">
                            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 size={48} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Conectado!</h2>
                            <p className="text-slate-500">Sua instância foi sincronizada com sucesso.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* QR Code Area */}
                            <div className="flex justify-center">
                                <div className="relative group">
                                    <div className={`w-72 h-72 border-2 rounded-2xl flex items-center justify-center bg-slate-100 ${status === 'loading' ? 'animate-pulse border-slate-200' : 'border-slate-200'}`}>
                                        {status === 'loading' && (
                                            <div className="text-slate-400 text-sm font-medium flex flex-col items-center">
                                                <RefreshCw className="animate-spin mb-2" size={24} />
                                                Gerando QR Code...
                                            </div>
                                        )}

                                        {status === 'qr_ready' && qrCode && (
                                            <img
                                                src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                                                alt="WhatsApp QR Code"
                                                className="w-full h-full p-2 object-contain rounded-xl"
                                            />
                                        )}

                                        {status === 'idle' && !qrCode && (
                                            <div className="text-slate-400 text-center p-4">
                                                <QrCode size={48} className="mx-auto mb-3 opacity-30" />
                                                <p className="text-sm">Aguardando inicialização...</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Overlay Refresh Button */}
                                    {status !== 'loading' && (
                                        <button
                                            onClick={handleRefresh}
                                            className="absolute bottom-4 right-4 p-3 bg-white text-slate-900 rounded-full shadow-lg hover:bg-slate-50 transition-transform active:scale-95 border border-slate-200"
                                            title="Atualizar QR Code"
                                        >
                                            <RefreshCw size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Status Indicator */}
                            <div className="flex items-center justify-center gap-2 text-sm font-medium">
                                <span>Status da Instância:</span>
                                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${connectionStatus === 'connected' ? 'bg-emerald-100 text-emerald-700' :
                                    connectionStatus === 'connecting' ? 'bg-amber-100 text-amber-700' :
                                        'bg-slate-100 text-slate-600'
                                    }`}>
                                    {connectionStatus === 'connected' && <Wifi size={12} />}
                                    {connectionStatus === 'disconnected' && <Wifi size={12} className="opacity-50" />}
                                    {connectionStatus === 'connecting' && <RefreshCw size={12} className="animate-spin" />}
                                    {connectionStatus}
                                </span>
                            </div>

                            <div className="text-center">
                                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                                    Abra o WhatsApp no seu celular, vá em Menu {'>'} Dispositivos Conectados {'>'} Conectar um Aparelho
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="fixed bottom-6 text-center w-full text-slate-400 text-xs">
                Powered by UAZAPI
            </div>
        </div>
    );
};

export default WhatsAppConnectPage;

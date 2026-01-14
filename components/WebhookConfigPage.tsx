
import React, { useState } from 'react';
import { 
  Globe, 
  Lock, 
  Copy, 
  Check, 
  RefreshCw, 
  Code2, 
  ArrowRightLeft,
  Terminal
} from 'lucide-react';

const WebhookConfigPage: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);
  const [secret, setSecret] = useState('nx_live_8v2a1z9m7w6q4p5r3x');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const CodeBlock = ({ title, code }: { title: string, code: string }) => (
    <div className="bg-slate-900 rounded-xl overflow-hidden mt-4 border border-slate-800">
      <div className="bg-slate-800 px-4 py-2 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Terminal size={14} className="text-slate-400" />
          <span className="text-xs font-mono text-slate-300">{title}</span>
        </div>
        <button 
          onClick={() => copyToClipboard(code, title)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          {copied === title ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono text-blue-300 overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Configurações de Webhook</h1>
        <p className="text-slate-500 mt-2">Integre o NexusDispatch diretamente com o seu sistema ou ERP.</p>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="flex items-center space-x-2 text-sm font-bold text-slate-700">
                <Globe size={16} className="text-slate-400" />
                <span>Endpoint de Entrada (Inbound)</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  defaultValue="https://api.nexusdispatch.com/v1/webhook/receive"
                  readOnly
                  className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-600 outline-none"
                />
                <button 
                  onClick={() => copyToClipboard('https://api.nexusdispatch.com/v1/webhook/receive', 'inbound')}
                  className="absolute right-3 top-2.5 p-1.5 text-slate-400 hover:text-slate-600"
                >
                  {copied === 'inbound' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">Envie POST requests para este URL para iniciar disparos via API.</p>
            </div>

            <div className="space-y-4">
              <label className="flex items-center space-x-2 text-sm font-bold text-slate-700">
                <ArrowRightLeft size={16} className="text-slate-400" />
                <span>URL de Retorno (Outbound)</span>
              </label>
              <input 
                type="text" 
                placeholder="https://seu-sistema.com/webhook/callback"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-mono text-xs"
              />
              <p className="text-[11px] text-slate-400">Onde notificaremos as mudanças de status (Entregue, Erro, etc).</p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 space-y-4">
            <label className="flex items-center space-x-2 text-sm font-bold text-slate-700">
              <Lock size={16} className="text-slate-400" />
              <span>Chave Secreta da API (Signing Secret)</span>
            </label>
            <div className="flex space-x-3">
              <div className="relative flex-1">
                <input 
                  type="password" 
                  value={secret}
                  readOnly
                  className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-600 outline-none"
                />
                <button 
                  onClick={() => copyToClipboard(secret, 'secret')}
                  className="absolute right-3 top-2.5 p-1.5 text-slate-400 hover:text-slate-600"
                >
                  {copied === 'secret' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </div>
              <button className="px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors flex items-center space-x-2 text-sm font-medium">
                <RefreshCw size={16} />
                <span>Regerar</span>
              </button>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 px-8 py-4 flex justify-end border-t border-slate-100">
          <button className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10">
            Salvar Alterações
          </button>
        </div>
      </div>

      {/* Documentation Section */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2 text-slate-900">
          <Code2 size={24} />
          <h2 className="text-xl font-bold">Exemplos de Payload</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Request (Seu Sistema → Nexus)</h3>
            <CodeBlock 
              title="POST /v1/webhook/receive"
              code={JSON.stringify({
  campaign_name: "Promoção Outono",
  message: "Olá {{nome}}, confira nossa oferta!",
  contacts: [
    { name: "Carlos", phone: "5511988887777" },
    { name: "Ana", phone: "5521977776666" }
  ]
}, null, 2)}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Callback (Nexus → Seu Sistema)</h3>
            <CodeBlock 
              title="POST /seu-callback-url"
              code={JSON.stringify({
  campaign_id: "nx_camp_abc123",
  timestamp: "2023-10-27T15:30:00Z",
  updates: [
    { phone: "5511988887777", status: "delivered" },
    { phone: "5521977776666", status: "error", error: "Invalid number" }
  ]
}, null, 2)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebhookConfigPage;

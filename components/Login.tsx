import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Mail, Lock, ArrowRight, UserPlus, LogIn, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                // Depending on config, might need email confirmation. 
                // For now assuming auto-confirm or showing message.
                alert('Conta criada! Verifique seu email para confirmar o cadastro.');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                navigate('/'); // Redirect to dashboard
            }
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro na autenticação');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Brand */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600 text-white shadow-xl shadow-brand-900/20 mb-6">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Nexus Dispatch</h1>
                    <p className="text-slate-500 mt-2 font-medium">Automação Inteligente para WhatsApp</p>
                </div>

                {/* Card */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-slate-900">
                            {isSignUp ? 'Criar Nova Conta' : 'Bem-vindo de volta'}
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            {isSignUp ? 'Preencha seus dados para começar' : 'Digite suas credenciais para acessar'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-5">
                        {error && (
                            <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-start space-x-3 text-rose-600">
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <span className="text-sm font-bold">{error}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="group relative">
                                <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={20} />
                                <input
                                    type="email"
                                    placeholder="Email corporativo"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                                    required
                                />
                            </div>

                            <div className="group relative">
                                <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={20} />
                                <input
                                    type="password"
                                    placeholder="Senha"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold shadow-lg shadow-brand-900/20 hover:shadow-xl hover:shadow-brand-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <>
                                    <span>{isSignUp ? 'Criar Conta' : 'Entrar na Plataforma'}</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center space-x-2"
                        >
                            {isSignUp ? (
                                <>
                                    <LogIn size={16} />
                                    <span>Já tem uma conta? Entrar</span>
                                </>
                            ) : (
                                <>
                                    <UserPlus size={16} />
                                    <span>Não tem conta? Cadastre-se</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="mt-8 text-center text-xs text-slate-400 font-medium">
                    &copy; 2024 Nexus Dispatch. Todos os direitos reservados.
                </div>
            </div>
        </div>
    );
};

export default Login;

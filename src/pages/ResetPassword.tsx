import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Loader2, Lock, ArrowRight, AlertCircle, CheckCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';

type PageState = 'checking' | 'invalid' | 'form' | 'success';

const ResetPassword: React.FC = () => {
    const navigate = useNavigate();
    const [pageState, setPageState] = useState<PageState>('checking');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // The Supabase client parses the recovery token from the URL hash
        // and fires PASSWORD_RECOVERY. We must listen BEFORE calling getSession
        // to avoid a race condition where the page declares the link invalid.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                // User arrived via a valid recovery email link
                setPageState('form');
            } else if (event === 'SIGNED_IN' && session) {
                // Already has an active session — allow the form
                setPageState('form');
            }
        });

        // Fallback: check for an existing active session (e.g. page refresh)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setPageState((current) => current === 'checking' ? 'form' : current);
            } else {
                // Give the onAuthStateChange listener 2s to fire PASSWORD_RECOVERY
                // before declaring the link invalid (handles slow redirects)
                setTimeout(() => {
                    setPageState((current) => current === 'checking' ? 'invalid' : current);
                }, 2000);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('As senhas não coincidem. Por favor, verifique.');
            return;
        }
        if (password.length < 8) {
            setError('A nova senha deve ter pelo menos 8 caracteres.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            setPageState('success');
            setTimeout(() => navigate('/login'), 3500);
        } catch (err: any) {
            setError(err.message || 'Erro ao atualizar a senha. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    // ── States ──────────────────────────────────────────────────

    if (pageState === 'checking') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-[#FFD700]" size={48} />
                    <p className="text-slate-500 text-sm font-medium">Verificando seu link de recuperação...</p>
                </div>
            </div>
        );
    }

    if (pageState === 'invalid') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-8">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={40} className="text-red-500" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-3">
                        Link inválido ou expirado
                    </h1>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        O link de recuperação de senha é inválido ou já expirou.
                        Por favor, solicite um novo link na página de login.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full py-4 px-6 bg-[#FFD700] hover:bg-[#F4C430] text-black font-bold text-lg rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#FFD700]/30"
                    >
                        Solicitar novo link
                    </button>
                </div>
            </div>
        );
    }

    if (pageState === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-8">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6 ring-8 ring-green-50">
                        <CheckCircle size={40} className="text-green-500" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-3">
                        Senha redefinida!
                    </h1>
                    <p className="text-slate-500 mb-6 leading-relaxed">
                        Sua senha foi atualizada com sucesso. Você será redirecionado para a página de login em instantes.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                        <Loader2 className="animate-spin" size={16} />
                        <span>Redirecionando...</span>
                    </div>
                </div>
            </div>
        );
    }

    // ── Main form ────────────────────────────────────────────────
    return (
        <div className="min-h-screen flex items-center justify-center bg-white p-8">
            <div className="max-w-md w-full">

                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-[#FFD700] flex items-center justify-center mx-auto mb-5">
                        <ShieldCheck className="text-black w-7 h-7" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
                        Redefinir senha
                    </h1>
                    <p className="text-slate-500 text-base font-medium">
                        Escolha uma nova senha segura para sua conta.
                    </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4" noValidate>

                    {error && (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start space-x-3 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-600" />
                            <span className="text-sm font-medium text-red-600 leading-snug">{error}</span>
                        </div>
                    )}

                    {/* New password */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-800 ml-1 block">
                            Nova Senha
                        </label>
                        <div className="group relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-[#FFD700] transition-colors duration-300" />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Mínimo 8 caracteres"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-11 pr-12 py-4 bg-white hover:bg-gray-50 focus:bg-white border-2 border-slate-100 focus:border-[#FFD700] rounded-xl text-base text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-[#FFD700]/10 transition-all duration-300"
                                required
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((p) => !p)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700 transition-colors duration-200"
                                tabIndex={-1}
                                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm password */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-800 ml-1 block">
                            Confirmar Nova Senha
                        </label>
                        <div className="group relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-[#FFD700] transition-colors duration-300" />
                            </div>
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                placeholder="Repita a nova senha"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="block w-full pl-11 pr-12 py-4 bg-white hover:bg-gray-50 focus:bg-white border-2 border-slate-100 focus:border-[#FFD700] rounded-xl text-base text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-[#FFD700]/10 transition-all duration-300"
                                required
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm((p) => !p)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700 transition-colors duration-200"
                                tabIndex={-1}
                                aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
                            >
                                {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>

                        {/* Live match feedback */}
                        {confirmPassword && (
                            <p className={`text-xs font-semibold ml-1 mt-1 ${password === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                                {password === confirmPassword ? '✓ As senhas coincidem' : '✗ As senhas não coincidem'}
                            </p>
                        )}
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading || (!!confirmPassword && password !== confirmPassword)}
                        className="w-full py-4 px-6 bg-[#FFD700] hover:bg-[#F4C430] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-black font-bold text-xl rounded-xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-[#FFD700]/30 active:scale-[0.98] flex items-center justify-center space-x-2 shadow-lg shadow-[#FFD700]/20 mt-2"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={24} />
                        ) : (
                            <>
                                <span>Salvar nova senha</span>
                                <ArrowRight size={22} className="stroke-[3px]" />
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="w-full py-3 px-6 bg-transparent hover:bg-slate-100 text-slate-700 font-semibold text-base rounded-xl transition-all duration-300 flex items-center justify-center"
                    >
                        Voltar ao login
                    </button>
                </form>

                <p className="text-center text-xs text-slate-400 mt-8">
                    © 2026 Nexus Prospect. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
};

export default ResetPassword;

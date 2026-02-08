import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Loader2, Lock, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

const ResetPassword: React.FC = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isValidSession, setIsValidSession] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);

    useEffect(() => {
        // Check if there's a valid recovery session
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setIsValidSession(true);
            }
            setCheckingSession(false);
        };

        // Listen for auth state changes (when user clicks recovery link)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsValidSession(true);
                setCheckingSession(false);
            }
        });

        checkSession();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setSuccess(true);

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'Erro ao atualizar a senha');
        } finally {
            setLoading(false);
        }
    };

    if (checkingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="animate-spin text-[#FFD700]" size={48} />
            </div>
        );
    }

    if (!isValidSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-8">
                <div className="max-w-md w-full text-center">
                    <div className="mb-6">
                        <AlertCircle size={64} className="mx-auto text-red-500" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-4">
                        Link inválido ou expirado
                    </h1>
                    <p className="text-slate-500 mb-8">
                        O link de recuperação de senha é inválido ou expirou. Por favor, solicite um novo link.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full py-4 px-6 bg-[#FFD700] hover:bg-[#F4C430] text-black font-bold text-lg rounded-xl transition-all duration-300"
                    >
                        Voltar ao Login
                    </button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-8">
                <div className="max-w-md w-full text-center">
                    <div className="mb-6">
                        <CheckCircle size={64} className="mx-auto text-green-500" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-4">
                        Senha atualizada!
                    </h1>
                    <p className="text-slate-500 mb-4">
                        Sua senha foi alterada com sucesso. Você será redirecionado para a página de login.
                    </p>
                    <Loader2 className="animate-spin mx-auto text-slate-400" size={24} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-white p-8">
            <div className="max-w-md w-full">
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
                        Redefinir senha
                    </h1>
                    <p className="text-slate-500 text-base font-medium">
                        Digite sua nova senha abaixo.
                    </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                    {error && (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start space-x-3">
                            <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-600" />
                            <span className="text-sm font-medium text-red-600">{error}</span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-800 ml-1 block">Nova Senha</label>
                        <div className="group relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-[#FFD700] transition-colors duration-300" />
                            </div>
                            <input
                                type="password"
                                placeholder="••••••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-11 pr-4 py-4 bg-white hover:bg-gray-50 focus:bg-white border-2 border-slate-100 focus:border-[#FFD700] rounded-xl text-base text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-[#FFD700]/10 transition-all duration-300"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-800 ml-1 block">Confirmar Senha</label>
                        <div className="group relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-[#FFD700] transition-colors duration-300" />
                            </div>
                            <input
                                type="password"
                                placeholder="••••••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="block w-full pl-11 pr-4 py-4 bg-white hover:bg-gray-50 focus:bg-white border-2 border-slate-100 focus:border-[#FFD700] rounded-xl text-base text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-[#FFD700]/10 transition-all duration-300"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 px-6 bg-[#FFD700] hover:bg-[#F4C430] text-black font-bold text-xl rounded-xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-[#FFD700]/30 active:scale-[0.98] flex items-center justify-center space-x-2 shadow-lg shadow-[#FFD700]/20"
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
            </div>
        </div>
    );
};

export default ResetPassword;

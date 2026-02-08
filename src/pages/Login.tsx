import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Loader2, Mail, Lock, ArrowRight, AlertCircle, Users, Target, Layers, Bot, CheckCircle } from 'lucide-react';

const ParticleBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
        let height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;

        const particles: { x: number; y: number; vx: number; vy: number; size: number }[] = [];
        const particleCount = Math.min(Math.floor((width * height) / 15000), 80); // Reduced count slightly

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.3, // Slower speed
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 1.5 + 0.5, // Smaller particles
            });
        }

        const draw = () => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, width, height);

            // Update and draw particles - Reduced Opacity
            ctx.fillStyle = 'rgba(255, 215, 0, 0.3)'; // Gold with low opacity
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.05)'; // Very subtle lines

            particles.forEach((p, i) => {
                p.x += p.vx;
                p.y += p.vy;

                // Bounce
                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();

                // Connect
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            });

            requestAnimationFrame(draw);
        };

        const animationId = requestAnimationFrame(draw);

        const handleResize = () => {
            if (!canvas.parentElement) return;
            width = canvas.width = canvas.parentElement.clientWidth;
            height = canvas.height = canvas.parentElement.clientHeight;
        };

        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 z-0 bg-[#0a0a0a]" />;
};


const Login: React.FC = () => {
    const navigate = useNavigate();
    const [isSignUp, setIsSignUp] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
                alert('Conta criada! Verifique seu email para confirmar o cadastro.');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                navigate('/');
            }
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro na autenticação');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message || 'Erro ao conectar com Google');
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError('Por favor, digite seu email.');
            return;
        }
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/#/reset-password`,
            });
            if (error) throw error;
            setSuccessMessage('Email de recuperação enviado! Verifique sua caixa de entrada.');
        } catch (err: any) {
            setError(err.message || 'Erro ao enviar email de recuperação');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex w-full font-sans">
            {/* Left Side - Tech Background (Visual) */}
            <div className="hidden lg:flex lg:w-[60%] relative bg-[#050505] items-center justify-center overflow-hidden">
                <ParticleBackground />
                <div className="relative z-10 p-12 max-w-3xl flex flex-col justify-center h-full pt-12">
                    <div className="mb-6">
                        <h1 className="text-5xl font-bold text-white mb-2 tracking-tight leading-tight">
                            Gestão e Inteligência Comercial <br />
                            para <span className="text-[#FFD700]">Indústrias & Varejo</span>
                        </h1>
                        <p className="text-slate-400 text-xl leading-relaxed">
                            Potencialize a gestão da sua empresa com uma plataforma que tem tudo.
                        </p>
                    </div>

                    <div className="space-y-2">
                        {/* Feature 1 */}
                        <div className="flex items-start gap-3 p-2.5 rounded-2xl hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-white/10 group cursor-default">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 ring-1 ring-white/10 group-hover:ring-[#FFD700]/50 group-hover:bg-[#FFD700]/10 shadow-[0_0_15px_-3px_rgba(255,215,0,0.1)] mt-1">
                                <Target className="text-[#FFD700] w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg mb-0.5 group-hover:text-[#FFD700] transition-colors">Prospecção de Clientes Automática</h3>
                                <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                                    Faça a captação de clientes através do Linkedin, Instagram, Base CNPJ e Google Maps.
                                </p>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="flex items-start gap-3 p-2.5 rounded-2xl hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-white/10 group cursor-default">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 ring-1 ring-white/10 group-hover:ring-[#FFD700]/50 group-hover:bg-[#FFD700]/10 shadow-[0_0_15px_-3px_rgba(255,215,0,0.1)] mt-1">
                                <Users className="text-[#FFD700] w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg mb-0.5 group-hover:text-[#FFD700] transition-colors">Gestão de Clientes</h3>
                                <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                                    Realize a gestão completa dos seus leads e clientes dentro de um CRM específico para o seu negócio.
                                </p>
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="flex items-start gap-3 p-2.5 rounded-2xl hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-white/10 group cursor-default">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 ring-1 ring-white/10 group-hover:ring-[#FFD700]/50 group-hover:bg-[#FFD700]/10 shadow-[0_0_15px_-3px_rgba(255,215,0,0.1)] mt-1">
                                <Layers className="text-[#FFD700] w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg mb-0.5 group-hover:text-[#FFD700] transition-colors">Tenha setores organizados dentro da sua Empresa</h3>
                                <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                                    Operacional, Comercial, Financeiro, Equipe, Clientes e Negócios? Todos separados para facilitar a sua organização.
                                </p>
                            </div>
                        </div>

                        {/* Feature 4 */}
                        <div className="flex items-start gap-3 p-2.5 rounded-2xl hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-white/10 group cursor-default">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 ring-1 ring-white/10 group-hover:ring-[#FFD700]/50 group-hover:bg-[#FFD700]/10 shadow-[0_0_15px_-3px_rgba(255,215,0,0.1)] mt-1">
                                <Bot className="text-[#FFD700] w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg mb-0.5 group-hover:text-[#FFD700] transition-colors">Agentes de Inteligência Artificial</h3>
                                <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                                    Totalmente personalizáveis, prontos para conectar no WhatsApp da sua empresa em menos de 5 minutos.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Decorative overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-0" />
            </div>

            {/* Right Side - White Form */}
            <div className="w-full lg:w-[40%] bg-white flex items-center justify-center p-8 lg:p-12 relative z-20 shadow-2xl shadow-black/20">
                <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 flex flex-col items-center"> {/* Centering container content */}
                    <div className="mb-6 text-center w-full"> {/* Force text center */}
                        <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
                            {isForgotPassword ? 'Recuperar senha' : isSignUp ? 'Crie sua conta' : 'Bem-vindo de volta'}
                        </h2>
                        <p className="text-slate-500 text-base font-medium">
                            {isForgotPassword ? 'Digite seu email para receber o link de recuperação.' : isSignUp ? 'Preencha os dados abaixo para começar.' : 'Por favor, insira seus dados para entrar.'}
                        </p>
                    </div>

                    <form onSubmit={isForgotPassword ? handleForgotPassword : handleAuth} className="space-y-4 w-full"> {/* Ensure form takes full width */}
                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start space-x-3 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-600" />
                                <span className="text-sm font-medium text-red-600 leading-snug">{error}</span>
                            </div>
                        )}

                        {successMessage && (
                            <div className="p-4 rounded-xl bg-green-50 border border-green-100 flex items-start space-x-3 animate-in fade-in slide-in-from-top-2">
                                <CheckCircle size={18} className="shrink-0 mt-0.5 text-green-600" />
                                <span className="text-sm font-medium text-green-600 leading-snug">{successMessage}</span>
                            </div>
                        )}

                        <div className="space-y-4 w-full">
                            <div className="space-y-2 w-full text-left"> {/* Align labels to left even if container is centered, or center them too? Usually left aligned is better for forms */}
                                <label className="text-sm font-bold text-slate-800 ml-1 block text-center lg:text-left">Email Corporativo</label>
                                <div className="group relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-[#FFD700] transition-colors duration-300" />
                                    </div>
                                    <input
                                        type="email"
                                        placeholder="seu@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full pl-11 pr-4 py-4 bg-white hover:bg-gray-50 focus:bg-white border-2 border-slate-100 focus:border-[#FFD700] rounded-xl text-base text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-[#FFD700]/10 transition-all duration-300 ease-out shadow-sm"
                                        required
                                    />
                                </div>
                            </div>

                            {!isForgotPassword && (
                                <div className="space-y-2 w-full text-left">
                                    <label className="text-sm font-bold text-slate-800 ml-1 block text-center lg:text-left">Senha</label>
                                    <div className="group relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-[#FFD700] transition-colors duration-300" />
                                        </div>
                                        <input
                                            type="password"
                                            placeholder="••••••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="block w-full pl-11 pr-4 py-4 bg-white hover:bg-gray-50 focus:bg-white border-2 border-slate-100 focus:border-[#FFD700] rounded-xl text-base text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-[#FFD700]/10 transition-all duration-300 ease-out shadow-sm"
                                            required
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {!isForgotPassword && (
                            <div className="flex items-center justify-between pt-1 w-full">
                                <label className="flex items-center space-x-2 cursor-pointer group">
                                    <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-[#FFD700] focus:ring-[#FFD700] transition duration-200" />
                                    <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">Lembrar de mim</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => { setIsForgotPassword(true); setError(null); setSuccessMessage(null); }}
                                    className="text-sm font-bold text-slate-700 hover:text-slate-900 transition-colors underline decoration-transparent hover:decoration-slate-700 underline-offset-4"
                                >
                                    Esqueceu a senha?
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 px-6 bg-[#FFD700] hover:bg-[#F4C430] text-black font-bold text-xl rounded-xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-[#FFD700]/30 active:scale-[0.98] flex items-center justify-center space-x-2 shadow-lg shadow-[#FFD700]/20"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={24} />
                            ) : (
                                <>
                                    <span>{isForgotPassword ? 'Enviar link de recuperação' : isSignUp ? 'Criar Conta' : 'Entrar na Plataforma'}</span>
                                    <ArrowRight size={22} className="stroke-[3px]" />
                                </>
                            )}
                        </button>

                        {isForgotPassword && (
                            <button
                                type="button"
                                onClick={() => { setIsForgotPassword(false); setError(null); setSuccessMessage(null); }}
                                className="w-full py-3 px-6 bg-transparent hover:bg-slate-100 text-slate-700 font-semibold text-base rounded-xl transition-all duration-300 flex items-center justify-center"
                            >
                                Voltar ao login
                            </button>
                        )}

                        {!isForgotPassword && (
                            <>
                                {/* Divider */}
                                <div className="flex items-center gap-4 w-full">
                                    <div className="flex-1 h-px bg-slate-200"></div>
                                    <span className="text-sm font-medium text-slate-400">ou continue com</span>
                                    <div className="flex-1 h-px bg-slate-200"></div>
                                </div>

                                {/* Google Login Button */}
                                <button
                                    type="button"
                                    onClick={handleGoogleLogin}
                                    disabled={loading}
                                    className="w-full py-2.5 px-6 bg-white hover:bg-gray-50 border-2 border-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg hover:border-slate-300 active:scale-[0.98] flex items-center justify-center space-x-2"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    <span>{isSignUp ? 'Cadastrar com o Google' : 'Entrar com o Google'}</span>
                                </button>
                            </>
                        )}

                        {!isForgotPassword && (
                            <div className="text-center pt-4 border-t border-slate-100 mt-4 w-full">
                                <p className="text-slate-500 text-sm font-medium">
                                    {isSignUp ? 'Já tem uma conta?' : 'Ainda não é cliente?'}
                                    <button
                                        type="button"
                                        onClick={() => setIsSignUp(!isSignUp)}
                                        className="ml-2 font-bold text-slate-900 hover:text-slate-700 transition-colors hover:underline underline-offset-4"
                                    >
                                        {isSignUp ? 'Fazer Login' : 'Criar conta agora'}
                                    </button>
                                </p>
                            </div>
                        )}
                    </form>

                    <div className="mt-8 text-center w-full">
                        <p className="text-xs font-medium text-slate-400">
                            © 2026 Conecta Consultoria. Todos os direitos reservados.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

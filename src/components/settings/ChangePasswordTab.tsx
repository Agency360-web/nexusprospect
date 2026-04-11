import React, { useState } from 'react';
import {
  Lock, Eye, EyeOff, ShieldCheck, AlertCircle,
  CheckCircle, Loader2, KeyRound, ShieldAlert,
  CheckCheck, Info,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

type FormState = 'idle' | 'loading' | 'success' | 'error';

interface PasswordField {
  value: string;
  visible: boolean;
}

// ─────────────────────────────────────────────────────────────
// PasswordInput is defined OUTSIDE the parent component.
// This is critical: if defined inside, React creates a new
// component type on every render → unmounts/remounts the <input>
// → loses focus after each keystroke.
// ─────────────────────────────────────────────────────────────
interface PasswordInputProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
  hint?: React.ReactNode;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
  id,
  label,
  placeholder,
  value,
  visible,
  onChange,
  onToggleVisibility,
  hint,
}) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="text-sm font-semibold text-slate-700 block">
      {label}
    </label>
    <div className="group relative">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
        <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-slate-700 transition-colors" />
      </div>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-200"
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={onToggleVisibility}
        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
        tabIndex={-1}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
    {hint}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Helper — also outside, pure function, no closures over state
// ─────────────────────────────────────────────────────────────
const getPasswordStrength = (password: string) => {
  if (!password) return { score: 0, label: '', color: '', bg: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Fraca', color: '#ef4444', bg: 'bg-red-500' };
  if (score <= 3) return { score, label: 'Razoável', color: '#f59e0b', bg: 'bg-amber-500' };
  if (score <= 4) return { score, label: 'Boa', color: '#3b82f6', bg: 'bg-blue-500' };
  return { score, label: 'Excelente', color: '#22c55e', bg: 'bg-green-500' };
};

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
const ChangePasswordTab: React.FC = () => {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState<PasswordField>({ value: '', visible: false });
  const [newPassword, setNewPassword] = useState<PasswordField>({ value: '', visible: false });
  const [confirmPassword, setConfirmPassword] = useState<PasswordField>({ value: '', visible: false });
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const strength = getPasswordStrength(newPassword.value);
  const passwordsMatch = !!(newPassword.value && confirmPassword.value && newPassword.value === confirmPassword.value);
  const passwordsMismatch = !!(confirmPassword.value && newPassword.value !== confirmPassword.value);

  const resetForm = () => {
    setCurrentPassword({ value: '', visible: false });
    setNewPassword({ value: '', visible: false });
    setConfirmPassword({ value: '', visible: false });
    setErrorMessage(null);
    setFormState('idle');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
      setErrorMessage('Por favor, preencha todos os campos.');
      setFormState('error');
      return;
    }
    if (newPassword.value.length < 8) {
      setErrorMessage('A nova senha deve ter no mínimo 8 caracteres.');
      setFormState('error');
      return;
    }
    if (newPassword.value !== confirmPassword.value) {
      setErrorMessage('A nova senha e a confirmação não coincidem.');
      setFormState('error');
      return;
    }
    if (currentPassword.value === newPassword.value) {
      setErrorMessage('A nova senha não pode ser igual à senha atual.');
      setFormState('error');
      return;
    }

    setFormState('loading');

    try {
      // STEP 1: Verify current password via re-authentication
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email ?? '',
        password: currentPassword.value,
      });
      if (signInError) {
        throw new Error('Senha atual incorreta. Por favor, verifique e tente novamente.');
      }

      // STEP 2: Update — Supabase applies bcrypt automatically
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword.value,
      });
      if (updateError) {
        throw new Error(updateError.message ?? 'Erro ao atualizar a senha. Tente novamente.');
      }

      setFormState('success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocorreu um erro inesperado. Tente novamente.');
      setFormState('error');
    }
  };

  // ── Success state ──
  if (formState === 'success') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center py-20 px-8">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5 ring-8 ring-green-50">
          <CheckCircle className="text-green-600 w-10 h-10" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">Senha alterada com sucesso!</h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-8 text-center max-w-sm">
          Sua senha foi atualizada e encriptada com segurança. Utilize a nova senha no próximo acesso.
        </p>
        <button
          type="button"
          onClick={resetForm}
          className="px-7 py-3 bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm"
        >
          Alterar novamente
        </button>
      </div>
    );
  }

  // ── Main form ──
  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
            <KeyRound className="text-white w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Segurança da Conta</h2>
            <p className="text-sm text-slate-500">Gerencie sua senha e proteja sua conta.</p>
          </div>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">

        {/* LEFT — Form (3 cols) */}
        <div className="xl:col-span-3 space-y-6">

          {/* Security notice */}
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <ShieldCheck className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-800 mb-0.5">Verificação de identidade</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Por segurança, confirmaremos sua{' '}
                <span className="font-semibold text-slate-700">senha atual</span>{' '}
                antes de aplicar qualquer alteração. Isso protege sua conta de acessos não autorizados.
              </p>
            </div>
          </div>

          {/* Error banner */}
          {errorMessage && (
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-2xl border border-red-100 animate-in fade-in slide-in-from-top-2 duration-200">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <span className="text-sm font-medium text-red-700 leading-snug">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Current password card */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Senha Atual</p>
              <PasswordInput
                id="current-password"
                label="Digite sua senha atual"
                placeholder="••••••••••••"
                value={currentPassword.value}
                visible={currentPassword.visible}
                onChange={(val) => setCurrentPassword((prev) => ({ ...prev, value: val }))}
                onToggleVisibility={() => setCurrentPassword((prev) => ({ ...prev, visible: !prev.visible }))}
              />
            </div>

            {/* New password card */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nova Senha</p>

              <PasswordInput
                id="new-password"
                label="Nova Senha"
                placeholder="Mínimo 8 caracteres"
                value={newPassword.value}
                visible={newPassword.visible}
                onChange={(val) => setNewPassword((prev) => ({ ...prev, value: val }))}
                onToggleVisibility={() => setNewPassword((prev) => ({ ...prev, visible: !prev.visible }))}
                hint={
                  newPassword.value ? (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="h-1.5 flex-1 rounded-full overflow-hidden bg-slate-100">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${i <= strength.score ? strength.bg : ''}`}
                              style={{ width: i <= strength.score ? '100%' : '0%' }}
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs font-semibold" style={{ color: strength.color }}>
                        Força: {strength.label}
                      </p>
                    </div>
                  ) : null
                }
              />

              <PasswordInput
                id="confirm-password"
                label="Confirmar Nova Senha"
                placeholder="Repita a nova senha"
                value={confirmPassword.value}
                visible={confirmPassword.visible}
                onChange={(val) => setConfirmPassword((prev) => ({ ...prev, value: val }))}
                onToggleVisibility={() => setConfirmPassword((prev) => ({ ...prev, visible: !prev.visible }))}
                hint={
                  confirmPassword.value ? (
                    <div
                      className={`mt-1.5 flex items-center gap-1.5 text-xs font-semibold ${
                        passwordsMatch ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {passwordsMatch ? (
                        <><CheckCheck className="w-3.5 h-3.5" /> As senhas coincidem</>
                      ) : (
                        <><AlertCircle className="w-3.5 h-3.5" /> As senhas não coincidem</>
                      )}
                    </div>
                  ) : null
                }
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={formState === 'loading' || passwordsMismatch}
                className="flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all duration-200 shadow-sm"
              >
                {formState === 'loading' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>Alterando senha...</span></>
                ) : (
                  <><ShieldCheck className="w-4 h-4" /><span>Salvar Nova Senha</span></>
                )}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={formState === 'loading'}
                className="py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all duration-200"
              >
                Cancelar
              </button>
            </div>

          </form>
        </div>

        {/* RIGHT — Info panel (2 cols) */}
        <div className="xl:col-span-2 space-y-5">

          {/* Requirements checklist — reactive to what user types */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-slate-600" />
              <p className="text-sm font-bold text-slate-800">Requisitos da senha</p>
            </div>
            <ul className="space-y-2.5">
              {[
                { text: 'Mínimo de 8 caracteres', met: newPassword.value.length >= 8 },
                { text: 'Pelo menos uma letra maiúscula', met: /[A-Z]/.test(newPassword.value) },
                { text: 'Pelo menos um número', met: /[0-9]/.test(newPassword.value) },
                { text: 'Pelo menos um símbolo (!@#$...)', met: /[^A-Za-z0-9]/.test(newPassword.value) },
              ].map(({ text, met }) => (
                <li key={text} className="flex items-center gap-2.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                      newPassword.value ? (met ? 'bg-green-100' : 'bg-red-50') : 'bg-slate-100'
                    }`}
                  >
                    {newPassword.value && met ? (
                      <CheckCircle className="w-3 h-3 text-green-600" />
                    ) : (
                      <div className={`w-1.5 h-1.5 rounded-full ${newPassword.value && !met ? 'bg-red-400' : 'bg-slate-300'}`} />
                    )}
                  </div>
                  <span
                    className={`text-xs leading-snug transition-colors duration-300 ${
                      newPassword.value ? (met ? 'text-green-700 font-medium' : 'text-slate-500') : 'text-slate-500'
                    }`}
                  >
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Security tips — dark card */}
          <div className="p-5 bg-slate-900 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-4 h-4 text-yellow-400" />
              <p className="text-sm font-bold text-white">Dicas de segurança</p>
            </div>
            <ul className="space-y-2.5">
              {[
                'Nunca compartilhe sua senha com ninguém.',
                'Evite reutilizar senhas de outras contas.',
                'Use um gerenciador de senhas para mais segurança.',
                'Troque sua senha periodicamente.',
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-yellow-400 shrink-0 mt-1.5" />
                  <span className="text-xs text-slate-300 leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Account info */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Conta</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-white">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.email}</p>
                <p className="text-xs text-slate-400">Autenticado via Supabase Auth</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ChangePasswordTab;

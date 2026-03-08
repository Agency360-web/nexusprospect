import { useAuth } from '../contexts/AuthContext';

// Páginas padrão para usuários sem configuração explícita
const DEFAULT_PAGES = ['dashboard', 'admin', 'clients', 'settings', 'reports', 'transmission'];

export const useRBAC = () => {
    const { profile, user } = useAuth();

    /**
     * Checks if the user has access to a specific page/module.
     * Admins always have access to everything.
     * Users without explicit permissions get default access.
     */
    const canAccess = (pageKey: string): boolean => {
        // Se não tem usuário autenticado, bloqueia
        if (!user) return false;

        // Se profile ainda não carregou mas user existe, dar acesso padrão
        if (!profile) {
            return DEFAULT_PAGES.includes(pageKey);
        }

        // Admins have bypass
        if (profile.role === 'admin') return true;

        // Check explicit permissions
        if (profile.allowed_pages && Array.isArray(profile.allowed_pages) && profile.allowed_pages.length > 0) {
            return profile.allowed_pages.includes(pageKey);
        }

        // Fallback: se não tiver allowed_pages configurado, dar acesso padrão
        return DEFAULT_PAGES.includes(pageKey);
    };

    /**
     * Checks if the user has a specific structural role.
     */
    const hasRole = (role: 'admin' | 'operator' | 'support' | 'user'): boolean => {
        return profile?.role === role;
    };

    return {
        canAccess,
        hasRole,
        role: profile?.role,
        loading: !profile && !user
    };
};


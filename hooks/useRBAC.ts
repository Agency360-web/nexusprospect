import { useAuth } from '../contexts/AuthContext';

export const useRBAC = () => {
    const { profile } = useAuth();

    /**
     * Checks if the user has access to a specific page/module.
     * Admins always have access to everything.
     */
    const canAccess = (pageKey: string): boolean => {
        if (!profile) return false;

        // Admins have bypass
        if (profile.role === 'admin') return true;

        // Check explicit permissions
        if (profile.allowed_pages && Array.isArray(profile.allowed_pages)) {
            return profile.allowed_pages.includes(pageKey);
        }

        return false;
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
        loading: !profile // You might want to handle loading states in UI
    };
};

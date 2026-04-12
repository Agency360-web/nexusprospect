/**
 * Nexus Prospect - Security Utilities
 * Minimalist sanitization to prevent common XSS patterns without external dependencies.
 */

export const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  
  // Basic removal of <script> and event handlers (onmouseover, onclick, etc)
  return html
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "") // Remove <script> tags
    .replace(/on\w+="[^"]*"/gim, "") // Remove inline event handlers
    .replace(/on\w+='[^']*'/gim, "")
    .replace(/javascript:[^"']*/gim, ""); // Remove javascript: URIs
};

/**
 * Escapes characters for safe HTML output
 */
export const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Google Calendar Integration Service
// Handles OAuth flow and Calendar API interactions

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

// These should be set in environment variables
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = typeof window !== 'undefined'
    ? `${window.location.origin}`
    : 'http://localhost:3001';

const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
].join(' ');

export interface CalendarEvent {
    id: string;
    summary: string;
    description?: string;
    colorId?: string;
    start: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    end: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    location?: string;
    htmlLink?: string;
    attendees?: Array<{
        email: string;
        displayName?: string;
        responseStatus?: string;
    }>;
    conferenceData?: {
        entryPoints?: Array<{
            uri: string;
            label?: string;
        }>;
    };
    linkedClient?: {
        id: string;
        name: string;
    } | null;
}

export interface GoogleTokens {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
}

/**
 * Generate the Google OAuth authorization URL
 */
export const getGoogleAuthUrl = (state?: string): string => {
    // Debugging redirect URI mismatch
    console.log('Google Auth Config:', {
        CLIENT_ID: CLIENT_ID ? 'Set' : 'Missing',
        REDIRECT_URI: REDIRECT_URI,
        Origin: window.location.origin
    });

    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: SCOPES,
        access_type: 'offline',
        prompt: 'consent',
        ...(state && { state })
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
};

/**
 * Exchange authorization code for tokens
 */
export const exchangeCodeForTokens = async (code: string): Promise<GoogleTokens> => {
    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: REDIRECT_URI,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error_description || 'Failed to exchange code for tokens');
    }

    return response.json();
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (refreshToken: string): Promise<GoogleTokens> => {
    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error_description || 'Failed to refresh token');
    }

    return response.json();
};

/**
 * Fetch calendar events for a date range
 */
export const fetchCalendarEvents = async (
    accessToken: string,
    timeMin: Date,
    timeMax: Date
): Promise<CalendarEvent[]> => {
    const params = new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '50',
    });

    const response = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/primary/events?${params.toString()}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('TOKEN_EXPIRED');
        }
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch events');
    }

    const data = await response.json();
    return data.items || [];
};

/**
 * Get today's date range
 */
export const getTodayRange = (): { start: Date; end: Date } => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return { start, end };
};

/**
 * Get week date range (next 7 days)
 */
export const getWeekRange = (): { start: Date; end: Date } => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);

    return { start, end };
};

/**
 * Get month date range for a specific date
 * Returns the first day of the calendar grid (potentially prev month) 
 * and last day (potentially next month) to cover 6 weeks
 */
export const getMonthRange = (date: Date): { start: Date; end: Date } => {
    const year = date.getFullYear();
    const month = date.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Start range: go back to Sunday
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDay.getDay());
    start.setHours(0, 0, 0, 0);

    // End range: go forward to Saturday to complete the grid (usually 42 days total)
    const end = new Date(lastDay);
    const daysToAdd = 6 - lastDay.getDay();
    end.setDate(lastDay.getDate() + daysToAdd);
    end.setHours(23, 59, 59, 999);

    return { start, end };
};

// Google Calendar Color ID Mapping (Approximate Tailwind classes)
export const GOOGLE_EVENT_COLORS: Record<string, { bg: string, text: string, border: string, dot: string }> = {
    '1': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-500' }, // Lavender
    '2': { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' }, // Sage
    '3': { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800', border: 'border-fuchsia-200', dot: 'bg-fuchsia-500' }, // Grape
    '4': { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200', dot: 'bg-rose-500' }, // Flamingo
    '5': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', dot: 'bg-yellow-500' }, // Banana
    '6': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', dot: 'bg-orange-500' }, // Tangerine
    '7': { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200', dot: 'bg-cyan-500' }, // Peacock
    '8': { bg: 'bg-slate-200', text: 'text-slate-800', border: 'border-slate-300', dot: 'bg-slate-600' }, // Graphite
    '9': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-600' }, // Blueberry
    '10': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', dot: 'bg-green-600' }, // Basil
    '11': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', dot: 'bg-red-600' }, // Tomato
};

export const DEFAULT_EVENT_COLOR = { bg: 'bg-slate-100', text: 'text-slate-900', border: 'border-slate-200', dot: 'bg-slate-600' };

export const getEventColorClasses = (colorId?: string) => {
    if (!colorId || !GOOGLE_EVENT_COLORS[colorId]) return DEFAULT_EVENT_COLOR;
    return GOOGLE_EVENT_COLORS[colorId];
};

/**
 * Helper to safely parse Google Calendar date
 * Handles YYYY-MM-DD (all day) vs ISO string (dateTime)
 * Ensures YYYY-MM-DD is treated as local date, avoiding timezone shifts
 */
export const getEventDate = (event: CalendarEvent): Date => {
    if (event.start.dateTime) {
        return new Date(event.start.dateTime);
    }
    if (event.start.date) {
        // Parse YYYY-MM-DD manually to create local date
        // new Date("2026-02-11") creates UTC, which shifts to prev day in UTC-3
        // new Date(2026, 1, 11) creates Local
        const [year, month, day] = event.start.date.split('-').map(Number);
        return new Date(year, month - 1, day);
    }
    return new Date();
};

/**
 * Format event time for display
 */
export const formatEventTime = (event: CalendarEvent): string => {
    // All-day event check
    if (event.start.date && !event.start.dateTime) {
        return 'Dia inteiro';
    }

    const date = getEventDate(event);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Format event date for display
 */
export const formatEventDate = (event: CalendarEvent): string => {
    const date = getEventDate(event);
    // Reset hours for accurate date comparison
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (compareDate.getTime() === today.getTime()) {
        return 'Hoje';
    } else if (compareDate.getTime() === tomorrow.getTime()) {
        return 'Amanhã';
    }

    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
};

/**
 * Check if credentials are configured
 */
export const isGoogleCalendarConfigured = (): boolean => {
    return Boolean(CLIENT_ID && CLIENT_SECRET);
};

export interface GoogleCalendarInput {
    summary: string;
    description?: string;
    location?: string;
    start: {
        dateTime?: string; // ISO string
        date?: string; // YYYY-MM-DD
    };
    end: {
        dateTime?: string; // ISO string
        date?: string; // YYYY-MM-DD
    };
    colorId?: string;
}

/**
 * Create a new event
 */
export const createCalendarEvent = async (
    accessToken: string,
    event: GoogleCalendarInput
): Promise<CalendarEvent> => {
    const response = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/primary/events`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to create event');
    }

    return response.json();
};

/**
 * Update an existing event
 */
export const updateCalendarEvent = async (
    accessToken: string,
    eventId: string,
    event: GoogleCalendarInput
): Promise<CalendarEvent> => {
    const response = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}`,
        {
            method: 'PATCH', // Helper to use PATCH for partial updates, or PUT for full. Let's use PATCH or PUT usually needed? 
            // Google API uses PUT for update, PATCH for patch. 
            // update -> full replacement. patch -> partial. 
            // Better to use PATCH if we send partial, but here we likely send full object from form.
            // Let's use PUT to be safe or PATCH if we adhere to documentation.
            // Documentation: PATCH is safer for partial. But let's assume we send all fields.
            // Let's stick to PATCH for now as it's more flexible.
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to update event');
    }

    return response.json();
};

/**
 * Delete an event
 */
export const deleteCalendarEvent = async (
    accessToken: string,
    eventId: string
): Promise<void> => {
    const response = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}`,
        {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to delete event');
    }
};

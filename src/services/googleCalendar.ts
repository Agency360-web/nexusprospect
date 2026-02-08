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
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events.readonly'
].join(' ');

export interface CalendarEvent {
    id: string;
    summary: string;
    description?: string;
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
 * Format event time for display
 */
export const formatEventTime = (event: CalendarEvent): string => {
    const startDate = event.start.dateTime || event.start.date;
    if (!startDate) return '';

    const date = new Date(startDate);

    // All-day event
    if (event.start.date && !event.start.dateTime) {
        return 'Dia inteiro';
    }

    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Format event date for display
 */
export const formatEventDate = (event: CalendarEvent): string => {
    const startDate = event.start.dateTime || event.start.date;
    if (!startDate) return '';

    const date = new Date(startDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Hoje';
    } else if (date.toDateString() === tomorrow.toDateString()) {
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

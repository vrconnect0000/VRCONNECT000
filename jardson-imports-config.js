(function() {
    const _u = 'aHR0cHM6Ly94anRrYXRtaXhmaHhsbHVtbWdsay5zdXBhYmFzZS5jbw==';
    const _k = 'ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5ocWRHdGhkRzFwZUdab2VHeHNkVzF0WjJ4cklpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpZek1EUTVPRE1zSW1WNGNDSTZNakE1TVRnNE1EazRNMzAueWZSTnJYdlVKQUE1X3djWW93ODZjb1I0ZTF3eU0wNXBzU2llSDU5SkRucw==';

    const SUPABASE_URL = atob(_u);
    const SUPABASE_KEY = atob(_k);
    window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.ENV_CONFIG = {
        get URL() { return SUPABASE_URL; },
        get KEY() { return SUPABASE_KEY; }
    };
})();

// Configurações do Supabase
// NOTA: Em um ambiente de produção real, estas chaves devem ser gerenciadas
// via variáveis de ambiente no seu provedor de hospedagem (Vercel, Netlify, etc.)

const CONFIG = {
    SUPABASE_URL: 'https://xjtkatmixfhxllummglk.supabase.co',
    SUPABASE_KEY: 'sb_publishable_GF3-_ADsa8yXbHU0EhHBLg_MdRtBn3m'
};

// Exportar para uso global
window.ENV_CONFIG = CONFIG;

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  // Adicione outras variáveis de ambiente aqui se necessário
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
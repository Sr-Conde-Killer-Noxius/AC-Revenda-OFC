#!/bin/bash

# ==============================================================================
# SCRIPT INTELIGENTE PARA GERAR RESUMO DE PROJETO (VERSÃO 5.6 - Final e Robusta)
# ==============================================================================
# Versão final que captura páginas na raiz de /pages e também pergunta por
# subdiretórios específicos para uma cobertura completa.
# ------------------------------------------------------------------------------

# --- VERIFICAÇÃO 0: INSTALAÇÃO DA SUPABASE CLI ---
echo "Verificando se a Supabase CLI está instalada no projeto..."
if [ ! -f "node_modules/.bin/supabase" ]; then
    echo "Supabase CLI não encontrada. Instalando agora..."
    npm install supabase --save-dev
    if [ $? -ne 0 ]; then
        echo "A instalação da Supabase CLI falhou. Por favor, verifique seu ambiente npm e tente novamente."
        exit 1
    fi
    echo "Supabase CLI instalada com sucesso!"
else
    echo "Supabase CLI já instalada. OK."
fi
echo ""

# --- VERIFICAÇÃO 1: LOGIN E LINK DO PROJETO (FUNÇÃO UNIFICADA) ---
function ensure_supabase_connection() {
    # Tenta um comando silencioso para ver se está logado.
    ./node_modules/.bin/supabase projects list > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo "Você não está logado na Supabase CLI."
        echo "Pressione Enter para abrir o navegador e fazer o login."
        read -p ""
        ./node_modules/.bin/supabase login
        if [ $? -ne 0 ]; then echo "O login falhou."; exit 1; fi
    fi

    # Verifica se o projeto está linkado.
    if [ -f "supabase/config.toml" ] && grep -q "project_id" "supabase/config.toml"; then
        echo "Projeto já conectado. Verificando validade da conexão..."
        ./node_modules/.bin/supabase functions list > /dev/null 2>&1
        if [ $? -ne 0 ]; then
            echo "A autenticação atual parece ser inválida para este projeto. Vamos refazer o login."
            rm -f supabase/config.toml
            ./node_modules/.bin/supabase logout
            echo "Pressione Enter para fazer um novo login no Supabase..."
            read -p ""
            ./node_modules/.bin/supabase login
            if [ $? -ne 0 ]; then echo "O novo login falhou."; exit 1; fi
            # Chama a função novamente para refazer o link.
            ensure_supabase_connection
        else
            echo "Conexão válida. OK."
        fi
    else
        echo "Este projeto ainda não está conectado a um projeto Supabase na nuvem."
        read -p "Por favor, cole aqui o ID do seu projeto Supabase e pressione Enter: " project_id
        if [ -z "$project_id" ]; then echo "Nenhum ID de projeto foi fornecido. Saindo."; exit 1; fi
        
        ./node_modules/.bin/supabase link --project-ref "$project_id"
        if [ $? -ne 0 ]; then
            echo "A conexão com o projeto falhou (erro de permissão?). Vamos tentar fazer o login novamente."
            ./node_modules/.bin/supabase logout
            echo "Pressione Enter para fazer um novo login no Supabase..."
            read -p ""
            ./node_modules/.bin/supabase login
            if [ $? -ne 0 ]; then echo "O novo login falhou."; exit 1; fi
            echo "Tentando conectar ao projeto novamente..."
            ./node_modules/.bin/supabase link --project-ref "$project_id"
            if [ $? -ne 0 ]; then echo "A conexão falhou novamente. Verifique o ID do projeto e suas permissões."; exit 1; fi
        fi
        echo "Projeto conectado com sucesso!"
    fi
}

# Chama a função principal de verificação de conexão
ensure_supabase_connection
echo ""


# --- NOVA VERIFICAÇÃO 3: DOCKER DESKTOP ---
echo "Verificando o status do Docker Desktop..."
if ! tasklist | grep -q "Docker Desktop.exe"; then
    echo "Docker Desktop não está em execução. Tentando iniciar..."
    start "" "/c/Program Files/Docker/Docker/Docker Desktop.exe"
    
    echo "Aguardando o Docker ficar pronto (isso pode levar até 1 minuto)..."
    counter=0
    while ! docker info > /dev/null 2>&1; do
        sleep 5
        counter=$((counter+1))
        echo -n "."
        if [ $counter -ge 12 ]; then
            echo ""
            echo "ERRO: O Docker não iniciou a tempo. Por favor, inicie o Docker Desktop manualmente e rode o script novamente."
            exit 1
        fi
    done
    echo ""
    echo "Docker está pronto para uso!"
else
    echo "Docker Desktop já está em execução. OK."
fi
echo ""


# ==============================================================================
# GERAÇÃO DO RELATÓRIO
# ==============================================================================
OUTPUT_FILE="resumo_automatico_projeto.txt"
echo "Gerando resumo do projeto em '$OUTPUT_FILE'..."
echo "" > "$OUTPUT_FILE"

# --- SEÇÕES 1 a 6 (ARQUIVOS ESSENCIAIS) ---
tree -I "node_modules|.next|.git|dist" >> "$OUTPUT_FILE" 2>/dev/null
echo "" >> "$OUTPUT_FILE"
jq '.dependencies, .devDependencies' package.json >> "$OUTPUT_FILE" 2>/dev/null
echo "" >> "$OUTPUT_FILE"
if [ ! -f ".env.example" ] && [ -f ".env" ]; then cp .env .env.example; fi
if [ -f ".env.example" ]; then cat .env.example >> "$OUTPUT_FILE"; fi
echo "" >> "$OUTPUT_FILE"
if [ -f "src/integrations/supabase/types.ts" ]; then cat "src/integrations/supabase/types.ts" >> "$OUTPUT_FILE"; fi
echo "" >> "$OUTPUT_FILE"
if [ -f "src/App.tsx" ]; then cat "src/App.tsx" >> "$OUTPUT_FILE"; fi
echo "" >> "$OUTPUT_FILE"
for file in supabase/migrations/*.sql; do if [ -f "$file" ]; then echo "" >> "$OUTPUT_FILE"; echo "--- Conteúdo de: $file ---" >> "$OUTPUT_FILE"; cat "$file" >> "$OUTPUT_FILE"; fi; done
echo "" >> "$OUTPUT_FILE"

# --- SEÇÃO EXTRA: CÓDIGO-FONTE DA LÓGICA DE NEGÓCIO (DINÂMICO E INTERATIVO) ---
echo "======================================" >> "$OUTPUT_FILE"
echo "  EXTRA: CONTEÚDO DAS EDGE FUNCTIONS, PÁGINAS E HOOKS" >> "$OUTPUT_FILE"
echo "======================================" >> "$OUTPUT_FILE"

# Adiciona o conteúdo de todas as Edge Functions, se existirem
for file in supabase/functions/*/index.ts; do
    if [ -f "$file" ]; then
        echo "" >> "$OUTPUT_FILE"
        echo "--- Conteúdo de: $file ---" >> "$OUTPUT_FILE"
        cat "$file" >> "$OUTPUT_FILE"
    fi
done

# --- BLOCO DE PÁGINAS ATUALIZADO ---
echo ""
echo "Importando páginas principais da raiz de 'src/pages'..."
# **NOVO**: Adiciona automaticamente o conteúdo das páginas na raiz de src/pages
for file in src/pages/*.tsx; do
    if [ -f "$file" ]; then
        echo "" >> "$OUTPUT_FILE"
        echo "--- Conteúdo de: $file ---" >> "$OUTPUT_FILE"
        cat "$file" >> "$OUTPUT_FILE"
    fi
done

echo ""
echo "Agora, informe sobre subdiretórios importantes dentro de 'src/pages'."
read -p "Digite os caminhos dos subdiretórios separados por espaço (ex: financeiro Connection) ou pressione Enter para pular: " user_page_dirs

if [ -n "$user_page_dirs" ]; then
    echo "Importando páginas dos subdiretórios especificados..."
    OLD_IFS="$IFS"
    IFS=' '
    for dir_path in $user_page_dirs; do
        for file in src/pages/${dir_path}/*.tsx; do
            if [ -f "$file" ]; then
                echo "" >> "$OUTPUT_FILE"
                echo "--- Conteúdo de: $file ---" >> "$OUTPUT_FILE"
                cat "$file" >> "$OUTPUT_FILE"
            fi
        done
    done
    IFS="$OLD_IFS"
fi
# --- FIM DO BLOCO DE PÁGINAS ATUALIZADO ---


# Adiciona o conteúdo dos hooks personalizados, se existirem
for file in src/hooks/*.ts; do
    if [ -f "$file" ]; then
        echo "" >> "$OUTPUT_FILE"
        echo "--- Conteúdo de: $file ---" >> "$OUTPUT_FILE"
        cat "$file" >> "$OUTPUT_FILE"
    fi
done


# --- SEÇÃO 7: POLÍTICAS DE SEGURANÇA (RLS) ---
echo "======================================" >> "$OUTPUT_FILE"
echo "  7. SCHEMA COMPLETO COM POLÍTICAS DE SEGURANÇA (RLS)" >> "$OUTPUT_FILE"
echo "======================================" >> "$OUTPUT_FILE"

if ! ./node_modules/.bin/supabase db dump --linked >> "$OUTPUT_FILE" 2>/dev/null; then
    echo ""
    echo "--------------------------------------------------------------------------"
    echo "AVISO: Falha ao obter o schema e as políticas de segurança (RLS)."
    echo "O erro 'Cannot find project ref' indica que a conexão local está quebrada."
    echo "Vamos forçar uma nova conexão com o projeto Supabase para corrigir isso."
    echo "--------------------------------------------------------------------------"
    echo ""
    rm -f supabase/config.toml
    ensure_supabase_connection
    echo ""
    echo "Conexão refeita. Tentando novamente obter o schema e as políticas..."
    if ! ./node_modules/.bin/supabase db dump --linked >> "$OUTPUT_FILE"; then
        echo "" >> "$OUTPUT_FILE"
        echo "ERRO CRÍTICO: Não foi possível obter as políticas de segurança mesmo após a reconexão." >> "$OUTPUT_FILE"
        echo "ERRO CRÍTICO: O relatório final está incompleto. Verifique o ID do projeto e suas permissões."
    else
         echo "Schema e RLS obtidos com sucesso após a reconexão!"
    fi
else
    echo "Schema e RLS obtidos com sucesso."
fi

echo "" >> "$OUTPUT_FILE"

echo "Resumo gerado com sucesso em '$OUTPUT_FILE'!"
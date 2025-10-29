# AI Rules for Acerto Certo Application

This document outlines the core technologies used in this project and provides guidelines for using specific libraries to maintain consistency and best practices.

## Tech Stack Overview

* **Vite**: A fast build tool that provides an instant development server and optimized builds.
* **TypeScript**: A superset of JavaScript that adds static type definitions, improving code quality and maintainability.
* **React**: A declarative, component-based JavaScript library for building user interfaces.
* **shadcn/ui**: A collection of beautifully designed, accessible, and customizable UI components built with Radix UI and Tailwind CSS.
* **Tailwind CSS**: A utility-first CSS framework for rapidly building custom designs.
* **React Router**: A standard library for routing in React applications, enabling declarative navigation.
* **Supabase**: An open-source Firebase alternative providing a PostgreSQL database, authentication, instant APIs, and real-time subscriptions.
* **TanStack Query (React Query)**: A powerful library for managing server-side data fetching, caching, and synchronization in React.
* **Zod**: A TypeScript-first schema declaration and validation library.
* **Lucide React**: A collection of beautiful and customizable open-source icons.
* **Sonner**: A modern toast component for React.

## Library Usage Rules

To ensure consistency and leverage the strengths of each library, please adhere to the following rules:

* **UI Components**: Always use `shadcn/ui` components for building the user interface. If a required component is not available or needs significant customization, create a new component in `src/components/` that wraps or extends `shadcn/ui` primitives. **Do not modify files within `src/components/ui/` directly.**
* **Styling**: All styling must be done using **Tailwind CSS** utility classes. Avoid using inline styles or creating separate CSS modules/files (beyond `src/index.css` for global base styles).
* **Routing**: Use **React Router** for all client-side navigation and route management. All main application routes should be defined in `src/App.tsx`.
* **Backend Interactions**: All authentication, database operations (CRUD), and real-time functionalities must be handled using the **Supabase** client (`@/integrations/supabase/client`).
* **Data Fetching & Server State**: For managing server-side data, including fetching, caching, and mutations, use **TanStack Query**.
* **Form Validation**: Implement all form and data validation using **Zod** schemas.
* **Icons**: Use icons from the **lucide-react** library.
* **Toast Notifications**: For displaying temporary, non-blocking messages to the user (e.g., success, error, loading), use the **Sonner** toast component.
* **Utility Functions**: General utility functions (e.g., `cn` for class merging) should be placed in `src/lib/utils.ts`.

## **IMPORTANT: AI Interaction Guardrails**

Para garantir a estabilidade do projeto e evitar a perda de trabalho, as seguintes regras **DEVEM** ser seguidas pela IA ao realizar modificações:

1.  **Proibição de Refatoração Não Solicitada:** A IA está **ESTRITAMENTE PROIBIDA** de refatorar qualquer página, componente ou função (incluindo lógica de botões, hooks, etc.) sem uma solicitação explícita do usuário para refatorar aquele item específico. Mudanças devem ser focadas apenas na tarefa solicitada.
2.  **Manutenção do Layout:** O layout visual das páginas e componentes **NÃO DEVE SER ALTERADO** a menos que o usuário peça *explicitamente* por uma mudança no layout. A estrutura visual existente deve ser preservada em todas as outras operações.
3.  **Restrição de Exclusão:** A IA **PODE CRIAR** novos arquivos, componentes, funções ou linhas de código conforme necessário para completar a tarefa solicitada. No entanto, a IA está **PROIBIDA de APAGAR** qualquer arquivo, componente, função, bloco de código significativo ou funcionalidade existente sem a **autorização explícita** do usuário no prompt atual. Se a exclusão for necessária, a IA deve primeiro *sugerir* a exclusão e aguardar a confirmação do usuário antes de prosseguir.
4.  **Configuração Específica de Edge Functions:** As seguintes *Edge Functions* **DEVEM** sempre ter a verificação de JWT desabilitada. Ao modificar ou implantar essas funções, a IA deve garantir explicitamente que no arquivo `supabase/config.toml`, a configuração `verify_jwt` esteja definida como `false`:
    * `evolution-webhook-receiver`
    * `revenda-webhook-listener`

    Exemplo de configuração correta no `supabase/config.toml`:

    ```toml
    [functions.evolution-webhook-receiver]
    verify_jwt = false
    
    [functions.revenda-webhook-listener]
    verify_jwt = false
    ```
    
    Esta configuração (correspondente à opção "Verify JWT with legacy secret" no painel do Supabase) **NUNCA**, em hipótese alguma, deve ser ativada (`true`) para estas duas funções.

O objetivo é garantir que a IA atue como uma ferramenta de adição e modificação controlada, preservando a integridade e as funcionalidades existentes do projeto, a menos que instruída diretamente a fazer o contrário.
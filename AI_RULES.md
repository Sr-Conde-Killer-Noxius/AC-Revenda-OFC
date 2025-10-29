# AI Rules for this Application

This document outlines the core technologies used in this project and provides guidelines for using specific libraries.

## Tech Stack Overview

*   **React & TypeScript**: The application is built using React for the user interface, with TypeScript ensuring type safety and enhancing code quality.
*   **Vite**: Serves as the build tool, offering a fast development experience and optimized production builds.
*   **Tailwind CSS**: All styling is handled using a utility-first approach with Tailwind CSS, enabling rapid and consistent UI development.
*   **shadcn/ui**: A collection of accessible and customizable UI components, built on Radix UI and styled with Tailwind CSS, is used for a consistent design system.
*   **React Router DOM**: Manages client-side routing, defining the navigation structure of the application.
*   **Supabase**: Provides backend services including user authentication, database management, and serverless Edge Functions for backend logic.
*   **React Query**: Utilized for efficient server-side data fetching, caching, and synchronization across the application.
*   **React Hook Form & Zod**: Forms are managed using React Hook Form, with Zod providing robust schema-based validation.
*   **Lucide React**: A library of customizable SVG icons used throughout the application.
*   **Sonner & shadcn/ui Toast**: Used for displaying user notifications and alerts.

## Library Usage Rules

To maintain consistency and leverage the strengths of each library, please adhere to the following guidelines:

*   **UI Components**: Always use `shadcn/ui` components for all user interface elements. If a required component is not available or needs significant customization, create a new component that wraps or extends existing `shadcn/ui` primitives or Radix UI components, ensuring it is styled with Tailwind CSS. **Do not modify `shadcn/ui` files directly.**
*   **Styling**: Exclusively use Tailwind CSS classes for all styling. Avoid inline styles or separate CSS files, except for global styles defined in `src/index.css`.
*   **Routing**: Use `react-router-dom` for all navigation and route definitions. All primary application routes should be defined within `src/App.tsx`.
*   **Data Fetching & Server State**: Use `@tanstack/react-query` for fetching, caching, and managing all server-side data.
*   **Forms & Validation**: Use `react-hook-form` for managing form state and `zod` for defining and validating form schemas.
*   **Icons**: Use `lucide-react` for all icons in the application.
*   **Notifications**: Use `sonner` for transient, non-blocking toast notifications. For more persistent or interactive alerts, use the `shadcn/ui/toast` component (which is built on Radix UI Toast).
*   **Backend Interactions**: All interactions with the backend (authentication, database queries, and calls to Supabase Edge Functions) must be performed using the `supabase` client imported from `src/integrations/supabase/client.ts`.
*   **Date Manipulation**: Use `date-fns` for any date formatting, parsing, or manipulation tasks. `react-day-picker` is specifically for date input components.
*   **File Structure**: Adhere to the established directory structure: `src/pages/` for main views, `src/components/` for reusable UI components, `src/hooks/` for custom React hooks, `src/contexts/` for React Context API providers, `src/lib/` for general utility functions, and `src/integrations/` for external service clients. **Always create a new file for every new component or hook.**
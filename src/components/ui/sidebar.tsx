"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot"; // Importar Slot
import { cn } from "@/lib/utils";

// Context for sidebar state (optional, but good for complex interactions)
interface SidebarContextType {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}
const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = React.useState(false); // Default to closed for mobile
  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = React.useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen?: boolean; // New prop for mobile state
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, children, isOpen, ...props }, ref) => {
    return (
      <aside
        ref={ref}
        className={cn(
          "flex-shrink-0 h-full flex-col overflow-y-auto bg-sidebar text-sidebar-foreground", // Base styles
          "w-[280px]", // Default width for desktop
          "hidden md:flex", // Hidden on mobile, flex on medium screens and up
          isOpen && "flex w-full absolute inset-y-0 left-0 z-50", // Show as full-width overlay on mobile when open
          className
        )}
        {...props}
      >
        {children}
      </aside>
    );
  }
);
Sidebar.displayName = "Sidebar";

interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
const SidebarHeader = React.forwardRef<HTMLDivElement, SidebarHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center justify-between p-4", className)} // Added flex, justify-between, items-center
      {...props}
    />
  )
);
SidebarHeader.displayName = "SidebarHeader";

interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {}
const SidebarContent = React.forwardRef<HTMLDivElement, SidebarContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex-1 p-4", className)} {...props} />
  )
);
SidebarContent.displayName = "SidebarContent";

interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {}
const SidebarFooter = React.forwardRef<HTMLDivElement, SidebarFooterProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-4 border-t border-sidebar-border", className)} {...props} />
  )
);
SidebarFooter.displayName = "SidebarFooter";

interface SidebarGroupProps extends React.HTMLAttributes<HTMLDivElement> {}
const SidebarGroup = React.forwardRef<HTMLDivElement, SidebarGroupProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("mb-4", className)} {...props} />
  )
);
SidebarGroup.displayName = "SidebarGroup";

interface SidebarGroupLabelProps extends React.HTMLAttributes<HTMLHeadingElement> {}
const SidebarGroupLabel = React.forwardRef<HTMLHeadingElement, SidebarGroupLabelProps>(
  ({ className, ...props }, ref) => (
    <h4
      ref={ref}
      className={cn("mb-2 text-xs font-semibold uppercase text-muted-foreground", className)}
      {...props}
    />
  )
);
SidebarGroupLabel.displayName = "SidebarGroupLabel";

interface SidebarGroupContentProps extends React.HTMLAttributes<HTMLDivElement> {}
const SidebarGroupContent = React.forwardRef<HTMLDivElement, SidebarGroupContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-1", className)} {...props} />
  )
);
SidebarGroupContent.displayName = "SidebarGroupContent";

interface SidebarMenuProps extends React.HTMLAttributes<HTMLUListElement> {}
const SidebarMenu = React.forwardRef<HTMLUListElement, SidebarMenuProps>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn("space-y-1", className)} {...props} />
  )
);
SidebarMenu.displayName = "SidebarMenu";

interface SidebarMenuItemProps extends React.HTMLAttributes<HTMLLIElement> {}
const SidebarMenuItem = React.forwardRef<HTMLLIElement, SidebarMenuItemProps>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn("", className)} {...props} />
  )
);
SidebarMenuItem.displayName = "SidebarMenuItem";

interface SidebarMenuButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}
const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ className, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "flex items-center w-full px-3 py-2 rounded-md text-sm transition-colors duration-200",
          "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarMenuButton.displayName = "SidebarMenuButton";

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
};
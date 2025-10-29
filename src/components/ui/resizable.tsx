"use client";

import * as React from "react";
import { GripVertical } from "lucide-react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";

import { cn } from "@/lib/utils";

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof PanelGroup>) => (
  <PanelGroup
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props}
  />
);

const ResizablePanel = Panel;

const ResizableHandle = React.forwardRef<
  HTMLDivElement, // Tipo do ref: O ref apontará para um HTMLDivElement
  React.ComponentPropsWithoutRef<typeof PanelResizeHandle> & {
    withHandle?: boolean;
  }
>(({ className, withHandle, ...props }, ref) => {
  return (
    <PanelResizeHandle
      // Combina o 'ref' do forwardRef com o restante das 'props'
      // e faz um type assertion para garantir que o PanelResizeHandle receba o 'ref' corretamente.
      {...({ ref, ...props } as React.ComponentProps<typeof PanelResizeHandle>)}
      className={cn(
        "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
        className
      )}
    >
      {withHandle && (
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-background">
          <GripVertical className="h-2.5 w-2.5" />
        </div>
      )}
    </PanelResizeHandle>
  );
});
ResizableHandle.displayName = PanelResizeHandle.displayName;

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
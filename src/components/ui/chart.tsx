import * as React from "react";
import * as RechartsPrimitive from "recharts";
// Removido: import { type TooltipPayload, type LegendPayload } from "recharts";
import { cn } from "@/lib/utils";
// import { VariantProps } from "class-variance-authority"; // Removido: variável não utilizada

// Inferindo TooltipPayload e LegendPayload a partir das props dos componentes Recharts
type TooltipPayload = RechartsPrimitive.TooltipProps<any, any>['payload'];
type LegendPayload = RechartsPrimitive.LegendProps['payload']; // Corrigido: removendo genéricos

const ChartContext = React.createContext<
  React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer> & {
    /**
     * The color of the chart.
     * @example "primary"
     */
    color?: string;
    /**
     * The colors of the chart.
     * @example ["red", "blue", "green"]
     */
    colors?: string[];
    /**
     * The CSS class name for the chart.
     */
    className?: string;
  }
>(undefined!);

const Chart = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer> & {
    /**
     * The color of the chart.
     * @example "primary"
     */
    color?: string;
    /**
     * The colors of the chart.
     * @example ["red", "blue", "green"]
     */
    colors?: string[];
    /**
     * The CSS class name for the chart.
     */
    className?: string;
  }
>(({ color, colors, className, children, ...props }, ref) => {
  return (
    <ChartContext.Provider value={{ color, colors, className, children }}>
      <div ref={ref} className={cn("h-full w-full", className)}>
        <RechartsPrimitive.ResponsiveContainer {...props}>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
Chart.displayName = "Chart";

const ChartTooltip = RechartsPrimitive.Tooltip;

// Redefinindo ChartTooltipContentProps para listar explicitamente as props que recebe
interface ChartTooltipContentProps {
  active?: boolean;
  payload?: TooltipPayload; // Corrigido: usando o tipo TooltipPayload inferido
  label?: string | number;
  labelFormatter?: (label: string | number, payload: TooltipPayload) => React.ReactNode; // Corrigido: usando o tipo TooltipPayload inferido
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: "dot" | "line";
  nameKey?: string;
  labelKey?: string;
  className?: string;
  // Adicione outras props que Recharts.Tooltip passa para o seu 'content' customizado, se necessário
}

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  ChartTooltipContentProps
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      nameKey,
      labelKey,
      ...props
    },
    ref
  ) => {
    const { colors } = React.useContext(ChartContext);

    if (active && payload && payload.length) {
      return (
        <div
          ref={ref}
          className={cn(
            "grid min-w-[130px] items-center break-words rounded-xl border border-border bg-background/95 p-4 text-xs shadow-2xl backdrop-blur-sm",
            className
          )}
          {...props}
        >
          {!hideLabel && (
            <div className="border-b border-border pb-2 text-sm font-medium">
              {labelFormatter ? labelFormatter(label!, payload) : label}
            </div>
          )}
          <div className="grid gap-1.5">
            {payload.map((item: any, index: number) => {
              const key = `${nameKey || item.name || item.dataKey || "value"}`;
              const itemColor = colors?.[index] || item.color;

              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center justify-between gap-x-4 py-1",
                    item.color
                  )}
                >
                  <div className="flex items-center gap-x-2">
                    {!hideIndicator && (
                      <span
                        className={cn("h-2 w-2 rounded-full", {
                          "bg-primary": indicator === "dot",
                          "w-0 border-l-2 border-primary": indicator === "line",
                        })}
                        style={{
                          backgroundColor:
                            indicator === "dot" ? itemColor : undefined,
                          borderColor:
                            indicator === "line" ? itemColor : undefined,
                        }}
                      />
                    )}
                    {item.name}
                  </div>
                  <span className="text-right font-medium tabular-nums text-foreground">
                    {item.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return null;
  }
);
ChartTooltipContent.displayName = "ChartTooltipContent";

const ChartLegend = RechartsPrimitive.Legend;

// Redefinindo ChartLegendContentProps para listar explicitamente as props que recebe
interface ChartLegendContentProps {
  payload?: LegendPayload; // Corrigido: usando o tipo LegendPayload inferido
  layout?: 'horizontal' | 'vertical';
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  onClick?: React.HTMLAttributes<HTMLDivElement>['onClick'];
  nameKey?: string;
  className?: string;
  // Adicione outras props que Recharts.Legend passa para o seu 'content' customizado, se necessário
}

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  ChartLegendContentProps
>(
  (
    {
      className,
      verticalAlign = "bottom",
      nameKey,
      payload,
      onClick,
      ...props
    },
    ref
  ) => {
    const { colors } = React.useContext(ChartContext);

    if (!payload || !payload.length) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-4",
          verticalAlign === "top" ? "pb-8" : "pt-8",
          className
        )}
        onClick={onClick}
        {...props}
      >
        {payload.map((item: any) => {
          const key = `${nameKey || item.dataKey || "value"}`;

          if (item.inactive) return null;

          return (
            <div
              key={key}
              className="flex items-center gap-x-2"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: colors?.[0] || item.color,
                }}
              />
              {item.value}
            </div>
          );
        })}
      </div>
    );
  }
);
ChartLegendContent.displayName = "ChartLegendContent";

export {
  Chart,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
};
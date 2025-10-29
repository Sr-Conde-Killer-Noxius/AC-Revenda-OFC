import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number | undefined;
  icon: React.ElementType;
  growth?: number | undefined;
  unit?: string;
  isLoading: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon: IconComponent, growth, unit = '', isLoading }) => {
  const isPositive = growth !== undefined && growth >= 0;
  const growthColorClass = growth === undefined || growth === null
    ? "text-muted-foreground"
    : isPositive
      ? "text-success"
      : "text-destructive";

  const GrowthIcon = growth === undefined || growth === null
    ? Minus
    : isPositive
      ? ArrowUp
      : ArrowDown;

  return (
    <Card className="bg-card p-4 sm:p-6 rounded-xl border border-border flex flex-col justify-between shadow-lg">
      <CardHeader className="flex flex-row justify-between items-center p-0">
        <CardTitle className="text-muted-foreground text-xs sm:text-sm font-medium whitespace-nowrap">{title}</CardTitle>
        <IconComponent className="text-primary h-5 w-5" />
      </CardHeader>
      <CardContent className="p-0 mt-[-2]"> {/* Adicionado mt-[-2] aqui */}
        {isLoading ? (
          <Skeleton className="h-8 w-3/4" />
        ) : (
          <h3 className="text-3xl font-bold text-foreground whitespace-nowrap">
            {value}<span className="text-base sm:text-lg md:text-xl lg:text-2xl font-medium text-muted-foreground">{unit}</span>
          </h3>
        )}
        {growth !== undefined && (
          <div className={`flex items-center text-sm mt-2 ${growthColorClass}`}>
            <GrowthIcon size={14} className="mr-1" />
            <span>{Math.abs(growth)}% vs. Mês Anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
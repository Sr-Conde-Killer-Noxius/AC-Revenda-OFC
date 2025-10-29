import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  isLoading: boolean;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, children, isLoading, className }) => (
  <Card className={`bg-card p-4 sm:p-6 rounded-xl border border-border shadow-lg ${className}`}>
    <CardHeader className="p-0 pb-6">
      <CardTitle className="text-lg sm:text-xl font-semibold text-foreground">{title}</CardTitle>
    </CardHeader>
    <CardContent className="h-[350px] p-0">
      {isLoading ? (
        <Skeleton className="h-full w-full" />
      ) : (
        <div style={{ width: '100%', height: '100%' }}>
          {children}
        </div>
      )}
    </CardContent>
  </Card>
);
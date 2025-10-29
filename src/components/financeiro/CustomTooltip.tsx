import React from "react";

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

export const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const isCurrency = payload.some((p: any) => p.dataKey.toLowerCase().includes('revenue') || p.name.toLowerCase().includes('mês') || p.dataKey.toLowerCase().includes('faturamento'));
    return (
      <div className="bg-card/80 backdrop-blur-sm p-3 rounded-lg border border-border text-sm text-foreground">
        <p className="font-bold text-primary mb-2">{label}</p>
        {payload.map((pld: any, index: number) => (
          <div key={index} style={{ color: pld.color }}>
            {`${pld.name}: ${isCurrency ? pld.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : pld.value }`}
          </div>
        ))}
      </div>
    );
  }
  return null;
};
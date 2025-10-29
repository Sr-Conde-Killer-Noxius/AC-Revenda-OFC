import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorStateProps {
  message: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message }) => (
  <div className="min-h-screen flex items-center justify-center p-4">
    <Card className="border-destructive bg-destructive/10 text-destructive max-w-md w-full">
      <CardHeader>
        <CardTitle>Erro ao carregar análise</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{message}</p>
        <p className="mt-2 text-sm text-muted-foreground">Por favor, tente novamente mais tarde.</p>
      </CardContent>
    </Card>
  </div>
);
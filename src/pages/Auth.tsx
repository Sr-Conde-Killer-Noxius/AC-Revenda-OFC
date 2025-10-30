import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

const signInSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
});

type SignInFormData = z.infer<typeof signInSchema>;

export default function Auth() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSignIn = async (data: SignInFormData) => {
    const { error } = await signIn(data.email, data.password);
    
    if (error) {
      toast({
        title: "Erro ao entrar",
        description: error.message === "Invalid login credentials" 
          ? "E-mail ou senha incorretos" 
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta.",
      });
      navigate("/");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              AC
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground">Painel Acerto Certo</h1>
            <p className="text-muted-foreground">Sistema de Cobrança e Gerenciamento</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Entrar</CardTitle>
            <CardDescription className="text-center">
              Acesse sua conta para continuar
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">E-mail</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="seu@email.com"
                  {...signInForm.register("email")}
                />
                {signInForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {signInForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password">Senha</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="••••••••"
                  {...signInForm.register("password")}
                />
                {signInForm.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {signInForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={signInForm.formState.isSubmitting}
              >
                {signInForm.formState.isSubmitting ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-muted-foreground text-sm space-y-1">
          <p>Desenvolvido por</p>
          <a 
            href="https://digitalsouloficial.vercel.app/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-primary hover:underline"
          >
            Digital Soul Solutions
          </a>
          <p>CNPJ: 58.870.696/0001-97</p>
        </div>
      </div>
    </div>
  );
}
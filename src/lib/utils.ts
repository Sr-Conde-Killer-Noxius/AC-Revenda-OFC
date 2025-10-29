import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata mensagens de erro técnicas em mensagens amigáveis para o usuário.
 * @param error O objeto de erro original.
 * @returns Uma string com a mensagem de erro formatada em português.
 */
export function formatErrorMessage(error: any): string {
  let message = "Ocorreu um erro inesperado. Por favor, tente novamente.";

  if (error instanceof Error) {
    // Erros de rede
    if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
      message = "Falha de conexão. Não foi possível se comunicar com o serviço de envio. Verifique sua internet e tente novamente.";
    } 
    // Erros de validação ou específicos da API (ex: número inválido)
    else if (error.message.includes("invalid phone number") || error.message.includes("número de telefone inválido")) {
      message = "O número de telefone do cliente parece ser inválido. Por favor, verifique o cadastro e tente novamente.";
    }
    // Erros de servidor (status 500)
    else if (error.message.includes("status 500") || error.message.includes("Internal Server Error")) {
      message = "Ocorreu um erro inesperado no servidor. A equipe técnica foi notificada. Por favor, tente novamente mais tarde.";
    }
    // Erros de pré-condição (ex: instância não configurada)
    else if (error.message.includes("Nenhuma instância do WhatsApp configurada")) {
      message = "Nenhuma instância do WhatsApp configurada para o seu usuário. Por favor, conecte seu WhatsApp em 'Conexão > WhatsApp'.";
    }
    // Mensagens de erro genéricas da API que podem ser exibidas
    else if (error.message) {
      message = error.message;
    }
  } else if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object' && error.message) {
    message = error.message;
  }

  // Fallback genérico para qualquer outro erro não mapeado
  if (message.includes("Failed to execute 'text' on 'Response': body stream already read")) {
    message = "Ocorreu um erro interno ao processar a resposta do servidor. Por favor, tente novamente.";
  }

  return message;
}
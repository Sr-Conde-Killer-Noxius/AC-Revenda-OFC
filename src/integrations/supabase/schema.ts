import { Database, Tables, TablesInsert, TablesUpdate, Enums, Json } from './types';

// Re-exporta os tipos genéricos para conveniência
export type { Database, Tables, TablesInsert, TablesUpdate, Enums, Json };

// Tipos específicos para tabelas
export type Client = Tables<'clients'>;
export type ClientInsert = TablesInsert<'clients'>;
export type ClientUpdate = TablesUpdate<'clients'>;

export type Plan = Tables<'plans'>;
export type PlanInsert = TablesInsert<'plans'>;
export type PlanUpdate = TablesUpdate<'plans'>;

export type Template = Tables<'templates'>;
export type TemplateInsert = TablesInsert<'templates'>;
export type TemplateUpdate = TablesUpdate<'templates'>;

export type FinancialEntry = Tables<'financial_entries'>;
export type FinancialEntryInsert = TablesInsert<'financial_entries'>;
export type FinancialEntryUpdate = TablesUpdate<'financial_entries'>;

export type Automation = Tables<'automations'>;
export type AutomationInsert = TablesInsert<'automations'>;
export type AutomationUpdate = TablesUpdate<'automations'>;

export type UserInstance = Tables<'user_instances'>;
export type UserInstanceInsert = TablesInsert<'user_instances'>;
export type UserInstanceUpdate = TablesUpdate<'user_instances'>;

export type WebhookConfig = Tables<'webhook_configs'>;
export type WebhookConfigInsert = TablesInsert<'webhook_configs'>;
export type WebhookConfigUpdate = TablesUpdate<'webhook_configs'>;

// NOVO: Tipo para a tabela profiles
export type Profile = Tables<'profiles'> & { external_id: string | null }; // Adicionado external_id aqui
export type ProfileInsert = TablesInsert<'profiles'>;
export type ProfileUpdate = TablesUpdate<'profiles'>;

// Novos tipos para as tabelas de histórico
export type EvolutionApiHistoryEntry = Tables<'evolution_api_history'>;
export type N8nQrCodeHistoryEntry = Tables<'n8n_qr_code_history'>;
export type N8nMessageSenderHistoryEntry = Tables<'n8n_message_sender_history'>;
export type EvolutionLogoutHistoryEntry = Tables<'evolution_logout_history'>; // NOVO: Tipo para histórico de logout
export type RevendaWebhookHistoryEntry = Tables<'revenda_webhook_history'>; // NOVO: Tipo para histórico de webhook da Revenda

// O tipo WebhookHistoryEntry original pode ser mantido se ainda for usado em algum lugar,
// mas para os novos históricos, usaremos os tipos específicos.
export type WebhookHistoryEntry = Tables<'webhook_history'>;

// NOVO: Tipos para as novas tabelas de administrador
export type AdminFinancialEntry = Tables<'admin_financial_entries'>;
export type AdminFinancialEntryInsert = TablesInsert<'admin_financial_entries'>;
export type AdminFinancialEntryUpdate = TablesUpdate<'admin_financial_entries'>;

export type SubscriberPlan = Tables<'subscriber_plans'>;
export type SubscriberPlanInsert = TablesInsert<'subscriber_plans'>;
export type SubscriberPlanUpdate = TablesUpdate<'subscriber_plans'>;

export type SubscriberTemplate = Tables<'subscriber_templates'>;
export type SubscriberTemplateInsert = TablesInsert<'subscriber_templates'>;
export type SubscriberTemplateUpdate = TablesUpdate<'subscriber_templates'>;

export type SubscriberAutomation = Tables<'subscriber_automations'>;
export type SubscriberAutomationInsert = TablesInsert<'subscriber_automations'>;
export type SubscriberAutomationUpdate = TablesUpdate<'subscriber_automations'>;

// NOVO: Tipos para as tabelas PagBank
export type PagbankConfig = Tables<'pagbank_configs'>;
export type PagbankConfigInsert = TablesInsert<'pagbank_configs'>;
export type PagbankConfigUpdate = TablesUpdate<'pagbank_configs'>;

export type PagbankCharge = Tables<'pagbank_charges'>;
export type PagbankChargeInsert = TablesInsert<'pagbank_charges'>;
export type PagbankChargeUpdate = TablesUpdate<'pagbank_charges'>;

// NOVO: Tipos para as tabelas Mercado Pago
export type MercadoPagoConfig = Tables<'mercado_pago_configs'>;
export type MercadoPagoConfigInsert = TablesInsert<'mercado_pago_configs'>;
export type MercadoPagoConfigUpdate = TablesUpdate<'mercado_pago_configs'>;

export type MercadoPagoCharge = Tables<'mercado_pago_charges'>; // NOVO: Tipo para Mercado Pago Charges
export type MercadoPagoChargeInsert = TablesInsert<'mercado_pago_charges'>; // NOVO: Tipo para Mercado Pago Charges Insert
export type MercadoPagoChargeUpdate = TablesUpdate<'mercado_pago_charges'>; // NOVO: Tipo para Mercado Pago Charges Update


// NOVO: Tipo para a tabela active_payment_gateway
export type ActivePaymentGateway = Tables<'active_payment_gateway'>;
export type ActivePaymentGatewayInsert = TablesInsert<'active_payment_gateway'>;
export type ActivePaymentGatewayUpdate = TablesUpdate<'active_payment_gateway'>;


// Tipos específicos para enums
export type ClientStatus = Enums<'client_status'>;
export type TransactionType = Enums<'transaction_type'>;
export type TemplateType = Enums<'template_type'>; // Adicionado

// NOVO: Tipo para a coluna 'status' em subscriptions (manualmente definido para resolver erro TS)
export type AppSubscriptionStatus = 'active' | 'inactive' | 'overdue';

// NOVO: Tipo para a coluna 'type' em scheduled_notifications
export type ScheduledNotificationType = 'client_notification' | 'subscriber_notification';
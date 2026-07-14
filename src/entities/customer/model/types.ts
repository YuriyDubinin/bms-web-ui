export type Customer = {
  id: string;
  name: string;
  legal_name?: string;
  industry?: string;
  email: string;
  phone?: string;
  timezone: string;
  locale: string;
  subscription_plan: string;
  subscription_status: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type UpdateCustomerInput = {
  name: string;
  legal_name?: string;
  industry?: string;
  email: string;
  phone?: string;
  timezone?: string;
  locale?: string;
  settings?: Record<string, unknown>;
};

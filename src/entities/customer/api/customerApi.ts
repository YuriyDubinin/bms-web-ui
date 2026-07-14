import { api } from '@shared/api';
import type { Customer, UpdateCustomerInput } from '../model';

export function getCustomer(signal?: AbortSignal): Promise<Customer> {
  return api.get<Customer>('/api/customer', { signal });
}

export function updateCustomer(input: UpdateCustomerInput): Promise<Customer> {
  return api.put<Customer>('/api/customer/update', input);
}

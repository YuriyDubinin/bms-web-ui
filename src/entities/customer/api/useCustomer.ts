import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { Customer, UpdateCustomerInput } from '../model';
import { getCustomer, updateCustomer } from './customerApi';

export const CUSTOMER_QUERY_KEY = ['customer'] as const;

export function useCustomerQuery(): UseQueryResult<Customer, Error> {
  return useQuery<Customer, Error>({
    queryKey: CUSTOMER_QUERY_KEY,
    queryFn: ({ signal }) => getCustomer(signal),
    staleTime: 60_000,
  });
}

export function useUpdateCustomer(): UseMutationResult<Customer, Error, UpdateCustomerInput> {
  const qc = useQueryClient();
  return useMutation<Customer, Error, UpdateCustomerInput>({
    mutationFn: updateCustomer,
    meta: { silent: true },
    onSuccess: (data) => {
      qc.setQueryData(CUSTOMER_QUERY_KEY, data);
    },
  });
}

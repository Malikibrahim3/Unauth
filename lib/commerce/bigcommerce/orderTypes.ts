export type BigCommerceAddress = {
  email?: string | null;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  street_1?: string | null;
  street_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
};

export type BigCommerceOrderPayload = {
  id?: number | string;
  date_created?: string | null;
  total_inc_tax?: string | number | null;
  total_ex_tax?: string | number | null;
  currency_code?: string | null;
  status?: string | null;
  status_id?: number | null;
  payment_method?: string | null;
  customer_id?: number | null;
  ip_address?: string | null;
  items_total?: number | null;
  staff_notes?: string | null;
  customer_message?: string | null;
  subtotal_ex_tax?: string | number | null;
  discount_amount?: string | number | null;
  billing_address?: BigCommerceAddress | null;
  shipping_addresses?: BigCommerceAddress[] | null;
  refunded_amount?: string | number | null;
};

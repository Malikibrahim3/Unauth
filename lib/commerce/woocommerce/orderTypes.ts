export type WooCommerceOrderPayload = {
  id?: number | string;
  number?: string | null;
  date_created?: string | null;
  total?: string | null;
  currency?: string | null;
  status?: string | null;
  billing?: {
    email?: string | null;
    phone?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    address_1?: string | null;
    address_2?: string | null;
    city?: string | null;
    state?: string | null;
    postcode?: string | null;
    country?: string | null;
  } | null;
  shipping?: {
    first_name?: string | null;
    last_name?: string | null;
    address_1?: string | null;
    address_2?: string | null;
    city?: string | null;
    state?: string | null;
    postcode?: string | null;
    country?: string | null;
  } | null;
  payment_method?: string | null;
  payment_method_title?: string | null;
  customer_id?: number | null;
  customer_ip_address?: string | null;
  customer_user_agent?: string | null;
  customer_note?: string | null;
  discount_total?: string | null;
  line_items?: unknown[] | null;
  refunds?: Array<{ id?: number | string }> | null;
};

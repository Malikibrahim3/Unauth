-- Grant missing privileges on rules tables.
-- The merchant_rules migration (20260616100000) was applied without GRANT
-- statements. This fixup adds them.
GRANT ALL ON public.merchant_rules TO service_role;
GRANT ALL ON public.rule_evaluations TO service_role;
GRANT ALL ON public.default_rule_templates TO service_role;
GRANT SELECT ON public.merchant_rules TO authenticated;
GRANT SELECT ON public.rule_evaluations TO authenticated;
GRANT SELECT ON public.default_rule_templates TO authenticated;
GRANT SELECT ON public.default_rule_templates TO anon;

# Deployment Readiness Benchmarks

| Dataset | Rows | Surfaced | TP | FP | FN | Precision | Recall | Review rate | Largest cluster | Linked clusters |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| small_sanity | 91 | 9 | 9 | 0 | 0 | 1 | 1 | 0.0989 | 5 | 2 |
| medium_realistic | 1350 | 56 | 56 | 0 | 10 | 1 | 0.8485 | 0.0415 | 12 | 7 |
| negative_control | 1500 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 0 |
| adversarial_fraud | 402 | 83 | 83 | 0 | 15 | 1 | 0.8469 | 0.2065 | 18 | 7 |
| large_merchant_scale | 5400 | 110 | 110 | 0 | 20 | 1 | 0.8462 | 0.0204 | 24 | 7 |

## Header Chaos

| File | Valid | Rows | Missing required | Unmapped headers |
|---|---:|---:|---|---:|
| header_chaos_shopify.csv | yes | 72 | - | 7 |
| header_chaos_woocommerce.csv | yes | 72 | - | 2 |
| header_chaos_amazon.csv | yes | 72 | - | 3 |
| header_chaos_etsy_semicolon_bom.csv | yes | 72 | - | 5 |
| header_chaos_stripe_pipe.csv | yes | 72 | - | 4 |
| header_chaos_custom_mixed_case.csv | yes | 72 | - | 3 |
| header_chaos_duplicate_headers.csv | yes | 72 | - | 3 |
| header_chaos_missing_important.csv | yes | 72 | - | 1 |

# Multi-Merchant Identity Graph Verification

Generated files: 5
Rows processed: 50,000
Cross-merchant identity links found: 166

## Confidence Breakdown

- Definite: 5
- Probable: 34
- Possible: 127
- Weak: 0

## Runs

| Merchant CSV | Rows | Cross-merchant attribute matches |
| --- | ---: | ---: |
| aurora-outfitters | 10,000 | 117 |
| northline-electronics | 10,000 | 61 |
| harbor-home | 10,000 | 80 |
| vertex-sneakers | 10,000 | 54 |
| lumen-beauty | 10,000 | 97 |

## Flagged Clusters

| Cluster | Merchants | Orders | Grade |
| --- | ---: | ---: | --- |
| fraud_ring_shared_ip_address_m1_m2_m4 | 3 | 216 | definite |
| clean_here_flagged_elsewhere | 2 | 4 | probable |
| same_email_different_names_m1_m3 | 2 | 2 | probable |
| same_device_m2_m5 | 2 | 2 | possible |

## False Positive Control

Legitimate cross-merchant customers appeared at 3 merchants and are retained as overlap context, not fraud clusters.

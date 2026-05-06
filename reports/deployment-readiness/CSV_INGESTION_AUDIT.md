# CSV Ingestion Audit

Verdict: **promising but not fully enterprise-ready**.

## What Works

- Backend stream parser handles BOM and delimiter sniffing via `lib/processing/streamParser.ts` and `lib/csv/sniffer.ts`.
- Supported delimiters in benchmarks: comma, tab, semicolon with BOM, pipe.
- Header chaos benchmark files all parsed as valid:
  - Shopify
  - WooCommerce
  - Amazon tab
  - Etsy semicolon BOM
  - Stripe pipe
  - custom mixed case
  - duplicate headers
  - missing important optional fields
- Large benchmark processed 5,400 rows, not capped at 1,000.

## Issues

### HIGH: Limit mismatch

Frontend says `Max 50 MB · up to 100,000 rows`; backend allows 500 MB and 5,000,000 rows; oversize API error says 50 MB despite a 500 MB constant.

Files:
- `components/upload/UploadClient.tsx:491`
- `app/api/audit/route.ts:29`
- `app/api/audit/route.ts:151-154`
- `lib/processing/streamParser.ts:20`

### HIGH: Unmapped headers are not visible enough

`streamParseCsv` returns `unmappedHeaders`, and `/api/audit` includes warnings, but the frontend does not clearly show post-submit ignored columns. Benchmarks show multiple unmapped headers in realistic exports.

### MEDIUM: Duplicate headers are warned in console but not user-facing

Papaparse renames duplicate headers. The UI warns in console only; merchants need a visible warning because duplicate columns can change mapping behavior.

### MEDIUM: Optional fields may look like core requirements

The upload UI includes advanced fields such as device/browser/cookie/ASN/card fingerprint. It does explain advanced integrations later, but enterprise merchants may wonder why default Shopify exports lack these fields.

### MEDIUM: Address mapping can lose structure

The parser accepts full `shipping_address`, but many merchant exports provide address1/city/postcode/country separately. Header chaos leaves address parts unmapped, so address cardinality can degrade unless the merchant manually maps.

## Benchmark Summary

See `reports/deployment-readiness/benchmarks/BENCHMARK_SUMMARY.md`.

| Dataset | Rows | Processed | Review rate | Precision | Recall |
|---|---:|---:|---:|---:|---:|
| small_sanity | 91 | 91 | 9.89% | 1.0 | 1.0 |
| medium_realistic | 1,350 | 1,350 | 4.15% | 1.0 | 0.8485 |
| negative_control | 1,500 | 1,500 | 0% | 1.0 | 1.0 |
| adversarial_fraud | 402 | 402 | 20.65% | 1.0 | 0.8469 |
| large_merchant_scale | 5,400 | 5,400 | 2.04% | 1.0 | 0.8462 |

## Required Before Pilot

- Shared upload constants/copy.
- Visible duplicate/unmapped header warnings.
- Address-part composition support or clear mapping guidance.
- CSV injection-safe exports.
- Full upload retry/failure recovery tests.


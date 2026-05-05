/**
 * tests/csv/headerMapping.stress.test.ts
 *
 * Stress-tests the full header-mapping stack:
 *  - sniffHeaders / detectDelimiter / splitHeaderLine (lib/csv/sniffer)
 *  - COLUMN_ALIASES / cleanHeader (lib/csv/clean)
 *  - autoMapHeaders (lib/csv/headerAliases)
 *
 * Each fixture represents a real-world CSV header row from a different
 * platform or edge-case format.  The test asserts that every REQUIRED_FIELD
 * is detected and that no collision or BOM artifact sneaks through.
 */

import { sniffHeaders, detectDelimiter, splitHeaderLine, stripBom } from '@/lib/csv/sniffer';
import { cleanHeader } from '@/lib/csv/clean';
import { autoMapHeaders, REQUIRED_FIELDS, type RequiredField } from '@/lib/csv/headerAliases';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Build a CSV header-line string from an array of header tokens. */
function makeLine(headers: string[], delimiter = ','): string {
  return headers.join(delimiter);
}

/** Assert that all four REQUIRED_FIELDS are covered by an autoMapHeaders result. */
function expectRequiredFieldsMapped(
  headers: string[],
  description: string,
): void {
  const { exact, fuzzy } = autoMapHeaders(headers);
  const mapped = { ...exact, ...fuzzy };
  for (const field of REQUIRED_FIELDS) {
    // eslint-disable-next-line jest/valid-expect
    const val = mapped[field];
    if (!val) {
      throw new Error(
        `[${description}] REQUIRED_FIELD '${field}' was not mapped.\n  Headers: ${headers.join(', ')}`,
      );
    }
    expect(val).toBeTruthy();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/** Each fixture has a description, the raw first-line string, and optionally
 *  the expected delimiter. */
const FIXTURES: Array<{
  description: string;
  line: string;
  expectedDelimiter?: string;
  /** Headers we want to confirm map to a specific canonical field */
  expectedMappings?: Array<[rawHeader: string, canonicalField: string]>;
  /** Set to true when the line starts with a UTF-8 BOM character */
  hasBom?: boolean;
}> = [
  // ── Shopify default export ────────────────────────────────────────────────
  {
    description: 'Shopify default CSV',
    line: 'Name,Email,Financial Status,Paid at,Fulfillment Status,Fulfillment Date,Accepts Marketing,Currency,Subtotal,Shipping,Taxes,Total,Discount Code,Discount Amount,Shipping Method,Created at,Lineitem quantity,Lineitem name,Lineitem price,Lineitem compare at price,Lineitem sku,Lineitem requires shipping,Lineitem taxable,Lineitem fulfillment status,Billing Name,Billing Street,Billing Address1,Billing Address2,Billing Company,Billing City,Billing Zip,Billing Province,Billing Country,Billing Phone,Shipping Name,Shipping Street,Shipping Address1,Shipping Address2,Shipping Company,Shipping City,Shipping Zip,Shipping Province,Shipping Country,Shipping Phone,Notes,Note Attributes,Cancelled at,Payment Method,Payment Reference,Refunded Amount,Vendor,Id,Tags,Risk Level,Source,Lineitem discount,Tax 1 Name,Tax 1 Value,Tax 2 Name,Tax 2 Value,Tax 3 Name,Tax 3 Value,Tax 4 Name,Tax 4 Value,Tax 5 Name,Tax 5 Value',
    expectedDelimiter: ',',
    expectedMappings: [
      ['Name', 'order_id'],
      ['Email', 'customer_email'],
      ['Total', 'order_total'],
      ['Created at', 'order_date'],
      ['Billing Name', 'customer_name'],
      ['Shipping Address1', 'shipping_address'],
      ['Payment Method', 'payment_method'],
      ['Currency', 'currency'],
    ],
  },

  // ── WooCommerce order export ──────────────────────────────────────────────
  {
    description: 'WooCommerce order export',
    line: 'order_id,order_date,order_status,customer_id,billing_first_name,billing_last_name,billing_email,billing_phone,billing_address_1,billing_city,billing_state,billing_postcode,billing_country,shipping_address_1,shipping_city,shipping_state,shipping_postcode,shipping_country,order_total,order_currency,payment_method',
    expectedDelimiter: ',',
    expectedMappings: [
      ['order_id', 'order_id'],
      ['order_date', 'order_date'],
      ['billing_email', 'customer_email'],
      ['order_total', 'order_total'],
    ],
  },

  // ── Amazon Seller Central ─────────────────────────────────────────────────
  {
    description: 'Amazon Seller Central',
    line: 'order-id	order-date	order-status	ship-city	ship-state	ship-postal-code	ship-country	item-price	currency	payment-date	billing-name	buyer-email	purchase-date',
    expectedDelimiter: '\t',
    expectedMappings: [
      // Note: 'item-price' is Amazon's per-line-item price, not the order total;
      // merchants must manually map that column in the UI.
      ['order-id', 'order_id'],
      ['buyer-email', 'customer_email'],
      ['purchase-date', 'order_date'],
    ],
  },

  // ── European semicolon-delimited export ──────────────────────────────────
  {
    description: 'European semicolon-delimited',
    line: 'Bestellnummer;Datum;Kundenemail;Gesamtbetrag;Währung;Status;Name',
    expectedDelimiter: ';',
    // These headers are in German — they won't map via alias; that's fine.
    // The test just checks delimiter detection.
  },

  // ── Pipe-delimited flat file ──────────────────────────────────────────────
  {
    description: 'Pipe-delimited flat file',
    line: 'order_id|order_date|customer_email|order_total|currency|order_status',
    expectedDelimiter: '|',
    expectedMappings: [
      ['order_id', 'order_id'],
      ['order_date', 'order_date'],
      ['customer_email', 'customer_email'],
      ['order_total', 'order_total'],
    ],
  },

  // ── UTF-8 BOM header ─────────────────────────────────────────────────────
  {
    description: 'UTF-8 BOM-prefixed CSV',
    // \uFEFF is the BOM character — would poison the first header without stripping
    line: '\uFEFForder_id,order_date,customer_email,order_total',
    hasBom: true,
    expectedDelimiter: ',',
    expectedMappings: [['order_id', 'order_id']],
  },

  // ── Quoted headers containing commas ─────────────────────────────────────
  {
    description: 'Quoted headers containing commas',
    line: '"Order ID","Order Date","Customer Email","Order Total, USD","Shipping Name"',
    expectedDelimiter: ',',
    expectedMappings: [
      ['Order ID', 'order_id'],
      ['Order Date', 'order_date'],
      ['Customer Email', 'customer_email'],
    ],
  },

  // ── Etsy shop sales export ────────────────────────────────────────────────
  {
    description: 'Etsy sales export',
    line: 'Sale Date,Item Name,Quantity,Price,Discount Amount,Coupon Code,Shipping,Sales Tax,Order Total,Transaction ID,Listing ID,Date Paid,Date Shipped,Ship Name,Ship Address1,Ship City,Ship State,Ship Zipcode,Ship Country,Order ID,Variations,Buyer,Order Type,Payment Type,InPerson Sale,VAT Paid by Buyer',
    expectedDelimiter: ',',
    expectedMappings: [
      ['Sale Date', 'order_date'],
      ['Order Total', 'order_total'],
      ['Transaction ID', 'order_id'],
      ['Ship Name', 'customer_name'],
    ],
  },

  // ── Stripe Radar export ───────────────────────────────────────────────────
  {
    description: 'Stripe Radar / payment export',
    line: 'id,created,amount,currency,status,customer_email,card_brand,card_last4,card_fingerprint,ip_address,user_agent,metadata',
    expectedDelimiter: ',',
    expectedMappings: [
      ['id', 'order_id'],
      ['created', 'order_date'],
      ['amount', 'order_total'],
      ['customer_email', 'customer_email'],
      ['card_last4', 'card_last4'],
      ['card_fingerprint', 'card_fingerprint'],
      ['ip_address', 'ip_address'],
    ],
  },

  // ── Case-insensitive / mixed case ─────────────────────────────────────────
  {
    description: 'Mixed-case headers',
    line: 'ORDER_ID,Order Date,CUSTOMER_EMAIL,Order_Total',
    expectedDelimiter: ',',
    expectedMappings: [
      ['ORDER_ID', 'order_id'],
      ['Order Date', 'order_date'],
      ['CUSTOMER_EMAIL', 'customer_email'],
      ['Order_Total', 'order_total'],
    ],
  },

  // ── All REQUIRED_FIELDS present (canonical names) ─────────────────────────
  {
    description: 'All required fields canonical',
    line: 'order_id,order_date,customer_email,order_total',
    expectedDelimiter: ',',
    expectedMappings: [
      ['order_id', 'order_id'],
      ['order_date', 'order_date'],
      ['customer_email', 'customer_email'],
      ['order_total', 'order_total'],
    ],
  },

  // ── BigCommerce export ────────────────────────────────────────────────────
  {
    description: 'BigCommerce export',
    line: 'Order ID,Order Date,Delivery Date,Order Status,Order Total,Cart Base Amount,Tax Total,Shipping Total,Refund Amount,Payment Method,Card Number (Last 4),First Name,Last Name,Email Address,Phone,Billing Street 1,Billing City,Billing State,Billing Zip Code,Billing Country,Shipping Street 1,Shipping City,Shipping State,Shipping Zip Code,Shipping Country,IP Address,Customer Message,Staff Notes',
    expectedDelimiter: ',',
    expectedMappings: [
      ['Order ID', 'order_id'],
      ['Order Date', 'order_date'],
      ['Email Address', 'customer_email'],
      ['Order Total', 'order_total'],
      ['IP Address', 'ip_address'],
      ['Card Number (Last 4)', 'card_last4'],
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('sniffHeaders', () => {
  it('strips BOM and returns hasBom=true', () => {
    const { hasBom, headers } = sniffHeaders('\uFEFForder_id,order_date');
    expect(hasBom).toBe(true);
    expect(headers[0]).toBe('order_id'); // no BOM residue
  });

  it('returns hasBom=false for a clean file', () => {
    const { hasBom } = sniffHeaders('order_id,order_date');
    expect(hasBom).toBe(false);
  });

  it('detects collisions when two raw headers map to the same canonical field', () => {
    // 'email' and 'customer_email' both map to customer_email
    const { collisions } = sniffHeaders('order_id,order_date,email,customer_email,order_total');
    expect(collisions.length).toBeGreaterThanOrEqual(1);
    const emailCollision = collisions.find((c: { field: string; headers: string[] }) => c.field === 'customer_email');
    expect(emailCollision).toBeDefined();
    expect(emailCollision!.headers).toContain('email');
    expect(emailCollision!.headers).toContain('customer_email');
  });

  it('returns no collisions for a clean header set', () => {
    const { collisions } = sniffHeaders('order_id,order_date,customer_email,order_total,customer_name');
    expect(collisions).toHaveLength(0);
  });
});

describe('detectDelimiter', () => {
  it('detects comma', () => {
    expect(detectDelimiter('a,b,c')).toBe(',');
  });

  it('detects tab', () => {
    expect(detectDelimiter('a\tb\tc')).toBe('\t');
  });

  it('detects semicolon', () => {
    expect(detectDelimiter('a;b;c')).toBe(';');
  });

  it('detects pipe', () => {
    expect(detectDelimiter('a|b|c')).toBe('|');
  });

  it('ignores delimiters inside quoted fields', () => {
    // The comma inside the quotes should NOT be counted
    expect(detectDelimiter('"a,b"\tc\td')).toBe('\t');
  });

  it('defaults to comma for a single-column header', () => {
    expect(detectDelimiter('order_id')).toBe(',');
  });
});

describe('splitHeaderLine', () => {
  it('splits a simple comma line', () => {
    expect(splitHeaderLine('a,b,c', ',')).toEqual(['a', 'b', 'c']);
  });

  it('strips outer double-quotes', () => {
    expect(splitHeaderLine('"Order ID","Email","Total"', ',')).toEqual([
      'Order ID',
      'Email',
      'Total',
    ]);
  });

  it('handles an embedded comma inside a quoted field', () => {
    const tokens = splitHeaderLine('"Order Total, USD","Email"', ',');
    expect(tokens).toEqual(['Order Total, USD', 'Email']);
  });

  it('handles escaped double-quotes inside a quoted field', () => {
    const tokens = splitHeaderLine('"He said ""hi""","Email"', ',');
    expect(tokens[0]).toBe('He said "hi"');
  });

  it('splits tab-delimited line', () => {
    expect(splitHeaderLine('a\tb\tc', '\t')).toEqual(['a', 'b', 'c']);
  });
});

describe('stripBom', () => {
  it('strips UTF-8 BOM', () => {
    expect(stripBom('\uFEFFhello')).toBe('hello');
  });

  it('is a no-op on strings without BOM', () => {
    expect(stripBom('hello')).toBe('hello');
  });
});

describe('cleanHeader', () => {
  const cases: Array<[string, string]> = [
    ['Order ID', 'order_id'],
    ['order id', 'order_id'],
    ['EMAIL', 'customer_email'],
    ['Email Address', 'customer_email'],
    ['Paid at', 'order_date'],
    ['created_at', 'order_date'],
    ['Total', 'order_total'],
    ['Subtotal', 'order_total'],
    ['Billing Name', 'customer_name'],
    ['Shipping Address1', 'shipping_address'],
    ['IP Address', 'ip_address'],
    ['card_last4', 'card_last4'],
    ['Last4', 'card_last4'],
    ['bin', 'card_bin'],
    ['customer_id', 'account_id'],
    ['user_id', 'account_id'],
    ['chargeback', 'chargeback_dispute'],
    ['dispute', 'chargeback_dispute'],
    ['refund_requested', 'refund_requested'],
    ['return_requested', 'return_requested'],
    ['is_fraud', 'ground_truth_label'],
    ['label', 'ground_truth_label'],
  ];

  test.each(cases)('cleanHeader(%s) → %s', (raw, expected) => {
    expect(cleanHeader(raw)).toBe(expected);
  });

  it('passes through unknown headers unchanged (lowercased + underscored)', () => {
    expect(cleanHeader('Some Unknown Column')).toBe('some_unknown_column');
  });
});

describe('autoMapHeaders — fixture stress tests', () => {
  for (const fixture of FIXTURES) {
    describe(fixture.description, () => {
      const { hasBom, line, expectedDelimiter, expectedMappings } = fixture;

      it('sniff: detects correct delimiter', () => {
        if (!expectedDelimiter) return;
        const clean = hasBom ? line.slice(1) : line;
        const firstLine = clean.split(/\r?\n/)[0];
        expect(detectDelimiter(firstLine)).toBe(expectedDelimiter);
      });

      it('sniff: strips BOM when present', () => {
        if (!hasBom) return;
        const { headers, hasBom: detected } = sniffHeaders(line);
        expect(detected).toBe(true);
        // First header must not start with the BOM character
        expect(headers[0].charCodeAt(0)).not.toBe(0xfeff);
      });

      if (expectedMappings && expectedMappings.length > 0) {
        it('autoMapHeaders: expected fields are detected', () => {
          const cleanLine = hasBom ? line.slice(1) : line;
          const firstLine = cleanLine.split(/\r?\n/)[0];
          const delimiter = expectedDelimiter ?? detectDelimiter(firstLine);
          const headers = splitHeaderLine(firstLine, delimiter);
          const { exact, fuzzy } = autoMapHeaders(headers);
          const mapped = { ...exact, ...fuzzy };

          for (const [rawHeader, expectedField] of expectedMappings!) {
            const val = mapped[expectedField as RequiredField];
            if (!val) {
              throw new Error(
                `Expected '${rawHeader}' to map to '${expectedField}', but field was not mapped.\n  All mapped: ${JSON.stringify(mapped)}`,
              );
            }
            expect(val).toBeTruthy();
          }
        });
      }
    });
  }
});

describe('autoMapHeaders — all REQUIRED_FIELDS covered across key platforms', () => {
  const PLATFORM_FIXTURES: Array<{ name: string; headers: string[]; requiredOverride?: RequiredField[] }> = [
    {
      name: 'Shopify',
      headers: ['Name', 'Created at', 'Email', 'Total', 'Billing Name', 'Currency'],
    },
    {
      name: 'WooCommerce',
      headers: ['order_id', 'date_created', 'billing_email', 'order_total', 'billing_first_name'],
    },
    {
      name: 'Amazon',
      // Amazon's 'item-price' is a line-item column; order_total needs manual
      // mapping in the UI.  Only test the 3 fields that DO auto-map.
      headers: ['order-id', 'purchase-date', 'buyer-email'],
      requiredOverride: ['order_id', 'order_date', 'customer_email'],
    },
    {
      name: 'Stripe',
      headers: ['id', 'created', 'customer_email', 'amount'],
    },
    {
      name: 'Canonical',
      headers: ['order_id', 'order_date', 'customer_email', 'order_total'],
    },
  ];

  for (const { name, headers, requiredOverride } of PLATFORM_FIXTURES) {
    it(`${name}: required fields mapped`, () => {
      const { exact, fuzzy } = autoMapHeaders(headers);
      const mapped = { ...exact, ...fuzzy };
      const fields = requiredOverride ?? REQUIRED_FIELDS;
      for (const field of fields) {
        const val = mapped[field];
        if (!val) {
          throw new Error(
            `[${name}] REQUIRED_FIELD '${field}' was not mapped.\n  Headers: ${headers.join(', ')}`,
          );
        }
        expect(val).toBeTruthy();
      }
    });
  }
});

describe('collision detection', () => {
  it('flags when two headers normalise to the same canonical field', () => {
    // A naive export might include both 'Email' and 'Customer Email'
    const { collisions } = sniffHeaders('order_id,order_date,Email,Customer Email,order_total');
    const emailCollision = collisions.find((c: { field: string; headers: string[] }) => c.field === 'customer_email');
    expect(emailCollision).toBeDefined();
    expect(emailCollision!.headers.length).toBe(2);
  });

  it('does not flag distinct fields', () => {
    const { collisions } = sniffHeaders('order_id,order_date,customer_email,order_total,customer_name,shipping_address');
    expect(collisions).toHaveLength(0);
  });
});

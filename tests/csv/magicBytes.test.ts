import { sniffCsvMagicBytes } from '@/lib/csv/sniffMagicBytes';

function blobFromBytes(bytes: number[]): Blob {
  return new Blob([new Uint8Array(bytes)]);
}

function blobFromText(text: string): Blob {
  return new Blob([text], { type: 'text/csv' });
}

describe('sniffCsvMagicBytes', () => {
  it('rejects a PNG renamed to .csv', async () => {
    const png = blobFromBytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    await expect(sniffCsvMagicBytes(png, 'orders.csv')).resolves.toMatchObject({
      valid: false,
      reason: 'binary_file',
    });
  });

  it('rejects binary files with null bytes', async () => {
    const binary = blobFromBytes([0x4d, 0x5a, 0x00, 0x00, 0x03, 0x00]);

    await expect(sniffCsvMagicBytes(binary, 'orders.csv')).resolves.toMatchObject({
      valid: false,
      reason: 'binary_file',
    });
  });

  it('rejects invalid UTF-8 text', async () => {
    const invalidUtf8 = blobFromBytes([0x6f, 0x72, 0x64, 0x65, 0x72, 0xff, 0x2c, 0x69, 0x64]);

    await expect(sniffCsvMagicBytes(invalidUtf8, 'orders.csv')).resolves.toMatchObject({
      valid: false,
      reason: 'invalid_text_encoding',
    });
  });

  it('rejects JSON renamed to .csv', async () => {
    const json = blobFromText('{"order_id":"A-1","customer_email":"buyer@example.com"}');

    await expect(sniffCsvMagicBytes(json, 'orders.csv')).resolves.toMatchObject({
      valid: false,
      reason: 'not_csv',
    });
  });

  it('rejects JSON arrays renamed to .csv', async () => {
    const json = blobFromText('[{"order_id":"A-1","customer_email":"buyer@example.com"}]');

    await expect(sniffCsvMagicBytes(json, 'orders.csv')).resolves.toMatchObject({
      valid: false,
      reason: 'not_csv',
    });
  });

  it('rejects ASCII non-CSV files renamed to .csv', async () => {
    const pdfHeader = blobFromText('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>');

    await expect(sniffCsvMagicBytes(pdfHeader, 'orders.csv')).resolves.toMatchObject({
      valid: false,
      reason: 'not_csv',
    });
  });

  it('rejects unsupported extensions before sniffing content', async () => {
    const csv = blobFromText('order_id,customer_email\nA-1,buyer@example.com\n');

    await expect(sniffCsvMagicBytes(csv, 'orders.txt')).resolves.toMatchObject({
      valid: false,
      reason: 'invalid_extension',
    });
  });

  it('rejects a 0-byte file', async () => {
    await expect(sniffCsvMagicBytes(new Blob([]), 'orders.csv')).resolves.toMatchObject({
      valid: false,
      reason: 'empty_file',
    });
  });

  it('rejects a 1-byte file', async () => {
    await expect(sniffCsvMagicBytes(blobFromText('a'), 'orders.csv')).resolves.toMatchObject({
      valid: false,
      reason: 'not_csv',
    });
  });

  it('rejects whitespace-only text files', async () => {
    await expect(sniffCsvMagicBytes(blobFromText(' \r\n\t\n'), 'orders.csv')).resolves.toMatchObject({
      valid: false,
      reason: 'not_csv',
    });
  });

  it('accepts a valid CSV without BOM', async () => {
    const csv = blobFromText('order_id,customer_email\nA-1,buyer@example.com\n');

    await expect(sniffCsvMagicBytes(csv, 'orders.csv')).resolves.toMatchObject({
      valid: true,
      hasBom: false,
      delimiter: ',',
    });
  });

  it('accepts a valid CSV with UTF-8 BOM', async () => {
    const csv = blobFromBytes([
      0xef, 0xbb, 0xbf,
      ...Buffer.from('order_id,customer_email\nA-1,buyer@example.com\n', 'utf8'),
    ]);

    await expect(sniffCsvMagicBytes(csv, 'orders.csv')).resolves.toMatchObject({
      valid: true,
      hasBom: true,
      delimiter: ',',
    });
  });

  it('accepts valid CSV with leading whitespace before the header', async () => {
    const csv = blobFromText('\n \r\n\torder_id,customer_email\nA-1,buyer@example.com\n');

    await expect(sniffCsvMagicBytes(csv, 'orders.csv')).resolves.toMatchObject({
      valid: true,
      delimiter: ',',
    });
  });

  it('accepts tab-delimited .tsv uploads', async () => {
    const tsv = blobFromText('order_id\tcustomer_email\nA-1\tbuyer@example.com\n');

    await expect(sniffCsvMagicBytes(tsv, 'orders.tsv')).resolves.toMatchObject({
      valid: true,
      delimiter: '\t',
    });
  });

  it('accepts semicolon-delimited CSV exports', async () => {
    const csv = blobFromText('order_id;customer_email\nA-1;buyer@example.com\n');

    await expect(sniffCsvMagicBytes(csv, 'orders.csv')).resolves.toMatchObject({
      valid: true,
      delimiter: ';',
    });
  });

  it('accepts pipe-delimited CSV exports', async () => {
    const csv = blobFromText('order_id|customer_email\nA-1|buyer@example.com\n');

    await expect(sniffCsvMagicBytes(csv, 'orders.csv')).resolves.toMatchObject({
      valid: true,
      delimiter: '|',
    });
  });

  it('accepts quoted headers containing delimiters', async () => {
    const csv = blobFromText('"order,id",customer_email\n"A-1",buyer@example.com\n');

    await expect(sniffCsvMagicBytes(csv, 'orders.csv')).resolves.toMatchObject({
      valid: true,
      delimiter: ',',
    });
  });

  it('accepts valid UTF-8 characters in CSV text', async () => {
    const csv = blobFromText('order_id,customer_name\nA-1,Zoë\n');

    await expect(sniffCsvMagicBytes(csv, 'orders.csv')).resolves.toMatchObject({
      valid: true,
      delimiter: ',',
    });
  });
});

export type AgreementTextExtractionInput = {
  fileName: string;
  mimeType: string | null;
  bytes: Buffer;
};

export type AgreementTextExtractionResult = {
  rawText: string;
  extractionStatus: 'parsed' | 'needs_review';
  warning: string | null;
};

export async function extractAgreementText(input: AgreementTextExtractionInput): Promise<AgreementTextExtractionResult> {
  const name = input.fileName.toLowerCase();
  const mime = (input.mimeType ?? '').toLowerCase();
  if (mime.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md')) {
    return {
      rawText: input.bytes.toString('utf8'),
      extractionStatus: 'parsed',
      warning: null,
    };
  }

  return {
    rawText: '',
    extractionStatus: 'needs_review',
    warning: 'Automated text extraction is not configured for this file type yet.',
  };
}

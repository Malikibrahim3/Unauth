export interface FriendlyError {
  headline: string;
  body: string;
  code: string;
}

export function friendlyUploadError(raw: string, _code?: string): FriendlyError {
  const msg = raw.toLowerCase();

  if (msg.includes('row-level security') || msg.includes('rls') || msg.includes('permission denied')) {
    return {
      headline: 'Something went wrong',
      body: "We couldn't save your file. Please try again. If it keeps happening, contact us with code UA-101.",
      code: 'UA-101',
    };
  }

  if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
    return {
      headline: "We've seen this upload already",
      body: "You've uploaded a file with the same name today. Rename it and try again.",
      code: 'UA-102',
    };
  }

  if (msg.includes('invalid input syntax') || msg.includes('parse') || msg.includes('csv')) {
    return {
      headline: "We couldn't read this file",
      body: "Your CSV has rows we couldn't parse. Check for missing commas and try again. Code UA-201.",
      code: 'UA-201',
    };
  }

  if (msg.includes('bucket not found') || msg.includes('storage')) {
    return {
      headline: 'Storage unavailable',
      body: 'Please try again in a minute. Code UA-301.',
      code: 'UA-301',
    };
  }

  return {
    headline: 'Something went wrong',
    body: 'Please try again. If it keeps happening, contact us with code UA-999.',
    code: 'UA-999',
  };
}

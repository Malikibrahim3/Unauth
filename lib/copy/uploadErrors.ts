export interface FriendlyError {
  headline: string;
  body: string;
  code: string;
}

export function friendlyUploadError(raw: string): FriendlyError {
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

  if (msg.includes('invalid input syntax') || msg.includes('csv parse') || msg.includes('missing commas') || msg.includes('could not parse')) {
    return {
      headline: "We couldn't read this file",
      body: "Your CSV has rows we couldn't parse. Check for missing commas and try again. Code UA-201.",
      code: 'UA-201',
    };
  }

  if (
    msg.includes('bucket not found') ||
    msg.includes('storage') ||
    msg.includes('uploadchunkrows') ||
    msg.includes('chunk upload')
  ) {
    return {
      headline: 'Storage unavailable',
      body: "We couldn't stage your file for processing. Please try again in a moment. Code UA-301.",
      code: 'UA-301',
    };
  }

  if (
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('enotfound') ||
    msg.includes('network') ||
    msg.includes('fetch failed') ||
    msg.includes('connection') ||
    msg.includes('abort')
  ) {
    return {
      headline: 'Connection issue',
      body: 'Your upload timed out due to its size. Try splitting it into smaller files, or contact us for help. Code UA-401.',
      code: 'UA-401',
    };
  }

  if (
    msg.includes('memory') ||
    msg.includes('heap') ||
    msg.includes('allocation') ||
    msg.includes('out of memory') ||
    msg.includes('payload too large') ||
    msg.includes('request entity too large')
  ) {
    return {
      headline: 'File too large',
      body: 'This CSV is too large to process in one go. Try splitting it into files under 100 MB each. Code UA-402.',
      code: 'UA-402',
    };
  }

  if (
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504') ||
    msg.includes('internal server error') ||
    msg.includes('service unavailable')
  ) {
    return {
      headline: 'Server busy',
      body: 'Our processing servers are temporarily overloaded. Please wait a moment and try again. Code UA-501.',
      code: 'UA-501',
    };
  }

  return {
    headline: 'Something went wrong',
    body: 'Please try again. If it keeps happening, contact us with code UA-999.',
    code: 'UA-999',
  };
}

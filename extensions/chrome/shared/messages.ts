import type { EvidenceResponse, LookupResponse } from './types';

export type MessageType =
  | 'GET_STATE'
  | 'SAVE_API_KEY'
  | 'CLEAR_API_KEY'
  | 'SET_BADGE_DISMISSED'
  | 'LOOKUP'
  | 'CREATE_EVIDENCE'
  | 'EMAIL_DETECTED'
  | 'OPEN_POPUP'
  | 'GET_DETECTED_EMAIL';

export type ExtensionMessage =
  | { type: 'GET_STATE' }
  | { type: 'SAVE_API_KEY'; apiKey: string }
  | { type: 'CLEAR_API_KEY' }
  | { type: 'SET_BADGE_DISMISSED'; dismissed: boolean }
  | {
      type: 'LOOKUP';
      email: string;
      name?: string;
      address?: string;
    }
  | {
      type: 'CREATE_EVIDENCE';
      email: string;
      orderId: string;
      disputedAmount?: number;
      currency?: string;
    }
  | { type: 'EMAIL_DETECTED'; email: string }
  | { type: 'OPEN_POPUP'; email?: string }
  | { type: 'GET_DETECTED_EMAIL' };

export type ExtensionResponse =
  | {
      ok: true;
      apiKey?: string | null;
      badgeDismissed?: boolean;
      pendingEmail?: string | null;
      detectedEmail?: string | null;
      lookup?: LookupResponse;
      evidence?: EvidenceResponse;
    }
  | {
      ok: false;
      error: string;
      code?: number | 'network' | 'unknown';
    };

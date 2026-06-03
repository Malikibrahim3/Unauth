'use client';

import { createContext, useContext } from 'react';
import type { DevPreviewState } from '@/lib/product/devPreview';

const DevPreviewContext = createContext<DevPreviewState | null>(null);

export const DevPreviewProvider = DevPreviewContext.Provider;

export function useDevPreview(): DevPreviewState | null {
  return useContext(DevPreviewContext);
}

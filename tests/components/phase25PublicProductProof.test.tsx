/** @jest-environment jsdom */

import React from 'react';
import '@testing-library/jest-dom';
import fs from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { OperationalCaseDemo } from '@/components/demo/OperationalCaseDemo';
import FoundationHero from '@/app/(public)/landing/_components/foundation/FoundationHero';
import FoundationHero2 from '@/app/(public)/landing/_components/foundation/FoundationHero2';
import FoundationPricingTiers from '@/app/(public)/landing/_components/foundation/FoundationPricingTiers';
import {
  isDemoCaseStep,
  MERCHANT_CASE_V1,
} from '@/lib/demo/merchantCaseV1';
import { LANDING_TIER_CHART } from '@/lib/billing/landingTierChart';
import { TIER_CONFIG } from '@/lib/billing/tiers';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    priority: _priority,
    unoptimized: _unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    priority?: boolean;
    unoptimized?: boolean;
  }) => <img alt="" {...props} />,
}));

describe('Phase 25 public product proof', () => {
  it('uses a versioned, privacy-safe route state and keeps the demo decision local', () => {
    expect(isDemoCaseStep('recommendation')).toBe(true);
    expect(isDemoCaseStep('unknown')).toBe(false);
    expect(MERCHANT_CASE_V1.privacy).toContain('No production account');

    render(<OperationalCaseDemo initialStep="decision" />);

    expect(document.querySelector('main')).toHaveAttribute('data-demo-fixture', 'merchant-case-v1');
    expect(document.querySelector('main')).toHaveAttribute('data-demo-step', 'decision');
    expect(document.querySelector('.ua-working-surface')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: /Request more evidence Keep the case open/,
      }),
    );

    expect(document.querySelector('main')).toHaveAttribute('data-demo-step', 'recovery');
    expect(screen.getByText('Simulated merchant decision recorded')).toBeInTheDocument();
    expect(screen.getByText(/No payout or external claim was executed/)).toBeInTheDocument();
  });

  it('renders shipping-route captures instead of an iframe or a separately drawn product', () => {
    const { container } = render(
      <>
        <FoundationHero />
        <FoundationHero2 />
      </>,
    );

    expect(container.querySelector('iframe')).not.toBeInTheDocument();
    expect(
      screen.getByAltText(/case review showing source-labelled commerce/i),
    ).toHaveAttribute('src', '/product-proof/case-evidence.webp');
    expect(
      screen.getByAltText(/case recommendation showing the matched merchant rule/i),
    ).toHaveAttribute('src', '/product-proof/case-recommendation.webp');
    expect(screen.getAllByRole('link', { name: /case/i }).some((link) => link.getAttribute('href') === '/demo')).toBe(true);
  });

  it('keeps pricing aligned to the shipped entitlement chart and makes no trial claim', () => {
    render(<FoundationPricingTiers />);

    expect(screen.queryByText(/trial/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Choose Pro' })).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('heading', { name: 'Enterprise' })).toBeInTheDocument();

    const free = LANDING_TIER_CHART.find((tier) => tier.key === 'unauth');
    const pro = LANDING_TIER_CHART.find((tier) => tier.key === 'pro');
    const growth = LANDING_TIER_CHART.find((tier) => tier.key === 'growth');
    const enterprise = LANDING_TIER_CHART.find((tier) => tier.key === 'scale');
    expect(free?.features).toContain('Evidence workflow without raw export');
    expect(free?.features).toContain('No API / bulk workflows');
    expect(pro?.price).toBe(`$${TIER_CONFIG.pro.priceMonthlyUsd}/month`);
    expect(pro?.priceNote).toContain(
      TIER_CONFIG.pro.limits.contextCreditsPerMonth.toLocaleString('en-US'),
    );
    expect(growth?.price).toBe(`$${TIER_CONFIG.growth.priceMonthlyUsd}/month`);
    expect(growth?.features).toContain('Up to five connected stores and fifteen seats');
    expect(enterprise?.features).toContain('Lookup API access');
    expect(enterprise?.features).toContain('Security review and service agreement');
  });

  it('removes the obsolete product-artifact files from the active public routes', () => {
    const root = process.cwd();
    const landingSource = fs.readFileSync(
      path.join(root, 'app/(public)/landing/page.tsx'),
      'utf8',
    );
    const heroSource = fs.readFileSync(
      path.join(root, 'app/(public)/landing/_components/foundation/FoundationHero.tsx'),
      'utf8',
    );
    const rootSource = fs.readFileSync(path.join(root, 'app/page.tsx'), 'utf8');

    expect(landingSource).not.toContain('OutcomeLandingBody');
    expect(landingSource).not.toContain('UnauthLinearClaimHero');
    expect(heroSource).not.toContain('hero-artifact.html');
    expect(fs.existsSync(path.join(root, 'public/hero-artifact.html'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'public/hero-artifact-stack.html'))).toBe(false);
    expect(rootSource).toContain("preservedRedirectTarget('/landing'");
  });
});

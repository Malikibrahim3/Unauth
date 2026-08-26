import {
  FL_FOOTER,
  FL_HERO,
  FL_LANDING_STORY,
  FL_NAV,
  FL_ROUTES,
} from '../../_lib/foundationContent';

export const LANDING_ARTIFACT_IDS = [
  'hero-gate-overview',
  'gate-evidence-to-decision',
  'workspace-around-the-gate',
  'recovery-follow-through',
  'financial-case-to-ledger',
] as const;

export type LandingArtifactId = (typeof LANDING_ARTIFACT_IDS)[number];

type LandingArtifactVisualType = 'Real product screen' | 'Custom diagram';

export type LandingArtifactSpec = {
  id: LandingArtifactId;
  src: string | null;
  mobileSrc?: string | null;
  alt: string;
  width: number;
  height: number;
  mobileWidth?: number;
  mobileHeight?: number;
  caption?: string;
  priority?: boolean;
  visualType: LandingArtifactVisualType;
  objective: string;
  requiredContent: readonly string[];
  prohibitedTreatments: readonly string[];
};

export const LANDING_ARTIFACTS: Record<LandingArtifactId, LandingArtifactSpec> = {
  'hero-gate-overview': {
    id: 'hero-gate-overview',
    src: '/product-proof/hero-case-gate-hold-signal-3420x1920.png',
    mobileSrc: null,
    alt: 'Unauth evidence gate overview showing a request, its source evidence, matched rule and review state.',
    width: 2400,
    height: 1350,
    mobileWidth: 1200,
    mobileHeight: 900,
    caption: 'Fictional workspace · current product screen · CASE-1ECF9',
    priority: true,
    visualType: 'Real product screen',
    objective: 'Prove the product is real with one sanitised claim-detail screen and recognisable application chrome.',
    requiredContent: [
      'One £128 request with evidence 4 of 5',
      'The missing proof and matched rule',
      'An advisory recommendation',
      'A hard merchant-decision boundary',
      'External action: None',
    ],
    prohibitedTreatments: [
      'No generic mockup, fake avatars, placeholder metrics, or cropped-away application chrome.',
    ],
  },
  'gate-evidence-to-decision': {
    id: 'gate-evidence-to-decision',
    src: null,
    mobileSrc: null,
    alt: 'Unauth case evidence and merchant decision view for one fictional refund request.',
    width: 1920,
    height: 1200,
    mobileWidth: 1200,
    mobileHeight: 1200,
    caption: 'Evidence to decision',
    visualType: 'Custom diagram',
    objective: 'Explain how source evidence becomes a visible review state without turning coverage into an automatic decision.',
    requiredContent: [
      'Support, Commerce, Fulfilment, and Carrier inputs',
      'Visible evidence states and the matched rule',
      'Missing proof causing Needs review',
      'A hard merchant-decision boundary',
      'External action: None',
    ],
    prohibitedTreatments: [
      'No risk gauge or implication that evidence coverage automatically decides readiness.',
    ],
  },
  'workspace-around-the-gate': {
    id: 'workspace-around-the-gate',
    src: null,
    mobileSrc: null,
    alt: 'Unauth workspace connecting case operations, payout controls, recovery and financial reconciliation.',
    width: 1920,
    height: 1200,
    mobileWidth: 1200,
    mobileHeight: 1200,
    caption: 'Workspace around the gate',
    visualType: 'Custom diagram',
    objective: 'Show the product as one continuous operating system around the gate rather than disconnected feature cards.',
    requiredContent: [
      'Connect evidence → Operate case → Control gate',
      'Control gate → Recover loss → Reconcile money',
      'One continuous case spine',
      'The real product surfaces listed above this slot',
    ],
    prohibitedTreatments: [
      'No bento cards, generic icons, or disconnected feature tiles.',
    ],
  },
  'recovery-follow-through': {
    id: 'recovery-follow-through',
    src: null,
    mobileSrc: null,
    alt: 'Unauth recovery follow-through showing responsibility, evidence requirements and an open claim deadline.',
    width: 1920,
    height: 1200,
    mobileWidth: 1200,
    mobileHeight: 1200,
    caption: 'Recovery follow-through',
    visualType: 'Custom diagram',
    objective: 'Separate responsibility candidates from review-only signals, then show the controlled path to a provider deadline.',
    requiredContent: [
      'Carrier, warehouse/3PL, and supplier responsibility candidates',
      'Prior case pattern and policy hold, labelled as review context only',
      'Merchant confirmation and hard evidence gates',
      'External submission, provider position, and deadline',
    ],
    prohibitedTreatments: [
      'Do not present review-only signals as fault evidence or provider acceptance.',
    ],
  },
  'financial-case-to-ledger': {
    id: 'financial-case-to-ledger',
    src: null,
    mobileSrc: null,
    alt: 'Unauth financial trace connecting a case recommendation, merchant decision, recovery and ledger outcome.',
    width: 1920,
    height: 1200,
    mobileWidth: 1200,
    mobileHeight: 1200,
    caption: 'Case to ledger',
    visualType: 'Custom diagram',
    objective: 'Keep every decision, recovery, credit, and reconciliation state distinct from recommendation through ledger outcome.',
    requiredContent: [
      'Recommendation → Merchant decision → External action',
      'Confirmed loss → Recovery claim → Provider response',
      'Received credit → Matched credit → Reconciled money',
      'Unknown values shown as unavailable, never zero',
    ],
    prohibitedTreatments: [
      'No collapsed money stages, invented values, or unknown amounts rendered as zero.',
    ],
  },
};

export const neutralLandingViewModel = {
  routes: FL_ROUTES,
  nav: FL_NAV,
  hero: FL_HERO,
  story: FL_LANDING_STORY,
  footer: FL_FOOTER,
  artifacts: LANDING_ARTIFACTS,
} as const;

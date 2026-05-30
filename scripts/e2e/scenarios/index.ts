import type { Scenario } from './common';
import { scenario1 } from './scenario01';
import { scenario2 } from './scenario02';
import { scenario3 } from './scenario03';
import { scenario4 } from './scenario04';
import { scenario5 } from './scenario05';
import { scenario6 } from './scenario06';
import { scenario7 } from './scenario07';
import { scenario8 } from './scenario08';
import { scenario9 } from './scenario09';
import { scenario10 } from './scenario10';
import { scenario11 } from './scenario11';

/** All scenarios in execution order. Scenario 1 must always run first. */
export const SCENARIOS: Scenario[] = [
  scenario1,
  scenario2,
  scenario3,
  scenario4,
  scenario5,
  scenario6,
  scenario7,
  scenario8,
  scenario9,
  scenario10,
  scenario11,
];

export type { Scenario, ScenarioContext } from './common';

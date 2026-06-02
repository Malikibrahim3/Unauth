'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';

/**
 * Keeps local state aligned when an external prop changes, without a sync effect.
 * @see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
 */
export function useAdjustStateWhenPropChanges<TProp, TState>(
  prop: TProp,
  apply: (prop: TProp) => TState,
  initialState: TState,
): [TState, Dispatch<SetStateAction<TState>>] {
  const [state, setState] = useState(initialState);
  const [prevProp, setPrevProp] = useState(prop);

  if (prop !== prevProp) {
    setPrevProp(prop);
    setState(apply(prop));
  }

  return [state, setState];
}

#!/bin/sh
set -eu

SOURCE="AUTHENTICATED_PRODUCT_REVAMP_IMPLEMENTATION_PLAN.md"
OUT="docs/revamp-phases"
mkdir -p "$OUT"

shared_intro() {
  sed -n '1,73p' "$SOURCE"
}

handoff_contract() {
  sed -n '874,934p' "$SOURCE"
  sed -n '935,988p' "$SOURCE"
}

write_phase() {
  number="$1"
  slug="$2"
  title="$3"
  roadmap_start="$4"
  roadmap_end="$5"
  scope_ranges="$6"
  journeys_range="$7"
  output="$OUT/PHASE-${number}-${slug}.md"

  {
    printf '# Implementation prompt — Phase %s: %s\n\n' "$number" "$title"
    printf '> Execute this phase only. Do not begin a later phase. Treat this file as a self-contained implementation brief.\n\n'
    shared_intro
    printf '\n## Phase boundary and required outcome\n\n'
    sed -n "${roadmap_start},${roadmap_end}p" "$SOURCE"
    printf '\nThe scope above is a hard delivery boundary, not permission to ignore dependencies. Inspect the current repository before editing, preserve verified backend capability, and rebuild every in-scope view/component from the assumption that its current presentation is not fit for purpose. Do not silently expand into later phases. If a later-phase dependency is needed, introduce the smallest typed seam or temporary compatibility adapter and record it in the handoff.\n\n'
    printf 'Completion means implementation, migrations where explicitly required, tests, accessibility checks, responsive verification, and a clean handoff—not a plan or visual mock-up. Do not mark the phase complete while any in-scope route, component, state, interaction, chart, or acceptance item is unverified.\n\n'
    printf '## Relevant audited specification\n\n'
    oldifs="$IFS"
    IFS=';'
    for range in $scope_ranges; do
      sed -n "${range}p" "$SOURCE"
      printf '\n'
    done
    IFS="$oldifs"
    if [ -n "$journeys_range" ]; then
      printf '## Relevant end-to-end journeys\n\n'
      sed -n "${journeys_range}p" "$SOURCE"
      printf '\n'
    fi
    printf '## File-level and component disposition requirements\n\n'
    sed -n '743,899p' "$SOURCE"
    printf '\n## Mandatory implementation and verification protocol\n\n'
    handoff_contract
    printf '\n## Phase completion response\n\n'
    printf 'Return: (1) outcome summary, (2) routes/components changed, (3) schema/API/read-model changes, (4) tests and exact commands/results, (5) screenshots or rendered evidence at supported widths, (6) accessibility/performance/security checks, (7) redirects/compatibility retained, (8) known limitations, and (9) the exact commit hash. Explicitly state every unchecked acceptance item; never describe an unverified item as complete.\n'
  } > "$output"
}

write_phase 1 foundations-contracts-shell "Safety, contracts, shell and shared foundations" 664 683 '74,296;441,602' ''
write_phase 2 payout-control-workflow "Core payout-control workflow" 684 693 '297,335' '603,613'
write_phase 3 loss-recovery-workflow "Financial outcome and recovery workflow" 694 703 '336,356;532,563' '614,629'
write_phase 4 customers-connected-objects "Connected customer and source objects" 704 713 '254,276;357,397;564,602' '630,637'
write_phase 5 intelligence-reporting-visualisation "Intelligence and commercial reporting" 714 723 '285,296;406,415;463,531' '638,645'
write_phase 6 configuration-administration "Configuration and administration" 724 733 '398,440;564,602' '646,661'
write_phase 7 hardening-rollout "Hardening and controlled rollout" 734 742 '74,170;441,602' ''

printf 'Built phased prompts in %s\n' "$OUT"

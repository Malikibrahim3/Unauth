import { NextResponse } from "next/server";

/**
 * Phase 3 deliberately retires unversioned bulk Work mutations. Keep a
 * tombstone response at the former URL so stale clients fail closed instead
 * of retrying an action whose per-record lifecycle guarantees no longer hold.
 */
export async function PATCH() {
  return NextResponse.json(
    {
      error:
        "Bulk task transitions are unavailable. Update each record from its current Work state.",
    },
    { status: 410 },
  );
}

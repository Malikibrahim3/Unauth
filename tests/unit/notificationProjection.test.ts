import { projectNotificationFromEvent } from "@/lib/notifications/project";
import { TABLES } from "@/lib/supabase/tables";

const MERCHANT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";

function event() {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    merchant_id: MERCHANT_ID,
    event_type: "notification.requested",
    payload: {
      recipient_user_id: USER_ID,
      kind: "assignment",
      title: "Case assigned",
      body: "Review the evidence.",
      target_href: "/claims/case-1",
      deduplication_key: "assignment:case-1:user-1",
    },
  } as const;
}

function makeClient(options: { member?: boolean; muted?: boolean } = {}) {
  const { member = true, muted = false } = options;
  const upsert = jest.fn().mockResolvedValue({ error: null });
  const queries: Array<{ table: string; filters: Array<[string, unknown]> }> =
    [];

  const client = {
    from(table: string) {
      const filters: Array<[string, unknown]> = [];
      queries.push({ table, filters });
      const builder: Record<string, unknown> = {};
      builder.select = () => builder;
      builder.eq = (column: string, value: unknown) => {
        filters.push([column, value]);
        return builder;
      };
      builder.in = (column: string, value: unknown) => {
        filters.push([column, value]);
        return builder;
      };
      builder.maybeSingle = async () => ({
        data:
          table === TABLES.MERCHANT_MEMBERS && member
            ? { user_id: USER_ID }
            : null,
        error: null,
      });
      builder.upsert = upsert;
      builder.then = (resolve: (value: unknown) => unknown) =>
        resolve({
          data:
            table === TABLES.NOTIFICATION_PREFERENCES && muted
              ? [{ user_id: USER_ID, in_app_enabled: false }]
              : [],
          error: null,
        });
      return builder;
    },
  };

  return { client, queries, upsert };
}

describe("notification event projection", () => {
  it("ignores unrelated domain events", async () => {
    const { client, queries } = makeClient();
    await expect(
      projectNotificationFromEvent(client as never, {
        ...event(),
        event_type: "claim.updated",
      }),
    ).resolves.toEqual({ applied: false, detail: "ignored" });
    expect(queries).toHaveLength(0);
  });

  it("rejects a recipient who is not an active member of the event merchant", async () => {
    const { client, upsert } = makeClient({ member: false });
    await expect(
      projectNotificationFromEvent(client as never, event()),
    ).rejects.toThrow("notification_recipient_not_active_member");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("honours a recipient mute without writing an inbox row", async () => {
    const { client, upsert } = makeClient({ muted: true });
    await expect(
      projectNotificationFromEvent(client as never, event()),
    ).resolves.toEqual({
      applied: true,
      detail: "notification_muted:assignment",
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("writes an idempotent, merchant- and recipient-scoped inbox row", async () => {
    const { client, queries, upsert } = makeClient();
    await expect(
      projectNotificationFromEvent(client as never, event()),
    ).resolves.toEqual({
      applied: true,
      detail: "notification:assignment:case-1:user-1",
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        merchant_id: MERCHANT_ID,
        recipient_user_id: USER_ID,
        domain_event_id: event().id,
        deduplication_key: "assignment:case-1:user-1",
      }),
      { onConflict: "merchant_id,recipient_user_id,deduplication_key" },
    );
    expect(
      queries.find((query) => query.table === TABLES.MERCHANT_MEMBERS)?.filters,
    ).toEqual(
      expect.arrayContaining([
        ["merchant_id", MERCHANT_ID],
        ["user_id", USER_ID],
        ["invite_status", "active"],
      ]),
    );
  });
});

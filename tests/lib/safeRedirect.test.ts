import { safeRedirectPath } from "@/lib/auth/safeRedirect";

describe("safeRedirectPath", () => {
  it.each([
    null,
    undefined,
    "",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
  ])("rejects unsafe redirect %s", (candidate) =>
    expect(safeRedirectPath(candidate)).toBe("/overview"),
  );

  it("preserves a same-origin application path, query and fragment", () => {
    expect(safeRedirectPath("/work?view=mine#queue")).toBe(
      "/work?view=mine#queue",
    );
  });
});

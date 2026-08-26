import { authReturnPath, loginHrefForReturnPath } from "@/lib/auth/routeContinuity";

describe("authenticated route continuity", () => {
  it("preserves an encoded named-report route and scope", () => {
    expect(authReturnPath("%2Ffinancials%2Freports%2Frecovery%3Frange%3D90d")).toBe(
      "/financials/reports/recovery?range=90d",
    );
    expect(loginHrefForReturnPath("/financials/reports/recovery?range=90d")).toBe(
      "/login?next=%2Ffinancials%2Freports%2Frecovery%3Frange%3D90d",
    );
  });

  it("rejects an unsafe persisted return target", () => {
    expect(authReturnPath("https%3A%2F%2Fevil.example")).toBe("/overview");
  });
});

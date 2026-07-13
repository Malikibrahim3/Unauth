import { htmlSafeJson } from "@/lib/utils/htmlSafeJson";

describe("htmlSafeJson", () => {
  it("escapes characters that can break out of an inline script", () => {
    const serialized = htmlSafeJson({
      value: "</script><script>alert(1)</script>&\u2028\u2029",
    });

    expect(serialized).not.toContain("</script>");
    expect(serialized).not.toContain("&");
    expect(serialized).not.toContain("\u2028");
    expect(serialized).not.toContain("\u2029");
    expect(JSON.parse(serialized)).toEqual({
      value: "</script><script>alert(1)</script>&\u2028\u2029",
    });
  });
});

import { getClaudeAuthStatus } from "../claude.js";

describe("getClaudeAuthStatus", () => {
  test("prefers Claude OAuth token", () => {
    const status = getClaudeAuthStatus({
      CLAUDE_CODE_OAUTH_TOKEN: "oauth",
      ANTHROPIC_API_KEY: "key",
    });

    expect(status.ok).toBe(true);
    expect(status.method).toBe("oauth-token");
    expect(status.env).toEqual({ CLAUDE_CODE_OAUTH_TOKEN: "oauth" });
  });

  test("uses Anthropic API key when OAuth token is absent", () => {
    const status = getClaudeAuthStatus({ ANTHROPIC_API_KEY: "key" });

    expect(status.ok).toBe(true);
    expect(status.method).toBe("api-key");
    expect(status.env).toEqual({ ANTHROPIC_API_KEY: "key" });
  });

  test("fails with setup guidance when no auth is available", () => {
    const status = getClaudeAuthStatus({});

    expect(status.ok).toBe(false);
    expect(status.message).toContain("claude setup-token");
  });
});


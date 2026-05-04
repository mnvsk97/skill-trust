export type ClaudeAuthMethod = "oauth-token" | "api-key";

export interface ClaudeAuthStatus {
  ok: boolean;
  method?: ClaudeAuthMethod;
  env: Record<string, string>;
  message: string;
}

export function getClaudeAuthStatus(env = process.env): ClaudeAuthStatus {
  const oauthToken = env.CLAUDE_CODE_OAUTH_TOKEN;
  if (oauthToken && oauthToken.trim() !== "") {
    return {
      ok: true,
      method: "oauth-token",
      env: { CLAUDE_CODE_OAUTH_TOKEN: oauthToken },
      message: "Claude auth found via CLAUDE_CODE_OAUTH_TOKEN.",
    };
  }

  const apiKey = env.ANTHROPIC_API_KEY;
  if (apiKey && apiKey.trim() !== "") {
    return {
      ok: true,
      method: "api-key",
      env: { ANTHROPIC_API_KEY: apiKey },
      message: "Claude auth found via ANTHROPIC_API_KEY.",
    };
  }

  return {
    ok: false,
    env: {},
    message:
      "Claude auth is required for behavior tests. Set CLAUDE_CODE_OAUTH_TOKEN for subscription auth, or ANTHROPIC_API_KEY for API auth. For subscription auth, run `claude setup-token` and export the printed token.",
  };
}


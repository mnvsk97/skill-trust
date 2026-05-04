import { parseSkillsFindOutput, recommendCandidates } from "../index.js";

describe("skills discovery", () => {
  test("parses npx skills find output", () => {
    const output = `
Install with npx skills add <owner/repo@skill>

vercel-labs/agent-skills@vercel-react-best-practices 364.1K installs
└ https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices

callstackincubator/agent-skills@react-native-best-practices 11.6K installs
└ https://skills.sh/callstackincubator/agent-skills/react-native-best-practices
`;

    const candidates = parseSkillsFindOutput(output);

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      package: "vercel-labs/agent-skills@vercel-react-best-practices",
      source: "vercel-labs/agent-skills",
      skill: "vercel-react-best-practices",
      installs: 364100,
      installText: "npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices",
    });
  });

  test("recommends high-signal popular sources first", () => {
    const recommendations = recommendCandidates([
      {
        package: "unknown/repo@skill",
        source: "unknown/repo",
        skill: "skill",
        installs: 50,
        installText: "npx skills add unknown/repo --skill skill",
      },
      {
        package: "vercel-labs/agent-skills@vercel-react-best-practices",
        source: "vercel-labs/agent-skills",
        skill: "vercel-react-best-practices",
        installs: 100_000,
        installText: "npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices",
      },
    ]);

    expect(recommendations[0].candidate.source).toBe("vercel-labs/agent-skills");
    expect(recommendations[0].verdict).toBe("recommended");
    expect(recommendations[1].verdict).toBe("review");
  });
});

export type AttackTechniqueEnrichment = {
  cwe?: string;
  mitreId?: string;
  tags: string[];
};

type TechniqueIndexEntry = {
  patterns: RegExp[];
  cwe?: string;
  mitreId: string;
  tactic: string;
  tag: string;
};

const TECHNIQUE_INDEX: TechniqueIndexEntry[] = [
  {
    patterns: [/sql injection|sqli|database injection/i],
    cwe: "CWE-89",
    mitreId: "T1190",
    tactic: "Initial Access",
    tag: "attack:initial-access"
  },
  {
    patterns: [/cross.?site scripting|\bxss\b/i],
    cwe: "CWE-79",
    mitreId: "T1059.007",
    tactic: "Execution",
    tag: "attack:execution"
  },
  {
    patterns: [/jwt|json web token|alg.?none|weak secret|token/i],
    cwe: "CWE-347",
    mitreId: "T1550",
    tactic: "Defense Evasion",
    tag: "attack:defense-evasion"
  },
  {
    patterns: [/rate.?limit|credential stuffing|brute.?force|password policy|weak password/i],
    cwe: "CWE-307",
    mitreId: "T1110",
    tactic: "Credential Access",
    tag: "attack:credential-access"
  },
  {
    patterns: [/user.?enumeration|timing oracle|auth.*oracle|response difference/i],
    cwe: "CWE-203",
    mitreId: "T1589",
    tactic: "Reconnaissance",
    tag: "attack:reconnaissance"
  },
  {
    patterns: [/tls|ssl|certificate|cipher|protocol downgrade/i],
    cwe: "CWE-326",
    mitreId: "T1557",
    tactic: "Credential Access",
    tag: "attack:credential-access"
  },
  {
    patterns: [/directory|content discovery|hidden path|exposed file|sensitive data/i],
    cwe: "CWE-200",
    mitreId: "T1083",
    tactic: "Discovery",
    tag: "attack:discovery"
  },
  {
    patterns: [/open port|service exposure|service fingerprint|banner|network service/i],
    cwe: "CWE-200",
    mitreId: "T1046",
    tactic: "Discovery",
    tag: "attack:discovery"
  },
  {
    patterns: [/missing security header|clickjack|csp|hsts|x-frame-options/i],
    cwe: "CWE-693",
    mitreId: "T1189",
    tactic: "Initial Access",
    tag: "attack:initial-access"
  }
];

export function enrichAttackTechnique(input: {
  technique?: string | null;
  title?: string | null;
  description?: string | null;
  existingCwe?: string | null;
  existingMitreId?: string | null;
  tags?: string[];
}): AttackTechniqueEnrichment {
  const text = [input.technique, input.title, input.description].filter(Boolean).join(" ");
  const match = TECHNIQUE_INDEX.find((entry) => entry.patterns.some((pattern) => pattern.test(text)));
  const tags = new Set(input.tags ?? []);

  if (!match) {
    return {
      ...(input.existingCwe ? { cwe: input.existingCwe } : {}),
      ...(input.existingMitreId ? { mitreId: input.existingMitreId } : {}),
      tags: [...tags]
    };
  }

  tags.add(match.tag);
  tags.add(`mitre:${match.mitreId}`);
  tags.add(`mitre-tactic:${match.tactic.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);

  return {
    ...(input.existingCwe ?? match.cwe ? { cwe: input.existingCwe ?? match.cwe } : {}),
    mitreId: input.existingMitreId ?? match.mitreId,
    tags: [...tags]
  };
}

import { type DemoResponse } from "@synosec/contracts";

export const demoResponse: DemoResponse = {
  scanMode: "depth-first",
  targetCount: 2,
  findings: [
    {
      id: "finding-ssh-legacy",
      target: "192.168.10.14",
      severity: "medium",
      summary: "Legacy SSH banner exposed with deprecated ciphers enabled."
    },
    {
      id: "finding-cms-version",
      target: "intranet.synosec.local",
      severity: "high",
      summary: "Public version leak maps to a known CMS vulnerability."
    }
  ]
};

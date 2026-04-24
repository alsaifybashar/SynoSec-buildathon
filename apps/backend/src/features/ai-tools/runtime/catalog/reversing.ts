import type { ToolCatalogEntry } from "./types.js";

export const reversingTools: ToolCatalogEntry[] = [
  { id: "binwalk", displayName: "Binwalk", binary: "binwalk", category: "reversing", riskTier: "passive", phase: "post", osiLayers: ["L7"], tags: ["reversing", "firmware", "extract"] },
  { id: "checksec", displayName: "Checksec", binary: "checksec", category: "reversing", riskTier: "passive", phase: "enum", osiLayers: ["L7"], tags: ["reversing", "binary", "hardening"] },
  { id: "gdb", displayName: "GDB", binary: "gdb", category: "reversing", riskTier: "passive", phase: "post", osiLayers: ["L7"], tags: ["reversing", "debugger", "binary"] },
  { id: "ghidra", displayName: "Ghidra", binary: "ghidraRun", category: "reversing", riskTier: "passive", phase: "post", osiLayers: ["L7"], tags: ["reversing", "decompiler", "binary"] },
  { id: "objdump", displayName: "Objdump", binary: "objdump", category: "reversing", riskTier: "passive", phase: "post", osiLayers: ["L7"], tags: ["reversing", "binary", "disassembly"] },
  { id: "radare2", displayName: "Radare2", binary: "r2", category: "reversing", riskTier: "passive", phase: "post", osiLayers: ["L7"], tags: ["reversing", "binary", "disassembly"] },
  { id: "strings", displayName: "Strings", binary: "strings", category: "reversing", riskTier: "passive", phase: "utility", osiLayers: ["L7"], tags: ["reversing", "binary", "strings"] }
];

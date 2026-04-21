#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function nowIso() {
  return new Date().toISOString();
}

function parseTimestamp(value) {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function normalizeStoryStatus(value) {
  if (value == null) {
    return "open";
  }

  return String(value).trim().toLowerCase();
}

function normalizeRunStatus(value) {
  if (value == null) {
    return "unknown";
  }

  return String(value).trim().toLowerCase();
}

function compareRunRecency(left, right) {
  const startedDifference = parseTimestamp(right.startedAt) - parseTimestamp(left.startedAt);
  if (startedDifference !== 0) {
    return startedDifference;
  }

  const finishedDifference = parseTimestamp(right.finishedAt) - parseTimestamp(left.finishedAt);
  if (finishedDifference !== 0) {
    return finishedDifference;
  }

  if ((right.runId ?? "") !== (left.runId ?? "")) {
    return String(right.runId ?? "").localeCompare(String(left.runId ?? ""));
  }

  return Number(right.iteration ?? 0) - Number(left.iteration ?? 0);
}

function selectLatestRun(runs) {
  return runs.slice().sort(compareRunRecency)[0] ?? null;
}

function parseProgressEntries(progressPath) {
  if (!fs.existsSync(progressPath)) {
    return [];
  }

  const text = fs.readFileSync(progressPath, "utf8");
  const sections = text.split(/^## \[/m).slice(1);

  return sections.map((section, index) => {
    const lines = [`## [${section}`].join("").split("\n");
    const header = lines[0] ?? "";
    const body = lines.slice(1);
    const storyMatch = header.match(/- ([A-Z0-9_-]+):\s*(.+)$/);
    const runLine = body.find((line) => line.startsWith("Run: "));
    const outcomeLine = body.find((line) => line.startsWith("- Outcome: "));
    const runMatch = runLine?.match(/^Run:\s+([0-9-]+)\s+\(iteration\s+(\d+)\)$/);

    return {
      index,
      storyId: storyMatch?.[1] ?? "",
      title: storyMatch?.[2] ?? "",
      runId: runMatch?.[1] ?? "",
      iteration: runMatch ? Number.parseInt(runMatch[2], 10) : null,
      outcome: outcomeLine ? outcomeLine.replace("- Outcome: ", "").trim().toLowerCase() : "completed"
    };
  }).filter((entry) => entry.storyId);
}

function loadRunRecords(runsDir) {
  if (!fs.existsSync(runsDir)) {
    return [];
  }

  return fs.readdirSync(runsDir)
    .filter((entry) => entry.endsWith(".json") && entry.startsWith("run-"))
    .flatMap((entry) => {
      const recordPath = path.join(runsDir, entry);
      try {
        const record = readJson(recordPath);
        return [{ ...record, recordPath }];
      } catch {
        return [];
      }
    });
}

function normalizeEffectiveRun(record, staleSeconds) {
  const status = normalizeRunStatus(record.status);
  if (status !== "running") {
    return { ...record, effectiveStatus: status };
  }

  if (staleSeconds <= 0) {
    return { ...record, effectiveStatus: status };
  }

  const startedAt = parseTimestamp(record.startedAt);
  if (!Number.isFinite(startedAt)) {
    return { ...record, effectiveStatus: "failed", failureReason: "invalid_started_at" };
  }

  const ageSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  if (ageSeconds > staleSeconds) {
    return {
      ...record,
      effectiveStatus: "failed",
      finishedAt: record.finishedAt ?? nowIso(),
      failureReason: record.failureReason ?? "stale_running_recovery"
    };
  }

  return { ...record, effectiveStatus: status };
}

function findMatchingProgressEntry(entries, storyId, runId, iteration) {
  return entries.find((entry) => (
    entry.storyId === storyId &&
    entry.runId === runId &&
    entry.iteration === iteration
  )) ?? null;
}

function setStoryStatus(story, nextStatus) {
  const timestamp = nowIso();
  story.status = nextStatus;
  story.updatedAt = timestamp;

  if (nextStatus === "done") {
    story.startedAt = story.startedAt ?? timestamp;
    story.completedAt = timestamp;
    return;
  }

  if (nextStatus === "in_progress") {
    story.startedAt = story.startedAt ?? timestamp;
    story.completedAt = null;
    return;
  }

  story.startedAt = null;
  story.completedAt = null;
}

function reconcilePrdState(prd, progressEntries, runRecords, staleSeconds) {
  const stories = Array.isArray(prd.stories) ? prd.stories : [];
  const normalizedRuns = runRecords.map((record) => normalizeEffectiveRun(record, staleSeconds));

  for (const story of stories) {
    if (!story || typeof story !== "object") {
      continue;
    }

    const latestRun = selectLatestRun(
      normalizedRuns.filter((record) => record.storyId === story.id)
    );
    const matchingProgress = latestRun
      ? findMatchingProgressEntry(progressEntries, story.id, latestRun.runId, latestRun.iteration)
      : null;
    const currentStatus = normalizeStoryStatus(story.status);

    if (!latestRun) {
      if (currentStatus === "in_progress") {
        setStoryStatus(story, "open");
      }
      continue;
    }

    if (latestRun.effectiveStatus === "completed") {
      if (matchingProgress) {
        if (currentStatus !== "done") {
          setStoryStatus(story, "done");
        }
      } else if (currentStatus !== "open") {
        setStoryStatus(story, "open");
      }
      continue;
    }

    if (latestRun.effectiveStatus === "running") {
      if (currentStatus !== "in_progress") {
        setStoryStatus(story, "in_progress");
      }
      continue;
    }

    if (currentStatus !== "open") {
      setStoryStatus(story, "open");
    }
  }

  return prd;
}

function buildStoryBlock(candidate) {
  const depends = Array.isArray(candidate.dependsOn) ? candidate.dependsOn : [];
  const acceptance = Array.isArray(candidate.acceptanceCriteria) ? candidate.acceptanceCriteria : [];
  const description = candidate.description || "";
  const blockLines = [];

  blockLines.push(`### ${candidate.id ?? ""}: ${candidate.title ?? ""}`);
  blockLines.push(`Status: ${candidate.status ?? "open"}`);
  blockLines.push(`Depends on: ${depends.length > 0 ? depends.join(", ") : "None"}`);
  blockLines.push("");
  blockLines.push("Description:");
  blockLines.push(description || "(none)");
  blockLines.push("");
  blockLines.push("Acceptance Criteria:");
  if (acceptance.length > 0) {
    blockLines.push(...acceptance.map((item) => `- [ ] ${item}`));
  } else {
    blockLines.push("- (none)");
  }

  return `${blockLines.join("\n")}\n`;
}

function selectStory({ prdPath, progressPath, runsDir, staleSeconds, metaOut, blockOut }) {
  const prd = readJson(prdPath);
  const progressEntries = parseProgressEntries(progressPath);
  const runRecords = loadRunRecords(runsDir);
  reconcilePrdState(prd, progressEntries, runRecords, staleSeconds);

  const stories = Array.isArray(prd.stories) ? prd.stories : [];
  const storyIndex = new Map(stories.filter((story) => story && typeof story === "object").map((story) => [story.id, story]));
  const remaining = stories.filter((story) => normalizeStoryStatus(story?.status) !== "done").length;

  let candidate = null;
  for (const story of stories) {
    if (!story || typeof story !== "object") {
      continue;
    }

    if (normalizeStoryStatus(story.status) !== "open") {
      continue;
    }

    const dependsOn = Array.isArray(story.dependsOn) ? story.dependsOn : [];
    const dependenciesMet = dependsOn.every((dependencyId) => normalizeStoryStatus(storyIndex.get(dependencyId)?.status) === "done");
    if (!dependenciesMet) {
      continue;
    }

    candidate = story;
    break;
  }

  const meta = {
    ok: true,
    total: stories.length,
    remaining,
    quality_gates: prd.qualityGates ?? []
  };

  if (candidate) {
    setStoryStatus(candidate, "in_progress");
    meta.id = candidate.id ?? "";
    meta.title = candidate.title ?? "";
    fs.writeFileSync(blockOut, buildStoryBlock(candidate));
  } else {
    fs.writeFileSync(blockOut, "");
  }

  writeJson(prdPath, prd);
  writeJson(metaOut, meta);
}

function startRun({ recordPath, runId, iteration, storyId, storyTitle, startedAt, logFile, summaryFile }) {
  const record = {
    version: 1,
    runId,
    iteration: Number(iteration),
    storyId,
    storyTitle,
    status: "running",
    startedAt,
    finishedAt: null,
    logFile,
    summaryFile,
    failureReason: null
  };
  writeJson(recordPath, record);
}

function appendFailureProgress(progressPath, record, reason) {
  const existingEntries = parseProgressEntries(progressPath);
  const existing = findMatchingProgressEntry(existingEntries, record.storyId, record.runId, record.iteration);
  if (existing) {
    return false;
  }

  const timestamp = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", hour12: false }).replace(",", "");
  const entry = [
    `## [${timestamp}] - ${record.storyId}: ${record.storyTitle}`,
    "Thread: ",
    `Run: ${record.runId} (iteration ${record.iteration})`,
    `Run log: ${record.logFile}`,
    `Run summary: ${record.summaryFile}`,
    "- Outcome: failed",
    `- Failure reason: ${reason}`,
    "---",
    ""
  ].join("\n");

  fs.appendFileSync(progressPath, entry);
  return true;
}

function finalizeRun({ prdPath, progressPath, runsDir, recordPath, result, finishedAt }) {
  const prd = readJson(prdPath);
  const progressEntriesBefore = parseProgressEntries(progressPath);
  const runRecords = loadRunRecords(runsDir);
  reconcilePrdState(prd, progressEntriesBefore, runRecords, 0);

  const record = readJson(recordPath);
  const story = (Array.isArray(prd.stories) ? prd.stories : []).find((entry) => entry?.id === record.storyId);
  const progressEntry = findMatchingProgressEntry(progressEntriesBefore, record.storyId, record.runId, record.iteration);

  let finalStatus = normalizeRunStatus(result);
  let failureReason = null;

  if (finalStatus === "completed" && !progressEntry) {
    finalStatus = "failed";
    failureReason = "missing_progress_entry";
  } else if (finalStatus !== "completed") {
    finalStatus = "failed";
    failureReason = finalStatus === "failed" ? "agent_failed" : `${finalStatus}_during_execution`;
  }

  record.status = finalStatus;
  record.finishedAt = finishedAt;
  record.failureReason = failureReason;
  writeJson(recordPath, record);

  let progressUpdated = false;
  if (story) {
    if (finalStatus === "completed") {
      setStoryStatus(story, "done");
    } else {
      setStoryStatus(story, "open");
      progressUpdated = appendFailureProgress(progressPath, record, failureReason ?? "agent_failed");
    }
    writeJson(prdPath, prd);
  }

  process.stdout.write(JSON.stringify({
    storyStatus: story?.status ?? "",
    runStatus: record.status,
    failureReason,
    progressUpdated
  }));
}

function getArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) {
    return "";
  }

  return process.argv[index + 1];
}

const command = process.argv[2];

if (command === "select-story") {
  selectStory({
    prdPath: getArg("--prd"),
    progressPath: getArg("--progress"),
    runsDir: getArg("--runs-dir"),
    staleSeconds: Number.parseInt(getArg("--stale-seconds") || "0", 10),
    metaOut: getArg("--meta-out"),
    blockOut: getArg("--block-out")
  });
} else if (command === "start-run") {
  startRun({
    recordPath: getArg("--record-path"),
    runId: getArg("--run-id"),
    iteration: getArg("--iteration"),
    storyId: getArg("--story-id"),
    storyTitle: getArg("--story-title"),
    startedAt: getArg("--started-at"),
    logFile: getArg("--log-file"),
    summaryFile: getArg("--summary-file")
  });
} else if (command === "finalize-run") {
  finalizeRun({
    prdPath: getArg("--prd"),
    progressPath: getArg("--progress"),
    runsDir: getArg("--runs-dir"),
    recordPath: getArg("--record-path"),
    result: getArg("--result"),
    finishedAt: getArg("--finished-at")
  });
}

export {
  appendFailureProgress,
  compareRunRecency,
  finalizeRun,
  findMatchingProgressEntry,
  loadRunRecords,
  normalizeEffectiveRun,
  normalizeStoryStatus,
  parseProgressEntries,
  reconcilePrdState,
  selectLatestRun,
  selectStory,
  startRun
};

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  loadRunRecords,
  reconcilePrdState,
  selectLatestRun,
  selectStory,
  startRun
} from "./workflow-state.mjs";

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ralph-workflow-state-"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createPrd(stories) {
  return {
    qualityGates: ["state must reconcile"],
    stories
  };
}

test("selectLatestRun ignores partial writes and stays deterministic", () => {
  const tempDir = createTempDir();
  const runsDir = path.join(tempDir, "runs");
  fs.mkdirSync(runsDir, { recursive: true });

  fs.writeFileSync(path.join(runsDir, "run-broken.json"), "{not-json");
  writeJson(path.join(runsDir, "run-older.json"), {
    runId: "20260421-010000-000001",
    iteration: 1,
    storyId: "S2",
    status: "failed",
    startedAt: "2026-04-21T01:00:00.000Z",
    finishedAt: "2026-04-21T01:03:00.000Z"
  });
  writeJson(path.join(runsDir, "run-latest.json"), {
    runId: "20260421-010500-000001",
    iteration: 1,
    storyId: "S2",
    status: "completed",
    startedAt: "2026-04-21T01:05:00.000Z",
    finishedAt: "2026-04-21T01:07:00.000Z"
  });

  const runs = loadRunRecords(runsDir);
  assert.equal(runs.length, 2);
  assert.equal(selectLatestRun(runs)?.runId, "20260421-010500-000001");
});

test("reconcilePrdState reopens conflicting done stories when progress is missing", () => {
  const prd = createPrd([
    {
      id: "S2",
      title: "Reconcile state",
      status: "done",
      startedAt: "2026-04-21T01:00:00.000Z",
      completedAt: "2026-04-21T01:10:00.000Z",
      updatedAt: "2026-04-21T01:10:00.000Z"
    }
  ]);

  reconcilePrdState(prd, [], [{
    runId: "20260421-010500-000001",
    iteration: 2,
    storyId: "S2",
    status: "completed",
    startedAt: "2026-04-21T01:05:00.000Z",
    finishedAt: "2026-04-21T01:07:00.000Z"
  }], 0);

  assert.equal(prd.stories[0].status, "open");
  assert.equal(prd.stories[0].completedAt, null);
});

test("reconcilePrdState follows the latest run outcome and matching progress for surfaced story status", () => {
  const prd = createPrd([
    {
      id: "S2",
      title: "Completed latest run",
      status: "open",
      startedAt: null,
      completedAt: null,
      updatedAt: "2026-04-21T01:00:00.000Z"
    },
    {
      id: "S3",
      title: "Failed latest run",
      status: "done",
      startedAt: "2026-04-21T01:00:00.000Z",
      completedAt: "2026-04-21T01:10:00.000Z",
      updatedAt: "2026-04-21T01:10:00.000Z"
    }
  ]);

  const progressEntries = [
    {
      index: 0,
      storyId: "S2",
      title: "Completed latest run",
      runId: "20260421-020000-000002",
      iteration: 2,
      outcome: "completed"
    },
    {
      index: 1,
      storyId: "S3",
      title: "Failed latest run",
      runId: "20260421-010000-000001",
      iteration: 1,
      outcome: "completed"
    }
  ];

  reconcilePrdState(prd, progressEntries, [
    {
      runId: "20260421-010000-000001",
      iteration: 1,
      storyId: "S2",
      status: "failed",
      startedAt: "2026-04-21T01:00:00.000Z",
      finishedAt: "2026-04-21T01:05:00.000Z"
    },
    {
      runId: "20260421-020000-000002",
      iteration: 2,
      storyId: "S2",
      status: "completed",
      startedAt: "2026-04-21T02:00:00.000Z",
      finishedAt: "2026-04-21T02:05:00.000Z"
    },
    {
      runId: "20260421-010000-000001",
      iteration: 1,
      storyId: "S3",
      status: "completed",
      startedAt: "2026-04-21T01:00:00.000Z",
      finishedAt: "2026-04-21T01:05:00.000Z"
    },
    {
      runId: "20260421-020000-000002",
      iteration: 2,
      storyId: "S3",
      status: "failed",
      startedAt: "2026-04-21T02:00:00.000Z",
      finishedAt: "2026-04-21T02:02:00.000Z"
    }
  ], 0);

  assert.equal(prd.stories[0].status, "done");
  assert.ok(prd.stories[0].completedAt);
  assert.equal(prd.stories[1].status, "open");
  assert.equal(prd.stories[1].completedAt, null);
});

test("selectStory recovers stale in-progress runs before choosing the next story", () => {
  const tempDir = createTempDir();
  const prdPath = path.join(tempDir, "prd.json");
  const progressPath = path.join(tempDir, "progress.md");
  const runsDir = path.join(tempDir, "runs");
  const metaOut = path.join(tempDir, "story.json");
  const blockOut = path.join(tempDir, "story.md");
  fs.mkdirSync(runsDir, { recursive: true });
  fs.writeFileSync(progressPath, "# Progress Log\n");

  writeJson(prdPath, createPrd([
    {
      id: "S1",
      title: "Done prerequisite",
      status: "done",
      startedAt: "2000-01-01T00:00:00.000Z",
      completedAt: "2000-01-01T00:10:00.000Z",
      updatedAt: "2000-01-01T00:10:00.000Z"
    },
    {
      id: "S2",
      title: "Recover stale story",
      status: "in_progress",
      dependsOn: ["S1"],
      startedAt: "2000-01-01T00:11:00.000Z",
      completedAt: null,
      updatedAt: "2000-01-01T00:11:00.000Z",
      acceptanceCriteria: ["Recover stale state"]
    }
  ]));

  writeJson(path.join(runsDir, "run-stale.json"), {
    runId: "20260421-001100-000001",
    iteration: 1,
    storyId: "S2",
    storyTitle: "Recover stale story",
    status: "running",
    startedAt: "2000-01-01T00:11:00.000Z",
    finishedAt: null
  });

  selectStory({
    prdPath,
    progressPath,
    runsDir,
    staleSeconds: 60,
    metaOut,
    blockOut
  });

  const meta = JSON.parse(fs.readFileSync(metaOut, "utf8"));
  const updatedPrd = JSON.parse(fs.readFileSync(prdPath, "utf8"));

  assert.equal(meta.id, "S2");
  assert.equal(updatedPrd.stories[1].status, "in_progress");
  assert.match(fs.readFileSync(blockOut, "utf8"), /Recover stale story/);
});

test("finalizeRun-compatible success requires progress and failure appends a progress entry", () => {
  const tempDir = createTempDir();
  const prdPath = path.join(tempDir, "prd.json");
  const progressPath = path.join(tempDir, "progress.md");
  const runsDir = path.join(tempDir, "runs");
  const successRecordPath = path.join(runsDir, "run-success.json");
  const failureRecordPath = path.join(runsDir, "run-failure.json");
  fs.mkdirSync(runsDir, { recursive: true });

  writeJson(prdPath, createPrd([
    {
      id: "S2",
      title: "Reconcile state",
      status: "in_progress",
      startedAt: "2026-04-21T01:00:00.000Z",
      completedAt: null,
      updatedAt: "2026-04-21T01:00:00.000Z"
    }
  ]));

  fs.writeFileSync(progressPath, [
    "# Progress Log",
    "## [2026-04-21 03:00:00] - S2: Reconcile state",
    "Thread: ",
    "Run: 20260421-030000-000001 (iteration 2)",
    "Run log: /tmp/run.log",
    "Run summary: /tmp/run.md",
    ""
  ].join("\n"));

  startRun({
    recordPath: successRecordPath,
    runId: "20260421-030000-000001",
    iteration: 2,
    storyId: "S2",
    storyTitle: "Reconcile state",
    startedAt: "2026-04-21T03:00:00.000Z",
    logFile: "/tmp/run.log",
    summaryFile: "/tmp/run.md"
  });

  const successOutput = JSON.parse(
    execFileSync(process.execPath, [
      path.resolve(".agents/ralph/workflow-state.mjs"),
      "finalize-run",
      "--prd", prdPath,
      "--progress", progressPath,
      "--runs-dir", runsDir,
      "--record-path", successRecordPath,
      "--result", "completed",
      "--finished-at", "2026-04-21T03:05:00.000Z"
    ], { encoding: "utf8" })
  );

  assert.equal(successOutput.runStatus, "completed");
  assert.equal(successOutput.storyStatus, "done");

  writeJson(prdPath, createPrd([
    {
      id: "S2",
      title: "Reconcile state",
      status: "in_progress",
      startedAt: "2026-04-21T04:00:00.000Z",
      completedAt: null,
      updatedAt: "2026-04-21T04:00:00.000Z"
    }
  ]));
  fs.writeFileSync(progressPath, "# Progress Log\n");

  startRun({
    recordPath: failureRecordPath,
    runId: "20260421-040000-000001",
    iteration: 3,
    storyId: "S2",
    storyTitle: "Reconcile state",
    startedAt: "2026-04-21T04:00:00.000Z",
    logFile: "/tmp/failure.log",
    summaryFile: "/tmp/failure.md"
  });

  const failureOutput = JSON.parse(
    execFileSync(process.execPath, [
      path.resolve(".agents/ralph/workflow-state.mjs"),
      "finalize-run",
      "--prd", prdPath,
      "--progress", progressPath,
      "--runs-dir", runsDir,
      "--record-path", failureRecordPath,
      "--result", "failed",
      "--finished-at", "2026-04-21T04:05:00.000Z"
    ], { encoding: "utf8" })
  );

  assert.equal(failureOutput.runStatus, "failed");
  assert.equal(failureOutput.storyStatus, "open");
  assert.match(fs.readFileSync(progressPath, "utf8"), /- Outcome: failed/);
});

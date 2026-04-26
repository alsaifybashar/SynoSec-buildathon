# Hackathon Depth Plan

This document defines the product shape SynoSec should pursue during the hackathon.

The goal is not to look broad. The goal is to prove one narrow, high-confidence workflow better than a generic scanner dashboard.

## Core Thesis

SynoSec should not present itself as a general-purpose offensive security platform with dozens of equally mature capabilities.

That would be inaccurate and weak in a judged environment.

The stronger thesis is:

- SynoSec turns raw reconnaissance and validation evidence into explicit attack paths.
- SynoSec preserves what was actually observed, what was inferred, and what remains unverified.
- SynoSec helps an operator understand which few weaknesses matter most when combined.

The differentiator is not the existence of more tools.

The differentiator is better reasoning, better evidence handling, and better attack-path explanation.

## Current Reality

The current system already has:

- a workflow runtime
- a seeded tool catalog
- brokered tool execution
- workflow traces and execution reports
- capability tools that route agent intent to one primary concrete tool
- custom evidence-producing probes for some web checks

The current system does not yet prove:

- deep target-specific reasoning across a narrow environment class
- strong finding verification discipline
- clean separation between confirmed findings and weaker hypotheses
- consistently trustworthy run history and trace persistence
- a polished flagship workflow that is clearly better than a conventional scanner run

## Product Direction

Depth over width means SynoSec should become a focused attack-path analysis product.

It should be optimized for one tight loop:

1. map reachable surface
2. collect bounded evidence
3. validate a small set of high-signal weaknesses
4. connect those weaknesses into concrete attack paths
5. explain operator impact and remediation priority

This is a stronger story than "we support many scanner categories."

## What The Product Should Be

The hackathon version of SynoSec should be:

- a depth-first external assessment workflow
- focused on web-exposed systems and adjacent infrastructure signals
- evidence-backed rather than tool-count-backed
- explicit about uncertainty
- centered on attack paths rather than isolated findings

## What The Product Should Not Be

The hackathon version should not try to be:

- a broad all-domain security platform
- a deep password-cracking suite
- a mature Windows assessment platform
- a forensics or reverse-engineering platform
- a complete replacement for established scanners

Those directions increase surface area without improving the core demo.

## Flagship Workflow

The product needs one primary workflow that becomes the demo and the thesis.

Recommended shape:

- start from a public target
- map surface and infrastructure clues
- run a constrained set of high-signal validation checks
- produce confirmed findings and suspected findings separately
- assemble those findings into prioritized attack paths
- generate a report that explains business and operator impact

The workflow should answer:

- What did we observe?
- What did we validate?
- What attack paths are plausible?
- Which paths are confirmed and which remain hypotheses?
- What should be fixed first?

## High-Value Finding Classes

The workflow should focus on a small set of findings with strong explanatory power.

Examples:

- unauthenticated sensitive endpoints
- exposed administrative surfaces
- weak or missing authentication controls
- missing or ineffective rate limiting
- leaked secrets, credentials, or configuration
- directory listing or artifact exposure
- origin exposure or edge-control bypass opportunities
- weak transport posture
- bounded injection or reflected-input validation

These are useful because they chain well and make attack-path reporting meaningful.

## Evidence Standard

Every finding shown in the final demo should meet a stricter evidence bar.

Each finding should carry:

- raw evidence
- the originating tool or probe
- a reproduction path when feasible
- a validation status
- a concise explanation of impact
- a concise remediation

Validation status should be explicit:

- `confirmed`
- `suspected`
- `blocked`
- `rejected`

No implied confirmation should be presented as proven.

## Why This Matters

A generic scanner can already produce:

- endpoint lists
- version banners
- template matches
- long finding tables

SynoSec adds value only if it can do more than aggregate that output.

The minimum differentiators are:

- normalize tool output into structured observations
- preserve original failure context
- show why one finding increases the risk of another
- rank end-to-end attack paths rather than isolated severities
- state clearly what could not be verified

## Attack-Path Correlation As The Centerpiece

Attack-path correlation should be the core artifact of the system.

The product story is not:

- "we found many issues"

The product story is:

- "these few observations combine into a realistic path to compromise"

Good examples:

- exposed data plus weak login controls leads to account takeover
- exposed administrative surface plus missing auth leads to immediate control
- leaked credentials or secrets plus a compatible access surface leads to lateral movement
- origin bypass plus an otherwise protected application removes outer defenses

The final report should make those paths visually and textually obvious.

## Scope To Cut

To protect depth, the following should be de-emphasized or cut from the hackathon narrative:

- most non-web tool categories
- broad password attack tooling
- most Windows tooling
- forensics and reversing categories
- large catalog breadth as a selling point
- "supports everything" language

Those capabilities can remain in the repository, but they should not drive the product story.

## Scope To Keep

Keep and strengthen the parts that support the flagship workflow:

- HTTP surface mapping
- crawl and content discovery
- bounded vulnerability validation
- auth-flow probing
- transport and service enumeration where it supports the path story
- capability tools
- workflow traces
- execution reports
- attack-path handoff and reporting

## Trust Gaps To Fix

The current product has several trust gaps that weaken a hackathon demo.

They should be fixed before adding more breadth:

- runs can be marked completed while some trace events remain in `running`
- `workflow_trace_entries` are not being populated
- some conclusions are stronger than the underlying evidence justifies
- the distinction between confirmed and inferred findings is not prominent enough
- tool availability gaps can collapse into shallow assessment coverage

If SynoSec claims to reason over evidence, its history and status model must be internally consistent.

## Execution Principles

The workflow should behave like a careful operator, not a blind tool launcher.

That means:

- choose a small number of relevant checks
- adapt when tools are unavailable
- preserve exact failure reasons
- avoid overstating confidence
- prefer strong evidence over wide surface coverage

The system should look disciplined under constrained tooling, not embarrassed by it.

## Demo Output Shape

The demo report should be optimized for fast comprehension.

Recommended sections:

- Surface
- Confirmed findings
- Suspected findings
- Attack paths
- Residual uncertainty
- Recommended next steps

The report should emphasize:

- what was directly observed
- what was validated
- what combinations create the highest impact
- what remains unknown

## Implementation Priorities

Priority order for the hackathon:

1. Harden one flagship workflow.
2. Make validation states explicit and visible.
3. Improve attack-path construction and ranking.
4. Tighten evidence and reproduction handling.
5. Fix run-history consistency and trace completeness.
6. Polish the final report around a small number of meaningful artifacts.

## Success Criteria

The hackathon build is successful if a judge or operator can watch one run and immediately understand:

- this is not just a wrapper around existing scanners
- the system is disciplined about evidence
- the system can explain how findings combine into practical attack paths
- the system is honest about uncertainty
- the output helps prioritize remediation better than a flat scanner report

## Non-Goals For The Hackathon

Do not spend hackathon time trying to prove:

- complete tool coverage
- broad category maturity
- cross-domain platform depth
- fully general autonomous exploitation
- polished support for every seeded tool

Those are post-hackathon concerns.

The hackathon win condition is a believable, narrow, high-signal workflow that demonstrates superior reasoning and reporting depth.

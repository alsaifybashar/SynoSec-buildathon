# Hackathon Project — Gemini CLI Guide

## Mission
Build a high-impact, innovative proof-of-concept (POC) in **24 hours**. Every decision must optimize for: **Demo Clarity > Working Prototype > Code Quality**.

## The Golden Rule
**Ship something that works and wows. Perfection is the enemy of the POC.**

---

## 24-Hour Timeline (Aggressive)
| Phase | Duration | Focus |
|-------|----------|-------|
| **1. Ideation & Stack** | 0–2h | Lock the "Big Idea," Tech Stack, and MVP Scope. |
| **2. Scaffolding** | 2–4h | Core DB, Auth, and Layout. |
| **3. Feature Build** | 4–16h | Ship the "Wow" features. |
| **4. Polish & Demo** | 16–22h | UX refinement, seed data, and pitch script. |
| **5. Buffer/Bugs** | 22–24h | Final fixes and rehearsal. |

---

## Efficiency Mandates

### 1. Speed-Optimized Defaults
- **Use established libraries.** Don't reinvent the wheel for Auth, UI components, or AI SDKs.
- **Hardcode early, abstract later.** Constant values are fine for a 24h demo.
- **"One Happy Path."** Focus on the demo flow. Edge cases are secondary.
- **Mock if needed.** If an external API is slow or complex, mock it with realistic data.

### 2. Innovation & Impact
- **The "Wow" Factor.** Focus on the one innovative feature that sets this apart.
- **Social Impact.** Every feature should answer: "How does this improve the world/society?"
- **AI-First.** Leverage Gemini for complex logic, classification, and generation.

### 3. Code & Architecture
- **Prefer Flat Structures.** Avoid deep nesting or over-engineered abstractions.
- **Self-Documenting Code.** Short functions with clear names.
- **Vercel/Railway ready.** Keep the project deployable from hour 1.

---

## AI Interaction Guidelines

### When to **Directly Act** (Directives)
- Fixing bugs or linter errors.
- Styling with Tailwind CSS.
- Adding tests for existing logic.
- Minor refactors within a single file.
- Generating realistic seed data.

### When to **Ask for Confirmation** (Inquiries)
- Changing the tech stack or core architecture.
- Adding a feature outside the original MVP scope.
- Integrating a new, complex external service.

---

## Recommended Tech Stack
- **Frontend:** Next.js (App Router), Tailwind CSS, shadcn/ui.
- **Backend:** Next.js API Routes or FastAPI (Python).
- **Database:** Prisma + SQLite/PostgreSQL (Supabase/Neon).
- **AI:** Google Gemini API (Vertex AI or Gemini Pro/Flash).
- **Deployment:** Vercel (Frontend/Fullstack), Railway (Backend/DB).

---

## Custom Skills
- `/brainstorm` — Use `hackathon-ideator` to find high-impact, innovative ideas.
- `/scaffold` — Use `hackathon-scaffolder` to set up the project structure.
- `/checkpoint` — Use `hackathon-checkpointer` to track progress against the 24h clock.
- `/demo-prep` — Use `hackathon-demo-prep` to generate a 3-minute script and pitch.

---

## Impact Framing for the Pitch
1. **The Pain**: Who is suffering? (Problem)
2. **The Cure**: How does this solve it? (Solution)
3. **The Spark**: Why is this different? (Innovation)
4. **The Scale**: How many lives could this touch? (Impact)

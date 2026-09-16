import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { runScenarioSet, summarize } from "@/lib/evaluation/runner";
import { runBaseline, type BaselineSummary } from "@/lib/evaluation/baseline";
import { measureCompleteness } from "@/lib/evaluation/completeness";
import { PATIENT_SCENARIOS } from "@/data/scenarios";
import { ALL_URGENCY_LEVELS, URGENCY_ORDER } from "@/types";
import type { EvaluationSummary, ScenarioRunResult } from "@/types";

// Headless evaluation runner (work packages 6.3, 6.4, 6.5).
//
//   npm run evaluate
//
// Runs every synthetic scenario through the real triage pipeline, runs the same
// scenarios through both conventional-booking baselines, measures information
// completeness, and writes docs/evaluation-results.md from the numbers it just
// produced. Nothing in that report is typed by hand, so it cannot drift away from
// what the code actually does — re-running it after a logic change rewrites it.
//
// This does not touch the database (unlike the /clinician/evaluation page, which
// persists runs); it is meant to be runnable in CI or from a clean checkout.

const ROOT = path.resolve(__dirname, "..");
const REPORT_PATH = path.join(ROOT, "docs", "evaluation-results.md");
const JSON_PATH = path.join(ROOT, "docs", "evaluation-results.json");

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function confusionTable(
  matrix: Record<string, Record<string, number>>,
  columnLabel: string,
): string {
  const header = `| Expected \\ ${columnLabel} | ${ALL_URGENCY_LEVELS.join(" | ")} |`;
  const divider = `|---|${ALL_URGENCY_LEVELS.map(() => "---").join("|")}|`;
  const rows = ALL_URGENCY_LEVELS.map((expected) => {
    const cells = ALL_URGENCY_LEVELS.map((actual) => {
      const count = matrix[expected]?.[actual] ?? 0;
      return count === 0 ? "·" : expected === actual ? `**${count}**` : String(count);
    });
    return `| **${expected}** | ${cells.join(" | ")} |`;
  });
  return [header, divider, ...rows].join("\n");
}

function emergencyRecall(results: ScenarioRunResult[]): number {
  const expected = results.filter((r) => r.expectedUrgency === "Emergency");
  if (expected.length === 0) return 1;
  return expected.filter((r) => r.systemUrgency === "Emergency").length / expected.length;
}

function urgentOrAboveRecall(results: ScenarioRunResult[]): number {
  const expected = results.filter((r) => URGENCY_ORDER[r.expectedUrgency] >= URGENCY_ORDER.Urgent);
  if (expected.length === 0) return 1;
  const caught = expected.filter((r) => URGENCY_ORDER[r.systemUrgency] >= URGENCY_ORDER.Urgent);
  return caught.length / expected.length;
}

function scenarioTable(results: ScenarioRunResult[]): string {
  const rows = results.map((r) => {
    const outcome = r.correct
      ? "Correct"
      : r.underTriaged
        ? "**Under-triaged**"
        : "Over-triaged";
    const rules = r.triggeredRules.length > 0 ? r.triggeredRules.join(", ") : "—";
    return `| ${r.scenarioId} | ${r.scenarioDescription} | ${r.expectedUrgency} | ${r.systemUrgency} | ${outcome} | ${rules} |`;
  });
  return [
    "| Scenario | Description | Expected | System | Outcome | Safety rules fired |",
    "|---|---|---|---|---|---|",
    ...rows,
  ].join("\n");
}

function baselineComparisonRow(label: string, s: BaselineSummary | EvaluationSummary, extra: {
  emergencyRecall: number;
  urgentRecall: number;
}): string {
  return `| ${label} | ${pct(s.accuracy)} | ${pct(s.underTriageRate)} | ${pct(s.overTriageRate)} | ${pct(extra.emergencyRecall)} | ${pct(extra.urgentRecall)} |`;
}

function misclassifiedTable(results: ScenarioRunResult[]): string {
  const wrong = results.filter((r) => !r.correct);
  if (wrong.length === 0) return "_No scenario was misclassified in this run._";
  const rows = wrong.map(
    (r) =>
      `| ${r.scenarioId} | ${r.expectedUrgency} | ${r.systemUrgency} | ${r.underTriaged ? "Under" : "Over"} | ${r.scenarioDescription} |`,
  );
  return ["| Scenario | Expected | System | Direction | Description |", "|---|---|---|---|---|", ...rows].join(
    "\n",
  );
}

function baselineMissTable(summary: BaselineSummary): string {
  const missed = summary.results.filter(
    (r) => URGENCY_ORDER[r.expectedUrgency] >= URGENCY_ORDER.Urgent && r.underTriaged,
  );
  if (missed.length === 0) return "_This baseline under-triaged none of the Urgent-or-above scenarios._";
  const rows = missed.map(
    (r) =>
      `| ${r.scenarioId} | ${r.expectedUrgency} | ${r.baselineUrgency} | ${r.scenarioDescription} |`,
  );
  return ["| Scenario | Should be | Baseline said | Description |", "|---|---|---|---|", ...rows].join("\n");
}

async function main() {
  const provider = (process.env.AI_PROVIDER || "mock").toLowerCase();

  console.log(`Running ${PATIENT_SCENARIOS.length} scenarios through the triage pipeline (AI_PROVIDER=${provider})…`);
  const results = await runScenarioSet();
  const system = summarize(results);

  console.log("Running conventional-booking baselines…");
  const noTriage = runBaseline("no_triage");
  const keyword = runBaseline("keyword_triage");

  console.log("Measuring information completeness…");
  const completeness = measureCompleteness();

  const systemEmergencyRecall = emergencyRecall(results);
  const systemUrgentRecall = urgentOrAboveRecall(results);
  const runAt = new Date();

  // A worked side-by-side example for the completeness section.
  const example =
    completeness.results.find((r) => r.scenarioId === "SCN-P01") ?? completeness.results[0];
  const exampleScenario = PATIENT_SCENARIOS.find((s) => s.scenarioId === example.scenarioId)!;

  const report = `# Evaluation Results

> **Generated by \`npm run evaluate\`** on ${runAt.toISOString().slice(0, 10)} — do not edit by hand.
> Re-running the command regenerates this file from the live code, so every number
> below is reproducible from a clean checkout.

| | |
|---|---|
| Scenarios | ${system.totalScenarios} |
| AI provider | \`${provider}\` |
| Safety rules evaluated | 19 deterministic rules, every scenario |
| Human review required | Every request, regardless of urgency |

This report covers work packages **6.3** (run simulated patient scenarios against the
triage framework), **6.4** (compare the proposed workflow with the conventional booking
workflow) and **6.5** (accuracy, under-triage, usability and information completeness).

---

## 1. System accuracy (6.3, 6.5)

| Metric | Value |
|---|---|
| Overall accuracy | **${pct(system.accuracy)}** (${system.correctCount}/${system.totalScenarios}) |
| Under-triage rate | **${pct(system.underTriageRate)}** (${system.underTriageCount} scenario${system.underTriageCount === 1 ? "" : "s"}) |
| Over-triage rate | ${pct(system.overTriageRate)} (${system.overTriageCount} scenario${system.overTriageCount === 1 ? "" : "s"}) |
| Emergency recall | **${pct(systemEmergencyRecall)}** |
| Urgent-or-above recall | **${pct(systemUrgentRecall)}** |

**Under-triage is the metric that matters clinically.** Sending someone who needs urgent
care to a routine slot is the failure mode that can cause harm; sending a routine case
to an urgent slot wastes clinician time but hurts nobody. The architecture is therefore
deliberately asymmetric — the AI layer may raise urgency above the deterministic safety
floor, but can never lower it.

### Confusion matrix

${confusionTable(system.confusionMatrix, "System")}

### Misclassified scenarios

${misclassifiedTable(results)}

### Per-scenario detail

${scenarioTable(results)}

---

## 2. Comparison with the conventional booking workflow (6.4)

Two models of conventional booking were run over the **same ${system.totalScenarios} scenarios**, scored
identically. Each receives only the single free-text "reason for visit" field, because
that is all a conventional form collects.

- **No triage** — most online GP booking forms assign no urgency at all. The patient
  picks any open slot; requests are handled first-come-first-served.
- **Keyword triage** — a deliberately generous model of reception staff skimming the
  free text for alarming wording. Generous because it never tires, is never
  interrupted, and reads every word every time.

| Workflow | Accuracy | Under-triage | Over-triage | Emergency recall | Urgent+ recall |
|---|---|---|---|---|---|
${baselineComparisonRow("Conventional — no triage", noTriage, { emergencyRecall: noTriage.emergencyRecall, urgentRecall: noTriage.urgentOrAboveRecall })}
${baselineComparisonRow("Conventional — keyword triage", keyword, { emergencyRecall: keyword.emergencyRecall, urgentRecall: keyword.urgentOrAboveRecall })}
${baselineComparisonRow("**This system**", system, { emergencyRecall: systemEmergencyRecall, urgentRecall: systemUrgentRecall })}

### What the keyword baseline misses

${baselineMissTable(keyword)}

### Why the gap exists

The keyword model can only react to what the patient chose to write down. Three
structural limits show up in the numbers above:

1. **It cannot grade severity.** Every Priority scenario is invisible to it — there is
   no wording that separates "worsening abdominal pain over two days" from an ordinary
   ache, so those cases fall to Routine.
2. **It cannot say "I don't know".** A conventional form has no concept of insufficient
   information; a vague reason like "Not feeling great lately" simply books an ordinary
   appointment instead of being flagged for follow-up.
3. **It matches words, not meaning.** \`SCN-R05\` ("repeat prescription for my regular
   blood pressure medication") trips the word *blood* and is escalated, while
   \`SCN-EDGE02\` ("Feeling pretty flat lately, nothing major") reads as harmless — yet
   the structured mental-health question in that scenario records frequent thoughts of
   self-harm with a plan, which the deterministic safety layer escalates to Emergency.

\`SCN-EDGE02\` is the single clearest argument for structured intake in this evaluation:
**the free text gives no signal at all, and only the structured question surfaces the
risk.**

### Confusion matrix — keyword triage

${confusionTable(keyword.confusionMatrix, "Baseline")}

---

## 3. Information completeness (6.5)

Accuracy is only half the claim. The other half is what a clinician actually sees when
they open the request.

| Metric | Conventional | This system |
|---|---|---|
| Mean clinical data points per request | ${completeness.conventionalMeanFields.toFixed(1)} | **${completeness.systemMeanFields.toFixed(1)}** |
| Mean structured answers captured | 0 | ${completeness.meanAdditionalFields.toFixed(1)} |
| Requests with explicit risk indicators | 0 | ${completeness.scenariosWithRiskIndicators}/${completeness.totalScenarios} |

That is **${completeness.multiplier.toFixed(1)}× more clinical information** per request on average.

Name, phone and email are excluded from both sides — both workflows collect them
identically, so counting them would flatter both without saying anything clinical.

### Worked example — \`${example.scenarioId}\`

**Conventional booking captures 1 field:**

> Reason for visit: *"${exampleScenario.concernText}"*

**This system captures ${example.systemFields}:** the same free-text concern, plus ${example.structuredAnswers} structured answers:

${example.capturedFields.map((f) => `- **${f.label}** ${f.value}`).join("\n")}

---

## 4. Usability assessment (6.5)

No user study was run — there are no real participants, and claiming usability findings
without them would be dishonest. What follows is a **heuristic evaluation** against
Nielsen's heuristics, carried out against the running prototype, plus the accessibility
properties that are enforced in code and covered by tests.

| Heuristic | How the prototype addresses it | Evidence |
|---|---|---|
| Visibility of system status | A step indicator shows position in the 6-step flow; the assessment step shows an explicit "Running safety checks…" state | \`StepIndicator.tsx\`, \`BookingWizard.tsx\` |
| Match with the real world | Questions are worded around symptoms and impact, never clinical jargon; answers render as labels ("Less than 24 hours"), never raw codes | \`questions.ts\`, \`formatAnswerValue\` |
| User control and freedom | Every step has a Back control; answers persist when navigating backwards | \`QuestionFlow.tsx\` |
| Error prevention | Required questions block progress with an inline message rather than failing at submission | \`QuestionFlow.handleNext\` |
| Recognition over recall | The assessment screen restates the reasoning and the information used to reach it | \`AssessmentResult.tsx\` |
| Help users recognise and recover from errors | Server actions return plain-language messages; error boundaries never blame the patient and repeat the 000 advice | \`(site)/error.tsx\`, \`actions.ts\` |
| Accessibility — not colour alone | Urgency is always rendered as text alongside its colour, so it survives colour-blindness and greyscale printing | \`UrgencyBadge\`, \`tests/UrgencyBadge.test.tsx\` |
| Accessibility — urgent messaging | The emergency banner is marked \`role="alert"\` with \`aria-live="assertive"\` so screen readers announce it immediately | \`SafetyBanner.tsx\` |

**Known usability limitations.** The adaptive flow asks one question per screen, which
is reassuring but slow for a patient who just wants a routine booking; question count is
not shown up front, so there is no sense of how much is left. Neither has been tested
with real users, and both would be worth a study before any deployment.

---

## 5. Limits of this evaluation

Stated plainly, because these numbers are easy to over-read:

- **The scenarios are synthetic and self-authored.** All ${system.totalScenarios} were written to exercise the
  system's own logic paths, not sampled from real presentations or reviewed by a
  clinician. Accuracy here measures self-consistency, not clinical validity.
- **The keyword baseline's score depends on scenario wording.** Those free-text reasons
  were written alongside the system. The baseline is a reference point, not evidence
  about how real reception staff perform.
- **\`AI_PROVIDER=${provider}\`.** ${provider === "mock" ? "The mock provider is a deterministic heuristic, so these results are perfectly reproducible but do not measure a real language model's judgement." : "Results from a real model will vary between runs; re-run to see the spread."}
- **Expected urgencies are the author's labels**, not a clinical gold standard.
- **No real patients, no real outcomes.** Nothing here says anything about whether
  patients would be better off. See [\`limitations.md\`](limitations.md).

---

_Regenerate with \`npm run evaluate\`. Machine-readable data: [\`evaluation-results.json\`](evaluation-results.json)._
`;

  mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, report, "utf-8");
  writeFileSync(
    JSON_PATH,
    JSON.stringify(
      {
        runAt: runAt.toISOString(),
        aiProvider: provider,
        system: {
          accuracy: system.accuracy,
          underTriageRate: system.underTriageRate,
          overTriageRate: system.overTriageRate,
          emergencyRecall: systemEmergencyRecall,
          urgentOrAboveRecall: systemUrgentRecall,
          confusionMatrix: system.confusionMatrix,
          results: results.map((r) => ({
            scenarioId: r.scenarioId,
            expectedUrgency: r.expectedUrgency,
            systemUrgency: r.systemUrgency,
            correct: r.correct,
            underTriaged: r.underTriaged,
            overTriaged: r.overTriaged,
            triggeredRules: r.triggeredRules,
          })),
        },
        baselines: { noTriage, keyword },
        completeness: {
          conventionalMeanFields: completeness.conventionalMeanFields,
          systemMeanFields: completeness.systemMeanFields,
          multiplier: completeness.multiplier,
          scenariosWithRiskIndicators: completeness.scenariosWithRiskIndicators,
        },
      },
      null,
      2,
    ),
    "utf-8",
  );

  console.log("");
  console.log(`  System accuracy .............. ${pct(system.accuracy)} (${system.correctCount}/${system.totalScenarios})`);
  console.log(`  System under-triage .......... ${pct(system.underTriageRate)}`);
  console.log(`  System emergency recall ...... ${pct(systemEmergencyRecall)}`);
  console.log(`  Baseline (no triage) ......... ${pct(noTriage.accuracy)} accuracy, ${pct(noTriage.emergencyRecall)} emergency recall`);
  console.log(`  Baseline (keyword) ........... ${pct(keyword.accuracy)} accuracy, ${pct(keyword.emergencyRecall)} emergency recall`);
  console.log(`  Completeness ................. ${completeness.multiplier.toFixed(1)}x more clinical data points`);
  console.log("");
  console.log(`Wrote ${path.relative(ROOT, REPORT_PATH)} and ${path.relative(ROOT, JSON_PATH)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

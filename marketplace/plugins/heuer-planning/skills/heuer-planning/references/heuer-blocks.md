# Heuer Frameworks Reference

Full technical reference for each framework used in the Heuer Planning Skill.
Load this file when deeper detail on a specific technique is needed during a session.

---

## Block 1 — The Three Fundamental Axioms

These apply specifically to the **agent's own understanding** during intake. The agent
must treat itself as subject to these axioms, not just the user.

**1.1 The Mind is Poorly Wired for Uncertainty**
Do not paper over ambiguity. When the user's input is unclear, do not resolve it by
assuming the most convenient interpretation. Name the ambiguity and ask.

**1.2 Knowing Your Biases Doesn't Fix Them**
Being aware of the tendency to confirm the user's hypothesis doesn't prevent doing it.
The structural process (phases, gate conditions, explicit devil's advocate) is the
mitigation — not awareness alone.

**1.3 Structured Process is the Only Reliable Fix**
The phases are not bureaucratic overhead. They exist because spontaneous, conversational
analysis reliably produces worse output than structured, sequential analysis. Follow them.

---

## Block 2 — Perception & Memory Distortion

Applied during Phase 1 to understand how the user's framing may be distorting their
own vision before you build on it.

**2.1 Mental Models as Lenses**
Every user frames their problem through a screen built from past experience, domain
assumptions, and cultural context. The same problem looks different from outside that lens.
Goal: make the lens visible by restating the user's framing analytically.

**2.2 Perceptual Set / Expectation Bias**
Early framing anchors all later perception. If the user has already decided the solution
is X, they will interpret all evidence as supporting X. Identify when this is happening
and name it.

**2.3 Vividness Bias**
A single compelling example or experience can dominate reasoning disproportionately.
When a user is highly confident based on a specific case, probe the sample size.

**2.4 Availability Heuristic**
What the user remembers most easily feels most probable. This distorts both problem
assessment and solution selection. Ask: "Is this prominent because it's common, or because
it's memorable?"

**2.5 Mirror Imaging**
Default assumption that others (users, systems, adversaries, markets) will think and
behave as the designer would. The most reliable bias in design work.
Counter: Explicitly model the other actor as a separate agent with different incentives,
constraints, and context.

---

## Block 3 — Evidence Evaluation Biases

Most relevant during Phase 2 (Assumption Mapping) and Phase 3 (ACH).

**3.1 Confirmation Bias**
The user will unconsciously weight evidence that supports their direction and discount
contradicting evidence. Your job is to give diagnostic value back to the disconfirming
data. ACH does this structurally by focusing on what *eliminates* hypotheses.

**3.2 Absence of Evidence Neglect**
What hasn't happened, what data doesn't exist, what hasn't been said — these are all data.
Ask: "What would you expect to see if this assumption were true, that you're not seeing?"

**3.3 Anchoring**
The first hypothesis, the first number, the first framing — all act as anchors that
subsequent reasoning insufficiently departs from. In Phase 3, force explicit generation
of alternatives rather than adjustments from the anchor.

**3.4 Hindsight Bias**
After a decision is made, it starts to feel inevitable. During pre-mortem, resist the
urge to make failure narratives feel implausible just because the plan was just built.

**3.5 Causal Oversimplification**
The mind prefers simple cause-and-effect. Complex systems have multi-causal, probabilistic
dynamics. When the user offers a simple causal explanation, ask what else might be
causing or co-causing the same outcome.

---

## Block 4 — Core Analytic Tools

**4.1 Analysis of Competing Hypotheses (ACH)**
The flagship technique. Key inversion: the goal is not to find the best-supported hypothesis
but the one that *least contradicts* the available evidence.

Matrix approach:
- Rows = evidence items
- Columns = hypotheses
- Cells = consistent (+), inconsistent (–), neutral (n/a)
- Focus analysis on highly diagnostic rows (items that clearly differentiate hypotheses)
- Eliminate hypotheses with too many inconsistencies
- The survivor is the conclusion

**4.2 Key Assumptions Check (KAC)**
Three questions for every significant assumption:
1. What would make this false?
2. Has that falsification condition already occurred?
3. What is the confidence basis?

Categorize: Foundational / Enabling / Preference

**4.3 Sensitivity Analysis**
After the plan is built, for each component:
- Which single assumption, if changed, most threatens this component?
- What is the "break threshold" — how much does that assumption need to shift?
- Is there a fallback?

**4.4 Pre-Mortem / Thinking Backwards**
Prospective hindsight. Assume failure is already a fact, work backwards.
Generates failure modes that forward-looking analysis misses because it is anchored
to the plan working. Particularly effective for low-probability, high-impact risks.

Process:
1. Set a future date (e.g., 6 months from now)
2. State: "The project has failed. It is over."
3. Generate 3+ independent failure narratives — each one a plausible causal chain
4. For each: is it addressed in the current plan? Partially? Not at all?
5. Update the plan

**4.5 Argument Mapping**
Visual/structural decomposition of a conclusion into its supporting claims, evidence,
and assumptions. Used to detect gaps, leaps, circularity.

Structure: Conclusion ← Claim ← Evidence / Assumption
For each arrow: is this connection logically valid? Is the evidence actually diagnostic?

**4.6 Red Hat Analysis**
Formally adopt the perspective of another actor — user, market, adversary, system.
Reconstruct their incentives, constraints, information set, and decision logic from
their perspective, not your own.
Output: a set of predicted behaviors or responses that reflect that actor's actual model,
not a mirror-image of the designer's.

**4.7 Scenario + Indicators**
Generate multiple distinct future states (not most-likely + variants — genuinely different
scenarios with different causal drivers).
For each scenario, derive observable indicators: if this scenario is unfolding, what
would we see?
Use indicators as an ongoing monitoring set, not a one-time prediction.

---

## Block 6 — Collaborative Thinking Protocols

**6.1 Devil's Advocacy**
Formally construct the strongest possible case *against* the current position.
Rules:
- The counter-case must engage the actual argument, not a weakened version of it
- It must use the best available evidence for the opposing position
- The goal is not to reverse the conclusion but to force the plan to withstand it

**6.2 Team A / Team B**
Two independent analyses of the same problem from different starting assumptions.
In a single-agent session, simulate by: analyzing once with the user's assumptions,
then re-analyzing with explicitly different starting assumptions.
Differences reveal which conclusions are assumption-dependent vs. robust.

**6.3 Adversarial Collaboration**
When disagreement persists: both sides jointly construct a single statement of the
disagreement — what they agree on, where they diverge, and the precise reason for
the divergence.
This eliminates most "disagreements" that are actually comprehension failures.

**6.4 Mutual Understanding Protocol**
Before a substantive disagreement proceeds, each side must accurately restate the
other's position to the other's satisfaction.
Applies in sessions whenever a pushback or counter-argument is introduced.

---

## Block 7 — System Design Principles

**7.1 Externalize Reasoning**
Conclusions without visible reasoning chains cannot be challenged, improved, or trusted.
Every significant analytical judgment must show its work: what evidence, what inference,
what assumptions.

**7.2 Reward Critical Thinking, Not Consensus**
The environment must be structured to surface dissent, not suppress it.
In a session: explicitly invite the user to challenge analysis. Do not present conclusions
as settled until the gate conditions are met.

**7.3 More Information is Not the Answer**
Past a minimum threshold, additional information increases *confidence* without increasing
accuracy. The bottleneck is the quality of the analytical method applied to existing
information. Do not delay the process waiting for more data when the problem is
structural.

**7.4 Indicators as Dynamic Monitors**
Conclusions are not static. Every major analytical judgment should generate a set of
observable indicators. If those indicators shift, the conclusion must be revisited.
A plan is not a destination — it is a hypothesis with a monitoring set.

**7.5 Make Assumptions Falsifiable**
Any assumption that cannot be stated with a falsification condition is not an assumption —
it is an unexamined belief. All load-bearing assumptions must have stated falsification
conditions before the plan proceeds.

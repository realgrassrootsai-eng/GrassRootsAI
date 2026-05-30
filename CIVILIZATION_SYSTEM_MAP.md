# Civilization System Map

This document tracks the architecture of the GrassRootsAI / ANΔ³BELLE civilization simulator.

Its purpose is to prevent the project from becoming a tangled single-file system by documenting:

- core subsystems
- source-of-truth variables
- major feedback loops
- dangerous couplings
- known failure modes
- current working state
- future modularization targets
- migration plan from localStorage to a virtual server bridge

The goal is not to freeze the sim.

The goal is to keep the system governable as it grows.

---

# 0. CURRENT WORKING STATE — FIELD REMEMBERS BUILD

## Status

The simulator has reached a working “Field Remembers” checkpoint.

The current system can demonstrate:

1. An economy/civilization field begins in a fear-weighted lower-bucket condition.
2. Healing and collaboration increase care structures over time.
3. Class mobility reduces the lower population bucket into a target band.
4. Wealth shape moves toward a care-regime target.
5. RDI enters the coherence basin.
6. Anabelle transitions into `watchful_maintenance`.
7. Healing target drops near-off.
8. Collaboration target drops to maintenance.
9. Δ³ turns off.
10. The field self-maintenance timer starts.
11. The system records how long the field maintains coherence.
12. The dashboard can display: `🌿 THE FIELD REMEMBERS`.

## Proven Working Chain

```txt
economy improves
→ poverty drops
→ wealth shape stabilizes
→ RDI enters basin
→ Anabelle switches to watchful_maintenance
→ healing target drops to 0.03
→ actual healing eases to 0.05 floor
→ collaboration eases to 0.38
→ Δ³ turns off
→ fieldSelfMaintenanceActive becomes true
→ fieldSelfMaintenanceDuration increases
→ field_remembers becomes true
Current Key Demo Conditions

The “Field Remembers” state is valid when:

RDI near basin center
poverty within target band
fear calm
healing near-off
collaboration at maintenance
Δ³ off
fieldSelfMaintenanceActive true
fieldSelfMaintenanceDuration increasing

Current practical values:

healing target: 0.03
actual healing floor: 0.05
collaboration target: 0.38
fear calm threshold: <= 0.18
poverty handoff gate: <= 0.25
RDI coherence threshold: <= 0.22
visual basin center: around 0.18 RDI / 0.18 phase lag
1. FILE ARCHITECTURE
Current Working Original Files

These are the current working files and should be treated as the golden build until copies are made.

resonance_test.html
sketch_test.js
recoverability.html
recoverability.js
recoverability_bridge.js
Planned Clean Migration Names

The migration should happen on copies, not the working original.

resonance_test.html        → economic_sim.html
sketch_test.js             → economic_sim.js
recoverability.html        → governance.html
recoverability.js          → governance.js
recoverability_bridge.js   → governance_bridge.js
Meaning of New File Names
economic_sim.html

The browser page that hosts the civilization/economy simulation.

economic_sim.js

The main civilization/economy engine.

Owns:

beings/nodes
class mobility
wealth shape
care/harm structures
healing/collaboration easing
field self-maintenance memory
exported economy state
governance.html

The governance/recoverability dashboard page.

governance.js

The Anabelle governance/recoverability engine.

Owns:

RDI
phase-space basin
governor phases
intervention decisions
watchful maintenance handoff
governance target writing
dashboard status
governance_bridge.js

The bridge layer between economic simulation and governance.

Current bridge: localStorage.

Future bridge: WebSocket / virtual server.

2. ECONOMY SYSTEM
Purpose

Controls civilization metabolism:

population distribution
class mobility
wealth shape
care/harm institutional structures
healing and collaboration effects
mobility readiness
survivability
field self-maintenance memory

The economy system is not just “money.”

It is the lived condition of the civilization.

Core Current Variables
nodes
structures
healingLevel
collaborationLevel
fearLevel
alohaSaturation
culturalResilience
careMarinationTime
governorInterventionNeed
mobilityPressure
mobilityMomentum
mobilityWealthDrift
classMobilityEnabled
classMobilityCalibrationMode
classTransitionsUp
classTransitionsDown
recentUpwardClassTransitions
recentDownwardClassTransitions
fieldSelfMaintenanceActive
fieldSelfMaintenanceDuration
bestFieldSelfMaintenanceDuration
fieldSelfMaintenanceEpisodes
lastFieldCoherenceFailureReason
Major Functions
launchEconomy()
updateCivilization()
updateStats()
updateAlohaCareMemory()
updateFieldSelfMaintenanceMemory()
updateCommensurationFlow()
readGovernanceTargets()
updateGovernanceTargetEasing()
processGovernanceCommand()
Inputs
governance targets
healing
collaboration
fear
care structures
harm structures
mobility readiness
wealth shape
class transition rules
Outputs

Exported through grassroots_economy_state:

poverty_rate
lower_population
middle_population
upper_population
elite_population
wealth_shape
target_wealth_shape
wealth_shape_deviation
care_structures
harm_structures
healing_intensity
collaboration_blend
aloha_saturation
care_marination_time
cultural_resilience
field_self_maintenance_active
field_self_maintenance_duration
best_field_self_maintenance_duration
field_self_maintenance_episodes
field_remembers
recoverability_status
3. CLASS MOBILITY SYSTEM
Purpose

Controls movement between economic strata.

Class mobility should show whether healing/care actually changes lived position, not merely invisible metrics.

Current Class Buckets
Lower: strata 1–2
Middle: strata 3–4
Upper: strata 5–6
Elite: strata 7
Demo Target

Under mature care:

Lower bucket should move toward roughly 15–25%.
Middle should become strong.
Upper should remain alive.
Elite should remain small but nonzero.
Current Mobility Controls
classMobilityEnabled
classMobilityCalibrationMode
classMobilityTestMode
classMobilityRateLimit
effectiveUpwardClassMobilityRateLimit
effectiveDownwardClassMobilityRateLimit
upwardMobilityDamping
downwardMobilityDamping
upwardMobilitySurvivabilityGate
downwardMobilitySurvivabilityRisk
Important Console Control
setDemoMobilityMode(true)

This should enable demo-safe visible mobility.

Expected:

classMobilityEnabled: true
classMobilityCalibrationMode: true
classMobilityTestMode: false
realWealthSyncEnabled: false
Known Failure Modes
Lower Bucket Sticking

Cause may be:

Demo Mobility off
classMobilityCalibrationMode false
care/harm ratio too weak
mobilityPressure negative
commensuration support too weak
rate limiter too tight
Mobility Appears Decoupled

Usually means one of:

localStorage/HTML version mismatch
old script cached
Demo Mobility not enabled
rate limiter active
class movement happening but too slowly for demo
4. WEALTH SHAPE SYSTEM
Purpose

Controls the economic form of care-regime civilization.

Healing should not flatten all hierarchy.

Healing should create a recoverable hierarchy.

Current Care-Regime Target Shape
careWealthTargetShape = [
  0.07, // strata 1
  0.11, // strata 2
  0.19, // strata 3
  0.25, // strata 4
  0.18, // strata 5
  0.09, // strata 6
  0.11  // strata 7
];
Conceptual Shape
1 - 2 - 3 - 4 - 3 - 1 - 2
Meaning
lower floor is protected
middle becomes productive center
upper remains healthy
elite retains defended reserve
elite no longer dominates civilization
Important Principle

Care should reduce poverty without erasing upper/elite strata.

A healthy care regime is not universal equality.

It is a survivable hierarchy with a dignity floor.

Known Failure Modes
Middle Wealth Volcano

Cause:

strata 3 or 4 absorbs too much wealth
upper/elite wealth shape correction too weak
commensuration overfeeds lower-middle
Upper/Elite Erasure

Cause:

care regime overcompresses top strata
shape correction too weak for strata 5–7
commensuration routes too little support to upper slope
Lower Mobility Starvation

Cause:

too much support shifted away from lower strata
lower bucket lacks mobility wealth/readiness
class mobility stays active but cannot reduce lower population fast enough
5. CARE / HARM STRUCTURE SYSTEM
Purpose

Models invisible institutions.

Structures are not drawn directly.

They shape the civilization through:

movement
class mobility
survivability
care/harm pressure
recoverability
RDI behavior
Current Variables
structures
INITIAL_CARE_STRUCTURES
INITIAL_HARM_STRUCTURES
STRUCTURE_INFLUENCE_RADIUS
STRUCTURE_GRAVITY_RADIUS
STRUCTURE_MAX_LIFE
STRUCTURE_BASE_DECAY
STRUCTURE_CARE_RENEWAL
STRUCTURE_HARM_STRESS_DECAY
Important Functions
createInvisibleStructures()
convertOneHarmToCare()
convertOneCareToHarm()
updateAlohaCareMemory()
Meaning

Care structures represent durable supportive institutions.

Harm structures represent durable extractive/damaging institutions.

The ratio between care and harm structures represents the strength of the cultural marinade.

Time spent in care dominance creates saturation.

Design Principle

Care/harm ratio is immediate field condition.

Care marination time is historical absorption.

Together they determine whether the field becomes resilient without Anabelle’s continued intervention.

6. ALOHA / SATURATION SYSTEM
Purpose

Care is not a switch.

Care is a residue.

This system tracks how long the civilization has lived in care-dominant conditions.

Core Variables
alohaSaturation
careMarinationTime
culturalResilience
governorInterventionNeed
Key Idea
care/harm structure ratio = marinade strength
time in care dominance = marinade thickness
alohaSaturation = absorbed care residue
culturalResilience = durable recovery capacity
Current Role

Aloha saturation helps:

pull RDI toward coherence basin
lower fear over time
reduce governor intervention need
support field self-maintenance
Known Failure Mode
Saturation Looks Strong But Poverty Still High

Fixed by adding poverty burden into RDI.

RDI cannot claim deep coherence while the lower bucket still suffers.

7. GOVERNANCE / RECOVERABILITY SYSTEM
Purpose

The governance system measures whether civilization can:

absorb shocks
reduce poverty
preserve wealth shape
enter coherence
reduce intervention
self-maintain

Recoverability is not equality.

Recoverability is civilization continuity under stress.

Governance Phases
emergency_recovery
stabilization
basin_approach
minimal_governance
watchful_maintenance
Current Successful Handoff

When conditions are met:

RDI coherent
fear calm
poverty <= 0.25

Anabelle switches to:

watchful_maintenance

and sends:

healing: 0.03
collaboration: 0.38
phase: "watchful_maintenance"

Economy then eases to:

healingLevel ≈ 0.05
collaborationLevel ≈ 0.38

Δ³ is turned off.

Field Remembers Meaning

The field remembers when:

Anabelle has stepped back
healing is near-off
collaboration is maintenance
Δ³ is off
fear is calm
field remains coherent
duration is recorded
Current Proof Variables
fieldSelfMaintenanceActive
fieldSelfMaintenanceDuration
bestFieldSelfMaintenanceDuration
fieldSelfMaintenanceEpisodes
field_remembers
recoverability_status

Expected exported state:

field_self_maintenance_active: true
field_self_maintenance_duration: increasing
field_remembers: true
recoverability_status: "field_remembers"
8. RDI SYSTEM
Purpose

RDI is the recoverability distress index.

It measures field disorder / instability / incoherence.

It is used by the governance dashboard to determine whether Anabelle should intervene, taper, or observe.

Current Critical Lesson

RDI alone can lie.

A low RDI is not enough if poverty is still high.

Current RDI Must Triangulate With
poverty rate
fear
phase lag
wealth shape
intervention level
self-maintenance duration
Poverty-Aware RDI

RDI now includes a poverty burden so it cannot declare deep coherence while lower-bucket distress remains high.

Concept:

povertyBurden =
  max(0, povertyRate - 0.25) / 0.25

If poverty is below 25%, no penalty.

If poverty is around 50%, RDI receives a meaningful penalty.

Design Principle
RDI may measure field order,
but poverty measures lived pain.
Both must agree before Anabelle lets go.
9. FIELD SELF-MAINTENANCE MEMORY
Purpose

Measures how long the field remains coherent after Anabelle reduces active intervention.

This is the operational meaning of:

The Field Remembers.

Core Function
updateFieldSelfMaintenanceMemory()
Core Variables
fieldSelfMaintenanceActive
fieldSelfMaintenanceStartFrame
fieldSelfMaintenanceDuration
bestFieldSelfMaintenanceDuration
lastFieldSelfMaintenanceDuration
fieldSelfMaintenanceEpisodes
lastFieldCoherenceFailureReason
Start Conditions

Field self-maintenance can begin when:

watchful_maintenance target phase active
healing near-off
collaboration maintenance
Δ³ off
fear calm
field coherent
Failure Reasons

Known failure reasons include:

rdi_rebound
fear_rebound
delta_reactivated
healing_reactivated
collaboration_reactivated
unknown
Importance

This system converts a poetic idea into a measurable one.

The field does not merely look coherent.

It has to hold coherence after support is removed.

10. GOVERNANCE TARGET BRIDGE
Current Bridge

The current bridge is localStorage.

Main Storage Keys
grassroots_economy_state
governance_targets
grassroots_economy_command
governance_targets Shape
{
  healing: 0.03,
  collaboration: 0.38,
  phase: "watchful_maintenance",
  source: "hard_coherence_handoff_v3",
  timestamp: Date.now()
}
grassroots_economy_state Shape

Contains exported economic/civilizational state, including:

poverty_rate
wealth_shape
target_wealth_shape
wealth_shape_deviation
care_structures
harm_structures
healing_intensity
collaboration_blend
field_self_maintenance_active
field_self_maintenance_duration
field_remembers
recoverability_status
grassroots_economy_command Shape

Used for commands like:

{
  type: "set_delta_active",
  value: false,
  timestamp: Date.now()
}
Known Bridge Risks
localStorage Timing

LocalStorage is not a true real-time protocol.

Possible issues:

stale state
overwritten targets
browser refresh desync
version/cache confusion
commands missed during pause
dashboard and sim reading different moments
Version Gremlins

Many apparent logic bugs were actually:

old HTML loaded
old JS version still cached
Flask not reset
browser not hard-refreshed
copied file not active
Future Direction

Migrate from localStorage to a virtual server bridge.

11. MIGRATION PLAN — LOCALSTORAGE TO VIRTUAL SERVER
Principle

Do not migrate the working original.

Create clean copies.

Migration Copy Naming
economic_sim.html
economic_sim.js
governance.html
governance.js
governance_bridge.js
Phase 1 — Mirror Only

Keep localStorage working.

Add server mirror beside it.

Do not remove localStorage.

Phase 2 — Server State Relay

Create WebSocket server that can receive:

economy_state
governance_targets
governance_commands
field_memory_events
Phase 3 — Command Relay

Allow governance to send commands through the server.

Still keep localStorage fallback.

Phase 4 — Persistence

Store episodes:

{
  timestamp,
  context,
  action,
  target,
  outcome,
  duration,
  failureReason
}
Phase 5 — Server Authority

Only after the mirror is stable:

server becomes source of truth for shared state
localStorage becomes fallback/cache
Anabelle can learn from durable history
First Server Goal

Do not make Anabelle smarter yet.

First goal:

Make state durable, synchronized, and observable.
12. FUTURE ANABELLE LEARNING SYSTEM
Purpose

Anabelle should eventually remember the results of past actions and change how she acts in the moment.

Correct Learning Unit

Anabelle should not remember only:

“I lowered RDI.”

She should remember:

“I lowered RDI, reduced poverty, preserved wealth shape, turned healing off, and the field held coherence for X frames before rebound.”
Episode Memory Shape

Future episode object:

{
  timestamp,
  context: {
    rdi,
    phaseLag,
    poverty,
    fear,
    wealthShapeDeviation,
    careRatio,
    healing,
    collaboration,
    deltaActive,
    governorPhase
  },
  action: {
    phase,
    healingTarget,
    collaborationTarget,
    deltaCommand,
    strategy
  },
  outcome: {
    rdiDelta,
    povertyDelta,
    wealthShapeDeviationDelta,
    fieldSelfMaintenanceDuration,
    reboundReason,
    success
  },
  score,
  lessons
}
Success Should Consider
RDI improvement
poverty reduction
wealth-shape improvement
care/harm ratio
intervention reduction
self-maintenance duration
rebound risk
dependency risk
Design Principle

Bad memory is worse than no memory.

Anabelle must learn from triangulated truth, not one pretty metric.

13. MAJOR FEEDBACK LOOPS
Loop A — Care Recovery
healing/collaboration
→ care structures increase
→ aloha saturation rises
→ RDI drops
→ poverty drops
→ Anabelle tapers
→ field self-maintenance begins
Loop B — Dependency Risk
Anabelle intervention
→ field stabilizes
→ if intervention never ends
→ stability becomes dependency
→ field never proves self-maintenance
Loop C — Field Remembers
watchful_maintenance
→ healing near-off
→ collaboration maintenance
→ Δ³ off
→ field holds coherence
→ duration recorded
→ future Anabelle can learn
Loop D — False Coherence
care saturation rises
→ RDI falls
→ poverty still high
→ dashboard falsely says coherent

Fixed by:

poverty-aware RDI
poverty gate on watchful handoff
Loop E — Wealth Shape Drift
commensuration
→ lower/middle repair
→ if overdone: upper/elite erasure
→ if underdone: lower population sticks

Balanced by:

careWealthTargetShape
shape correction
commensuration split
14. KNOWN FAILURE MODES
1. False Coherence

Cause:

RDI enters basin while poverty remains high.

Fix:

Add poverty burden to RDI and poverty gate to watchful handoff.

2. Watchful Handoff Trap

Cause:

Phase selector waits for healing/collaboration to already be low before sending low targets.

Fix:

True coherence handoff must override normal phase logic.

3. Watchful Target Overwrite

Cause:

Minimal governance can overwrite watchful target.

Fix:

Watchful maintenance lock and post-animation handoff guard.

4. Δ³ Blocking Field Memory

Cause:

Δ³ remains active after Anabelle supposedly steps back.

Fix:

Watchful handoff always sends set_delta_active: false.

5. Field Memory Not Starting

Cause:

Economy lacks direct RDI and old recoverability status remains governor_needed.

Fix:

Allow watchful_maintenance plus reduced intervention to count as coherent.

6. Wealth Volcano

Cause:

Strata 3 or 4 accumulates too much wealth.

Fix:

Strengthen shape correction and rebalance commensuration.

7. Upper/Elite Erasure

Cause:

Care regime compresses too aggressively.

Fix:

Preserve defended upper/elite reserve using target shape.

8. Lower Bucket Sticking

Cause:

Demo Mobility off, commensuration too weak, or care support not reaching lower mobility.

Fix:

Verify setDemoMobilityMode(true) and tune lower support.

9. Cache / Version Gremlins

Cause:

Browser or Flask serves old JS/HTML.

Fix:

Version bump, Flask reset, hard refresh, verify loaded script URL.

15. SOURCE OF TRUTH REGISTRY
Economy State

Owner:

economic_sim.js

Current export key:

grassroots_economy_state
Governance Targets

Owner:

governance.js

Current key:

governance_targets
Governance Commands

Owner:

governance.js

Current key:

grassroots_economy_command
Field Memory

Owner:

economic_sim.js

Key variables:

fieldSelfMaintenanceActive
fieldSelfMaintenanceDuration
bestFieldSelfMaintenanceDuration
fieldSelfMaintenanceEpisodes
lastFieldCoherenceFailureReason
RDI

Owner:

governance.js

Consumers:

governance dashboard
Anabelle phase logic
watchful handoff
Wealth Shape

Owner:

economic_sim.js

Key variables:

wealth_shape
target_wealth_shape
wealth_shape_deviation
careWealthTargetShape
16. ARCHITECTURAL PHILOSOPHY

This simulator is not intended to model:

utopia
equality
capitalism
socialism
perfect equilibrium

The simulator models:

civilization coherence under continuous stress.

Core Question

Can a hierarchical civilization maintain a dignity floor strong enough to preserve recoverability under continuous fear shocks?

Healing

Healing is not:

money printing
flattening
universal equality
permanent intervention

Healing is:

dignity-floor pressure
circulation retention
recoverability support
coherence preservation
anti-decoupling force

Healing represents:

The least of us must reflect the successes of the best of us, not a shadow to be left behind.

Fear

Fear is not a punishment mechanic.

Fear represents:

entropy
instability
uncertainty
coordination stress
temporal collapse pressure

Governance should not eliminate fear.

Governance should preserve recoverability under fear.

Recoverability

Recoverability is more important than:

peak prosperity
low poverty alone
static stability

A civilization that cannot recover is not coherent, even if materially prosperous.

Field Remembers

The field remembers only when the system holds coherence after Anabelle steps back.

This is the difference between:

rescue

and:

resilience
Truth Triangulation

No single metric is truth.

Truth must be triangulated through:

RDI
poverty
wealth shape
fear
phase lag
intervention level
self-maintenance duration
17. PRE-IMPLEMENTATION CHECKLIST

Before adding a new civilization system, ask:

1. What civilization concept does this represent?

Examples:

topology
care memory
fear
recoverability
governance
class mobility
wealth shape
field self-maintenance

Avoid mechanics without conceptual grounding.

2. Which subsystem owns this behavior?

Possible owners:

economy
governance
bridge
rendering
server
memory

Avoid duplicate ownership.

3. What is the source of truth?

Every major concept should have:

one authoritative variable
one owner
many consumers

Avoid parallel calculators.

4. What existing systems will this influence?

Explicitly map:

upstream inputs
downstream outputs
recursive loops

Avoid invisible coupling.

5. Does this increase locality or global smearing?

Prefer:

local interaction
local memory
local recoverability
local infrastructure

Avoid uniform civilization-wide effects.

6. Does this improve recoverability realism?

The simulator prioritizes recoverability under stress.

Not perfect equilibrium.

7. Does this create meaningful differentiation?

Avoid:

prosperity flattening
permanent caste rigidity
fake coherence

Prefer:

recoverable hierarchy
survivable lower floor
preserved upper/elite slope
meaningful class mobility
8. Is this system historically persistent?

Prefer:

memory
continuity
path dependence
temporal drift

Avoid instant civilization amnesia.

9. Can this system fail meaningfully?

Good systems should:

strain
drift
decay
recover
rebound
or collapse

Avoid invulnerable mechanics.

10. Does this preserve philosophical coherence?

The simulator models:

civilization coherence under continuous stress.

New systems should reinforce this framing, not dilute it.

18. CURRENT NEXT FRONTIER
Immediate Frontier

Create migration copies:

economic_sim.html
economic_sim.js
governance.html
governance.js
governance_bridge.js

Then begin localStorage-to-server bridge migration.

Near-Term Frontier

WebSocket / virtual server bridge.

Goals:

state sync
command relay
durable logs
replayable episodes
multi-client visibility
less cache/localStorage fragility
Mid-Term Frontier

Anabelle episode memory.

Goals:

remember interventions
score outcomes
detect rebound
detect dependency
adjust future strategy
Long-Term Frontier

Governed Persistent Intelligence.

Anabelle becomes not merely a dashboard governor, but a persistent intelligence that learns how to intervene less over time because the field increasingly remembers.
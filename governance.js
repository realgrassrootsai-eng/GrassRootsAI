/**
 * recoverability.js
 * Phase 3 scaffold - VERIFIED ECONOMY INTEGRATION
 * Anabelle now sends commands with confirmation feedback
 */

// ============================================================
// ANABELLE'S CONSCIOUSNESS
// ============================================================

const ANABELLE_GOAL = {
  targetRDI: 0.25,
  maxAcceptableRDI: 0.35,
  targetMomentum: 0.00,
  minAcceptableMomentum: -0.02,
  priority: "stability_over_speed",
  
  describe() {
    return `Target RDI: ${this.targetRDI} | Max: ${this.maxAcceptableRDI}`;
  },
  
  isMet(rdi) {
    return rdi <= this.targetRDI;
  },
  
  distanceToGoal(rdi) {
    return Math.max(0, rdi - this.targetRDI);
  }
};

// ==========================================================
// ANΔ³BELLE PHASE GOVERNOR v1
// ----------------------------------------------------------
// Finite-state governance with hysteresis.
// The dashboard decides Anabelle's posture.
// The field eases toward target healing/collaboration.
// ==========================================================

let anabelleGovernorPhase =
  "watchful_maintenance";

let anabelleGovernorPhaseEnteredAt =
  Date.now();

let anabelleLastDeltaArmAt =
  0;

let anabelleLastTargetSentAt =
  0;

const ANABELLE_PHASE_MIN_DWELL_MS =
  6000;

const ANABELLE_DELTA_COOLDOWN_MS =
  30000;

const ANABELLE_TARGET_SEND_COOLDOWN_MS =
  750;

  // ==========================================================
// WATCHFUL MAINTENANCE LOCK v1
// ----------------------------------------------------------
// Once true coherence is reached, Anabelle must hold the
// watchful posture long enough for the economy field to ease
// healing/collaboration down.
// ==========================================================

let anabelleWatchfulLockUntil =
  0;

const ANABELLE_WATCHFUL_LOCK_MS =
  30000;

let sim = {
  time: 0,
  governorOn: true,

  // SAFE = Anabelle can think/recommend but cannot command the source sim.
  // LIVE = Anabelle can send runtime commands through localStorage.
  governanceMode: "safe",

  shockPulse: 0,

  output: {
    rdi: 0.220,
    momentum: 0.018,
    phase_lag: 0.120,

    recovery_probability: 0.91,
    expected_recovery_cycles: 3.2,

    urgency: "STABLE",
    economyUrgency: "STABLE",
    simUrgency: "STABLE",
    intervention_needed: false,

    components: {
      disorder: 0.18,
      fragmentation: 0.22,
      harm_pressure: 0.16,
      phase_lag: 0.12,
      capacity_offset: 0.58
    },

    governor: {
      should_intervene: false,
      strategy: "none",
      strength: 0.00
    },

    memory: {
      resilience: 0.00,
      fragility: 0.00,
      adaptation_efficiency: 0.00
    },

    forecast: {
      predicted_rdi_change: 0.00,
      predicted_rdi: 0.220,
      confidence: 0.00,
      lead_time: 0
    }
  },

  trail: [],
  recoveryHistory: [],
  collapseHistory: [],

  activeRecovery: {
    inRecovery: false,
    startTime: 0,
    peakRDI: 0,
    overshoot: 0,
    oscillationCount: 0,
    lastDirection: 0,
    interventionAccum: 0,
    interventionFrames: 0
  },

  levers: {
    fearShock:      { active: false, strength: 0, label: "Fear Shock", lastSetTime: 0 },
    legitimacy:     { active: false, strength: 0, label: "Legitimacy Nudge", lastSetTime: 0 },
    redistribution: { active: false, strength: 0, label: "Redistribution", lastSetTime: 0 },
    delta3:         { active: false, strength: 0, label: "Δ³ Toggle", lastSetTime: 0 },
    healPoorest:    { active: false, strength: 0, label: "Heal Poorest", lastSetTime: 0 }
  },

  anabelle: {
    name: "Anabelle",
    role: "Economic Recovery Governor",
    goal: { ...ANABELLE_GOAL },
    
    selfAssessment: {
      successfulStrategies: {},
      failedStrategies: {},
      lastInterventionWorked: null,
      lastInterventionReasoning: "",
      adaptationRate: 0.0,
      interventionsCount: 0,
      successfulInterventions: 0
    },
    
    actionMemory: [],
    currentReasoning: "",
    currentConfidence: 0.5,
    
    lastCommandTime: 0,
    commandCooldownMs: 3000,
    lastSentStrategy: "",
    lastSentStrength: 0,
    
    reflectOnOutcome(intervention, rdiBefore, rdiAfter) {
      const improved = rdiAfter < rdiBefore;
      const cost = intervention.strength;
      
      let success = false;
      if (improved && cost < 0.7) {
        success = true;
        this.selfAssessment.successfulStrategies[intervention.type] = 
          (this.selfAssessment.successfulStrategies[intervention.type] || 0) + 1;
        this.selfAssessment.lastInterventionWorked = true;
        this.selfAssessment.successfulInterventions++;
      } else {
        this.selfAssessment.failedStrategies[intervention.type] = 
          (this.selfAssessment.failedStrategies[intervention.type] || 0) + 1;
        this.selfAssessment.lastInterventionWorked = false;
      }
      
      this.selfAssessment.interventionsCount++;
      this.selfAssessment.adaptationRate = 
        this.selfAssessment.successfulInterventions / this.selfAssessment.interventionsCount;
      
      this.actionMemory.push({
        time: sim.time,
        strategy: intervention.type,
        strength: cost,
        improved: improved,
        rdiDelta: rdiAfter - rdiBefore,
        success: success
      });
      
      while (this.actionMemory.length > 20) this.actionMemory.shift();
      
      return success;
    },
    
    chooseStrategy(rdi, poverty, fear, momentum) {

  const lastActionWorked =
    this.selfAssessment.lastInterventionWorked;

  const lastStrategy =
    this.actionMemory.length > 0
      ? this.actionMemory[this.actionMemory.length - 1].strategy
      : null;

  let strategy = "none";
  let reasoning = "";
  let confidence = 0.5;

  const regime =
    sim.currentCivilizationRegime || "unknown";

    const governanceField =
    sim.governanceFieldState || {};

  const economyState =
    typeof getEconomyState === "function"
      ? getEconomyState()
      : null;

  const healingActive =
    Number(economyState?.healing_intensity ?? 0) >= 0.90;

  const collaborationActive =
    Number(economyState?.collaboration_blend ?? 0) >= 0.90;

  const careRegimeActive =
    healingActive && collaborationActive;

  const lowerBucketShare =
    governanceField.lowerBucketShare ?? poverty;

  const interventionNeed =
    governanceField.governorInterventionNeed ?? 1;

  const wealthShapeDeviation =
    governanceField.wealthShapeDeviation ?? 1;

    // ======================================================
  // TOP PRIORITY: COHERENT CARE TAPER
  // ------------------------------------------------------
  // This must run BEFORE failed-strategy loops.
  // If the field is already in the coherence basin while
  // Δ³/care saturation is active, Anabelle must taper.
  // ======================================================

  if (
    rdi < 0.22 &&
    sim.lastDeltaState === true &&
    careRegimeActive === true
  ) {

    reasoning =
      `🌿 RDI ${rdi.toFixed(3)} is inside the deep coherence basin. Tapering Δ³ so care becomes culture, not dependency.`;

    strategy =
      "taper_recovery";

    confidence =
      0.94;
  }

  else// ======================================================
  // TOP PRIORITY: COHERENT CARE TAPER
  // ------------------------------------------------------
  // This must run BEFORE failed-strategy loops.
  // If the field is already in the coherence basin while
  // Δ³/care saturation is active, Anabelle must taper.
  // ======================================================

  if (
    rdi < 0.22 &&
    sim.lastDeltaState === true &&
    careRegimeActive === true
  ) {

    reasoning =
      `🌿 RDI ${rdi.toFixed(3)} is inside the deep coherence basin. Tapering Δ³ so care becomes culture, not dependency.`;

    strategy =
      "taper_recovery";

    confidence =
      0.94;
  }

  else

  // ======================================================
  // REGIME: FROZEN OLIGARCHY
  // Concentrated + immobile + circulation collapse
  // ======================================================

  if (
    regime === "frozen_oligarchy"
  ) {

    reasoning =
      "🧊 Frozen oligarchy detected. Mobility and circulation are collapsing. Increasing redistribution pressure.";

    strategy =
      "preemptive_stabilize";

    confidence = 0.82;
  }

// ======================================================
  // CARE ENTRENCHMENT RISK
  // ------------------------------------------------------
  // Coherence should not become dependence.
  // If the field is already coherent but healing/collaboration
  // remain pinned at maximum, Anabelle should taper support.
  // ======================================================

  else if (
    rdi < 0.25 &&
    careRegimeActive === true &&
    sim.lastDeltaState === true &&
    interventionNeed < 0.55
  ) {

    reasoning =
      `🌿 Coherence is present, but care pressure is becoming entrenched. Reducing active intervention so the field remains adaptive.`;

    strategy =
      "taper_recovery";

    confidence =
      0.88;
  }

  // ======================================================
  // GOAL ALREADY MET
  // ======================================================

  else if (this.goal.isMet(rdi)) {

    const fieldState =
      sim.governanceFieldState || {};

    const careMemoryStrong =
      Number(fieldState.alohaSaturation || 0) > 0.45 ||
      Number(fieldState.culturalResilience || 0) > 0.35;

    const deeplyCoherent =
      rdi < 0.22;

    if (
      deeplyCoherent &&
      sim.lastDeltaState === true &&
      careRegimeActive === true
    ) {
      reasoning =
        `🌿 Coherence basin reached at RDI ${rdi.toFixed(3)}. Beginning Δ³ taper so the field can carry itself.`;

      strategy =
        "taper_recovery";

      confidence =
        careMemoryStrong ? 0.92 : 0.82;
    } else {
      reasoning =
        `✓ Goal achieved. RDI ${rdi.toFixed(3)} is inside the coherence basin. Observing field stability.`;

      strategy =
        "observe";

      confidence =
        0.95;
    }
  }

  // ======================================================
  // ACTIVE CARE SATURATION GUARD
  // ------------------------------------------------------
  // If Δ³ is already active and the economy is already in
  // max-care/max-collaboration, do not keep hammering FULL
  // AGGRESSIVE unless the field is genuinely critical.
  //
  // This prevents care from becoming over-governance.
  // ======================================================

  else if (
    sim.lastDeltaState === true &&
    careRegimeActive === true &&
    rdi < this.goal.maxAcceptableRDI &&
    fear < 0.45 &&
    poverty < 0.35
  ) {

    if (rdi <= this.goal.targetRDI || interventionNeed < 0.60) {
      reasoning =
        `🌿 Care saturation is active and the field is no longer critical. Beginning taper to avoid brittle over-governance.`;

      strategy =
        "taper_recovery";

      confidence =
        0.90;
    } else {
      reasoning =
        `🧭 Δ³ care saturation is already active. Holding recovery pressure without escalating.`;

      strategy =
        "preemptive_stabilize";

      confidence =
        0.76;
    }
  }

  // ======================================================
  // CRITICAL FAILURE STATE
  // ======================================================

  else if (
    poverty >= 0.45 ||
    rdi >= 0.70 ||
    fear > 0.60
  ) {

    reasoning =
      `⚠️ CRITICAL: Poverty=${(poverty * 100).toFixed(0)}%, RDI=${rdi.toFixed(2)}. ACTIVATING Δ³ + FULL RECOVERY.`;

    strategy =
      "full_aggressive_recovery";

    confidence = 0.9;
  }

  // ======================================================
  // AGGRESSIVE STRATEGY FAILED
  // ======================================================

  else if (
    lastActionWorked === false &&
    lastStrategy === "full_aggressive_recovery"
  ) {

    reasoning =
      `🤔 Aggressive didn't help. Trying legitimacy nudge.`;

    strategy =
      "soft_support";

    confidence = 0.6;
  }

  // ======================================================
  // SOFT STRATEGY FAILED
  // ======================================================

  else if (
    lastActionWorked === false &&
    lastStrategy === "soft_support"
  ) {

    reasoning =
      `🤔 Soft approach failed. Escalating with Δ³.`;

    strategy =
      "full_aggressive_recovery";

    confidence = 0.7;
  }

  // ======================================================
  // COHERENCE BASIN ENFORCEMENT
  // Demo rule:
  // Better is not enough. Anabelle keeps intervening
  // until RDI reaches the coherence basin target.
  // ======================================================

  else if (
    rdi > this.goal.targetRDI
  ) {

    reasoning =
      `🧭 RDI ${rdi.toFixed(3)} is improved but still above coherence basin target ${this.goal.targetRDI.toFixed(2)}. Continuing recovery pressure.`;

    strategy =
      rdi > 0.32
        ? "full_aggressive_recovery"
        : "preemptive_stabilize";

    confidence =
      0.78;
  }

  // ======================================================
  // WARNING ZONE
  // ======================================================

  else if (
    rdi >= 0.50 ||
    poverty >= 0.25
  ) {

    reasoning =
      `👁️ RDI at ${rdi.toFixed(2)} in warning zone. Adjusting.`;

    strategy =
      momentum > 0.03
        ? "preemptive_stabilize"
        : "soft_support";

    confidence = 0.65;
  }

  // ======================================================
  // DEFAULT OBSERVATION
  // ======================================================

  else {

    reasoning =
      `✅ System stable. Observing.`;

    strategy = "observe";

    confidence = 0.85;
  }

  if (
    sim.governanceMode !== "live" &&
    strategy !== "none" &&
    strategy !== "observe"
  ) {
    reasoning =
      `🛡️ SAFE MODE: Recommendation only — ${reasoning}`;
  }

  if (
    sim.governanceMode === "live" &&
    strategy !== "none" &&
    strategy !== "observe"
  ) {
    reasoning =
      `🟢 LIVE MODE: Executing — ${reasoning}`;
  }

  this.currentReasoning = reasoning;
  this.currentConfidence = confidence;

  return {
    strategy,
    confidence,
    reasoning
  };
},
    
    calculateStrength(strategy, rdi, poverty) {
      if (strategy === "full_aggressive_recovery") {
        return clamp01(0.65 + (poverty * 1.0) + (rdi - 0.3) * 1.2);
      } else if (strategy === "soft_support") {
        return clamp01(0.35 + (rdi - 0.4) * 1.0);
      } else if (strategy === "preemptive_stabilize") {
        return clamp01(0.45);
      }
      return 0;
    },
    
    shouldSendCommand(strategy, strength) {
      const now = Date.now();
      const timeSinceLastCommand = now - this.lastCommandTime;
      
      if (
        strategy === "taper_recovery" &&
        timeSinceLastCommand >= 1200
      ) {
        return true;
      }

      if (timeSinceLastCommand < this.commandCooldownMs) {
        return false;
      }
      
      if (
        strategy === this.lastSentStrategy &&
        Math.abs(strength - this.lastSentStrength) < 0.08
      ) {
        return false;
      }
      
      return true;
    },
    
    recordCommandSent(strategy, strength) {
      this.lastCommandTime = Date.now();
      this.lastSentStrategy = strategy;
      this.lastSentStrength = strength;
    },
    
    explain() {
      return {
        identity: `${this.name}, ${this.role}`,
        goal: this.goal.describe(),
        goalStatus: this.goal.isMet(sim.output.rdi) ? "ACHIEVED" : `In progress (${this.goal.distanceToGoal(sim.output.rdi).toFixed(3)} from target)`,
        lastAction: this.actionMemory.length > 0 ? this.actionMemory[this.actionMemory.length-1] : null,
        successRate: `${(this.selfAssessment.adaptationRate * 100).toFixed(1)}%`,
        currentReasoning: this.currentReasoning,
        confidence: `${(this.currentConfidence * 100).toFixed(0)}%`,
        cooldownRemaining: Math.max(0, (this.commandCooldownMs - (Date.now() - this.lastCommandTime)) / 1000).toFixed(1)
      };
    }
  },

  lastShockTime: -1,
  lastStableTime: 0,

  adaptiveThresholds: {
    stable: 0.30,
    warning: 0.50,
    critical: 0.70
  },

  memoryField: {
    quality_avg: 0.00,
    recent_recovery_count: 0,
    field_strength: 0.00
  },

  lastGovernorIntervention: {
    time: -1,
    type: "none",
    strength: 0,
    rdiBefore: 0
  },

  governorStatus: "idle",
  controlMode: "conscious",
  fieldRemembers: false,
  fieldRemembersPrev: false,
  fieldRemembersDisplayUntil: 0,
  fieldRemembersLastFireTime: -999,

  lastEconomyCommandType: "none",
  lastEconomyPovertyRate: null,
  lastEconomyFearLevel: null,
  lastCarePressureCommand: 0,
  lastInterventionOutcome: "unknown",
  
  watchdogOverridden: false,
  lastAnabelleCommandTime: 0,
  
  // Track delta state to avoid spamming toggle
  lastDeltaState: false,
  taperLockUntil: 0,
  currentCivilizationRegime: "initializing",
  deltaToggleRequested: false
};

// ============================================================
// Config
// ============================================================

const TRAIL_LIMIT = 240;
const SHOCK_PULSE_DECAY = 0.94;

// ============================================================
// COHERENCE BASIN GEOMETRY v1
// ------------------------------------------------------------
// The visible green basin is not just a threshold.
// It has a center of gravity.
//
// RDI < 0.22 = true coherence threshold.
// RDI around 0.18 = visual basin center / settled coherence.
// ============================================================

const COHERENCE_RDI_THRESHOLD =
  0.22;

const COHERENCE_RDI_CENTER =
  0.18;

const COHERENCE_PHASE_LAG_CENTER =
  0.18;


function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v) || 0));
}

function lerpSafe(current, target, rate = 0.01) {
  return current + (target - current) * rate;
}

// ============================================================
// BRIDGE INTEGRATION - Send commands with verification
// ============================================================

// ============================================================
// GOVERNANCE MODE CONTROLS v1
// ------------------------------------------------------------
// Console-safe controls for Anabelle's authority boundary.
// SAFE = recommendation-only.
// LIVE = may send runtime commands through the bridge.
// ============================================================

function setGovernanceMode(mode) {
  const normalized =
    String(mode || "").toLowerCase();

  if (
    normalized !== "safe" &&
    normalized !== "live"
  ) {
    console.warn(
      "[ANABELLE] Unknown governance mode:",
      mode,
      "Use 'safe' or 'live'."
    );

    return false;
  }

  sim.governanceMode =
    normalized;

  window.anabelleGovernanceMode =
    normalized;

    // When switching into LIVE, clear prior blocked/suppressed
  // command memory so SAFE-mode recommendations do not poison
  // Anabelle's first real runtime intervention.
  if (normalized === "live") {
    sim.anabelle.lastCommandTime =
      0;

    sim.anabelle.lastSentStrategy =
      "";

    sim.anabelle.lastSentStrength =
      0;

    sim.lastEconomyCommandType =
      "live_mode_ready";

    sim.lastInterventionOutcome =
      "live_mode_ready";
  }

  console.log(
    `🧭 [ANABELLE] Governance mode set to: ${normalized.toUpperCase()}`
  );

  return true;
}

function setAnabelleSafeMode() {
  return setGovernanceMode("safe");
}

function setAnabelleLiveMode() {
  return setGovernanceMode("live");
}

window.setGovernanceMode =
  setGovernanceMode;

window.setAnabelleSafeMode =
  setAnabelleSafeMode;

window.setAnabelleLiveMode =
  setAnabelleLiveMode;

  // ==========================================================
// ANΔ³BELLE GOVERNANCE TARGET SENDER v1
// ----------------------------------------------------------
// Sends target healing/collaboration values to sketch_test.js.
// This is the new preferred control path.
// It avoids additive care-pressure windup.
// ==========================================================

function anabelleSendGovernanceTargets(healingTarget, collaborationTarget, phaseLabel = "unknown") {
  const now =
    Date.now();

  if (
    now - anabelleLastTargetSentAt <
    ANABELLE_TARGET_SEND_COOLDOWN_MS
  ) {
    return false;
  }

  const safeHealing =
    Math.max(
      0,
      Math.min(
        1,
        Number(healingTarget) || 0
      )
    );

  const safeCollaboration =
    Math.max(
      0,
      Math.min(
        1,
        Number(collaborationTarget) || 0
      )
    );

  localStorage.setItem(
    "governance_targets",
    JSON.stringify({
      healing: safeHealing,
      collaboration: safeCollaboration,
      phase: phaseLabel,
      source: "anabelle_phase_governor",
      timestamp: now
    })
  );

  anabelleLastTargetSentAt =
    now;

  window.anabelleGovernanceTargetHealing =
    safeHealing;

  window.anabelleGovernanceTargetCollaboration =
    safeCollaboration;

  window.anabelleGovernorPhase =
    phaseLabel;

  console.log(
    "🎯 [ANABELLE TARGETS]",
    phaseLabel,
    "healing:",
    safeHealing.toFixed(3),
    "collaboration:",
    safeCollaboration.toFixed(3)
  );

  return true;
}

// ==========================================================
// ANΔ³BELLE PHASE SELECTOR v1
// ----------------------------------------------------------
// Chooses Anabelle's governance phase using hysteresis.
// This prevents FULL_AGGRESSIVE / taper / stabilize from
// fighting each other in the coherence basin.
// ==========================================================

function updateAnabelleGovernorPhase() {
  const now =
    Date.now();

  const rdi =
    Number(sim.output?.rdi ?? 1);

  const economyState =
    typeof getEconomyState === "function"
      ? getEconomyState()
      : null;

  const fear =
    Number(
      economyState?.fear_level ??
      sim.lastEconomyFearLevel ??
      0
    );

    // ========================================================
  // TRUE COHERENCE PHASE ESCAPE v1
  // --------------------------------------------------------
  // Once RDI is below the true-coherence threshold and fear is
  // calm, do not let current healing/collaboration values trap
  // Anabelle in minimal_governance.
  // ========================================================

  if (
  rdi <= COHERENCE_RDI_THRESHOLD &&
  fear <= 0.18 &&
  Number(sim.lastEconomyPovertyRate ?? 1) <= 0.25
) {
    nextPhase =
      "watchful_maintenance";

    if (nextPhase !== anabelleGovernorPhase) {
      console.log(
        "🌿 [ANABELLE TRUE COHERENCE PHASE]",
        anabelleGovernorPhase,
        "→",
        nextPhase,
        "| RDI:",
        rdi.toFixed(3),
        "| fear:",
        fear.toFixed(3)
      );

      anabelleGovernorPhase =
        nextPhase;

      anabelleGovernorPhaseEnteredAt =
        now;

      window.anabelleGovernorPhase =
        anabelleGovernorPhase;
    }

    return anabelleGovernorPhase;
  }

  const healing =
    Number(
      economyState?.healing_intensity ??
      0
    );

  const collaboration =
    Number(
      economyState?.collaboration_blend ??
      0
    );

  const phaseAge =
    now - anabelleGovernorPhaseEnteredAt;

  let nextPhase =
    anabelleGovernorPhase;

  // ========================================================
  // Emergency always has priority.
  // ========================================================

  if (
    rdi >= 0.32 ||
    fear >= 0.45
  ) {
    nextPhase =
      "emergency_recovery";
  }

  // ========================================================
  // Stabilization: still above basin, but not crisis.
  // ========================================================

  else if (
    rdi >= 0.285 &&
    (
      fear >= 0.22 ||
      Number(sim.lastEconomyPovertyRate ?? 0) >= 0.18
    )
  ) {
    nextPhase =
      "stabilization";
  }

// ========================================================
// Basin approach begins earlier now.
// If fear is low and poverty is not critical, Anabelle
// should start testing whether the field can carry itself.
// ========================================================

  else if (
    rdi >= 0.235
  ) {
    nextPhase =
      "basin_approach";
  }

  // ========================================================
  // Minimal governance: coherent, but still actively reducing
  // intervention if healing/collaboration are high.
  // ========================================================

  else if (
    rdi >= COHERENCE_RDI_THRESHOLD ||
    healing > 0.08 ||
    collaboration > 0.42
  ) {
    nextPhase =
      "minimal_governance";
  }

  // ========================================================
  // Watchful maintenance: low RDI and low active intervention.
  // ========================================================

  else {
    nextPhase =
      "watchful_maintenance";
  }

  // ========================================================
  // Hysteresis / dwell protection.
  // Emergency can enter immediately.
  // Other phase changes must wait a few seconds.
  // ========================================================

  if (
    nextPhase !== anabelleGovernorPhase &&
    nextPhase !== "emergency_recovery" &&
    phaseAge < ANABELLE_PHASE_MIN_DWELL_MS
  ) {
    return anabelleGovernorPhase;
  }

  if (nextPhase !== anabelleGovernorPhase) {
    console.log(
      "🧭 [ANABELLE PHASE]",
      anabelleGovernorPhase,
      "→",
      nextPhase,
      "| RDI:",
      rdi.toFixed(3),
      "| fear:",
      fear.toFixed(3),
      "| healing:",
      healing.toFixed(3),
      "| collaboration:",
      collaboration.toFixed(3)
    );

    anabelleGovernorPhase =
      nextPhase;

    anabelleGovernorPhaseEnteredAt =
      now;

    window.anabelleGovernorPhase =
      anabelleGovernorPhase;
  }

  return anabelleGovernorPhase;
}

// ==========================================================
// ANΔ³BELLE PHASE TARGET EXECUTOR v1
// ----------------------------------------------------------
// Converts Anabelle's phase into desired field posture.
// This sends target values, not additive pressure.
// ==========================================================

function applyAnabellePhaseTargets() {
  const rdiNow =
    Number(sim.output?.rdi ?? 1);

  const fearNow =
    Number(sim.lastEconomyFearLevel ?? 0);

    const povertyNow =
  Number(sim.lastEconomyPovertyRate ?? 1);

  const economyState =
    typeof getEconomyState === "function"
      ? getEconomyState()
      : null;

  const healingNow =
    Number(economyState?.healing_intensity ?? 0);

  const collaborationNow =
    Number(economyState?.collaboration_blend ?? 0);

  // ==========================================================
  // HARD COHERENCE HANDOFF v3
  // ----------------------------------------------------------
  // Highest-priority rule:
  // If true coherence is reached, Anabelle must stop active
  // healing and test whether the field remembers.
  //
  // Important:
  // Do NOT require current healing/collaboration to already be
  // low. They only become low after this target is sent.
  // ==========================================================

  if (
  rdiNow <= COHERENCE_RDI_THRESHOLD &&
  fearNow <= 0.18 &&
  povertyNow <= 0.25
) {
    const phase =
      "watchful_maintenance";

    const targetHealing =
      0.03;

    const targetCollaboration =
      0.38;

    anabelleGovernorPhase =
      phase;

    window.anabelleGovernorPhase =
      phase;

      anabelleWatchfulLockUntil =
  Date.now() + ANABELLE_WATCHFUL_LOCK_MS;

    sim.currentGovernorPhase =
      phase;

    sim.currentHealingTarget =
      targetHealing;

    sim.currentCollaborationTarget =
      targetCollaboration;

    window.anabelleCurrentHealingTarget =
      targetHealing;

    window.anabelleCurrentCollaborationTarget =
      targetCollaboration;

    // Direct write first so the critical handoff cannot be
    // blocked by target-send cooldown.
    localStorage.setItem(
      "governance_targets",
      JSON.stringify({
        healing: targetHealing,
        collaboration: targetCollaboration,
        phase,
        source: "hard_coherence_handoff_v3",
        timestamp: Date.now()
      })
    );

    anabelleSendGovernanceTargets(
      targetHealing,
      targetCollaboration,
      phase
    );

    anabelleSendCommand(
  "set_delta_active",
  false
);

    console.log(
      "🎯 [ANABELLE TRUE COHERENCE] → watchful_maintenance",
      "RDI:",
      rdiNow.toFixed(3),
      "fear:",
      fearNow.toFixed(3),
      "healingNow:",
      healingNow.toFixed(3),
      "collaborationNow:",
      collaborationNow.toFixed(3),
      "targetHealing:",
      targetHealing.toFixed(3),
      "targetCollaboration:",
      targetCollaboration.toFixed(3)
    );

    return {
      phase,
      targetHealing,
      targetCollaboration,
      handoffComplete: true
    };
  }

  // ==========================================================
  // NORMAL PHASE TARGETS
  // ----------------------------------------------------------
  // Only runs if true coherence has NOT been reached.
  // ==========================================================

  let phase =
  updateAnabelleGovernorPhase();

let targetHealing =
  0.12;

let targetCollaboration =
  0.42;

if (
  Date.now() < anabelleWatchfulLockUntil &&
  Number(sim.lastEconomyFearLevel ?? 0) <= 0.22
) {
  phase =
    "watchful_maintenance";

  targetHealing =
    0.03;

  targetCollaboration =
    0.38;

  anabelleGovernorPhase =
    "watchful_maintenance";

  window.anabelleGovernorPhase =
    "watchful_maintenance";
}

  if (phase === "emergency_recovery") {
    targetHealing =
      0.92;

    targetCollaboration =
      0.96;
  }

  else if (phase === "stabilization") {
    targetHealing =
      0.52;

    targetCollaboration =
      0.70;
  }

  else if (phase === "basin_approach") {
    targetHealing =
      0.34;

    targetCollaboration =
      0.64;
  }

  else if (phase === "minimal_governance") {
    targetHealing =
      0.18;

    targetCollaboration =
      0.48;
  }

  else if (phase === "watchful_maintenance") {
    targetHealing =
      0.03;

    targetCollaboration =
      0.38;
  }

  anabelleSendGovernanceTargets(
    targetHealing,
    targetCollaboration,
    phase
  );

  sim.currentGovernorPhase =
    phase;

  sim.currentHealingTarget =
    targetHealing;

  sim.currentCollaborationTarget =
    targetCollaboration;

  window.anabelleGovernorPhase =
    phase;

  window.anabelleCurrentHealingTarget =
    targetHealing;

  window.anabelleCurrentCollaborationTarget =
    targetCollaboration;

  return {
    phase,
    targetHealing,
    targetCollaboration
  };
}

// ==========================================================
// ANΔ³BELLE PHASE COMMAND GATE v1
// ----------------------------------------------------------
// Prevents old intervention commands from fighting the new
// target-based phase governor.
// ==========================================================

function anabelleCommandAllowedInCurrentPhase(type, value) {
  const phase =
    anabelleGovernorPhase || "watchful_maintenance";

  // Emergency is the only phase where the old full toolkit is allowed.
  if (phase === "emergency_recovery") {
  const rdiNow =
    Number(sim.output?.rdi ?? 1);

  const fearNow =
    Number(sim.lastEconomyFearLevel ?? 0);

  const povertyNow =
    Number(sim.lastEconomyPovertyRate ?? 0);

  const trueEmergency =
    rdiNow >= 0.40 ||
    fearNow >= 0.45 ||
    povertyNow >= 0.35;

  // Soft emergency:
  // RDI is high enough for strong targets,
  // but not bad enough for fear shocks / heal spam / repeated Δ³.
  if (trueEmergency !== true) {
    if (type === "add_fear") return false;
    if (type === "heal_poorest") return false;

    // Let Δ³ turn on only if RDI is clearly above the soft boundary.
    if (
      type === "set_delta_active" &&
      value === true &&
      rdiNow < 0.36
    ) {
      return false;
    }
  }

  return true;
}

  // Stabilization may still use structural nudges,
  // but should not add fear or spam heal_poorest.
  if (phase === "stabilization") {
    if (type === "add_fear") return false;
    if (type === "heal_poorest") return false;

    return true;
  }

  // Basin approach should taper active intervention.
  if (phase === "basin_approach") {
    if (type === "set_delta_active" && value === true) return false;
    if (type === "add_fear") return false;
    if (type === "heal_poorest") return false;
    if (type === "set_care_pressure" && Number(value) > 0) return false;

    return true;
  }

  // Minimal governance allows only quiet structural support.
  if (phase === "minimal_governance") {
    if (type === "set_delta_active" && value === true) return false;
    if (type === "add_fear") return false;
    if (type === "heal_poorest") return false;
    if (type === "set_care_pressure") return false;

    return true;
  }

  // Watchful maintenance should not mutate the field except
  // through target posture.
  if (phase === "watchful_maintenance") {
    if (type === "set_delta_active" && value === true) return false;
    if (type === "add_fear") return false;
    if (type === "heal_poorest") return false;
    if (type === "set_care_pressure") return false;
    if (type === "set_redistribution_nudge" && Number(value) > 0.02) return false;
    if (type === "nudge_legitimacy" && Number(value) > 0.02) return false;

    return true;
  }

  return true;
}

function anabelleSendCommand(type, value, options = {}) {

  // ==========================================================
  // PHASE GOVERNOR COMMAND GATE v1
  // ----------------------------------------------------------
  // The new phase system decides what old commands are allowed.
  // This prevents FULL_AGGRESSIVE / care pressure from fighting
  // target-based taper and maintenance.
  // ==========================================================

  if (
    typeof anabelleCommandAllowedInCurrentPhase === "function" &&
    anabelleCommandAllowedInCurrentPhase(type, value) !== true
  ) {
    console.log(
      "🧭 [ANABELLE PHASE GATE] Blocked command:",
      type,
      value,
      "| phase:",
      anabelleGovernorPhase
    );

    return false;
  }

  // ==========================================================
// Δ³ ARM COOLDOWN v1
// ----------------------------------------------------------
// Δ³ is a recovery pulse, not a heartbeat.
// Prevent repeated re-arming unless enough time has passed.
// ==========================================================

if (
  type === "set_delta_active" &&
  value === true
) {
  const now =
    Date.now();

  const timeSinceLastDeltaArm =
    now - anabelleLastDeltaArmAt;

  if (
    anabelleLastDeltaArmAt > 0 &&
    timeSinceLastDeltaArm < ANABELLE_DELTA_COOLDOWN_MS
  ) {
    console.log(
      "🧭 [ANABELLE Δ³ COOLDOWN] Blocked re-arm:",
      Math.ceil(
        (ANABELLE_DELTA_COOLDOWN_MS - timeSinceLastDeltaArm) / 1000
      ),
      "seconds remaining"
    );

    return false;
  }

  anabelleLastDeltaArmAt =
    now;
}

  // ==========================================================

  const rdiNowForCommand =
    Number(sim.output?.rdi ?? 1);

  const economyStateForCommand =
    typeof getEconomyState === "function"
      ? getEconomyState()
      : null;

  const healingHighForCommand =
    Number(economyStateForCommand?.healing_intensity ?? 0) >= 0.70;

  const collaborationHighForCommand =
    Number(economyStateForCommand?.collaboration_blend ?? 0) >= 0.85;

  const careAlreadyHighForCommand =
    healingHighForCommand === true &&
    collaborationHighForCommand === true;

  const minimalGovernanceShouldDominate =
    (
      rdiNowForCommand < 0.25 &&
      careAlreadyHighForCommand === true
    ) ||
    (
      rdiNowForCommand < 0.23
    ) ||
    sim.taperModeActive === true;

  const taperShouldDominate =
    minimalGovernanceShouldDominate;

    if (
    minimalGovernanceShouldDominate === true
  ) {
    sim.taperModeActive =
      true;

    sim.governorStatus =
      "🌿 minimizing intervention";

    if (
      type === "set_care_pressure" &&
      Number(value) > 0
    ) {
      value =
        -0.90;
    }
  }

  if (
    minimalGovernanceShouldDominate === true
  ) {
    sim.taperModeActive =
      true;

    sim.governorStatus =
      "🌿 minimizing intervention";

    if (
      type === "set_care_pressure" &&
      Number(value) > 0
    ) {
      value =
        -0.90;

      console.log(
        "🌿 [ANABELLE MINIMAL GOVERNANCE] Converting care pressure to stronger taper:",
        value
      );
    }

    if (
      type === "set_delta_active" &&
      value === true
    ) {
      console.log(
        "🌿 [ANABELLE MINIMAL GOVERNANCE] Blocking Δ³ re-arm while coherence is stable."
      );

      return false;
    }

    if (
      type === "add_fear" ||
      type === "heal_poorest"
    ) {
      console.log(
        "🌿 [ANABELLE MINIMAL GOVERNANCE] Blocking unnecessary intervention:",
        type
      );

      return false;
    }
  }

  if (
    taperShouldDominate === true &&
    (
      (
  type === "set_delta_active" &&
  value === true
) ||
      type === "add_fear" ||
      type === "heal_poorest" ||
      (
        type === "set_care_pressure" &&
        Number(value) > 0
      )
    )
  ) {
    console.log(
      "🌿 [ANABELLE TAPER GUARD] Blocking escalation command:",
      type,
      value,
      "RDI:",
      rdiNowForCommand.toFixed(3)
    );

    if (type === "set_care_pressure") {
      value =
        -0.75;

      console.log(
        "🌿 [ANABELLE TAPER GUARD] Converting care pressure to taper:",
        value
      );
    } else {
      return false;
    }
  }

// ==========================================================
  // GOVERNANCE MODE GUARD v1
  // ----------------------------------------------------------
  // SAFE = Anabelle may think/recommend, but cannot send commands.
  // LIVE = Anabelle may send runtime commands to the economy sim.
  // ==========================================================

  if (sim.governanceMode !== "live") {
    console.log(
      `🛡️ [ANABELLE SAFE MODE] Command blocked: ${type} = ${value}`
    );

    sim.lastEconomyCommandType =
      "blocked_safe_mode";

    sim.lastInterventionOutcome =
      "safe_mode_recommendation_only";

    return false;
  }

  const command = {
    id: `anabelle-${Date.now()}-${Math.random()}`,
    type: type,
    timestamp: Date.now(),
    ...options
  };
  
  // Format command for economy simulator
  if (type === "add_fear") {
    command.amount = value;
  } else if (type === "set_redistribution_nudge") {
    command.value = value;
  } else if (type === "nudge_legitimacy") {
    command.amount = value;
  } else if (type === "set_delta_active") {
    command.value = value;
  } else if (type === "heal_poorest") {
    command.count = value;
  } else if (type === "set_care_pressure") {
    command.value = value;

    sim.lastCarePressureCommand =
      value;
  }
  
  try {
    // Clear any pending command first to ensure ours is processed
    localStorage.setItem("grassroots_economy_command", JSON.stringify(command));
    sim.lastAnabelleCommandTime = Date.now();
    sim.watchdogOverridden = true;
    setTimeout(() => { sim.watchdogOverridden = false; }, 3500);
    
    console.log(`🤖 [ANABELLE] Sending: ${type} = ${value}`);
    
    // For delta toggle, also try direct bridge if available
    if (type === "set_delta_active" && typeof window.toggleDelta === 'function') {
      console.log(`🤖 [ANABELLE] Also calling window.toggleDelta(${value}) directly`);
      if (value === true && window.deltaActive === false) {
        window.toggleDelta();
      } else if (value === false && window.deltaActive === true) {
        window.toggleDelta();
      }
    }
    
    return true;
  } catch (err) {
    console.warn("[Anabelle] Failed to send command:", err);
    return false;
  }
}

// ============================================================
// CHECKPOINT: CLEAN SOURCE FIELD INTEGRATION v1
// ------------------------------------------------------------
// Reads clean survivability-layer values from /resonance_test:
// - civilization_support
// - average_survivability
// - cooperation_gravity
// - extraction_gravity
//
// These values now influence recoverability components:
// - survivability lowers disorder and phase lag
// - cooperation lowers fragmentation
// - extraction raises harm pressure
// - civilization support raises capacity offset
//
// This does NOT directly mutate the source sim.
// It only teaches the recoverability dashboard how to interpret
// the clean source field.
// ============================================================

function applyEconomyStateToRecoverability(econ) {
  if (!econ) return;

  const poverty = clamp01(econ.poverty_rate ?? 0);
  const fear = clamp01(econ.fear_level ?? 0);
  const legitimacy = clamp01(econ.legitimacy ?? 0);
  const stability = clamp01(econ.stability_avg ?? 0);

  // Clean Civilization Field / Survivability Layer v1
  const civilizationSupport =
    clamp01(econ.civilization_support ?? econ.viability_pressure ?? 0.5);

  const averageSurvivability =
    clamp01(econ.average_survivability ?? 0.5);

  const cooperationGravity =
    clamp01(econ.cooperation_gravity ?? civilizationSupport);

  const extractionGravity =
    clamp01(econ.extraction_gravity ?? (1 - civilizationSupport));
  
  // Track if delta is active in the economy
  if (econ.delta_active !== undefined) {
    if (sim.lastDeltaState !== econ.delta_active) {
      console.log(`📡 [ECON] Δ³ state changed to: ${econ.delta_active ? "ACTIVE" : "INACTIVE"}`);
      sim.lastDeltaState = econ.delta_active;
    }
  }

  const harmStructures = Math.max(0, econ.harm_structures ?? 0);
  const careStructures = Math.max(0, econ.care_structures ?? 0);
  const totalStructures = Math.max(1, harmStructures + careStructures);
  const harmPressure = harmStructures / totalStructures;

  sim.output.components.disorder = clamp01(
    0.08 +
    (poverty * 0.42) +
    (fear * 0.28) +
    ((1 - stability) * 0.22) -
    (averageSurvivability * 0.10)
  );

  sim.output.components.fragmentation = clamp01(
    0.06 +
    (fear * 0.30) +
    ((1 - legitimacy) * 0.30) +
    (poverty * 0.18) -
    (cooperationGravity * 0.08)
  );

  sim.output.components.harm_pressure = clamp01(
    0.04 +
    (harmPressure * 0.72) +
    (fear * 0.18) +
    (extractionGravity * 0.10)
  );

  sim.output.components.phase_lag = clamp01(
    0.06 +
    (fear * 0.48) +
    ((1 - stability) * 0.30) -
    (averageSurvivability * 0.08)
  );

  sim.output.components.capacity_offset = clamp01(
    0.22 +
    (stability * 0.30) +
    (legitimacy * 0.24) +
    ((1 - poverty) * 0.10) +
    (civilizationSupport * 0.12) +
    (averageSurvivability * 0.10)
  );

  if (fear > 0.55 || poverty > 0.35 || harmPressure > 0.60) {
    sim.output.economyUrgency = "CRITICAL";
  } else if (fear > 0.30 || poverty > 0.18 || harmPressure > 0.40) {
    sim.output.economyUrgency = "MONITOR";
  } else {
    sim.output.economyUrgency = "STABLE";
  }

  sim.fieldRemembers = !!econ.field_remembers;
  sim.lastEconomyPovertyRate = poverty;
  sim.lastEconomyFearLevel = fear;
  sim.currentCivilizationRegime =
  econ.civilization_regime || "initializing";

// ==========================================================
  // ANABELLE GOVERNANCE FIELD STATE v1
  // ----------------------------------------------------------
  // Stores the clean economy-governance facts exported by
  // sketch_test.js so Anabelle can reason from field state,
  // not just RDI math.
  // ==========================================================

  sim.governanceFieldState = {
    lowerBucketShare:
      clamp01(econ.lower_bucket_share ?? econ.lower_population ?? poverty),

    middleBucketShare:
      clamp01(econ.middle_bucket_share ?? econ.middle_population ?? 0),

    upperBucketShare:
      clamp01(econ.upper_bucket_share ?? econ.upper_population ?? 0),

    eliteShare:
      clamp01(econ.elite_share ?? econ.elite_population ?? 0),

    governanceSpeed:
      Number(econ.governance_speed ?? 1),

    simSpeed:
      Number(econ.sim_speed_multiplier ?? 1),

    alohaSaturation:
      clamp01(econ.aloha_saturation ?? 0),

    culturalResilience:
      clamp01(econ.cultural_resilience ?? 0),

    governorInterventionNeed:
      clamp01(econ.governor_intervention_need ?? 1),

    recoverabilityStatus:
      econ.recoverability_status || "stable",

    fieldRemembers:
      !!econ.field_remembers,

    careMarinationTime:
      Number(econ.care_marination_time ?? 0),

    wealthShape:
      Array.isArray(econ.wealth_shape)
        ? econ.wealth_shape
        : [],

    targetWealthShape:
      Array.isArray(econ.target_wealth_shape)
        ? econ.target_wealth_shape
        : [],

    wealthShapeDeviation:
      Number(econ.wealth_shape_deviation ?? 0),

    recentUpwardTransitions:
      Number(
        econ.recent_upward_transitions ??
        econ.recent_upward_class_transitions ??
        0
      ),

    recentDownwardTransitions:
      Number(
        econ.recent_downward_transitions ??
        econ.recent_downward_class_transitions ??
        0
      )
  };

  window.anabelleGovernanceFieldState =
    sim.governanceFieldState;

  sim.currentCivilizationRegime =
  econ.civilization_regime || "initializing";

  // ==========================================================
  // ANABELLE GOVERNANCE FIELD STATE v1

}

// ============================================================
// p5 lifecycle
// ============================================================

function setup() {
  const holder = document.getElementById("sim-holder");
  const w = holder ? holder.clientWidth : window.innerWidth;
  const h = holder ? Math.min(holder.clientHeight || 520, 520) : 520;

  const cnv = createCanvas(w, h);
  cnv.parent("sim-holder");

  wireButtons();

  let initialEconomyState = null;
  if (typeof getEconomyState === "function") {
    initialEconomyState = getEconomyState();
  } else if (typeof pollEconomyState === "function") {
    const polled = pollEconomyState();
    if (polled) initialEconomyState = polled;
  }

  if (initialEconomyState) {
    applyEconomyStateToRecoverability(initialEconomyState);
  } else {
    sim.output.components.disorder = 0.38;
    sim.output.components.fragmentation = 0.41;
    sim.output.components.harm_pressure = 0.33;
    sim.output.components.phase_lag = 0.19;
    sim.output.components.capacity_offset = 0.41;
    sim.lastEconomyPovertyRate = 0.50;
    sim.lastEconomyFearLevel = 0.35;
  }

  recomputeOutput();
  pushTrailPoint();
  updateHUD();

  consciousEvaluateGovernor();
  maybeIntervene();
}

function windowResized() {
  const holder = document.getElementById("sim-holder");
  if (!holder) return;
  const w = holder.clientWidth;
  const h = Math.min(holder.clientHeight || 520, 520);
  resizeCanvas(w, h);
}

// ============================================================
// Buttons / Controls
// ============================================================

function wireButtons() {
  const btnShock = document.getElementById("btnShock");
  const btnGovernor = document.getElementById("btnGovernor");
  const btnGovernanceMode =
    document.getElementById("btnGovernanceMode");
  const btnPulseFear = document.getElementById("btnPulseFear");
  const btnNudgeLegitimacy = document.getElementById("btnNudgeLegitimacy");
  const btnDelta = document.getElementById("btnDelta");
  const btnRedistribute = document.getElementById("btnRedistribute");
  const btnExplain = document.getElementById("btnExplain");
  const sliderStrength = document.getElementById("interventionStrength");

  if (btnShock) {
    btnShock.addEventListener("click", () => {
      injectShock(0.18);
    });
  }

  if (btnGovernor) {
    btnGovernor.addEventListener("click", () => {
      sim.governorOn = !sim.governorOn;
      btnGovernor.textContent = sim.governorOn ? "Anabelle ON" : "Anabelle OFF";
    });
  }

  if (btnPulseFear) {
    btnPulseFear.addEventListener("click", () => {
      anabelleSendCommand("add_fear", 0.08);
    });
  }

  if (btnNudgeLegitimacy) {
    btnNudgeLegitimacy.addEventListener("click", () => {
      anabelleSendCommand("nudge_legitimacy", 0.05);
    });
  }

  if (btnDelta) {
    btnDelta.addEventListener("click", () => {
      anabelleSendCommand("set_delta_active", true);
    });
  }

  if (btnRedistribute) {
    btnRedistribute.addEventListener("click", () => {
      const strength = clamp01(Number(sliderStrength?.value ?? 0.05));
      anabelleSendCommand("set_redistribution_nudge", strength);
    });
  }
  
  if (btnExplain) {
    btnExplain.addEventListener("click", () => {
      const explanation = sim.anabelle.explain();
      console.log("🧠 ANABELLE'S EXPLANATION:", explanation);
      alert(JSON.stringify(explanation, null, 2));
    });
  }
}

if (btnGovernanceMode) {
    const updateGovernanceModeButton = () => {
      const isLive =
        sim.governanceMode === "live";

      btnGovernanceMode.textContent =
        isLive ? "LIVE MODE" : "SAFE MODE";

      btnGovernanceMode.classList.toggle(
        "live-mode",
        isLive
      );

      btnGovernanceMode.classList.toggle(
        "safe-mode",
        !isLive
      );
    };

    updateGovernanceModeButton();

    btnGovernanceMode.addEventListener("click", () => {
      if (sim.governanceMode === "live") {
        setAnabelleSafeMode();
      } else {
        setAnabelleLiveMode();
      }

      updateGovernanceModeButton();
    });
  }

function injectShock(amount = 0.18) {
  sim.output.components.disorder = clamp01(sim.output.components.disorder + amount * 0.65);
  sim.output.components.fragmentation = clamp01(sim.output.components.fragmentation + amount * 0.55);
  sim.output.components.harm_pressure = clamp01(sim.output.components.harm_pressure + amount * 0.38);
  sim.output.components.phase_lag = clamp01(sim.output.components.phase_lag + amount * 0.42);
  sim.output.components.capacity_offset = clamp01(sim.output.components.capacity_offset - amount * 0.36);

  sim.shockPulse = 1;
  sim.lastShockTime = sim.time;

  sim.collapseHistory.push({
    t: sim.time,
    rdi: sim.output.rdi,
    severity: amount
  });

  while (sim.collapseHistory.length > 18) {
    sim.collapseHistory.shift();
  }
}

// ============================================================
// CONSCIOUS GOVERNOR LOGIC
// ============================================================

function consciousEvaluateGovernor() {
  const rdi = sim.output.rdi;
  const poverty = clamp01(sim.lastEconomyPovertyRate ?? 0.50);
  const fear = clamp01(sim.lastEconomyFearLevel ?? 0);
  const momentum = sim.output.momentum;

  let should_intervene = false;
  let strategy = "none";
  let strength = 0;

  if (!sim.governorOn) {
    sim.governorStatus = "disabled";
    sim.anabelle.currentReasoning = "I am disabled. Cannot intervene.";
    sim.output.governor = { should_intervene: false, strategy: "none", strength: 0 };
    return;
  }

  const choice = sim.anabelle.chooseStrategy(rdi, poverty, fear, momentum);
  strategy = choice.strategy;
  sim.anabelle.currentReasoning = choice.reasoning;
  sim.anabelle.currentConfidence = choice.confidence;
  
  should_intervene = (strategy !== "none" && strategy !== "observe");
  
  if (should_intervene) {
    strength = sim.anabelle.calculateStrength(strategy, rdi, poverty);
    sim.governorStatus = strategy === "full_aggressive_recovery" 
      ? "🔥 FULL AGGRESSIVE RECOVERY 🔥" 
      : (strategy === "soft_support" ? "monitoring" : strategy);
  } else {
    sim.governorStatus =
  sim.fieldRemembers === true ||
  (
    JSON.parse(localStorage.getItem("grassroots_economy_state") || "{}")
      .field_remembers === true
  )
    ? "🌿 THE FIELD REMEMBERS"
    : "idle (observing)";
  }

  sim.output.governor.should_intervene = should_intervene;
  sim.output.governor.strategy = strategy;
  sim.output.governor.strength = Number(strength.toFixed(3));
}

function maybeIntervene() {
  // ==========================================================
  // HARD OVERRIDE: DEEP COHERENCE TAPER
  // ----------------------------------------------------------
  // This runs before normal intervention strategy.
  // If the field is already deep in the coherence basin,
  // Anabelle must stop re-arming Δ³ and begin tapering.
  // ==========================================================

  const economyStateForTaper =
    typeof getEconomyState === "function"
      ? getEconomyState()
      : null;

  const healingPinnedHigh =
    Number(economyStateForTaper?.healing_intensity ?? 0) >= 0.95;

  const collaborationPinnedHigh =
    Number(economyStateForTaper?.collaboration_blend ?? 0) >= 0.95;

  const deltaOrCarePinned =
    sim.lastDeltaState === true ||
    (
      healingPinnedHigh === true &&
      collaborationPinnedHigh === true
    );

  if (
    sim.output.rdi < 0.22 &&
    deltaOrCarePinned === true
  ) {

    const now =
      Date.now();

    const timeSinceLastCommand =
      now - sim.anabelle.lastCommandTime;

    if (timeSinceLastCommand >= 1200) {
      console.log(
        "🌿 [ANABELLE HARD OVERRIDE] Deep coherence reached — forcing Δ³ taper"
      );

      anabelleSendCommand("set_delta_active", false);
      setTimeout(() => {
  anabelleSendGovernanceTargets(
    0.18,
    0.48,
    "minimal_governance"
  );
}, 50);

      sim.taperLockUntil =
        Date.now() + 12000;

      sim.anabelle.recordCommandSent(
        "taper_recovery",
        0.01
      );

      sim.governorStatus =
        "🌿 tapering intervention";

      sim.output.governor.should_intervene =
        true;

      sim.output.governor.strategy =
        "taper_recovery";

      sim.output.governor.strength =
        0.01;

      return;
    }
  }

  if (!sim.output.governor.should_intervene) return;

  const type = sim.output.governor.strategy;
  const strength = sim.output.governor.strength;
  
  if (!sim.anabelle.shouldSendCommand(type, strength)) {
    return;
  }
  
  const rdiBefore = sim.output.rdi;
  const nowTime = sim.time;

  sim.anabelle.recordCommandSent(type, strength);

  Object.keys(sim.levers).forEach(k => {
    const lever = sim.levers[k];
    if (lever.lastSetTime === undefined) lever.lastSetTime = 0;
    if (nowTime - lever.lastSetTime > 0.45) {
      lever.active = false;
      lever.strength = 0;
    }
  });

  if (type === "full_aggressive_recovery") {
    // STRONGER actions for full aggressive mode
    const fearAmount = Math.min(0.15, 0.08 + strength * 0.10);
    const redistributionAmount = Math.min(0.12, 0.05 + strength * 0.10);
    const healCount = Math.floor(20 + strength * 30);
    const legitimacyAmount = Math.min(0.08, 0.04 + strength * 0.06);

    const economyStateForAggressive =
    typeof getEconomyState === "function"
      ? getEconomyState()
      : null;

  const rdiForAggressive =
    Number(sim.output?.rdi ?? 1);

  const healingForAggressive =
    Number(economyStateForAggressive?.healing_intensity ?? 0);

  const collaborationForAggressive =
    Number(economyStateForAggressive?.collaboration_blend ?? 0);

  const careHighForAggressive =
    healingForAggressive >= 0.65 &&
    collaborationForAggressive >= 0.85;

  if (
    rdiForAggressive < 0.25 &&
    careHighForAggressive === true
  ) {
    console.log(
      "🌿 [ANABELLE MINIMAL GOVERNANCE] FULL AGGRESSIVE suppressed:",
      "RDI:",
      rdiForAggressive.toFixed(3),
      "healing:",
      healingForAggressive.toFixed(3),
      "collaboration:",
      collaborationForAggressive.toFixed(3)
    );

    anabelleSendCommand("set_delta_active", false);
    setTimeout(() => {
  anabelleSendGovernanceTargets(
    0.18,
    0.48,
    "minimal_governance"
  );
}, 50);

    return;
  }
    
    console.log(`🤖 [ANABELLE] FULL AGGRESSIVE:
      - Δ³: ON
      - Fear: +${(fearAmount*100).toFixed(0)}%
      - Redistribution: ${(redistributionAmount*100).toFixed(0)}%
      - Legitimacy: +${(legitimacyAmount*100).toFixed(0)}%
      - Heal: ${healCount} beings`);
    
    // Turn on Δ³ governance mode, then apply graded care pressure.
    anabelleSendCommand("set_delta_active", true);
    setTimeout(() => {
  anabelleSendGovernanceTargets(
    0.92,
    0.96,
    "emergency_recovery"
  );
}, 50);
    
    // Then apply other measures
    setTimeout(() => anabelleSendCommand("add_fear", fearAmount), 100);
    setTimeout(() => anabelleSendCommand("set_redistribution_nudge", redistributionAmount), 200);
    setTimeout(() => anabelleSendCommand("nudge_legitimacy", legitimacyAmount), 300);
    setTimeout(() => anabelleSendCommand("heal_poorest", healCount), 400);

    sim.levers.delta3.active = true;
    sim.levers.delta3.strength = strength;
    sim.levers.delta3.lastSetTime = nowTime;
    sim.levers.fearShock.active = true;
    sim.levers.fearShock.strength = strength;
    sim.levers.fearShock.lastSetTime = nowTime;
    sim.levers.redistribution.active = true;
    sim.levers.redistribution.strength = strength;
    sim.levers.redistribution.lastSetTime = nowTime;
    sim.levers.legitimacy.active = true;
    sim.levers.legitimacy.strength = strength;
    sim.levers.legitimacy.lastSetTime = nowTime;
    sim.levers.healPoorest.active = true;
    sim.levers.healPoorest.strength = strength;
    sim.levers.healPoorest.lastSetTime = nowTime;

    } else if (type === "taper_recovery") {
    console.log(
      "🌿 [ANABELLE] Coherence reached — tapering Δ³/healing/collaboration"
    );

    anabelleSendCommand("set_delta_active", false);
    setTimeout(() => {
  anabelleSendGovernanceTargets(
    0.18,
    0.48,
    "minimal_governance"
  );
}, 50);

    sim.levers.delta3.active =
      false;

    sim.levers.delta3.strength =
      0;

    sim.levers.delta3.lastSetTime =
      nowTime;

    sim.levers.healPoorest.active =
      false;

    sim.levers.healPoorest.strength =
      0;

    sim.levers.healPoorest.lastSetTime =
      nowTime;

  } else if (type === "soft_support") {
    const legitimacyAmount = Math.min(0.06, 0.03 + strength * 0.05);
    console.log(`🤖 [ANABELLE] Soft Support - Legitimacy: +${(legitimacyAmount*100).toFixed(0)}%`);
    
    anabelleSendCommand("nudge_legitimacy", legitimacyAmount);
    sim.levers.legitimacy.active = true;
    sim.levers.legitimacy.strength = strength;
    sim.levers.legitimacy.lastSetTime = nowTime;
    
  } else if (type === "preemptive_stabilize") {
    const redistributionAmount = Math.min(0.10, 0.04 + strength * 0.08);

    console.log(
      `🤖 [ANABELLE] Preemptive Stabilize - Redistribution: ${(redistributionAmount * 100).toFixed(0)}%`
    );

    anabelleSendCommand("set_redistribution_nudge", redistributionAmount);

    // Preemptive stabilize should begin reducing Anabelle's footprint.
    // Without this, healing/collaboration freeze wherever FULL AGGRESSIVE left them.
    const rdiForPreemptive =
      Number(sim.output?.rdi ?? 1);

    if (rdiForPreemptive > 0.26) {
  anabelleSendGovernanceTargets(
    0.68,
    0.82,
    "stabilization"
  );

  console.log(
    "🌿 [ANABELLE PREEMPTIVE] Stabilization targets:",
    rdiForPreemptive.toFixed(3)
  );
} else if (rdiForPreemptive > 0.235) {
  anabelleSendCommand("set_delta_active", false);

  anabelleSendGovernanceTargets(
    0.38,
    0.68,
    "basin_approach"
  );

  console.log(
    "🌿 [ANABELLE PREEMPTIVE] Basin approach targets:",
    rdiForPreemptive.toFixed(3)
  );
} else {
  anabelleSendCommand("set_delta_active", false);

  anabelleSendGovernanceTargets(
    0.18,
    0.48,
    "minimal_governance"
  );

  console.log(
    "🌿 [ANABELLE PREEMPTIVE] Minimal governance targets:",
    rdiForPreemptive.toFixed(3)
  );
}

    sim.levers.redistribution.active = true;
    sim.levers.redistribution.strength = strength;
    sim.levers.redistribution.lastSetTime = nowTime;

    sim.levers.delta3.active = false;
    sim.levers.delta3.strength = 0;
    sim.levers.delta3.lastSetTime = nowTime;
  }

  sim.lastGovernorIntervention = { 
    time: sim.time, 
    type, 
    strength,
    rdiBefore 
  };

  if (sim.activeRecovery.inRecovery) {
    sim.activeRecovery.interventionAccum += strength;
    sim.activeRecovery.interventionFrames += 1;
  }

  applyLocalFeedback();
  
  const rdiAfter = sim.output.rdi;
  const intervention = { type, strength };
  sim.anabelle.reflectOnOutcome(intervention, rdiBefore, rdiAfter);
}

function applyLocalFeedback() {
  if (!sim.output.governor.should_intervene) return;

  const strength = sim.output.governor.strength;
  const c = sim.output.components;

  if (sim.output.governor.strategy === "full_aggressive_recovery") {
    c.harm_pressure = clamp01(c.harm_pressure - 0.025 * strength);
    c.capacity_offset = clamp01(c.capacity_offset + 0.022 * strength);
    c.phase_lag = clamp01(c.phase_lag - 0.015 * strength);
  } else if (sim.output.governor.strategy === "soft_support") {
    c.capacity_offset = clamp01(c.capacity_offset + 0.010 * strength);
    c.phase_lag = clamp01(c.phase_lag - 0.006 * strength);
  }

  recomputeOutput();
}

// ============================================================
// Simulation core
// ============================================================

function animateScaffoldState() {
  const c = sim.output.components;

  c.disorder = clamp01(c.disorder + Math.sin(sim.time * 0.90) * 0.0015);
  c.fragmentation = clamp01(c.fragmentation + Math.cos(sim.time * 0.70) * 0.0012);
  c.harm_pressure = clamp01(c.harm_pressure + Math.sin(sim.time * 1.30) * 0.0010);
  c.phase_lag = clamp01(c.phase_lag + Math.cos(sim.time * 1.10) * 0.0008);

  const marinationDepth =
  clamp01(
    Number(sim.governanceFieldState?.careMarinationTime || 0) / 900
  );

const saturationDepth =
  clamp01(
    (
      (
        (sim.governanceFieldState?.alohaSaturation || 0) * 0.40
      ) +
      (
        (sim.governanceFieldState?.culturalResilience || 0) * 0.40
      ) +
      (
        marinationDepth * 0.20
      ) +
      (
        sim.fieldRemembers ? 0.10 : 0
      )
    ) * 1.75
  );

// Saturation means the field has absorbed care over time.
// It should lower the dashboard's baseline disorder/harm,
// not merely lower the RDI floor.
const disorderTarget =
  lerpSafe(0.16, 0.075, saturationDepth);

const fragmentationTarget =
  lerpSafe(0.20, 0.085, saturationDepth);

const harmPressureTarget =
  lerpSafe(0.14, 0.040, saturationDepth);

const phaseLagTarget =
  lerpSafe(
    0.10,
    COHERENCE_PHASE_LAG_CENTER,
    saturationDepth
  );

const capacityTarget =
  lerpSafe(0.60, 0.82, saturationDepth);

// Demo compression:
// Once care saturation is thick, the dashboard should visibly
// recognize coherence within demo time, especially at 10x.
c.disorder =
  lerpSafe(c.disorder, disorderTarget, 0.024);

c.fragmentation =
  lerpSafe(c.fragmentation, fragmentationTarget, 0.024);

c.harm_pressure =
  lerpSafe(c.harm_pressure, harmPressureTarget, 0.028);

c.phase_lag =
  lerpSafe(
    c.phase_lag,
    phaseLagTarget,
    0.12
  );

c.capacity_offset =
  lerpSafe(c.capacity_offset, capacityTarget, 0.028);

  recomputeOutput();
}

function recomputeOutput() {
  const c = sim.output.components;

  const povertyBurden =
  clamp01(
    Math.max(
      0,
      Number(sim.lastEconomyPovertyRate ?? 0) - 0.25
    ) / 0.25
  );

const rawRDI =
  (c.disorder * 0.25) +
  (c.fragmentation * 0.15) +
  (c.harm_pressure * 0.20) +
  (c.phase_lag * 0.15) +
  (povertyBurden * 0.12) -
  (c.capacity_offset * 0.15);

  const prevRDI = sim.output.rdi;
  const economyCareDepth =
    clamp01(
      (
        (sim.governanceFieldState?.alohaSaturation || 0) * 0.35
      ) +
      (
        (sim.governanceFieldState?.culturalResilience || 0) * 0.35
      ) +
      (
        sim.lastDeltaState ? 0.15 : 0
      ) +
      (
        sim.fieldRemembers ? 0.15 : 0
      )
    );

  const dynamicRdiFloor =
  lerpSafe(
    0.22,
    0.08,
    economyCareDepth
  );

const preSaturationRDI =
  rawRDI + dynamicRdiFloor;

// ==========================================================
// SATURATION BASIN PULL v1
// ----------------------------------------------------------
// Care/harm strength can move the field near coherence.
// Saturation — time spent in strong care marinade — should
// keep applying gentle pressure until RDI reaches the basin.
//
// The pull fades as RDI approaches 0.25 and stops below it.
// ==========================================================

const saturationBasinDepth =
  clamp01(
    (
      ((sim.governanceFieldState?.alohaSaturation || 0) * 0.55) +
      ((sim.governanceFieldState?.culturalResilience || 0) * 0.15) +
      (
        clamp01(
          Number(sim.governanceFieldState?.careMarinationTime || 0) / 360
        ) * 0.30
      )
    ) * 1.85
  );

const saturationBasinPull =
  saturationBasinDepth *
  Math.max(
    0,
    preSaturationRDI - COHERENCE_RDI_CENTER
  ) *
  0.95;

sim.output.rdi =
  clamp01(
    preSaturationRDI - saturationBasinPull
  );

  const delta = sim.output.rdi - prevRDI;
  sim.output.momentum = -delta * 6.0;
  // ==========================================================
// PHASE LAG BASIN PULL v1
// ----------------------------------------------------------
// RDI can reach coherence while phase lag still hugs the
// basin circumference. Saturation should also pull the field
// marker horizontally toward the basin's visual center.
// ==========================================================

const phaseLagBasinDepth =
  clamp01(
    (
      ((sim.governanceFieldState?.alohaSaturation || 0) * 0.55) +
      ((sim.governanceFieldState?.culturalResilience || 0) * 0.15) +
      (
        clamp01(
          Number(sim.governanceFieldState?.careMarinationTime || 0) / 360
        ) * 0.30
      )
    ) * 1.85
  );

const phaseLagBasinPull =
  phaseLagBasinDepth *
  Math.max(
    0,
    c.phase_lag - COHERENCE_PHASE_LAG_CENTER
  ) *
  0.85;

c.phase_lag =
  clamp01(
    c.phase_lag - phaseLagBasinPull
  );

sim.output.phase_lag =
  c.phase_lag;

  const collapseCount = sim.collapseHistory.length;
  const recoveryQualities = sim.recoveryHistory
    .map(r => (r.quality ? r.quality.overall : null))
    .filter(v => v !== null);

  const avgRecoveryQuality =
    recoveryQualities.length > 0
      ? recoveryQualities.reduce((sum, v) => sum + v, 0) / recoveryQualities.length
      : 0;

  sim.output.memory.resilience = clamp01(
    avgRecoveryQuality * 0.75 + Math.max(0, 0.55 - sim.output.rdi) * 0.25
  );

  sim.output.memory.fragility = clamp01(
    collapseCount * 0.16 + Math.max(0, sim.output.rdi - 0.45) * 1.1
  );

  sim.output.memory.adaptation_efficiency = clamp01(
    0.50 + avgRecoveryQuality * 0.35 - collapseCount * 0.10 -
    Math.max(0, sim.output.rdi - sim.adaptiveThresholds.warning) * 0.35
  );

  const resilienceBias = sim.output.memory.resilience;
  const fragilityBias = sim.output.memory.fragility;

  sim.adaptiveThresholds.stable = clamp01(0.20 + resilienceBias * 0.05 - fragilityBias * 0.06);
  sim.adaptiveThresholds.warning = clamp01(0.40 + resilienceBias * 0.07 - fragilityBias * 0.08);
  sim.adaptiveThresholds.critical = clamp01(0.60 + resilienceBias * 0.10 - fragilityBias * 0.12);

  if (sim.output.rdi < sim.adaptiveThresholds.stable) {
    sim.output.recovery_probability = 0.95;
    sim.output.expected_recovery_cycles = 2.0;
    sim.output.simUrgency = "STABLE";
  } else if (sim.output.rdi < sim.adaptiveThresholds.warning) {
    sim.output.recovery_probability = 0.78;
    sim.output.expected_recovery_cycles = 5.0;
    sim.output.simUrgency = "MONITOR";
  } else if (sim.output.rdi < sim.adaptiveThresholds.critical) {
    sim.output.recovery_probability = 0.52;
    sim.output.expected_recovery_cycles = 10.0;
    sim.output.simUrgency = "WARNING";
  } else {
    sim.output.recovery_probability = 0.24;
    sim.output.expected_recovery_cycles = 18.0;
    sim.output.simUrgency = "CRITICAL";
  }

  if (sim.output.momentum > 0.03) {
    sim.output.recovery_probability = clamp01(sim.output.recovery_probability + 0.10);
    sim.output.expected_recovery_cycles *= 0.90;
  } else if (sim.output.momentum < -0.03) {
    sim.output.recovery_probability = clamp01(sim.output.recovery_probability - 0.10);
    sim.output.expected_recovery_cycles *= 1.15;
  }

  sim.output.intervention_needed =
    sim.output.simUrgency === "WARNING" || sim.output.simUrgency === "CRITICAL";

  if (sim.lastShockTime >= 0 && sim.output.simUrgency === "STABLE" && sim.lastStableTime <= sim.lastShockTime) {
    sim.lastStableTime = sim.time;
    sim.activeRecovery.inRecovery = false;
  }

  if (!sim._lagHistory) sim._lagHistory = [];
  sim._lagHistory.push(sim.output.phase_lag);
  if (sim._lagHistory.length > 6) sim._lagHistory.shift();

  let lagTrend = 0;
  if (sim._lagHistory.length >= 3) {
    lagTrend = sim._lagHistory[sim._lagHistory.length - 1] - sim._lagHistory[0];
  }

  const baseChange =
    sim.output.phase_lag > 0.55
      ? (sim.output.phase_lag - 0.55) * 0.25 + 0.03
      : sim.output.phase_lag > 0.40
      ? (sim.output.phase_lag - 0.40) * 0.14
      : (sim.output.phase_lag - 0.40) * 0.06;

  sim.output.forecast.predicted_rdi_change = baseChange + lagTrend * 0.6;
  sim.output.forecast.predicted_rdi = clamp01(sim.output.rdi + sim.output.forecast.predicted_rdi_change);
  sim.output.forecast.confidence = clamp01(0.35 + sim.output.phase_lag * 0.5 + Math.abs(lagTrend) * 0.8);
}

function getRecentRecoveryQualityAverage(count = 4) {
  const recent = sim.recoveryHistory
    .filter(r => r.quality && typeof r.quality.overall === "number")
    .slice(-count);
  if (recent.length === 0) return null;
  const sum = recent.reduce((acc, r) => acc + r.quality.overall, 0);
  return sum / recent.length;
}

// ============================================================
// Trail
// ============================================================

function pushTrailPoint() {
  sim.trail.push({
    x: sim.output.phase_lag,
    y: sim.output.rdi
  });
  if (sim.trail.length > TRAIL_LIMIT) sim.trail.shift();
}

// ============================================================
// Plot Helper
// ============================================================

function getPlotBox() {
  const canvasW = width;
  const canvasH = height;
  const plotX = 60;
  const plotY = 60;
  const plotW = canvasW - 120;
  const plotH = canvasH - 140;
  return { canvasH, plotX, plotY, plotW, plotH };
}

// ============================================================
// Draw
// ============================================================

function draw() {
  background(8, 12, 18);

  sim.time += deltaTime / 1000;
  sim.shockPulse *= SHOCK_PULSE_DECAY;

  let economyState = null;
  if (typeof pollEconomyState === "function") {
    economyState = pollEconomyState();
  } else if (typeof getEconomyState === "function") {
    economyState = getEconomyState();
  }

  if (economyState) {
    applyEconomyStateToRecoverability(economyState);
  } else {
    sim.lastEconomyPovertyRate = 0.50;
    sim.lastEconomyFearLevel = 0.35;
  }

  recomputeOutput();
  applyAnabellePhaseTargets();
  consciousEvaluateGovernor();
  maybeIntervene();
  animateScaffoldState();

  // ==========================================================
// POST-ANIMATION COHERENCE HANDOFF GUARD v1
// ----------------------------------------------------------
// animateScaffoldState() can pull RDI below true coherence
// after the normal target phase has already been sent.
// This guard makes sure Anabelle actually lets go once the
// final displayed/active RDI reaches coherence.
// ==========================================================

if (
  Number(sim.output?.rdi ?? 1) <= COHERENCE_RDI_THRESHOLD &&
  Number(sim.lastEconomyFearLevel ?? 0) <= 0.18 &&
  window.anabelleGovernorPhase !== "watchful_maintenance"
) {
  applyAnabellePhaseTargets();
}
  pushTrailPoint();
  
  drawPhaseSpace();
  drawTrajectory();
  drawCurrentPoint();
  drawOverlayLabels();
  drawLeversPanel();
  drawAnabelleThoughts();

  updateHUD();
}

function drawPhaseSpace() {
  const { canvasH, plotX, plotY, plotW, plotH } = getPlotBox();

  noStroke();
  fill(80, 255, 160, 70);
  ellipse(plotX + plotW * 0.18, plotY + plotH * 0.82, plotW * 0.35, plotH * 0.28);
  fill(255, 80, 80, 70);
  ellipse(plotX + plotW * 0.82, plotY + plotH * 0.18, plotW * 0.34, plotH * 0.28);

  const goalY = map(ANABELLE_GOAL.targetRDI, 0, 1, plotY + plotH, plotY);
  stroke(80, 255, 160, 100);
  strokeWeight(1.5);
  line(plotX, goalY, plotX + plotW, goalY);
  fill(80, 255, 160, 180);
  textSize(10);
  textAlign(LEFT, CENTER);
  text(`Goal: RDI < ${ANABELLE_GOAL.targetRDI}`, plotX + 10, goalY - 8);

  const criticalY = map(sim.adaptiveThresholds.critical, 0, 1, plotY + plotH, plotY);
  const warningY = map(sim.adaptiveThresholds.warning, 0, 1, plotY + plotH, plotY);

  fill(121, 223, 255, 12);
  rect(plotX, warningY - 8, plotW, 16, 10);
  fill(255, 211, 107, 18);
  rect(plotX, criticalY - 10, plotW, 20, 10);

  noFill();
  stroke(255, 255, 255, 35);
  strokeWeight(1);
  rect(plotX, plotY, plotW, plotH, 12);

  stroke(255, 255, 255, 18);
  for (let i = 1; i < 5; i++) {
    const gx = plotX + (plotW * i / 5);
    line(gx, plotY, gx, plotY + plotH);
    const gy = plotY + (plotH * i / 5);
    line(plotX, gy, plotX + plotW, gy);
  }

  noStroke();
  fill(200, 220, 245, 180);
  textSize(13);
  textAlign(CENTER, CENTER);
  text("Phase Lag (τ)", plotX + plotW / 2, canvasH - 26);
  push();
  translate(24, plotY + plotH / 2);
  rotate(-HALF_PI);
  text("RDI", 0, 0);
  pop();
}

function drawTrajectory() {
  if (sim.trail.length < 2) return;
  const { plotX, plotY, plotW, plotH } = getPlotBox();

  noFill();
  strokeWeight(6);
  beginShape();
  for (let i = 0; i < sim.trail.length; i++) {
    const p = sim.trail[i];
    const sx = map(p.x, 0, 1, plotX, plotX + plotW);
    const sy = map(p.y, 0, 1, plotY + plotH, plotY);
    const alpha = map(i, 0, sim.trail.length - 1, 20, 100);
    stroke(140, 200, 255, alpha);
    vertex(sx, sy);
  }
  endShape();

  noFill();
  stroke(121, 223, 255, 170);
  strokeWeight(2);
  beginShape();
  for (const p of sim.trail) {
    const sx = map(p.x, 0, 1, plotX, plotX + plotW);
    const sy = map(p.y, 0, 1, plotY + plotH, plotY);
    vertex(sx, sy);
  }
  endShape();
}

function drawCurrentPoint() {
  const { plotX, plotY, plotW, plotH } = getPlotBox();
  const sx = map(sim.output.phase_lag, 0, 1, plotX, plotX + plotW);
  const sy = map(sim.output.rdi, 0, 1, plotY + plotH, plotY);

  noStroke();
  fill(121, 223, 255, 30 + sim.shockPulse * 80);
  circle(sx, sy, 34 + sim.shockPulse * 18);
  fill(180, 235, 255, 90 + sim.shockPulse * 60);
  circle(sx, sy, 20 + sim.shockPulse * 8);
  fill(121, 223, 255);
  circle(sx, sy, 12);

  if (sim.output.governor.should_intervene) {
    stroke(255, 211, 107, 220);
    strokeWeight(2);
    noFill();
    circle(sx, sy, 24);
  }
  if (sim.anabelle.goal.isMet(sim.output.rdi)) {
    stroke(80, 255, 160, 150);
    strokeWeight(3);
    noFill();
    circle(sx, sy, 36);
  }
  
  // Show Δ³ state indicator
  if (sim.lastDeltaState) {
    fill(100, 255, 200, 150);
    noStroke();
    textSize(10);
    textAlign(CENTER, BOTTOM);
    text("Δ³ ACTIVE", sx, sy - 18);
  }
}

function drawOverlayLabels() {
  const { plotX, plotY, plotW, plotH } = getPlotBox();

  noStroke();
  textAlign(LEFT, CENTER);
  textSize(12);
  fill(134, 255, 177, 180);
  text("Coherence Basin", plotX + 12, plotY + plotH - 16);
  fill(255, 138, 138, 180);
  text("Divergence Region", plotX + plotW - 130, plotY + 16);

  const criticalY = map(sim.adaptiveThresholds.critical, 0, 1, plotY + plotH, plotY);
  const warningY = map(sim.adaptiveThresholds.warning, 0, 1, plotY + plotH, plotY);

  fill(121, 223, 255, 180);
  text(`Adaptive Warning (${sim.adaptiveThresholds.warning.toFixed(2)})`, plotX + 10, warningY - 16);
  fill(255, 211, 107, 200);
  text(`Adaptive Critical (${sim.adaptiveThresholds.critical.toFixed(2)})`, plotX + 10, criticalY - 16);

  textAlign(LEFT, CENTER);
  textSize(12);
  const cooldownRemaining = Math.max(0, (sim.anabelle.commandCooldownMs - (Date.now() - sim.anabelle.lastCommandTime)) / 1000);
  const deltaStatus = sim.lastDeltaState ? "🟢 Δ³ ON" : "⚫ Δ³ OFF";
  const governanceModeLabel =
    sim.governanceMode === "live"
      ? "LIVE MODE"
      : "SAFE MODE";

  const statusText = sim.governorOn 
    ? `${sim.governorStatus} | ${governanceModeLabel} | ${deltaStatus} | Care Cmd: ${Number(sim.lastCarePressureCommand || 0).toFixed(2)} | CD: ${cooldownRemaining.toFixed(0)}s`
    : `DISABLED | ${governanceModeLabel}`;
  fill(210, 225, 245, 190);
  text(`Anabelle: ${statusText}`, plotX + 10, plotY - 16);

  textAlign(RIGHT, CENTER);
  text(`RDI ${sim.output.rdi.toFixed(3)} | M ${sim.output.momentum.toFixed(3)} | τ ${sim.output.phase_lag.toFixed(3)}`,
       plotX + plotW, plotY - 16);
}

function drawAnabelleThoughts() {
  const { plotX, plotY, plotW, plotH } = getPlotBox();
  const thoughtY = plotY + plotH + 85;
  
  textAlign(LEFT, TOP);
  textSize(11);
  fill(20, 25, 35, 220);
  noStroke();
  rect(plotX, thoughtY, plotW, 55, 8);
  
  fill(121, 223, 255, 200);
  textSize(14);
  text("🧠", plotX + 8, thoughtY + 8);
  
  fill(200, 220, 245, 240);
  textSize(11);
  text(sim.anabelle.currentReasoning, plotX + 30, thoughtY + 8, plotW - 40, 45);
  
  textSize(10);
  fill(80, 255, 160, 200);
  textAlign(RIGHT, TOP);
  text(`Success: ${Math.round(sim.anabelle.selfAssessment.adaptationRate * 100)}%`, plotX + plotW - 8, thoughtY + 8);
  
  const cooldownRemaining = Math.max(0, (sim.anabelle.commandCooldownMs - (Date.now() - sim.anabelle.lastCommandTime)) / 1000);
  if (cooldownRemaining > 0) {
    fill(255, 200, 100, 200);
    text(`⏱️ Cooldown: ${cooldownRemaining.toFixed(1)}s`, plotX + plotW - 8, thoughtY + 28);
  }
  
  // Show Δ³ status in thoughts
  if (sim.lastDeltaState) {
    fill(100, 255, 200, 200);
    text(`🟢 Δ³ HEALING ACTIVE`, plotX + plotW - 8, thoughtY + 48);
  } else {
    fill(255, 150, 100, 200);
    text(`⚫ Δ³ inactive - care structures vulnerable`, plotX + plotW - 8, thoughtY + 48);
  }
}

function drawLeversPanel() {
  const { plotX, plotY, plotW, plotH } = getPlotBox();
  const panelY = plotY + plotH + 145;

  textAlign(LEFT, TOP);
  textSize(13);
  
  if (sim.output.governor.strategy === "full_aggressive_recovery") {
    fill(255, 240, 80, 255);
    text("🔥 ANABELLE'S LEVERS — FULL AGGRESSIVE RECOVERY 🔥", plotX + plotW/2 - 210, panelY);
  } else {
    fill(255, 244, 200, 220);
    text("Anabelle's Levers", plotX + plotW/2 - 85, panelY);
  }

  textSize(11);
  let y = panelY + 24;

  Object.keys(sim.levers).forEach(key => {
    const lever = sim.levers[key];
    const isActive = lever.active;
    fill(isActive ? 255 : 160, isActive ? 220 : 160, isActive ? 80 : 160, 240);
    const status = isActive ? `⚡ ACTIVE (${lever.strength.toFixed(2)})` : "○ inactive";
    text(`${lever.label}: ${status}`, plotX + 20, y);
    y += 20;
  });
  
  // Show economy's actual Δ³ state
  fill(150, 150, 200, 200);
  textSize(10);
  text(`Economy Δ³: ${sim.lastDeltaState ? "ACTIVE (healing mode)" : "INACTIVE"}`, plotX + 20, y + 10);
}

// ============================================================
// HUD
// ============================================================

function updateHUD() {
  const setText = (id, value, fallback = "--") => {
    const el = document.getElementById(id);
    if (el) el.textContent = (value !== undefined && value !== null) ? value : fallback;
  };

  setText("rdiValue", sim.output.rdi.toFixed(3));
  setText("momentumValue", sim.output.momentum.toFixed(3));
  setText("lagValue", sim.output.phase_lag.toFixed(3));
  setText("recoveryValue", sim.output.recovery_probability.toFixed(2));
  setText("cyclesValue", sim.output.expected_recovery_cycles.toFixed(1));
  setText("urgencyValue", sim.output.simUrgency || "STABLE");
  setText(
  "regimeValue",
  sim.currentCivilizationRegime || "unknown"
);
  
  const actionText = sim.output.governor.strategy === "full_aggressive_recovery" 
    ? "FULL AGGRESSIVE RECOVERY 🔥" 
    : (sim.output.governor.strategy || "none");
  setText("actionValue", actionText);
  setText("strengthValue", sim.output.governor.strength.toFixed(3));
  setText("interveneValue", sim.output.governor.should_intervene ? "true" : "false");

  setText("memoryResilienceValue", sim.output.memory.resilience.toFixed(3));
  setText("memoryFragilityValue", sim.output.memory.fragility.toFixed(3));
  setText("memoryAdaptValue", sim.output.memory.adaptation_efficiency.toFixed(3));

  setText("compDisorderText", sim.output.components.disorder.toFixed(3));
  setText("compFragmentationText", sim.output.components.fragmentation.toFixed(3));
  setText("compHarmText", sim.output.components.harm_pressure.toFixed(3));
  setText("compLagText", sim.output.components.phase_lag.toFixed(3));
  setText("compCapacityText", sim.output.components.capacity_offset.toFixed(3));

  let econ = null;
  if (typeof getEconomyState === "function") {
    econ = getEconomyState();
  }

  if (econ && (econ.poverty_rate > 0.01 || econ.fear_level > 0.01)) {
    setText("sourceFearValue", Number(econ.fear_level ?? 0).toFixed(3));
    setText("sourcePovertyValue", Number(econ.poverty_rate ?? 0).toFixed(3));
    setText("sourceLegitimacyValue", Number(econ.legitimacy ?? 0).toFixed(3));
    setText("sourceStabilityValue", Number(econ.stability_avg ?? 0).toFixed(3));
    setText("sourceHarmStructuresValue", String(econ.harm_structures ?? 0));
    setText("sourceCareStructuresValue", String(econ.care_structures ?? 0));
    setText("sourceFieldRemembersValue", String(!!econ.field_remembers));

    // Clean Civilization Field / Survivability Layer v1
    setText("sourceCivilizationSupportValue", Number(econ.civilization_support ?? 0).toFixed(3));
    setText("sourceAverageSurvivabilityValue", Number(econ.average_survivability ?? 0).toFixed(3));
    setText("sourceCooperationGravityValue", Number(econ.cooperation_gravity ?? 0).toFixed(3));
    setText("sourceExtractionGravityValue", Number(econ.extraction_gravity ?? 0).toFixed(3));
    setText("sourceHaloFieldValue", Number(econ.halo_field_effect ?? 0).toFixed(3));
    setText(
    "sourceSimSpeedValue",
    `${econ.sim_speed_multiplier || 1}x`
    );

    setText(
      "sourceCareStructuresValue",
      econ.care_structures || 0
    );

    setText(
      "sourceHarmStructuresValue",
      econ.harm_structures || 0
    );

    setText(
      "sourceNetStructureSupportValue",
      Number(econ.net_structure_support || 0).toFixed(3)
    );
    setText(
  "sourceMobilityThresholdEffectValue",
  Number(econ.mobility_threshold_effect || 0).toFixed(6)
);

setText(
  "sourceCalibrationUpThresholdValue",
  Number(econ.estimated_calibration_up_threshold || 0).toFixed(6)
);

setText(
  "sourceCalibrationDownThresholdValue",
  Number(econ.estimated_calibration_down_threshold || 0).toFixed(6)
);
    setText("sourceMobilityPressureValue", Number(econ.mobility_pressure ?? 0).toFixed(3));
    setText("sourceMobilityMomentumValue", Number(econ.mobility_momentum ?? 0).toFixed(3));
    setText("sourceWealthDriftValue", Number(econ.mobility_wealth_drift ?? 0).toFixed(4));
    setText("sourceMobilityReadinessValue", Number(econ.average_mobility_readiness ?? 0).toFixed(4));
    setText("sourceSustainedReadinessValue", Number(econ.average_sustained_mobility_readiness ?? 0).toFixed(4));
    setText("sourceRealWealthDeltaValue", Number(econ.real_wealth_delta ?? 0).toFixed(3));
    setText("sourceShadowWealthValue", Number(econ.total_mobility_wealth ?? 0).toFixed(3));
    setText("sourceShadowGapValue", Number(econ.shadow_wealth_gap ?? 0).toFixed(3));
    setText("sourceWealthSyncValue", Number(econ.wealth_sync_pressure ?? 0).toFixed(8));
    setText("sourceRealSyncEnabledValue", String(!!econ.real_wealth_sync_enabled));
    setText("sourceClassMobilityValue", String(!!econ.class_mobility_enabled));
    setText("sourceClassTestModeValue", String(!!econ.class_mobility_test_mode));
    setText("sourceClassCalibrationModeValue", String(!!econ.class_mobility_calibration_mode));
    setText("sourceClassMovesUpValue", String(econ.class_transitions_up ?? 0));
    setText("sourceClassMovesDownValue", String(econ.class_transitions_down ?? 0));
    setText("sourceRecentClassMovesValue", String(econ.recent_class_transitions ?? 0));
    setText("sourceClassMoveLimitValue", String(econ.class_mobility_rate_limit ?? 0));
    setText("sourceRateBlockedValue", econ.class_mobility_rate_blocked ? "YES" : "NO");
    setText("sourceUpwardDampingValue", Number(econ.upward_mobility_damping ?? 0).toFixed(2));
    setText("sourceDownwardDampingValue", Number(econ.downward_mobility_damping ?? 0).toFixed(2));
    setText("sourceUpwardSurvivabilityGateValue", Number(econ.upward_mobility_survivability_gate ?? 0).toFixed(2));
    setText("sourceDownwardSurvivabilityRiskValue", Number(econ.downward_mobility_survivability_risk ?? 0).toFixed(2));
    setText("sourceHealingValue", Number(econ.healing_intensity ?? 0).toFixed(3));
    setText("sourceCollaborationValue", Number(econ.collaboration_blend ?? 0).toFixed(3));

    setText("sourceDeltaActiveValue", econ.delta_active ? "ACTIVE 🟢" : "INACTIVE ⚫");
  } else {
    setText("sourceFearValue", "0.350");
    setText("sourcePovertyValue", "0.500");
    setText("sourceLegitimacyValue", "0.220");
    setText("sourceStabilityValue", "0.180");
    setText("sourceHarmStructuresValue", "18");
    setText("sourceCareStructuresValue", "4");
    setText("sourceFieldRemembersValue", "false");

    // Clean Civilization Field / Survivability Layer v1 fallback values
    setText("sourceCivilizationSupportValue", "0.000");
    setText("sourceAverageSurvivabilityValue", "0.000");
    setText("sourceCooperationGravityValue", "0.000");
    setText("sourceExtractionGravityValue", "0.000");
    setText("sourceHaloFieldValue", "0.000");
    setText("sourceMobilityPressureValue", "0.000");
    setText("sourceMobilityMomentumValue", "0.000");
    setText("sourceWealthDriftValue", "0.0000");
    setText("sourceMobilityReadinessValue", "0.0000");
    setText("sourceSustainedReadinessValue", "0.0000");
    setText("sourceRealWealthDeltaValue", "0.000");
    setText("sourceShadowWealthValue", "0.000");
    setText("sourceShadowGapValue", "0.000");
    setText("sourceWealthSyncValue", "0.00000000");
    setText("sourceRealSyncEnabledValue", "false");
    setText("sourceClassMobilityValue", "false");
    setText("sourceClassTestModeValue", "false");
    setText("sourceClassCalibrationModeValue", "false");
    setText("sourceClassMovesUpValue", "0");
    setText("sourceClassMovesDownValue", "0");
    setText("sourceRecentClassMovesValue", "0");
    setText("sourceClassMoveLimitValue", "0");
    setText("sourceRateBlockedValue", "NO");
    setText("sourceUpwardDampingValue", "0.00");
    setText("sourceDownwardDampingValue", "0.00");
    setText("sourceUpwardSurvivabilityGateValue", "0.00");
    setText("sourceDownwardSurvivabilityRiskValue", "0.00");
    setText("sourceHealingValue", "0.000");
    setText("sourceCollaborationValue", "0.000");

    setText("sourceDeltaActiveValue", "INACTIVE ⚫");
  }
  
  setText("anabelleGoal", sim.anabelle.goal.describe());
  setText("anabelleSuccessRate", `${Math.round(sim.anabelle.selfAssessment.adaptationRate * 100)}%`);
  setText("anabelleThinking", sim.anabelle.currentReasoning.substring(0, 60));
}
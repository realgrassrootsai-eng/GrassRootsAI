/**
 * recoverability_bridge.js
 * 
 * Bridges sketch_test.js (American Economy Visualizer) with recoverability.js
 * Uses localStorage as the communication channel.
 */

// ============================================================
// STATE POLLING
// ============================================================

let lastEconomyState = null;
let lastCommandId = 0;

function pollEconomyState() {
  try {
    const raw = localStorage.getItem("grassroots_economy_state");
    if (!raw) return null;
    
    const state = JSON.parse(raw);
    lastEconomyState = state;
    return state;
  } catch (err) {
    console.warn("[BRIDGE] Failed to parse economy state:", err);
    return null;
  }
}

function getEconomyState() {
  // Always poll localStorage so the governor dashboard sees live source sim changes.
  return pollEconomyState();
}

// ============================================================
// COMMAND SENDING
// ============================================================

function sendEconomyCommand(type, value, options = {}) {
  const command = {
    id: Date.now() + Math.random(),
    type: type,
    value: value,
    timestamp: Date.now(),
    ...options
  };
  
  try {
    localStorage.setItem("grassroots_economy_command", JSON.stringify(command));
    console.log("[BRIDGE] Sent command:", type, value);
    return true;
  } catch (err) {
    console.warn("[BRIDGE] Failed to send command:", err);
    return false;
  }
}

// ============================================================
// SPECIFIC COMMAND WRAPPERS
// ============================================================

const BridgeCommands = {
  setDeltaActive: (active) => sendEconomyCommand("set_delta_active", active),
  addFear: (amount) => sendEconomyCommand("add_fear", amount),
  triggerFearShock: (intensity = 0.05) => sendEconomyCommand("add_fear", intensity),
  nudgeLegitimacy: (amount) => sendEconomyCommand("nudge_legitimacy", amount),
  setRedistributionNudge: (strength) => {
    const capped = Math.min(0.12, Math.max(0, Number(strength) || 0));
    return sendEconomyCommand("set_redistribution_nudge", capped);
  },
  setCareSpawnRate: (multiplier) => sendEconomyCommand("set_care_spawn_multiplier", multiplier),
  setHarmSpawnRate: (multiplier) => sendEconomyCommand("set_harm_spawn_multiplier", multiplier),
  healPoorest: (count = 10) => sendEconomyCommand("heal_poorest", count),
  redistributeWealth: (amount) => sendEconomyCommand("redistribute", amount)
};

// ============================================================
// ECONOMY STATE ACCESSORS
// ============================================================

function getEconomyMetrics() {
  const state = getEconomyState();
  if (!state) return null;
  
  // Track previous poverty rate to calculate drift
  if (typeof window._prevPovertyRate === 'undefined') {
    window._prevPovertyRate = 0;
  }

  const metrics = {
    fear_level: state.fear_level || 0,
    legitimacy: state.legitimacy || 0,
    stability_avg: state.stability_avg || 0,
    is_coherent: state.is_coherent || false,
    field_remembers: state.field_remembers || false,
    civilization_regime: state.civilization_regime || "initializing",
    plateau_detected: state.plateau_detected || false,
    poverty_rate: state.poverty_rate || 0,
    poverty_rate_prev: window._prevPovertyRate,
    bottom50_share: state.bottom50_share || 0,
    current_poor_percent: state.current_poor_percent || 0.5,
    target_poor_percent: state.target_poor_percent || 0.5,
    fear_poverty_penalty: state.fear_poverty_penalty || 0,
    recovery_secs: state.recovery_secs || null,
    harm_structures: state.harm_structures || 0,
    care_structures: state.care_structures || 0,
    care_harm_ratio: state.care_harm_ratio || 1.0,
    governor_can_nudge: state.governor_can_nudge || false,
    governor_phase: state.governor_phase || "idle",
    redistribution_nudge: state.redistribution_nudge || 0,
    optics_score_hint: state.optics_score_hint || 0.5,
    lived_score_hint: state.lived_score_hint || 0.5,

    // Clean Civilization Field / Survivability Layer v1
    civilization_support: state.civilization_support || state.viability_pressure || 0,
    viability_pressure: state.viability_pressure || state.civilization_support || 0,
    cooperation_gravity: state.cooperation_gravity || 0,
    extraction_gravity: state.extraction_gravity || 0,
    halo_field_effect: state.halo_field_effect || 0,
    average_survivability: state.average_survivability || 0,
    average_mobility_readiness: state.average_mobility_readiness || 0,
    average_sustained_mobility_readiness:
    state.average_sustained_mobility_readiness || 0,
    real_wealth_delta: state.real_wealth_delta || 0,
    total_mobility_wealth: state.total_mobility_wealth || 0,
    average_mobility_wealth: state.average_mobility_wealth || 0,
    shadow_wealth_gap: state.shadow_wealth_gap || 0,
    wealth_sync_pressure: state.wealth_sync_pressure || 0,
    real_wealth_sync_enabled: state.real_wealth_sync_enabled || false,
    class_mobility_enabled: state.class_mobility_enabled || false,
    class_mobility_test_mode: state.class_mobility_test_mode || false,
    class_mobility_calibration_mode: state.class_mobility_calibration_mode || false,
    class_transitions_up: state.class_transitions_up || 0,
    class_transitions_down: state.class_transitions_down || 0,
    recent_class_transitions: state.recent_class_transitions || 0,
    class_mobility_rate_limit: state.class_mobility_rate_limit || 0,
    class_mobility_rate_blocked: state.class_mobility_rate_blocked || false,
    upward_mobility_damping: state.upward_mobility_damping || 0,
    downward_mobility_damping: state.downward_mobility_damping || 0,
    upward_mobility_survivability_gate:
    state.upward_mobility_survivability_gate || 0,
    downward_mobility_survivability_risk:
    state.downward_mobility_survivability_risk || 0,
    care_structures: state.care_structures || 0,
    harm_structures: state.harm_structures || 0,

    net_structure_support:
    state.net_structure_support || 0,
    mobility_threshold_effect:
  state.mobility_threshold_effect || 0,

estimated_calibration_up_threshold:
  state.estimated_calibration_up_threshold || 0,

estimated_calibration_down_threshold:
  state.estimated_calibration_down_threshold || 0,
    mobility_pressure: state.mobility_pressure || 0,
    mobility_momentum: state.mobility_momentum || 0,
    mobility_wealth_drift: state.mobility_wealth_drift || 0,
    sim_speed_multiplier: state.sim_speed_multiplier || 1,
    healing_intensity: state.healing_intensity || 0,
    collaboration_blend: state.collaboration_blend || 0
  };
  
  // Update stored previous rate for next check
  window._prevPovertyRate = state.poverty_rate || 0;

  return metrics;
}

// ============================================================
// WATCHDOG DECISION EXECUTION
// ============================================================

let lastCommandTime = 0;
const COMMAND_COOLDOWN_MS = 10000;

function executeWatchdogDecision(decision) {
  switch (decision.action) {
    case "nudge_redistribution":
      BridgeCommands.setRedistributionNudge(decision.strength || 0.01);
      break;
    case "trigger_fear_shock":
      BridgeCommands.triggerFearShock(decision.intensity || 0.05);
      break;
    case "activate_delta":
      BridgeCommands.setDeltaActive(true);
      break;
    case "deactivate_delta":
      BridgeCommands.setDeltaActive(false);
      break;
    case "nudge_legitimacy":
      BridgeCommands.nudgeLegitimacy(decision.amount || 0.02);
      break;
    case "heal_poorest":
      BridgeCommands.healPoorest(decision.count || 10);
      break;
    default:
      console.warn("[BRIDGE] Unknown action:", decision.action);
  }
}

// ============================================================
// SIMPLE WATCHDOG (RULES)
// ============================================================

function simpleWatchdog(state) {
  // DEBUG: Print state every 10 seconds (approx 10th call)
  if (Math.random() < 0.1) {
    console.log("[WATCHDOG] State:", {
      poverty: state.poverty_rate,
      stability: state.stability_avg,
      legitimacy: state.legitimacy,
      plateau: state.plateau_detected,
      nudge: state.redistribution_nudge
    });
  }
  
  // Get key metrics
  const poverty = state.poverty_rate || 0;
  const stability = state.stability_avg || 0;
  const legitimacy = state.legitimacy || 0;
  const plateau = state.plateau_detected || false;
  const nudge = state.redistribution_nudge || 0;
  
  // Calculate poverty drift (how much it changed since last check)
  const povertyPrev = state.poverty_rate_prev || poverty;
  const povertyDrift = Math.abs(poverty - povertyPrev);
  
  // RULE 1: Plateau detected AND poverty > 8%
  if (plateau && poverty > 0.08) {
    console.log("[WATCHDOG] Rule 1: plateau + high poverty - nudge redistribution");
    return { action: "nudge_redistribution", strength: 0.015 };
  }
  
  // RULE 2: Poverty stuck (not dropping) and stability calm
  if (poverty > 0.10 && povertyDrift < 0.001 && stability > 50) {
    console.log("[WATCHDOG] Rule 2: poverty stuck at", (poverty*100).toFixed(1), "% - fear shock");
    return { action: "trigger_fear_shock", intensity: 0.04 };
  }
  
  // RULE 3: Very high poverty (>15%)
  if (poverty > 0.15) {
    console.log("[WATCHDOG] Rule 3: very high poverty - strong redistribution");
    return { action: "nudge_redistribution", strength: 0.03 };
  }
  
  // RULE 4: High nudge but poverty still high (nudge ineffective)
  if (nudge > 0.05 && poverty > 0.12) {
    console.log("[WATCHDOG] Rule 4: high nudge ineffective - fear shock");
    return { action: "trigger_fear_shock", intensity: 0.04 };
  }
  
  // Default: no action
  console.log("[WATCHDOG] No rule triggered");
  return { action: null };
}   

// ============================================================
// BRIDGE LOOP
// ============================================================

let registeredWatchdog = null;
let bridgeLoopActive = false;

function registerWatchdog(watchdogFunction) {
  registeredWatchdog = watchdogFunction;
  console.log("[BRIDGE] Watchdog registered");
  
  if (!bridgeLoopActive) {
    startBridgeLoop();
  }
}

function startBridgeLoop() {
  if (bridgeLoopActive) return;
  bridgeLoopActive = true;
  
  setInterval(() => {
    const state = getEconomyMetrics();
    
    if (state && registeredWatchdog) {
      const now = Date.now();
      const canSend = (now - lastCommandTime) >= COMMAND_COOLDOWN_MS;
      
      const decision = registeredWatchdog(state);
      
      if (decision && decision.action && canSend) {
        console.log("[BRIDGE] Sending command:", decision.action);
        executeWatchdogDecision(decision);
        lastCommandTime = now;
      } else if (decision && decision.action && !canSend) {
        // Cooldown active - silent skip
      }
    }
  }, 1000);
}

// ============================================================
// AUTO-START
// ============================================================

console.log("[BRIDGE] Bridge file loaded successfully");

// registerWatchdog(simpleWatchdog);
// Disabled: Anabelle governance authority now flows through
// recoverability.js SAFE / LIVE mode.
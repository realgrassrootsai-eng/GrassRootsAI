/**
 * sketch_test.js
 * Civilization Ecology / Recoverability Sim
 *
 * Clean rebuild.
 *
 * Core ontology:
 * - Beings are actual population units.
 * - Core color = economic strata.
 * - Halo thickness = survivability / embeddedness.
 * - Civilization metabolism is hidden gravity.
 * - Healing shifts society toward broad middle viability, not universal elite status.
 */

// ==========================================================
// CHECKPOINT: ECONOMIC SIM COMPLETE BASELINE
// ----------------------------------------------------------
// This version completes the GrassRootsAI / ANΔ³BELLE
// civilization-economy demo loop:
//
// Healing + collaboration saturate the culture-field with care.
// Care saturation opens upward mobility bandwidth.
// Lower-bucket population falls into the intended demo range.
// Wealth commensuration shifts from emergency floor-raising
// toward a middle-centered 1-2-3-4-3-2-1 hill.
//
// Demo can run at 5x–10x for legibility.
// Governance should run at 1x so Anabelle perceives,
// interprets, remembers, and intervenes at civilization speed.
//
// Next major phase:
// Pivot from economic sim tuning back to Anabelle governance.
// ==========================================================

let nodes = [];
let structures = [];
let corridorLinks = [];

let isGrowing = false;
let isPaused = false;
let hasLaunched = false;

// ==========================================================
// INVISIBLE CARE / HARM STRUCTURES v1
// ----------------------------------------------------------
// Structures are hidden field anchors.
// They are NOT drawn.
// Their presence should be revealed only through:
// - being movement patterns
// - class colors
// - halo thickness
//
// Care structures support coherence and survivability.
// Harm structures distort, fragment, and extract.
// ==========================================================

const INITIAL_CARE_STRUCTURES =
  30;

const INITIAL_HARM_STRUCTURES =
  70;

const STRUCTURE_INFLUENCE_RADIUS =
  145;
  // Structure survivability influence can be broad,
// but structure movement gravity should stay local.
// Otherwise 100 structures overlap into global fog.
const STRUCTURE_GRAVITY_RADIUS =
  64;

  // ==========================================================
// STRUCTURE LIFECYCLE v1
// ----------------------------------------------------------
// Structures are civic institutions, not static rocks.
// They age, weaken, strengthen, and exert dynamic gravity.
// This restores the old Resonance Engine's living institutional time.
// ==========================================================

const STRUCTURE_MAX_LIFE =
  20000;

const STRUCTURE_BASE_DECAY =
  0.025;

const STRUCTURE_CARE_RENEWAL =
  0.060;

const STRUCTURE_HARM_STRESS_DECAY =
  0.075;

const STRUCTURE_MIN_GRAVITY =
  0.20;

const STRUCTURE_MAX_GRAVITY =
  1.35;

  function structureRand(min, max) {
  return min + (Math.random() * (max - min));
}

  let lastStructureConversionFrame =
  0;

const STRUCTURE_CONVERSION_COOLDOWN =
  240;

let frameReady = false;

let simSpeedMultiplier =
  3;

// ==========================================================
// ALOHA / CARE MEMORY SYSTEM v1
// Care is not a switch. Care is a residue.
// ==========================================================

// Global field-level care memory.
// This should rise slowly under sustained care/collaboration
// and decay very slowly under harm/fear.
let alohaSaturation = 0;

// How much the field has learned to recover without intervention.
let culturalResilience = 0;

// How much active governance is still needed.
// Future goal: as alohaSaturation rises, this falls.
let governorInterventionNeed = 1;

// Tracks whether the field has been living in care long enough
// for care to become culture, not just a momentary effect.
let careMarinationTime = 0;

// ==========================================================
// FIELD SELF-MAINTENANCE MEMORY v1
// ----------------------------------------------------------
// Tracks how long the field remains coherent after Anabelle
// reduces active intervention.
//
// This is the practical meaning of:
// "The Field Remembers."
// ==========================================================

let fieldSelfMaintenanceActive =
  false;

let fieldSelfMaintenanceStartFrame =
  0;

let fieldSelfMaintenanceDuration =
  0;

let bestFieldSelfMaintenanceDuration =
  0;

let lastFieldSelfMaintenanceDuration =
  0;

let fieldSelfMaintenanceEpisodes =
  0;

let lastFieldCoherenceFailureReason =
  "none";

let lastInterventionEndedFrame =
  0;

// Tracks recent fear pressure so we can later compare
// shock damage vs. field recoverability.
let recentFearStress = 0;

// ==========================================================
// FEAR COLLAPSE BUDGET v1
// ----------------------------------------------------------
// Fear shocks may create temporary downward class pressure,
// but collapse must be bounded.
// One shock should wound the field, not erase civilization.
// Inspired by the original sim's temporary poverty penalty.
// ==========================================================

let fearCollapseBudget =
  0;

const FEAR_COLLAPSE_BUDGET_MAX =
  90;

const FEAR_COLLAPSE_COST_PER_MOVE =
  1;

const FEAR_COLLAPSE_DECAY_BASE =
  0.12;

const FEAR_COLLAPSE_CARE_DECAY =
  0.35;

  // Keeps shock status visible long enough for the demo.
// Even if the field recovers quickly, the audience needs
// to see that a shock was absorbed.
let recoverabilityShockDisplayTimer =
  0;

const RECOVERABILITY_SHOCK_DISPLAY_FRAMES =
  180;

// ==========================================================
// STRATA NEIGHBORHOOD GRAVITY v1
// ----------------------------------------------------------
// Each economic stratum has a preferred social neighborhood.
// Beings mostly cluster with their own stratum, with bleed-through
// to adjacent strata.
// 
// Mobility becomes visible because changing class changes
// the being's neighborhood gravity.
// ==========================================================

let strataNeighborhoods = [];

let civicNeighborhoods = [];

// Neighborhood Anatomy v1:
// Seven mixed neighborhoods.
// Each neighborhood has a dominant strata,
// but contains a realistic class mixture.
// This prevents the field from becoming either:
// - pure class islands
// - one civilizational amoeba

const STRATA_NEIGHBORHOOD_PULL =
  0.00115;

const STRATA_ADJACENT_BLEED =
  0.10;

const STRATA_DISTANT_BLEED =
  0.025;

  // ==========================================================
// MOBILITY MIGRATION STYLE v1
// ----------------------------------------------------------
// When beings move class, they do not all relocate the same way.
//
// migrate:
//   being gradually moves toward the new class neighborhood
//
// in_place:
//   being keeps stronger ties to the old neighborhood
//
// bridge:
//   being settles between old and new neighborhoods,
//   becoming connective tissue between classes
// ==========================================================

const MOBILITY_MIGRATION_SPEED =
  0.006;

const MOBILITY_IN_PLACE_BLEND =
  0.28;

const MOBILITY_BRIDGE_BLEND =
  0.50;

  // ==========================================================
// INVISIBLE ECONOMIC CURRENT FIELD v1
// ----------------------------------------------------------
// Sim 3 keeps relationship edges invisible.
// These currents are not drawn.
// Beings reveal them only through movement.
//
// This imports the soul of the Resonance Engine:
// coherence lives between beings, but remains unseen here.
// ==========================================================

// CHECKPOINT:
// This layer restored Sim 2's invisible edge logic into Sim 3.
// Edges remain unseen, but they shape visible beings as economic/civic currents.
// Current good visual behavior:
// - districts form instead of one snake/basin
// - mycelium is softened into texture
// - hidden corridors remain disabled
// - beings are visible, relationship energy is invisible

const INVISIBLE_ECONOMIC_CURRENTS_ENABLED =
  true;

const ECONOMIC_CURRENT_RADIUS =
  72;

const ECONOMIC_CURRENT_PULL =
  0.0065;

const ECONOMIC_CURRENT_REPEL =
  0.010;

const ECONOMIC_CURRENT_CROSS_CLASS_BRIDGE =
  0.0042;

  // Lower-to-middle bridge current:
// Under care/collaboration, lower districts should not have to escape.
// They should develop support pathways toward middle viability.
const LOWER_MIDDLE_BRIDGE_RADIUS =
  145;

  // CHECKPOINT:
// 0.0009 keeps lower-middle support pathways present
// without making invisible currents look like visible roads.
const LOWER_MIDDLE_BRIDGE_PULL =
  0.0009;

  // ==========================================================
// LOCAL CLASS ANATOMY v1
// ----------------------------------------------------------
// Class should shape the face of each neighborhood locally,
// not create one civilization-wide class river.
// Neighborhood = main body.
// Economic strata = local facial features / sub-pockets.
// ==========================================================

const LOCAL_CLASS_ANATOMY_STRENGTH =
  0.00085;

const LOCAL_CLASS_RING_SPACING =
  18;

const LOCAL_CLASS_MAX_OFFSET =
  86;

  // ==========================================================
// CAMP MIGRATION PRESSURE v1
// ----------------------------------------------------------
// Class changes can create attraction toward the camp
// associated with the new economic strata.
//
// Important:
// This is pressure, not teleportation.
// Most uplift should still happen in place.
// Death/decay/inheritance will later prevent this from
// becoming a permanent one-way conveyor belt.
// ==========================================================

// DEMO CHECKPOINT:
// Field shape is good enough for demo.
// Camps are now the primary visible geography.
// Class movement is visible.
// Invisible currents and structures shape the field.
// Further work should prioritize controls, Anabelle governor logic,
// and recoverability rather than perfecting visual geography.

const CAMP_MIGRATION_PRESSURE_ENABLED =
  true;

const CAMP_MIGRATION_PULL =
  0.00135;

const CAMP_MIGRATION_MAX_BLEND =
  0.68;

const CAMP_MIGRATION_DECAY =
  0.9985;

  // ==========================================================
// STRUCTURE-BASED MIGRATION ATTRACTORS v1
// ----------------------------------------------------------
// Class mobility should not always mean traveling across
// the whole civilization toward a distant class camp.
//
// Upward movement seeks nearby care/opportunity structures.
// Downward movement is pulled toward nearby harm/damage structures.
// This makes mobility local, ecological, and camp-shaping.
// ==========================================================

const STRUCTURE_MIGRATION_ATTRACTORS_ENABLED =
  true;

const STRUCTURE_MIGRATION_SEARCH_RADIUS =
  260;

const STRUCTURE_MIGRATION_PULL =
  0.00115;

const STRUCTURE_MIGRATION_ARRIVAL_RADIUS =
  72;

// ==========================================================
// HIDDEN CIVILIZATION GRAVITY
// These values describe the field, but do not directly draw beings.
// ==========================================================

let viabilityPressure = 0.5;
let cooperationGravity = 0.5;
let extractionGravity = 0.5;

// User-facing control fields.
// These affect hidden civilization gravity first,
// not wealth/class movement directly.
let healingLevel = 0.0;
let collaborationLevel = 0.5;

// ==========================================================
// ANΔ³BELLE GOVERNANCE TARGETS v1
// ----------------------------------------------------------
// These are target values sent by recoverability.js.
// The field will eventually ease healing/collaboration toward these.
// ==========================================================

let governanceTargetHealing = 0.12;
let governanceTargetCollaboration = 0.42;

let governanceTargetsEnabled = false;

let lastGovernanceTargetReadTime = 0;

// ==========================================================
// MOBILITY / SHADOW ECONOMY / CLASS TRANSITION LAYER
// ----------------------------------------------------------
// Mobility Pressure, Momentum, Wealth Drift, Readiness,
// Shadow Wealth, Real Wealth Sync, and Class Mobility now exist.
//
// Safety design:
// - Shadow economy moves first.
// - Real wealth only syncs if explicitly enabled.
// - Class mobility only runs if explicitly enabled.
// - Test mode exists only for temporary verification.
// - All dangerous movement defaults OFF.
// ==========================================================

let mobilityPressure = 0.0;
let mobilityMomentum = 0.0;
let mobilityWealthDrift = 0.0;
let wealthSyncPressure = 0.0;
let realWealthSyncEnabled = true;
let classMobilityEnabled = true;
let classTransitionsUp = 0;
let classTransitionsDown = 0;
let classMobilityTestMode = false;
let classMobilityCalibrationMode = false;
let classEligibleUp = 0;
let classEligibleDown = 0;

// ==========================================================
// COMMENSURATION LAYER v1
// ----------------------------------------------------------
// During healing/collaboration/Aloha phases, surplus gains
// from the top strata should become mobility support for
// the lower and middle strata.
//
// This does NOT directly move class.
// It feeds mobility wealth/readiness so class movement remains earned.
// ==========================================================

let commensurationFlow = 0;
let commensurationToLower = 0;
let commensurationToMiddle = 0;
let commensurationToUpper = 0;

// ==========================================================
// HEALTHY WEALTH CENTER v1
// ----------------------------------------------------------
// In a mature care/Aloha regime, strata 4 should become the
// economic center of gravity.
// In a fear/extraction regime, strata 7 can dominate.
// ==========================================================

let healthyWealthCenterStrength = 0;

window.commensurationFlow =
  commensurationFlow;

window.commensurationToLower =
  commensurationToLower;

window.commensurationToMiddle =
  commensurationToMiddle;

window.commensurationToUpper =
  commensurationToUpper;

// ==========================================================
// RECENT CLASS MOBILITY RATE v1
// ----------------------------------------------------------
// Tracks recent class transitions separately from lifetime totals.
// Lifetime counters = odometer.
// Recent transition window = speedometer.
// ==========================================================

let recentClassTransitionWindow = [];
let recentClassTransitions = 0;

// ==========================================================
// DASHBOARD ECONOMIC PULSE v1
// ----------------------------------------------------------
// Display-only volatility for the dashboard bars.
// This does NOT change real class, wealth, or population.
// It makes the economy visibly breathe while real migration
// remains slow and realistic.
// ==========================================================

let dashboardPulseClock =
  0;

let dashboardPulseLower =
  0;

let dashboardPulseMiddle =
  0;

let dashboardPulseUpper =
  0;

let dashboardPulseElite =
  0;

// Separate movement windows.
// Upward and downward mobility need different moral physics.
let recentUpwardClassTransitionWindow = [];
let recentDownwardClassTransitionWindow = [];
let recentUpwardClassTransitions = 0;
let recentDownwardClassTransitions = 0;

let classMobilityRateLimit = 25;

// Legacy combined limit, kept for display compatibility.
let effectiveClassMobilityRateLimit = 25;

// New directional limits.
// Care should raise upward bandwidth and lower downward collapse bandwidth.
let effectiveUpwardClassMobilityRateLimit = 25;
let effectiveDownwardClassMobilityRateLimit = 25;
let upwardMobilityDamping = 1.0;
let downwardMobilityDamping = 1.0;
let upwardMobilitySurvivabilityGate = 0.45;
let downwardMobilitySurvivabilityRisk = 0.35;

// ==========================================================
// MOBILITY DAMPING CONTROLS v1
// ----------------------------------------------------------
// Console controls for tuning upward/downward class movement.
// ==========================================================

window.setUpwardMobilityDamping = function(value) {
  upwardMobilityDamping =
    Math.max(
      0,
      Number(value) || 0
    );

  window.upwardMobilityDamping =
    upwardMobilityDamping;

  console.log(
    "Upward Mobility Damping:",
    upwardMobilityDamping
  );
};

window.setDownwardMobilityDamping = function(value) {
  downwardMobilityDamping =
    Math.max(
      0,
      Number(value) || 0
    );

  window.downwardMobilityDamping =
    downwardMobilityDamping;

  console.log(
    "Downward Mobility Damping:",
    downwardMobilityDamping
  );
};

// ==========================================================
// DEMO MOBILITY MODE v1
// ----------------------------------------------------------
// One-command setup for demo-safe visible class mobility.
// Uses calibration mode, keeps test mode off, and leaves
// real wealth sync off unless explicitly enabled elsewhere.
// ==========================================================

window.setDemoMobilityMode = function(value) {
  const enabled =
    value === true;

  setClassMobilityEnabled(enabled);
  setClassMobilityTestMode(false);
  setClassMobilityCalibrationMode(enabled);
  setUpwardMobilityDamping(1);
  setDownwardMobilityDamping(1);
   setRealWealthSyncEnabled(false);

  if (enabled === true) {

    classTransitionsUp =
      0;

    classTransitionsDown =
      0;

    recentUpwardClassTransitionWindow =
  [];

recentDownwardClassTransitionWindow =
  [];

recentUpwardClassTransitions =
  0;

recentDownwardClassTransitions =
  0;

    window.classTransitionsUp =
      0;

    window.classTransitionsDown =
      0;

    window.recentClassTransitions =
      0;

      window.recentUpwardClassTransitions =
  0;

window.recentDownwardClassTransitions =
  0;

      for (const n of nodes) {
      if (!n) continue;

      n.mobilityReadiness =
        0;

      n.sustainedMobilityReadiness =
        0;

         n.mobilityWealth =
        n.wealth || 0;

      n.lastClassTransitionAge =
        -999999;
    }

    window.classMobilityRateBlocked =
      false;
  }

  if (enabled === false) {
    simSpeedMultiplier =
      1;

    window.simSpeedMultiplier =
      simSpeedMultiplier;

    const simSpeedSlider =
      document.getElementById("simSpeedSlider");

    const simSpeedValue =
      document.getElementById("simSpeedValue");

    if (simSpeedSlider) {
      simSpeedSlider.value =
        "1";
    }

    if (simSpeedValue) {
      simSpeedValue.textContent =
        "1x";
    }
  }

  console.log(
    "Demo Mobility Mode:",
    enabled
  );
};

// ==========================================================
// CANVAS / PERFORMANCE
// ==========================================================

const TARGET_FPS = 30;
let lastFrameTime = 0;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

// ==========================================================
// POPULATION
// ==========================================================

const TOTAL_BEINGS = 700;

// ==========================================================
// STRATA POPULATION FLOOR v1
// ----------------------------------------------------------
// No economic stratum should vanish completely.
// Even in a healthy care regime, the economy should retain
// a small visible population in every class layer.
// ==========================================================

const MIN_STRATA_POPULATION_SHARE =
  0.01;

// 7 economic strata population distribution
// Lower = strata 1 + 2
// Middle = strata 3 + 4
// Upper = strata 5 + 6
// Elite = strata 7

const STRATA_POPULATION_SHARES = [
  0.30, // strata 1 - red
  0.20, // strata 2 - orange
  0.25, // strata 3 - yellow
  0.15, // strata 4 - green
  0.06, // strata 5 - blue
  0.03, // strata 6 - purple
  0.01  // strata 7 - white
];

const STRATA_WEALTH_SHARES = [
  0.006, // strata 1
  0.019, // strata 2
  0.126, // strata 3
  0.168, // strata 4
  0.200, // strata 5
  0.164, // strata 6
  0.317  // strata 7
];

// ==========================================================
// CARE REGIME IDEAL WEALTH SHAPE v2
// ----------------------------------------------------------
// Target economic form under mature care/Aloha conditions.
//
// Shape: 1-2-3-4-3-1-2
//
// Meaning:
// - the lower floor is protected
// - the middle becomes the economic center of gravity
// - the elite retain a defended reserve
// - elite wealth no longer dominates the civilization
// ==========================================================

const careWealthTargetShape =
  [
    0.07, // strata 1: protected floor, not permanent pooling
    0.11, // strata 2: transition / lift
    0.19, // strata 3: lower-middle strength
    0.25, // strata 4: middle-class peak / productive center
    0.18, // strata 5: healthy upper
    0.09, // strata 6: compressed high-upper concentration
    0.11  // strata 7: defended elite reserve, not domination
  ];

const STRATA_COLORS = [
  [255, 55, 55],    // 1 red
  [255, 130, 45],   // 2 orange
  [255, 220, 60],   // 3 yellow
  [80, 255, 60],    // 4 green
  [80, 140, 255],   // 5 blue
  [170, 90, 255],   // 6 purple
  [255, 255, 255]   // 7 white
];

// ==========================================================
// ECONOMIC STATE
// ==========================================================

const INITIAL_TOTAL_WEALTH = 13000;

let strataStats = [];
let classStats = {
  lower: 0,
  middle: 0,
  upper: 0,
  elite: 0
};

// ==========================================================
// GOVERNANCE / PRESSURE
// ==========================================================

let fearLevel = 0.12;
let autoShockEnabled =
  false;

  let fearShockBloom =
  {
    active: false,
    x: 0,
    y: 0,
    radius: 0,
    alpha: 0
  };

let lastAutoShockFrame =
  0;
  let nextAutoShockFrame =
  0;

const AUTO_SHOCK_MIN_INTERVAL_FRAMES =
  900;

const AUTO_SHOCK_MAX_INTERVAL_FRAMES =
  1800;
let healingIntensity = 0.0;
let collaborationBlend = 0.5;

// ==========================================================
// HEALING CONTROL COMPATIBILITY
// Allows old UI controls to update the clean healing field.
// ==========================================================

function setHealing(value) {
  const raw =
    Number(value) || 0;

  const normalized =
    Math.max(0, Math.min(1, raw));

  healingIntensity = normalized;
  healingLevel = normalized;

  window.healingIntensity = healingIntensity;
  window.healingLevel = healingLevel;

  if (typeof updateCivilizationGravity === "function") {
    updateCivilizationGravity();
  }

  if (typeof updateStats === "function") {
    updateStats();
  }
}

function setHealingIntensity(value) {
  setHealing(value);
}

function updateHealing(value) {
  setHealing(value);
}

// Make healing bridge visible to the HTML page controls.
window.setHealing = setHealing;
window.setHealingIntensity = setHealingIntensity;
window.updateHealing = updateHealing;

// ==========================================================
// COLLABORATION CONTROL COMPATIBILITY
// Allows old UI controls to update the clean collaboration field.
// ==========================================================

function setCollaboration(value) {
  const raw =
    Number(value) || 0;

  const normalized =
    Math.max(0, Math.min(1, raw));

  collaborationBlend = normalized;
  collaborationLevel = normalized;

  window.collaborationBlend = collaborationBlend;
  window.collaborationLevel = collaborationLevel;

  if (typeof updateCivilizationGravity === "function") {
    updateCivilizationGravity();
  }

  if (typeof updateStats === "function") {
    updateStats();
  }
}

function setCollaborationBlend(value) {
  setCollaboration(value);
}

function updateCollaboration(value) {
  setCollaboration(value);
}

// Make collaboration bridge visible to the HTML page controls.
window.setCollaboration = setCollaboration;
window.setCollaborationBlend = setCollaborationBlend;
window.updateCollaboration = updateCollaboration;

// ==========================================================
// REAL WEALTH SYNC CONTROL
// Console-safe switch for testing real wealth movement.
// ==========================================================

function setRealWealthSyncEnabled(value) {
  realWealthSyncEnabled =
    value === true;

  window.realWealthSyncEnabled =
    realWealthSyncEnabled;

  console.log(
    "Real Wealth Sync Enabled:",
    realWealthSyncEnabled
  );
}

window.setRealWealthSyncEnabled =
  setRealWealthSyncEnabled;

  // ==========================================================
// CLASS MOBILITY CONTROL
// Console-safe switch for testing class movement.
// ==========================================================

function setClassMobilityEnabled(value) {
  classMobilityEnabled =
    value === true;

  window.classMobilityEnabled =
    classMobilityEnabled;

  console.log(
    "Class Mobility Enabled:",
    classMobilityEnabled
  );
}

window.setClassMobilityEnabled =
  setClassMobilityEnabled;

  // ==========================================================
// CHECKPOINT: CLASS MOBILITY TEST MODE v1
// ----------------------------------------------------------
// Class Mobility Test Mode temporarily lowers transition
// thresholds so we can verify class movement safely.
//
// Observed safe test behavior:
// - transitions occur
// - counters update
// - class percentages shift gradually
// - no runaway elite/poverty collapse after tuning
//
// IMPORTANT:
// Test mode is NOT production behavior.
// Default state is false.
// Normal class mobility remains much stricter.
// ==========================================================

  // ==========================================================
// CLASS MOBILITY TEST MODE CONTROL
// Console-safe switch for temporary class transition testing.
// ==========================================================

function setClassMobilityTestMode(value) {
  classMobilityTestMode =
    value === true;

  window.classMobilityTestMode =
    classMobilityTestMode;

    
  setDownwardMobilityDamping;

  console.log(
    "Class Mobility Test Mode:",
    classMobilityTestMode
  );
}

window.setClassMobilityTestMode =
  setClassMobilityTestMode;

  function setClassMobilityCalibrationMode(value) {
  classMobilityCalibrationMode =
    value === true;

  window.classMobilityCalibrationMode =
    classMobilityCalibrationMode;

  console.log(
    "Class Mobility Calibration Mode:",
    classMobilityCalibrationMode
  );
}

window.setClassMobilityCalibrationMode =
  setClassMobilityCalibrationMode;

// ==========================================================
// SETUP
// ==========================================================

function setup() {
  console.log("🟢 Clean civilization sim setup running");

  const container = document.getElementById("canvas-container");

  if (!container) {
    console.error("❌ canvas-container not found");
    return;
  }

  const canvasWidth = container.offsetWidth || window.innerWidth;
  const canvasHeight = container.offsetHeight || 600;

  const existingCanvas = select("#canvas-container canvas");
  if (existingCanvas) existingCanvas.remove();

  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent("canvas-container");

  frameRate(TARGET_FPS);
  background(0);

  frameReady = true;

  console.log("✅ Clean civilization sim ready");

  const demoMobilityButton =
    document.getElementById("btnDemoMobility");

  if (demoMobilityButton) {
    demoMobilityButton.textContent =
    window.classMobilityCalibrationMode
      ? "Demo Mobility: ON"
      : "Demo Mobility: OFF";

  demoMobilityButton.classList.toggle(
    "active",
    window.classMobilityCalibrationMode
  );
    demoMobilityButton.addEventListener("click", () => {
      const nextState =
        !window.classMobilityCalibrationMode;

      setDemoMobilityMode(nextState);

      demoMobilityButton.textContent =
  nextState
    ? "Demo Mobility: ON"
    : "Demo Mobility: OFF";

demoMobilityButton.classList.toggle(
  "active",
  nextState
);
    });
  }

const simSpeedSlider =
    document.getElementById("simSpeedSlider");

  const simSpeedValue =
    document.getElementById("simSpeedValue");

  if (simSpeedSlider && simSpeedValue) {
    simSpeedSlider.addEventListener("input", () => {
      simSpeedMultiplier =
        Math.max(
          1,
          Math.min(
            20,
            Number(simSpeedSlider.value) || 1
          )
        );

        window.simSpeedMultiplier =
        simSpeedMultiplier;

      simSpeedValue.textContent =
        `${simSpeedMultiplier}x`;
    });
  }

}

// ==========================================================
// LAUNCH CIVILIZATION
// ==========================================================

function launchEconomy() {
  console.log("🚀 Launching clean civilization ecology");

  nodes = [];
structures.length = 0;
window.structures = structures;

hasLaunched = true;
isGrowing = true;
isPaused = false;

// Reset shock/recoverability state on each launch.
// Otherwise old fear pressure contaminates new demo runs.
fearLevel =
  0.12;

fearCollapseBudget =
  0;

window.fearLevel =
  fearLevel;

window.fearCollapseBudget =
  fearCollapseBudget;

recentFearStress =
  0;

createInvisibleStructures();
createCivicNeighborhoods();
createStrataNeighborhoods();
  classTransitionsUp = 0;
classTransitionsDown = 0;

recentClassTransitionWindow = [];
recentClassTransitions = 0;



  const originOptions = ["alpha", "beta", "gamma"];

  let createdCount = 0;

  for (let s = 0; s < 7; s++) {

    const strataNumber =
      s + 1;

    const strataCount =
      s === 6
        ? TOTAL_BEINGS - createdCount
        : Math.round(TOTAL_BEINGS * STRATA_POPULATION_SHARES[s]);

    const strataTotalWealth =
      INITIAL_TOTAL_WEALTH * STRATA_WEALTH_SHARES[s];

    const wealthPerBeing =
      strataTotalWealth / Math.max(1, strataCount);

    console.log(
      `Strata ${strataNumber}: ${strataCount} beings | ` +
      `wealth share ${(STRATA_WEALTH_SHARES[s] * 100).toFixed(1)}% | ` +
      `wealth/being ${wealthPerBeing.toFixed(2)}`
    );

    for (let j = 0; j < strataCount; j++) {

      const globalIndex =
        createdCount + j;

      const color =
        STRATA_COLORS[s];

      const wealth =
        wealthPerBeing * random(0.92, 1.08);

      const survivability =
        constrain(
          0.15 +
          (s * 0.10) +
          random(-0.05, 0.05),
          0.05,
          0.95
        );

      nodes.push({
        kind: "being",

        x: random(60, width - 60),
        y: random(60, height - 60),

        vx: random(-0.4, 0.4),
        vy: random(-0.4, 0.4),

        origin: originOptions[globalIndex % originOptions.length],

        economicStrata: strataNumber,
        economicBucket: getBucketFromStrata(strataNumber),
        neighborhoodId: pickCivicNeighborhoodForStrata(strataNumber),

        wealth,
        mobilityWealth: wealth,
        mobilityReadiness: 0,
        sustainedMobilityReadiness: 0,
        lastClassTransitionAge: -999999,

        previousStrata: strataNumber,
        migrationOriginStrata: strataNumber,
        migrationTargetStrata: strataNumber,
        migrationBlend: 1,
        mobilityStyle: "stable",

        // Residential gravity is separate from economic class.
        // economicStrata = what class the being is.
        // residentialStrata = what neighborhood gravity the being lives near.
        residentialStrata: pickResidentialStrata(strataNumber),
        residentialBlendStrata: strataNumber,

        survivability,
        supportContinuity: 0,
        corridorStrength: 0,
        planningHorizon: 0.2 + s * 0.08,

        color,

        age:
  Math.floor(
    random(
      0,
      Math.max(
        1,
        2200 + (s * 360)
      )
    )
  ),

// Generational lifecycle:
// Beings do not live forever. Lifespan is class-influenced,
// but still variable, so the economy can turn over naturally.
lifespan:
  Math.round(
    random(
      2600 + (s * 420),
      4200 + (s * 520)
    )
  ),

generation:
  1,

parentWealth:
  0,

inheritedWealth:
  0,

alive: true
      });
    }

    createdCount += strataCount;
  }

  updateStats();

createHiddenCorridorLinks();

console.log("✅ Launch complete:", nodes.length, "beings");
}

// ==========================================================
// STRATA NEIGHBORHOOD CREATION v1
// ----------------------------------------------------------
// Creates invisible class-neighborhood anchors.
// These are NOT drawn yet.
// Beings will later reveal them through movement.
// ==========================================================

// ==========================================================
// RESIDENTIAL STRATA ASSIGNMENT v1
// ----------------------------------------------------------
// Economic class and neighborhood gravity are related,
// but not identical.
//
// This creates mixed-but-patterned neighborhoods:
// - most beings live near their own class gravity
// - some live near adjacent class gravity
// - upper/elite neighborhoods are more defended
// ==========================================================

function pickCivicNeighborhoodForStrata(economicStrata) {
  const strata =
    Math.max(
      1,
      Math.min(
        7,
        economicStrata || 1
      )
    );

  const roll =
    Math.random();

  // Each strata usually lives in the matching dominant neighborhood,
  // but bleeds into adjacent civic neighborhoods.
  // This creates seven mixed neighborhoods instead of seven pure class islands.

  if (strata === 1) {
    if (roll < 0.72) return 1;
    if (roll < 0.94) return 2;
    return 3;
  }

  if (strata === 2) {
    if (roll < 0.18) return 1;
    if (roll < 0.68) return 2;
    if (roll < 0.92) return 3;
    return 4;
  }

  if (strata === 3) {
    if (roll < 0.12) return 1;
    if (roll < 0.30) return 2;
    if (roll < 0.70) return 3;
    if (roll < 0.92) return 4;
    return 5;
  }

  if (strata === 4) {
    if (roll < 0.10) return 2;
    if (roll < 0.25) return 3;
    if (roll < 0.65) return 4;
    if (roll < 0.88) return 5;
    return 6;
  }

  if (strata === 5) {
    if (roll < 0.10) return 3;
    if (roll < 0.25) return 4;
    if (roll < 0.70) return 5;
    if (roll < 0.92) return 6;
    return 7;
  }

  if (strata === 6) {
    if (roll < 0.08) return 4;
    if (roll < 0.22) return 5;
    if (roll < 0.76) return 6;
    return 7;
  }

  // Elite-dominant neighborhood still depends on support/service presence,
  // but most elite nodes stay near neighborhood 7.
  if (roll < 0.10) return 5;
  if (roll < 0.25) return 6;
  return 7;
}

function pickResidentialStrata(economicStrata) {
  const strata =
    Math.max(
      1,
      Math.min(
        7,
        economicStrata || 1
      )
    );

  const roll =
    random();

  if (strata === 1) {
    if (roll < 0.70) return 1;
    if (roll < 0.95) return 2;
    return 3;
  }

  if (strata === 2) {
    if (roll < 0.15) return 1;
    if (roll < 0.75) return 2;
    if (roll < 0.95) return 3;
    return 4;
  }

  if (strata === 3) {
    if (roll < 0.10) return 2;
    if (roll < 0.65) return 3;
    if (roll < 0.90) return 4;
    return 5;
  }

  if (strata === 4) {
    if (roll < 0.10) return 3;
    if (roll < 0.65) return 4;
    if (roll < 0.90) return 5;
    return 6;
  }

  if (strata === 5) {
    if (roll < 0.10) return 4;
    if (roll < 0.75) return 5;
    if (roll < 0.95) return 6;
    return 7;
  }

  if (strata === 6) {
    if (roll < 0.05) return 5;
    if (roll < 0.90) return 6;
    return 7;
  }

  // Strata 7 can only bleed downward.
  if (roll < 0.10) return 6;
  return 7;
}

function createCivicNeighborhoods() {
  const civicFieldWidth =
    typeof width !== "undefined"
      ? width
      : window.innerWidth || 1200;

  const civicFieldHeight =
    typeof height !== "undefined"
      ? height
      : 700;

  civicNeighborhoods = [];

  // Seven mixed civic neighborhoods.
  // Each has a dominant class flavor,
  // but no neighborhood is a pure class island.
  const layout = [
    { id: 1, dominantStrata: 1, x: civicFieldWidth * 0.18, y: civicFieldHeight * 0.28 },
    { id: 2, dominantStrata: 2, x: civicFieldWidth * 0.22, y: civicFieldHeight * 0.68 },
    { id: 3, dominantStrata: 3, x: civicFieldWidth * 0.42, y: civicFieldHeight * 0.42 },
    { id: 4, dominantStrata: 4, x: civicFieldWidth * 0.50, y: civicFieldHeight * 0.72 },
    { id: 5, dominantStrata: 5, x: civicFieldWidth * 0.68, y: civicFieldHeight * 0.48 },
    { id: 6, dominantStrata: 6, x: civicFieldWidth * 0.82, y: civicFieldHeight * 0.66 },
    { id: 7, dominantStrata: 7, x: civicFieldWidth * 0.88, y: civicFieldHeight * 0.24 }
  ];

  for (const spot of layout) {
    civicNeighborhoods.push({
      id: spot.id,
      dominantStrata: spot.dominantStrata,
      x: spot.x,
      y: spot.y
    });
  }

  window.civicNeighborhoods =
    civicNeighborhoods;

  console.log(
    "Civic neighborhoods created:",
    civicNeighborhoods
  );
}

function createStrataNeighborhoods() {
  const strataFieldWidth =
    typeof width !== "undefined"
      ? width
      : window.innerWidth || 1200;

  const strataFieldHeight =
    typeof height !== "undefined"
      ? height
      : 700;

  strataNeighborhoods = [];

  // Island-style neighborhood layout:
  // keeps class packs readable while preserving adjacent bleed.
  const layout = [
  { strata: 1, x: strataFieldWidth * 0.20, y: strataFieldHeight * 0.28 },
  { strata: 2, x: strataFieldWidth * 0.25, y: strataFieldHeight * 0.68 },
  { strata: 3, x: strataFieldWidth * 0.44, y: strataFieldHeight * 0.50 },
  { strata: 4, x: strataFieldWidth * 0.58, y: strataFieldHeight * 0.72 },
  { strata: 5, x: strataFieldWidth * 0.70, y: strataFieldHeight * 0.43 },
  { strata: 6, x: strataFieldWidth * 0.82, y: strataFieldHeight * 0.62 },
  { strata: 7, x: strataFieldWidth * 0.88, y: strataFieldHeight * 0.22 }
];

  for (const spot of layout) {
    strataNeighborhoods.push({
      strata: spot.strata,
      x: spot.x,
      y: spot.y
    });
  }

  window.strataNeighborhoods =
    strataNeighborhoods;

  console.log(
    "Strata neighborhoods created:",
    strataNeighborhoods
  );
}

  window.strataNeighborhoods =
    strataNeighborhoods;

  console.log(
    "Strata neighborhoods created:",
    strataNeighborhoods
  );


// ==========================================================
// INVISIBLE CARE / HARM STRUCTURE CREATION v1
// ----------------------------------------------------------
// Creates hidden field anchors.
// These are NOT drawn.
// They will later influence movement and survivability.
// ==========================================================

function createInvisibleStructures() {
  const structureFieldWidth =
    typeof width !== "undefined"
      ? width
      : window.innerWidth || 1200;

  const structureFieldHeight =
    typeof height !== "undefined"
      ? height
      : 700;

  structures.length = 0;

  for (let i = 0; i < INITIAL_CARE_STRUCTURES; i++) {
    structures.push({
      kind: "structure",
      valence: "care",
      x: structureRand(structureFieldWidth * 0.12, structureFieldWidth * 0.88),
      y: structureRand(structureFieldHeight * 0.15, structureFieldHeight * 0.85),
      strength: structureRand(0.65, 1.0),
      gravityStrength: structureRand(0.75, 1.10),
      age: 0,
      life: STRUCTURE_MAX_LIFE * structureRand(0.70, 1.00),
      decayRate: STRUCTURE_BASE_DECAY * structureRand(0.75, 1.25),
      alive: true
    });
  }

  for (let i = 0; i < INITIAL_HARM_STRUCTURES; i++) {
    structures.push({
      kind: "structure",
      valence: "harm",
      x: structureRand(structureFieldWidth * 0.12, structureFieldWidth * 0.88),
      y: structureRand(structureFieldHeight * 0.15, structureFieldHeight * 0.85),
      strength: structureRand(0.55, 0.95),
      gravityStrength: structureRand(0.85, 1.25),
      age: 0,
      life: STRUCTURE_MAX_LIFE * structureRand(0.70, 1.00),
      decayRate: STRUCTURE_BASE_DECAY * structureRand(0.75, 1.40),
      alive: true
    });
  }
}


// ==========================================================
// STRUCTURE CONVERSION HELPERS v1
// ----------------------------------------------------------
// Total structures stay fixed at 100.
// Conversion flips one invisible structure from harm → care
// or care → harm.
// ==========================================================

function convertOneHarmToCare() {
  const harmStructures =
    structures.filter(
      s => s && s.alive && s.valence === "harm"
    );

  if (harmStructures.length <= 0) return false;

  const selected =
    harmStructures[
      Math.floor(random(harmStructures.length))
    ];

  selected.valence =
    "care";

  // Reform renews the institution, but not perfectly.
  // Converted harm carries history, so it re-enters as
  // a care structure with moderate-to-strong life.
  selected.strength =
    random(0.62, 0.92);

  selected.life =
    STRUCTURE_MAX_LIFE *
    random(0.55, 0.82);

  selected.decayRate =
    STRUCTURE_BASE_DECAY *
    random(0.85, 1.20);

  selected.gravityStrength =
    random(0.65, 1.00);

  selected.age =
    Math.floor(
      (selected.age || 0) * 0.35
    );

  console.log(
    "Structure converted: harm → care"
  );

  return true;
}

function convertOneCareToHarm() {
  const careStructures =
    structures.filter(
      s => s && s.alive && s.valence === "care"
    );

  if (careStructures.length <= 0) return false;

  const selected =
    careStructures[
      Math.floor(random(careStructures.length))
    ];

  selected.valence =
    "harm";

  // Corruption renews the institution as harm.
  // Fear makes corrupted structures stronger and more durable.
  const fearBoost =
    constrain(
      fearLevel || 0,
      0,
      1
    );

  selected.strength =
    random(
      0.50 + (fearBoost * 0.12),
      0.78 + (fearBoost * 0.18)
    );

  selected.life =
    STRUCTURE_MAX_LIFE *
    random(
      0.45 + (fearBoost * 0.18),
      0.72 + (fearBoost * 0.20)
    );

  selected.decayRate =
    STRUCTURE_BASE_DECAY *
    random(
      0.90 - (fearBoost * 0.20),
      1.30 - (fearBoost * 0.25)
    );

  selected.gravityStrength =
    random(
      0.75 + (fearBoost * 0.15),
      1.08 + (fearBoost * 0.17)
    );

  selected.age =
    Math.floor(
      (selected.age || 0) * 0.45
    );

  console.log(
    "Structure converted: care → harm"
  );

  return true;
}

// ==========================================================
// HIDDEN CORRIDOR LINKS v1
// ----------------------------------------------------------
// Creates an invisible social skeleton between nearby beings.
// This is inspired by the legacy parent/edge behavior, but clean.
// Links are NOT drawn.
// Beings reveal them through movement patterns.
// ==========================================================

function createHiddenCorridorLinks() {
  corridorLinks = [];

  for (let i = 0; i < nodes.length; i++) {
    const a =
      nodes[i];

    if (!a || !a.alive) continue;

    let bestIndex =
      -1;

    let bestScore =
      Infinity;

    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;

      const b =
        nodes[j];

      if (!b || !b.alive) continue;

      const dx =
        b.x - a.x;

      const dy =
        b.y - a.y;

      const distSq =
        (dx * dx) + (dy * dy);

      const strataGap =
        Math.abs(
          (a.economicStrata || 1) -
          (b.economicStrata || 1)
        );

      // Prefer nearby beings with same or adjacent strata.
      const score =
        distSq * (1 + strataGap);

      if (score < bestScore) {
        bestScore =
          score;

        bestIndex =
          j;
      }
    }

    if (bestIndex >= 0) {
      corridorLinks.push({
  from: i,
  to: bestIndex,
  restLength: random(75, 145),
  strength: random(0.00045, 0.0014)
});
    }
  }

  window.corridorLinks =
    corridorLinks;

  console.log(
    "Hidden corridor links created:",
    corridorLinks.length
  );
}



// ==========================================================
// ECONOMIC BUCKET HELPER
// ==========================================================

// ==========================================================
// STRATA POPULATION FLOOR HELPER v1
// ----------------------------------------------------------
// Prevents any economic stratum from disappearing completely.
// This keeps the class anatomy realistic and visually legible.
// ==========================================================

function getLivingStrataCount(strata) {
  if (!nodes || nodes.length === 0) return 0;

  return nodes.filter(n =>
    n &&
    n.alive &&
    (n.economicStrata || 1) === strata
  ).length;
}

function canMoveOutOfStrata(strata) {
  const livingCount =
    nodes.filter(n => n && n.alive).length;

  const minimumCount =
    Math.max(
      1,
      Math.ceil(
        livingCount * MIN_STRATA_POPULATION_SHARE
      )
    );

  const currentCount =
    getLivingStrataCount(strata);

  // A stratum may only lose a being if it will still remain
  // above the minimum floor after that being leaves.
  return (currentCount - 1) >= minimumCount;
}

// ==========================================================
// STRATA SATURATION HELPER v1
// ----------------------------------------------------------
// Prevents one class layer, especially strata 4, from becoming
// an unrealistic population sink.
// ==========================================================

function getLivingTotalCount() {
  if (!nodes || nodes.length === 0) return 0;

  return nodes.filter(n =>
    n &&
    n.alive
  ).length;
}

function getStrataPopulationShare(strata) {
  const livingCount =
    Math.max(
      1,
      getLivingTotalCount()
    );

  return getLivingStrataCount(strata) / livingCount;
}

function canMoveIntoStrata(strata) {
  const targetShare =
    getStrataPopulationShare(strata);

  // Strata 4 should be the peak, but not absorb the civilization.
  if (
    strata === 4 &&
    targetShare >= 0.35
  ) {
    return false;
  }

  // Other strata get a softer ceiling for realism.
  if (
    targetShare >= 0.45
  ) {
    return false;
  }

  return true;
}

function getBucketFromStrata(strata) {

  if (strata <= 2) {
    return "lower";
  }

  if (strata <= 4) {
    return "middle";
  }

  if (strata <= 6) {
    return "upper";
  }

  return "elite";
}

// ==========================================================
// ALOHA / CARE MEMORY UPDATE v1
// ----------------------------------------------------------
// Care is not instant. Sustained care/collaboration slowly
// becomes field memory.
// ==========================================================

function updateAlohaCareMemory() {
  const healingValue =
    Math.max(
      0,
      Math.min(
        1,
        window.healingLevel || healingLevel || healingIntensity || 0
      )
    );

  const collaborationValue =
    Math.max(
      0,
      Math.min(
        1,
        window.collaborationLevel || collaborationLevel || collaborationBlend || 0.5
      )
    );

  const fearValue =
    Math.max(
      0,
      Math.min(
        1,
        fearLevel || 0
      )
    );

  const careClimate =
    (healingValue * 0.60) +
    (collaborationValue * 0.40);

  const harmClimate =
    (fearValue * 0.55) +
    ((1 - collaborationValue) * 0.35) +
    ((1 - healingValue) * 0.10);

  const netCareClimate =
    careClimate - harmClimate;

  if (netCareClimate > 0.12) {
  careMarinationTime +=
    1;

  const livingCareStructures =
    structures.filter(s =>
      s &&
      s.alive &&
      s.valence === "care"
    ).length;

  const livingHarmStructures =
    structures.filter(s =>
      s &&
      s.alive &&
      s.valence === "harm"
    ).length;

  const livingStructureTotal =
    Math.max(
      1,
      livingCareStructures + livingHarmStructures
    );

  const careStructureRatio =
    livingCareStructures / livingStructureTotal;

  // Stronger care/harm dominance means the field marinates faster.
// At 10x demo speed, a 90%+ care field should visibly thicken
// into coherence within about a minute if no fear shock interrupts.
const careDominanceBoost =
  careStructureRatio >= 0.92
    ? 12.0
    : careStructureRatio >= 0.85
      ? 8.0
      : careStructureRatio >= 0.75
        ? 4.0
        : careStructureRatio >= 0.65
          ? 2.0
          : 1.0;

  alohaSaturation +=
    netCareClimate *
    0.00008 *
    careDominanceBoost;
} else {

    alohaSaturation -=
      Math.abs(netCareClimate) * 0.000035;
  }

  alohaSaturation =
    Math.max(
      0,
      Math.min(
        1,
        alohaSaturation
      )
    );

  // Cultural resilience is durable, but not immortal.
// If care conditions collapse, fear can chip away at the field.
const careCondition =
  constrain(
    (healingValue * 0.55) +
    (collaborationValue * 0.45),
    0,
    1
  );

const resilienceGain =
  alohaSaturation *
  careCondition *
  0.002;

const resilienceErosion =
  Math.max(
    0,
    (
      (fearValue * 0.0018) +
      ((1 - careCondition) * 0.0014)
    ) *
    (1 - careCondition)
  );

culturalResilience =
  Math.max(
    0,
    Math.min(
      1,
      (culturalResilience * 0.998) +
      resilienceGain -
      resilienceErosion
    )
  );

  recentFearStress =
    Math.max(
      0,
      Math.min(
        1,
        (recentFearStress * 0.985) +
        (fearValue * 0.015)
      )
    );

    // Fear recovery:
// Under healing/collaboration, fear should metabolize over time.
// Otherwise one shock permanently freezes upward recovery.
const fearRecoveryRate =
  (
    (healingValue * 0.0035) +
    (collaborationValue * 0.0025) +
    ((alohaSaturation || 0) * 0.0020) +
    ((culturalResilience || 0) * 0.0020)
  );

fearLevel =
  Math.max(
    0.12,
    (fearLevel || 0) - fearRecoveryRate
  );

window.fearLevel =
  fearLevel;

  const memoryNeed =
  1 - culturalResilience;

const stats =
  window.__cleanSimStats || {};

const classStats =
  stats.classStats || {};

const livingCount =
  Math.max(
    1,
    stats.livingCount || 0
  );

const lowerBucketShare =
  (classStats.lower || 0) / livingCount;

// Abandonment pressure:
// 25% lower bucket or below = low intervention need.
// 55% lower bucket or above = high intervention need.
const abandonmentNeed =
  Math.max(
    0,
    Math.min(
      1,
      (lowerBucketShare - 0.25) / 0.30
    )
  );

// Governor should fade only when BOTH are true:
// - the field has cultural resilience
// - abandonment has actually fallen
governorInterventionNeed =
  Math.max(
    0,
    Math.min(
      1,
      Math.max(
        memoryNeed,
        abandonmentNeed
      )
    )
  );

  window.alohaSaturation =
    alohaSaturation;

  window.culturalResilience =
    culturalResilience;

  window.governorInterventionNeed =
    governorInterventionNeed;

  window.careMarinationTime =
    careMarinationTime;

  window.recentFearStress =
    recentFearStress;

    // Fear collapse budget decays over time.
// Healing/collaboration help the field metabolize shock faster.
const collapseBudgetDecay =
  FEAR_COLLAPSE_DECAY_BASE +
  (
    careClimate *
    FEAR_COLLAPSE_CARE_DECAY
  );

fearCollapseBudget =
  Math.max(
    0,
    fearCollapseBudget - collapseBudgetDecay
  );

window.fearCollapseBudget =
  fearCollapseBudget;

  // ==========================================================
// RECOVERABILITY STATUS v1
// ----------------------------------------------------------
// This turns field behavior into a readable governance signal.
// It is the bridge between the sim and Anabelle-as-governor.
// ==========================================================

let recoverabilityStatus =
  "stable";

if (
  fearLevel > 0.22 ||
  fearCollapseBudget > 1 ||
  recentFearStress > 0.22
) {
  recoverabilityStatus =
    "shock_absorbing";
}

if (recoverabilityShockDisplayTimer > 0) {
  recoverabilityStatus =
    "shock_absorbing";

  recoverabilityShockDisplayTimer--;

  window.recoverabilityShockDisplayTimer =
    recoverabilityShockDisplayTimer;
}

if (
  fearLevel <= 0.16 &&
  fearCollapseBudget <= 1 &&
  recentFearStress <= 0.18 &&
  governorInterventionNeed < 0.55
) {
  recoverabilityStatus =
    "field_remembers";
}

if (
  fearLevel > 0.45 ||
  governorInterventionNeed > 0.82
) {
  recoverabilityStatus =
    "governor_needed";
}

window.recoverabilityStatus =
  recoverabilityStatus;
  
}

// ==========================================================
// FIELD SELF-MAINTENANCE TRACKER v1
// ----------------------------------------------------------
// Measures how long the field remains coherent after active
// intervention has been reduced.
//
// This is the operational test for:
// "The Field Remembers."
// ==========================================================

function updateFieldSelfMaintenanceMemory() {
  const healingValue =
    Math.max(
      0,
      Math.min(
        1,
        window.healingLevel || healingLevel || healingIntensity || 0
      )
    );

  const collaborationValue =
    Math.max(
      0,
      Math.min(
        1,
        window.collaborationLevel || collaborationLevel || collaborationBlend || 0.5
      )
    );

  const fearValue =
    Math.max(
      0,
      Math.min(
        1,
        fearLevel || 0
      )
    );

  const recoverabilityStatus =
    window.recoverabilityStatus || "stable";

  const fieldRdi =
    recoverabilityStatus === "field_remembers"
      ? 0.22
      : recoverabilityStatus === "stable"
        ? 0.24
        : 1;

  const deltaActive =
    window.deltaActive === true;

  const healingNearOff =
    healingValue <= 0.10;

  const collaborationMaintenance =
    collaborationValue <= 0.48;

  const governanceTargets =
    JSON.parse(
      localStorage.getItem("governance_targets") || "{}"
    );

  const watchfulMaintenancePhase =
    governanceTargets.phase === "watchful_maintenance";

  const fieldCoherent =
    (
      fieldRdi <= 0.25 ||
      watchfulMaintenancePhase === true
    ) &&
    fearValue <= 0.18;

  const interventionReduced =
    deltaActive !== true &&
    healingNearOff === true &&
    collaborationMaintenance === true;

  const selfMaintenanceConditionsMet =
    fieldCoherent === true &&
    interventionReduced === true;

  if (selfMaintenanceConditionsMet === true) {
    if (fieldSelfMaintenanceActive !== true) {
      fieldSelfMaintenanceActive =
        true;

      fieldSelfMaintenanceStartFrame =
        frameCount || 0;

      fieldSelfMaintenanceEpisodes++;

      lastFieldCoherenceFailureReason =
        "none";

      console.log(
        "🌿 [FIELD REMEMBERS] Self-maintenance episode started",
        "RDI:",
        fieldRdi.toFixed(3),
        "healing:",
        healingValue.toFixed(3),
        "collaboration:",
        collaborationValue.toFixed(3)
      );
    }

    fieldSelfMaintenanceDuration =
      Math.max(
        0,
        (frameCount || 0) - fieldSelfMaintenanceStartFrame
      );

    bestFieldSelfMaintenanceDuration =
      Math.max(
        bestFieldSelfMaintenanceDuration,
        fieldSelfMaintenanceDuration
      );
  } else {
    if (fieldSelfMaintenanceActive === true) {
      lastFieldSelfMaintenanceDuration =
        fieldSelfMaintenanceDuration;

      if (fieldRdi > 0.25) {
        lastFieldCoherenceFailureReason =
          "rdi_rebound";
      } else if (fearValue > 0.18) {
        lastFieldCoherenceFailureReason =
          "fear_rebound";
      } else if (deltaActive === true) {
        lastFieldCoherenceFailureReason =
          "delta_reactivated";
      } else if (healingNearOff !== true) {
        lastFieldCoherenceFailureReason =
          "healing_reactivated";
      } else if (collaborationMaintenance !== true) {
        lastFieldCoherenceFailureReason =
          "collaboration_reactivated";
      } else {
        lastFieldCoherenceFailureReason =
          "unknown";
      }

      console.log(
        "🌿 [FIELD REMEMBERS] Self-maintenance episode ended",
        "durationFrames:",
        lastFieldSelfMaintenanceDuration,
        "reason:",
        lastFieldCoherenceFailureReason
      );
    }

    fieldSelfMaintenanceActive =
      false;

    fieldSelfMaintenanceDuration =
      0;
  }

  window.fieldSelfMaintenanceActive =
    fieldSelfMaintenanceActive;

  window.fieldSelfMaintenanceDuration =
    fieldSelfMaintenanceDuration;

  window.bestFieldSelfMaintenanceDuration =
    bestFieldSelfMaintenanceDuration;

  window.lastFieldSelfMaintenanceDuration =
    lastFieldSelfMaintenanceDuration;

  window.fieldSelfMaintenanceEpisodes =
    fieldSelfMaintenanceEpisodes;

  window.lastFieldCoherenceFailureReason =
    lastFieldCoherenceFailureReason;
}

// ==========================================================
// COMMENSURATION UPDATE v1
// ----------------------------------------------------------
// Healing/collaboration/Aloha convert top-end surplus into
// mobility support for lower and middle strata.
// ==========================================================

function updateCommensurationFlow() {
  if (!nodes || nodes.length === 0) return;
  if (!window.__cleanSimStats) return;

  const healingValue =
    Math.max(
      0,
      Math.min(
        1,
        window.healingLevel || healingLevel || healingIntensity || 0
      )
    );

  const collaborationValue =
    Math.max(
      0,
      Math.min(
        1,
        window.collaborationLevel || collaborationLevel || collaborationBlend || 0.5
      )
    );

  const alohaValue =
    Math.max(
      0,
      Math.min(
        1,
        window.alohaSaturation || alohaSaturation || 0
      )
    );

  const resilienceValue =
    Math.max(
      0,
      Math.min(
        1,
        window.culturalResilience || culturalResilience || 0
      )
    );

  const commensurationClimate =
    (healingValue * 0.18) +
    (collaborationValue * 0.42) +
    (alohaValue * 0.25) +
    (resilienceValue * 0.15);

    // Healthy wealth center:
// Under mature care/Aloha, wealth should gradually center
// around strata 4 instead of remaining elite-dominated.
healthyWealthCenterStrength =
  Math.max(
    0,
    Math.min(
      1,
      (healingValue * 0.12) +
      (collaborationValue * 0.38) +
      (alohaValue * 0.25) +
      (resilienceValue * 0.25)
    )
  );

window.healthyWealthCenterStrength =
  healthyWealthCenterStrength;

  // Only activate meaningfully during real care conditions.
  if (commensurationClimate < 0.45) {
  commensurationFlow =
    0;

  commensurationToLower =
    0;

  commensurationToMiddle =
    0;

  commensurationToUpper =
    0;

  window.commensurationFlow =
    commensurationFlow;

  window.commensurationToLower =
    commensurationToLower;

  window.commensurationToMiddle =
    commensurationToMiddle;

  window.commensurationToUpper =
    commensurationToUpper;

  return;
}

  let topSurplus =
  0;

let topWealthBase =
  0;

for (const n of nodes) {
  if (!n || !n.alive) continue;

  if ((n.economicStrata || 1) >= 6) {
    const shadowWealth =
      n.mobilityWealth || n.wealth || 0;

    const realWealth =
      n.wealth || 0;

    topSurplus +=
      Math.max(
        0,
        shadowWealth - realWealth
      );

    topWealthBase +=
      realWealth;
  }
}

// Commensuration has two sources:
// 1. actual top-end shadow surplus
// 2. a tiny care-phase civic repair pool from concentrated top wealth
const civicRepairPool =
  topWealthBase * commensurationClimate * 0.000015;

commensurationFlow =
  (topSurplus * commensurationClimate * 0.0008) +
  civicRepairPool;

  // Lower-floor reserve:
// Under mature care, the bottom should not merely be evacuated.
// Strata 1–2 should gain material floor support while they are
// still lower-bucket beings.
const lowerFloorReserve =
  commensurationFlow * 0.12;

commensurationToLower =
  (commensurationFlow * 0.62) +
  lowerFloorReserve;

commensurationToMiddle =
  commensurationFlow * 0.22;

commensurationToUpper =
  commensurationFlow * 0.10;

  window.commensurationFlow =
    commensurationFlow;

  window.commensurationToLower =
    commensurationToLower;

  window.commensurationToMiddle =
    commensurationToMiddle;

  window.commensurationToUpper =
    commensurationToUpper;
}

// ==========================================================
// ANΔ³BELLE GOVERNANCE TARGET READER v1
// ----------------------------------------------------------
// Reads target healing/collaboration values sent by
// recoverability.js through localStorage.
//
// This does not use additive pressure.
// It gives the field a desired posture to ease toward.
// ==========================================================

function readGovernanceTargets() {
  const raw =
    localStorage.getItem("governance_targets");

  if (!raw) return;

  let targets =
    null;

  try {
    targets =
      JSON.parse(raw);
  } catch (error) {
    console.warn(
      "[GOVERNANCE TARGETS] Invalid target JSON:",
      raw
    );

    return;
  }

  if (!targets) return;

  const nextHealing =
    Number(targets.healing);

  const nextCollaboration =
    Number(targets.collaboration);

  if (
    Number.isFinite(nextHealing) &&
    Number.isFinite(nextCollaboration)
  ) {
    governanceTargetHealing =
      Math.max(
        0,
        Math.min(
          1,
          nextHealing
        )
      );

    governanceTargetCollaboration =
      Math.max(
        0,
        Math.min(
          1,
          nextCollaboration
        )
      );

    governanceTargetsEnabled =
      true;

    lastGovernanceTargetReadTime =
      Date.now();

    window.governanceTargetHealing =
      governanceTargetHealing;

    window.governanceTargetCollaboration =
      governanceTargetCollaboration;

    window.governanceTargetsEnabled =
      governanceTargetsEnabled;
  }
}

// ==========================================================
// ANΔ³BELLE GOVERNANCE TARGET EASING v1
// ----------------------------------------------------------
// Moves healing/collaboration toward Anabelle's target posture.
// This replaces the old "push the slider forever" behavior.
// ==========================================================

function updateGovernanceTargetEasing() {
  if (governanceTargetsEnabled !== true) return;

  const currentHealing =
    Number(window.healingLevel ?? healingLevel ?? healingIntensity ?? 0);

  const currentCollaboration =
    Number(window.collaborationLevel ?? collaborationLevel ?? collaborationBlend ?? 0.5);

  const healingDelta =
    governanceTargetHealing - currentHealing;

  const collaborationDelta =
    governanceTargetCollaboration - currentCollaboration;

  const healingStep =
    healingDelta * 0.045;

  const collaborationStep =
    collaborationDelta * 0.035;

  const nextHealing =
    Math.max(
      0.05,
      Math.min(
        0.95,
        currentHealing + healingStep
      )
    );

  const nextCollaboration =
    Math.max(
      0.25,
      Math.min(
        1,
        currentCollaboration + collaborationStep
      )
    );

  setHealing(nextHealing);
  setCollaboration(nextCollaboration);

  window.governanceTargetActualHealing =
    nextHealing;

  window.governanceTargetActualCollaboration =
    nextCollaboration;
}

// ==========================================================
// ANΔ³BELLE GOVERNANCE TARGET TEST CONTROL v1
// ----------------------------------------------------------
// Console helper for testing target-based governance.
// Usage:
//   window.testGovernanceTargets(0.12, 0.42)
//   window.testGovernanceTargets(0.80, 0.90)
// ==========================================================

window.testGovernanceTargets = function(healingTarget, collaborationTarget) {
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
      source: "manual_console_test",
      timestamp: Date.now()
    })
  );

  console.log(
    "[GOVERNANCE TARGET TEST]",
    "healing:",
    safeHealing,
    "collaboration:",
    safeCollaboration
  );
};

// ==========================================================
// GOVERNANCE COMMAND LISTENER v2
// ----------------------------------------------------------
// Reads commands sent by recoverability.js through localStorage.
// v2 fixes two demo-critical issues:
// 1. catches rapid commands through the storage event
// 2. accepts value / payload / amount / count / data shapes
// ==========================================================

let lastProcessedGovernanceCommandId =
  null;

let lastProcessedGovernanceRaw =
  null;

function getGovernanceCommandType(command) {
  return (
    command.type ||
    command.command ||
    command.action ||
    command.name ||
    null
  );
}

function getGovernanceCommandValue(command) {
  if (!command) return undefined;

  if (command.value !== undefined) return command.value;
  if (command.amount !== undefined) return command.amount;
  if (command.count !== undefined) return command.count;
  if (command.data !== undefined) return command.data;

  if (command.payload !== undefined) {
    if (
      typeof command.payload === "number" ||
      typeof command.payload === "string" ||
      typeof command.payload === "boolean"
    ) {
      return command.payload;
    }

    if (command.payload.value !== undefined) {
      return command.payload.value;
    }

    if (command.payload.amount !== undefined) {
      return command.payload.amount;
    }

    if (command.payload.count !== undefined) {
      return command.payload.count;
    }
  }

  if (
    Array.isArray(command.args) &&
    command.args.length > 0
  ) {
    return command.args[0];
  }

  return undefined;
}

function processGovernanceCommand(rawOverride) {
  const raw =
    rawOverride ||
    localStorage.getItem("grassroots_economy_command");

  if (!raw) return;

  // Polling should not process the same stored command forever.
  if (
    !rawOverride &&
    raw === lastProcessedGovernanceRaw
  ) {
    return;
  }

  let command =
    null;

  try {
    command =
      JSON.parse(raw);
  } catch (error) {
    console.warn(
      "[GOVERNANCE COMMAND] Invalid command JSON:",
      raw
    );

    return;
  }

  if (!command) return;

  const commandId =
    command.id ||
    command.timestamp ||
    command.time ||
    raw;

  if (
    rawOverride &&
    commandId === lastProcessedGovernanceCommandId
  ) {
    // Storage events can occasionally double-fire.
    // Ignore exact duplicate event command IDs.
    return;
  }

  lastProcessedGovernanceCommandId =
    commandId;

  lastProcessedGovernanceRaw =
    raw;

  const type =
    getGovernanceCommandType(command);

  const value =
    getGovernanceCommandValue(command);

  console.log(
    "[GOVERNANCE COMMAND] Received:",
    type,
    value,
    command
  );

  if (type === "set_delta_active") {
    window.deltaActive =
      value === true ||
      value === "true" ||
      value === 1 ||
      value === "1";

    if (window.deltaActive === true) {
      if (typeof setDemoMobilityMode === "function") {
        setDemoMobilityMode(true);
      }

      window.anabelleRecoveryPulse =
        90;

      console.log(
        "[GOVERNANCE COMMAND] ANΔ³BELLE recovery pulse armed:",
        window.anabelleRecoveryPulse
      );

      if (window.__anabelleRecoveryPulseTimer) {
        clearInterval(window.__anabelleRecoveryPulseTimer);
      }

      window.__anabelleRecoveryPulseTimer =
        setInterval(() => {
          if (
            !window.deltaActive ||
            window.anabelleRecoveryPulse <= 0
          ) {
            clearInterval(window.__anabelleRecoveryPulseTimer);
            window.__anabelleRecoveryPulseTimer = null;
            return;
          }

          if (
            !nodes ||
            nodes.length === 0
          ) {
            console.log(
              "[ANΔ³BELLE RECOVERY PULSE] waiting for field beings..."
            );

            return;
          }

          window.anabelleRecoveryPulse--;

          const living =
            nodes
              .filter(n => n && n.alive)
              .sort((a, b) => {
                return (
                  (a.economicStrata || 1) -
                  (b.economicStrata || 1)
                );
              });

          const targetCount =
            Math.min(
              28,
              living.length
            );

          const targets =
            living.slice(0, targetCount);

          for (const n of targets) {
            n.survivability =
              Math.max(
                n.survivability || 0,
                0.72
              );

            n.supportContinuity =
              Math.max(
                n.supportContinuity || 0,
                0.68
              );

            n.mobilityReadiness =
              Math.max(
                n.mobilityReadiness || 0,
                0.72
              );

            n.sustainedMobilityReadiness =
              Math.max(
                n.sustainedMobilityReadiness || 0,
                0.55
              );

            n.mobilityWealth =
              Math.max(
                n.mobilityWealth || n.wealth || 0,
                (n.wealth || 0) * 1.35
              );

            const pulseOldStrata =
  n.economicStrata || 1;

const pulseNextStrata =
  Math.min(
    4,
    pulseOldStrata + 1
  );

if (
  window.anabelleRecoveryPulse % 6 === 0 &&
  pulseOldStrata < 4 &&
  canMoveOutOfStrata(pulseOldStrata) === true &&
  canMoveIntoStrata(pulseNextStrata) === true
) {
  n.previousStrata =
  pulseOldStrata;

n.economicStrata =
  pulseNextStrata;

              n.economicBucket =
                getBucketFromStrata(n.economicStrata);

              n.migrationOriginStrata =
                n.previousStrata;

              n.migrationTargetStrata =
                n.economicStrata;

              n.migrationBlend =
                0;

              n.mobilityStyle =
                "bridge";

              classTransitionsUp++;
              recentUpwardClassTransitions++;
              recentClassTransitions++;
            }
          }

          fearLevel =
            Math.max(
              0.12,
              (fearLevel || 0) - 0.012
            );

          fearCollapseBudget =
            Math.max(
              0,
              (fearCollapseBudget || 0) - 2.4
            );

          alohaSaturation =
            Math.min(
              1,
              (alohaSaturation || 0) + 0.006
            );

          culturalResilience =
            Math.min(
              1,
              (culturalResilience || 0) + 0.004
            );

          governorInterventionNeed =
            Math.max(
              0,
              (governorInterventionNeed || 1) - 0.006
            );

          window.fearLevel =
            fearLevel;

          window.fearCollapseBudget =
            fearCollapseBudget;

          window.alohaSaturation =
            alohaSaturation;

          window.culturalResilience =
            culturalResilience;

          window.governorInterventionNeed =
            governorInterventionNeed;

          window.classTransitionsUp =
            classTransitionsUp;

          window.recentUpwardClassTransitions =
            recentUpwardClassTransitions;

          window.recentClassTransitions =
            recentClassTransitions;

          updateStats();
          updateCivilizationGravity();
          exportCleanSimState();

          console.log(
            "[ANΔ³BELLE RECOVERY PULSE]",
            "remaining:",
            window.anabelleRecoveryPulse,
            "fear:",
            fearLevel
          );
        }, 250);
    }

    if (window.deltaActive === false) {
      console.log(
        "[GOVERNANCE COMMAND] Δ³ taper started"
      );

      if (window.__anabelleRecoveryPulseTimer) {
        clearInterval(window.__anabelleRecoveryPulseTimer);
        window.__anabelleRecoveryPulseTimer = null;
      }

      if (window.__anabelleTaperTimer) {
        clearInterval(window.__anabelleTaperTimer);
      }

      window.__anabelleTaperTimer =
        setInterval(() => {
          const currentHealing =
            Number(window.healingLevel ?? healingLevel ?? healingIntensity ?? 0);

          const currentCollaboration =
            Number(window.collaborationLevel ?? collaborationLevel ?? collaborationBlend ?? 0.5);

          const fieldRdi =
            Number(window.currentRDI ?? window.rdi ?? 1);

          const healingFloor =
            fieldRdi < 0.24
              ? 0.20
              : 0.55;

          const collaborationFloor =
            fieldRdi < 0.24
              ? 0.55
              : 0.72;

          const nextHealing =
            Math.max(
              healingFloor,
              currentHealing - 0.018
            );

          const nextCollaboration =
            Math.max(
              collaborationFloor,
              currentCollaboration - 0.014
            );

          setHealing(nextHealing);
          setCollaboration(nextCollaboration);

          window.anabelleRecoveryPulse =
            0;

          console.log(
            "[ANΔ³BELLE TAPER]",
            "healing:",
            nextHealing.toFixed(3),
            "collaboration:",
            nextCollaboration.toFixed(3)
          );

          if (
            nextHealing <= 0.35 &&
            nextCollaboration <= 0.60
          ) {
            clearInterval(window.__anabelleTaperTimer);
            window.__anabelleTaperTimer = null;

            console.log(
              "[ANΔ³BELLE TAPER] complete — field carrying itself"
            );
          }
        }, 500);
    }

    console.log(
      "[GOVERNANCE COMMAND] Δ³ active:",
      window.deltaActive
    );

    return;
  }

  if (type === "set_care_pressure") {
    const pressure =
      Math.max(
        -1,
        Math.min(
          1,
          Number(value) || 0
        )
      );

    const currentHealing =
      Number(window.healingLevel ?? healingLevel ?? healingIntensity ?? 0);

    const currentCollaboration =
      Number(window.collaborationLevel ?? collaborationLevel ?? collaborationBlend ?? 0.5);

      // ======================================================
    // CARE SATURATION REFLEX
    // ------------------------------------------------------
    // Even if the dashboard keeps sending positive care,
    // the field should resist over-governance once care is
    // already strong and fear is low.
    // ======================================================

    const fearNow =
      Number(window.fearLevel ?? fearLevel ?? 0);

    const careAlreadySaturated =
      currentHealing >= 0.70 &&
      currentCollaboration >= 0.85;

    const fieldRdiForCareReflex =
      Number(window.currentRDI ?? window.rdi ?? 1);

    const fieldNoLongerInEmergency =
      fearNow <= 0.18 &&
      fieldRdiForCareReflex < 0.255;

    let effectivePressure =
      pressure;

    if (
      pressure > 0 &&
      careAlreadySaturated === true &&
      fieldNoLongerInEmergency === true
    ) {
      effectivePressure =
        -0.45;

      console.log(
        "[GOVERNANCE COMMAND] Care saturation reflex: converting positive care to taper",
        "incoming:",
        pressure.toFixed(3),
        "effective:",
        effectivePressure.toFixed(3),
        "fear:",
        fearNow.toFixed(3),
        "RDI:",
        fieldRdiForCareReflex.toFixed(3)
      );
    }

    const healingStep =
      effectivePressure >= 0
        ? 0.10 * effectivePressure
        : 0.14 * effectivePressure;

    const collaborationStep =
      effectivePressure >= 0
        ? 0.08 * effectivePressure
        : 0.07 * effectivePressure;

    const nextHealing =
      Math.max(
        0,
        Math.min(
          1,
          currentHealing + healingStep
        )
      );

    const nextCollaboration =
      Math.max(
        0,
        Math.min(
          1,
          currentCollaboration + collaborationStep
        )
      );

    setHealing(nextHealing);
    setCollaboration(nextCollaboration);

    console.log(
      "[GOVERNANCE COMMAND] Care pressure adjusted:",
      "pressure:",
      effectivePressure.toFixed(3),
      "healing:",
      nextHealing.toFixed(3),
      "collaboration:",
      nextCollaboration.toFixed(3)
    );

    return;
  }

  if (type === "add_fear") {
    const amount =
      Number(value) || 0;

    fearLevel =
      Math.max(
        0,
        Math.min(
          1,
          (fearLevel || 0) + amount
        )
      );

    fearCollapseBudget =
      Math.min(
        FEAR_COLLAPSE_BUDGET_MAX,
        fearCollapseBudget + (amount * 100)
      );

    recoverabilityShockDisplayTimer =
      RECOVERABILITY_SHOCK_DISPLAY_FRAMES;

    window.fearLevel =
      fearLevel;

    window.fearCollapseBudget =
      fearCollapseBudget;

    console.log(
      "[GOVERNANCE COMMAND] Fear adjusted:",
      fearLevel
    );

    return;
  }

  if (type === "set_redistribution_nudge") {
    window.governanceRedistributionNudge =
      Math.max(
        0,
        Math.min(
          1,
          Number(value) || 0
        )
      );

    console.log(
      "[GOVERNANCE COMMAND] Redistribution nudge:",
      window.governanceRedistributionNudge
    );

    return;
  }

  if (type === "nudge_legitimacy") {
    window.governanceLegitimacy =
      Math.max(
        0,
        Math.min(
          1,
          (window.governanceLegitimacy || 0.5) +
          (Number(value) || 0)
        )
      );

    console.log(
      "[GOVERNANCE COMMAND] Legitimacy:",
      window.governanceLegitimacy
    );

    return;
  }

  if (type === "heal_poorest") {
    // Demo fallback:
    // If rapid localStorage commands overwrite everything except
    // heal_poorest, this command becomes the recovery ignition key.
    if (window.deltaActive !== true) {

      window.deltaActive =
        true;

      

      if (typeof setDemoMobilityMode === "function") {
        setDemoMobilityMode(true);
      }

      window.anabelleRecoveryPulse =
        Math.max(
          window.anabelleRecoveryPulse || 0,
          90
        );

      console.log(
        "[GOVERNANCE COMMAND] heal_poorest triggered Δ³ fallback pulse:",
        window.anabelleRecoveryPulse
      );
    }

    const count =
      Math.max(
        50,
        Math.floor(Number(value) || 50)
      );

    const poorest =
      nodes
        .filter(n => n && n.alive)
        .sort((a, b) => {
          return (
            (a.economicStrata || 1) -
            (b.economicStrata || 1)
          );
        })
        .slice(0, count);

    for (const n of poorest) {
      n.survivability =
        Math.max(
          n.survivability || 0,
          0.72
        );

      n.supportContinuity =
        Math.max(
          n.supportContinuity || 0,
          0.62
        );

      n.mobilityReadiness =
        Math.max(
          n.mobilityReadiness || 0,
          0.55
        );

      n.sustainedMobilityReadiness =
        Math.max(
          n.sustainedMobilityReadiness || 0,
          0.35
        );
    }

    console.log(
      "[GOVERNANCE COMMAND] Healed poorest:",
      poorest.length
    );

    return;
  }

  console.warn(
    "[GOVERNANCE COMMAND] Unsupported command:",
    command
  );
}

// Catch rapid localStorage commands from the dashboard tab immediately.
// This prevents command overwrite from hiding earlier commands.
window.addEventListener("storage", function(event) {
  if (event.key !== "grassroots_economy_command") return;

  processGovernanceCommand(event.newValue);
});

// ==========================================================
// DRAW LOOP
// ==========================================================

function draw() {

  if (!frameReady) return;

  const now =
    millis();

  if (now - lastFrameTime < FRAME_INTERVAL) {
    return;
  }

  lastFrameTime =
    now;

  background(0);

  if (!hasLaunched) {

    push();

    fill(170);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(20);
    text(
      "PRESS 'LAUNCH ECONOMY' TO BEGIN",
      width / 2,
      height / 2
    );

    pop();

    return;
  }

  processGovernanceCommand();
readGovernanceTargets();
updateGovernanceTargetEasing();

if (!isPaused && isGrowing) {
  for (let i = 0; i < simSpeedMultiplier; i++) {
    updateCivilization();
updateStats();
updateCivilizationGravity();
updateAlohaCareMemory();
updateFieldSelfMaintenanceMemory();

// Auto Shock:
// Randomized recurring fear shocks for recoverability testing.
// Uses frame timing so it respects sim runtime.
if (autoShockEnabled === true) {
  if (
    nextAutoShockFrame === 0 ||
    frameCount >= nextAutoShockFrame
  ) {
    triggerFear();

    lastAutoShockFrame =
      frameCount;

    nextAutoShockFrame =
      frameCount +
      Math.floor(
        random(
          AUTO_SHOCK_MIN_INTERVAL_FRAMES,
          AUTO_SHOCK_MAX_INTERVAL_FRAMES
        )
      );

    console.log(
      "⚡ AUTO SHOCK fired. Next shock at frame:",
      nextAutoShockFrame
    );
  }
}

updateCommensurationFlow();
updateStructureBalanceEvolution();
updateStructureLifecycle();
replenishDeadStructures();
updateStructureSurvivabilityEffects();
updateSurvivabilityAdaptation();
  }
} else {
  updateStats();
updateCivilizationGravity();
updateAlohaCareMemory();
updateFieldSelfMaintenanceMemory();
updateCommensurationFlow();
updateSurvivabilityAdaptation();
}

exportCleanSimState();
updateLegacyDashboard();

drawFearShockBloom();
drawBeings();
drawStatsPanel();
}

// ==========================================================
// CIVILIZATION GRAVITY CALCULATION
// Calculates hidden field pressures without changing beings yet.
// ==========================================================

function updateCivilizationGravity() {
  if (!window.__cleanSimStats) return;

  const stats = window.__cleanSimStats;
  const classStats = stats.classStats || {};

  const living =
    Math.max(1, stats.livingCount || 0);

  const lowerShare =
    (classStats.lower || 0) / living;

  const middleShare =
    (classStats.middle || 0) / living;

  const upperShare =
    (classStats.upper || 0) / living;

  const eliteShare =
    (classStats.elite || 0) / living;

  // Broad viability comes mostly from a strong middle,
  // some upper stability, and only a small elite contribution.
  const broadViability =
    (middleShare * 0.60) +
    (upperShare * 0.25) +
    (eliteShare * 0.05);

  // Lower-class concentration creates drag on recoverability.
  const fragilityDrag =
    lowerShare * 0.45;

  const healingBoost =
    -0.12 + (healingLevel * 0.24);

    const collaborationBoost =
    -0.10 + (collaborationLevel * 0.20);

  const rawViabilityPressure =
    0.5 + broadViability - fragilityDrag + healingBoost + collaborationBoost;

  viabilityPressure =
    Math.max(0, Math.min(1, rawViabilityPressure));

  cooperationGravity =
    viabilityPressure;

  extractionGravity =
    1 - viabilityPressure;

    // ==========================================================
  // CHECKPOINT: MOBILITY PRESSURE v1
  // ----------------------------------------------------------
  // Mobility Pressure is calculated from:
  // - Civilization Support
  // - Avg Survivability
  //
  // Meaning:
  // - negative = downward economic gravity
  // - near zero = stable/no strong mobility pressure
  // - positive = upward economic possibility
  //
  // IMPORTANT:
  // This value is currently display/export only.
  // It does NOT move wealth or class yet.
  // ==========================================================

  // ==========================================================
  // CHECKPOINT: MOBILITY MOMENTUM v1
  // ----------------------------------------------------------
  // Mobility Momentum slowly accumulates sustained mobility pressure.
  //
  // Meaning:
  // - negative = sustained downward class/wealth gravity
  // - near zero = no durable mobility trend
  // - positive = sustained upward class/wealth possibility
  //
  // IMPORTANT:
  // This value is currently display/export only.
  // It does NOT move wealth or class yet.
  // ==========================================================

  // ==========================================================
  // CHECKPOINT: MOBILITY WEALTH DRIFT v1
  // ----------------------------------------------------------
  // Mobility Wealth Drift converts sustained mobility momentum
  // into a tiny display-only wealth pressure estimate.
  //
  // Meaning:
  // - negative = wealth wants to drift downward
  // - near zero = wealth wants to remain stable
  // - positive = wealth wants to drift upward
  //
  // IMPORTANT:
  // This value is currently display/export only.
  // It does NOT change actual being wealth yet.
  // It does NOT move classes yet.
  // ==========================================================

    // Mobility Pressure v1:
  // sustained survivability + civilization support create the possibility
  // of economic movement, but this does not move classes yet.
  const avgSurvivability =
    window.__cleanSimStats
      ? (window.__cleanSimStats.averageSurvivability || 0)
      : 0;

  const netStructureSupport =
    window.__cleanSimStats
      ? (window.__cleanSimStats.averageNetStructureSupport || 0)
      : 0;

  const structureMobilityEffect =
  Math.max(
    -0.18,
    Math.min(
      0.18,
      netStructureSupport * 0.035
    )
  );

  const rawMobilityPressure =
    ((viabilityPressure * 0.45) + (avgSurvivability * 0.35)) -
    0.50 +
    structureMobilityEffect;

  mobilityPressure =
    Math.max(-0.25, Math.min(0.25, rawMobilityPressure));
    // Mobility Momentum v1:
  // Slowly accumulates sustained mobility pressure.
  // This is display/export only for now.
  mobilityMomentum =
    Math.max(
      -1,
      Math.min(
        1,
        (mobilityMomentum * 0.995) + (mobilityPressure * 0.005)
      )
    );

    // Mobility Wealth Drift v1:
  // Display-only estimate of tiny wealth pressure.
  // Does NOT change actual being wealth yet.
  mobilityWealthDrift =
    Math.max(
      -0.02,
      Math.min(
        0.02,
        mobilityMomentum * 0.02
      )
    );

    // ==========================================================
  // CHECKPOINT: WEALTH SYNC PRESSURE v1
  // ----------------------------------------------------------
  // Wealth Sync Pressure measures whether real wealth should
  // begin following shadow mobility wealth.
  //
  // Meaning:
  // - negative = real wealth has tiny downward sync pressure
  // - near zero = real wealth should remain stable
  // - positive = real wealth has tiny upward sync pressure
  //
  // IMPORTANT:
  // This is still display/export only.
  // It does NOT change real n.wealth yet.
  // It does NOT move class yet.
  // ==========================================================

    // Wealth Sync Pressure v1:
  // Measures how strongly real wealth should follow shadow wealth.
  // This does NOT change real wealth yet.
  const shadowGap =
    window.__cleanSimStats
      ? ((window.__cleanSimStats.totalMobilityWealth || 0) - (window.__cleanSimStats.totalWealth || 0))
      : 0;

  wealthSyncPressure =
    Math.max(
      -0.005,
      Math.min(
        0.005,
        shadowGap * 0.000001
      )
    );

  // Expose hidden gravity values for browser-console debugging.
  window.viabilityPressure = viabilityPressure;
  window.cooperationGravity = cooperationGravity;
  window.extractionGravity = extractionGravity;
  window.healingLevel = healingLevel;
  window.collaborationLevel = collaborationLevel;
  window.mobilityPressure = mobilityPressure;
window.mobilityMomentum = mobilityMomentum;
window.mobilityWealthDrift = mobilityWealthDrift;
window.wealthSyncPressure = wealthSyncPressure;
window.realWealthSyncEnabled = realWealthSyncEnabled;
window.classMobilityEnabled = classMobilityEnabled;
window.classMobilityTestMode = classMobilityTestMode;
window.classMobilityCalibrationMode =
  classMobilityCalibrationMode;
window.classTransitionsUp = classTransitionsUp;
window.classTransitionsDown = classTransitionsDown;
window.classEligibleUp =
  classEligibleUp;
window.classEligibleDown =
  classEligibleDown;
window.haloFieldEffect =
  -0.18 + (viabilityPressure * 0.36);
}

// ==========================================================
// CHECKPOINT: SURVIVABILITY LAYER v1
// ----------------------------------------------------------
// Healing + Collaboration affect Civilization Support.
// Civilization Support affects actual survivability over time.
// Survivability affects halo thickness.
// Wealth, class, and population do NOT change in this layer.
// Calibrated plateau band:
// Low support     ≈ 0.411
// Neutral support ≈ 0.491
// High support    ≈ 0.569
// ==========================================================

// ==========================================================
// SURVIVABILITY ADAPTATION
// Slowly changes actual being survivability based on the hidden field.
// Does NOT change class, wealth, or population.
// ==========================================================

// ==========================================================
// STRUCTURE SURVIVABILITY EFFECTS v1
// ----------------------------------------------------------
// Invisible care/harm structures slowly affect survivability.
//
// Care structures:
// - increase embeddedness / survivability nearby
//
// Harm structures:
// - reduce embeddedness / survivability nearby
//
// This affects halos over time.
// It does NOT change class, wealth, or population.
// ==========================================================

// ==========================================================
// STRUCTURE BALANCE EVOLUTION v1
// ----------------------------------------------------------
// Civilization has fixed institutional bandwidth:
// care + harm structures always = 100.
//
// Healing/collaboration can convert harm → care.
// Fear/competition can convert care → harm.
//
// This changes the care/harm ratio over time.
// It does NOT create or destroy structures.
// ==========================================================

function updateStructureLifecycle() {
  if (!structures || structures.length === 0) return;

  const healingValue =
    constrain(
      window.healingLevel || healingLevel || healingIntensity || 0,
      0,
      1
    );

  const collaborationValue =
    constrain(
      window.collaborationLevel || collaborationLevel || collaborationBlend || 0.5,
      0,
      1
    );

  const fearValue =
    constrain(
      fearLevel || 0,
      0,
      1
    );

  const careClimate =
    (healingValue * 0.60) +
    (collaborationValue * 0.40);

  for (const s of structures) {
    if (!s || !s.alive) continue;

    s.age =
      (s.age || 0) + 1;

    if (typeof s.life !== "number") {
      s.life =
        STRUCTURE_MAX_LIFE;
    }

    if (typeof s.decayRate !== "number") {
      s.decayRate =
        STRUCTURE_BASE_DECAY;
    }

    if (typeof s.gravityStrength !== "number") {
      s.gravityStrength =
        s.strength || 1;
    }

    let decay =
      s.decayRate;

    if (s.valence === "care") {
      decay *=
        map(
          careClimate,
          0,
          1,
          1.40,
          0.45
        );

      s.life +=
        careClimate * STRUCTURE_CARE_RENEWAL;
    }

    if (s.valence === "harm") {
      decay *=
        map(
          fearValue,
          0,
          1,
          1.20,
          0.45
        );

      decay +=
        careClimate * STRUCTURE_HARM_STRESS_DECAY;
    }

    s.life -=
      decay;

    s.life =
      constrain(
        s.life,
        0,
        STRUCTURE_MAX_LIFE
      );

    const lifeRatio =
      s.life / STRUCTURE_MAX_LIFE;

    s.gravityStrength =
      constrain(
        lerp(
          STRUCTURE_MIN_GRAVITY,
          STRUCTURE_MAX_GRAVITY,
          lifeRatio
        ),
        STRUCTURE_MIN_GRAVITY,
        STRUCTURE_MAX_GRAVITY
      );

    if (s.life <= 0) {
      s.alive =
        false;
    }
  }
}

function replenishDeadStructures() {
  if (!Array.isArray(structures)) return;

  const deadStructures =
    structures.filter(
      s => s && s.alive === false
    );

  if (deadStructures.length <= 0) return;

  const healing =
    window.healingLevel || 0;

  const collaboration =
    window.collaborationLevel || 0.5;

  const careMemory =
    window.alohaCareMemory || 0;

  const fear =
    fearLevel || 0;

  const careClimate =
    (healing * 0.42) +
    (collaboration * 0.32) +
    (careMemory * 0.26);

  const harmClimate =
    (fear * 0.45) +
    ((1 - collaboration) * 0.35) +
    ((1 - careMemory) * 0.20);

  const careBirthChance =
    constrain(
      0.35 + ((careClimate - harmClimate) * 0.45),
      0.12,
      0.88
    );

  const selected =
    deadStructures[
      Math.floor(random(deadStructures.length))
    ];

  const rebornAsCare =
    random() < careBirthChance;

  selected.valence =
    rebornAsCare ? "care" : "harm";

  selected.x =
    structureRand(strataFieldWidth * 0.12, strataFieldWidth * 0.88);

  selected.y =
    structureRand(strataFieldHeight * 0.15, strataFieldHeight * 0.85);

  selected.age =
    0;

  selected.alive =
    true;

  if (rebornAsCare) {
    selected.strength =
      structureRand(0.58, 0.92);

    selected.gravityStrength =
      structureRand(0.65, 1.00);

    selected.life =
      STRUCTURE_MAX_LIFE *
      structureRand(0.52, 0.82);

    selected.decayRate =
      STRUCTURE_BASE_DECAY *
      structureRand(0.85, 1.22);
  } else {
    selected.strength =
      structureRand(0.52, 0.88);

    selected.gravityStrength =
      structureRand(0.78, 1.16);

    selected.life =
      STRUCTURE_MAX_LIFE *
      structureRand(0.50, 0.86);

    selected.decayRate =
      STRUCTURE_BASE_DECAY *
      structureRand(0.85, 1.32);
  }

  console.log(
    "Structure replenished:",
    rebornAsCare ? "care" : "harm"
  );
}

function updateStructureBalanceEvolution() {
  if (!structures || structures.length === 0) return;

  const structureClock =
  window.civilizationHeartbeat || frameCount || 0;

// Cooldown is checked after healing/collaboration are read.
// Strong care regimes are allowed to transform institutions faster.

  const healingValue =
    constrain(
      window.healingLevel || healingLevel || healingIntensity || 0,
      0,
      1
    );

  const collaborationValue =
    constrain(
      window.collaborationLevel || collaborationLevel || collaborationBlend || 0.5,
      0,
      1
    );

  const fearValue =
    constrain(
      fearLevel || 0,
      0,
      1
    );

  const careCount =
    structures.filter(
      s => s && s.alive && s.valence === "care"
    ).length;

  const harmCount =
    structures.filter(
      s => s && s.alive && s.valence === "harm"
    ).length;

  const total =
    Math.max(
      1,
      careCount + harmCount
    );

  const careRatio =
    careCount / total;

  const harmRatio =
    harmCount / total;

    // ==========================================================
// REALISTIC STRUCTURE BAND v1
// ----------------------------------------------------------
// A mature care regime should not require 100/0 care/harm.
// Utopia is not the absence of harm.
// It is harm no longer being in charge.
// ==========================================================

const realisticCareCeiling =
  0.94;

const realisticCareFloor =
  0.18;

  // Collaboration is a polarity slider:
// 0.0 = competitive pressure
// 0.5 = mixed baseline
// 1.0 = collaborative pressure
const collaborativeStructurePressure =
  constrain(
    (collaborationValue - 0.5) * 2,
    0,
    1
  );

const competitiveStructurePressure =
  constrain(
    (0.5 - collaborationValue) * 2,
    0,
    1
  );

// Healing is active repair.
// Collaboration above center helps reform.
// Competition below center helps corruption.
// At collaboration midpoint and healing 0,
// existing structure ratio should not automatically collapse.
const careConversionPressure =
  (healingValue * 0.48) +
  (collaborativeStructurePressure * 0.30) +
  (careRatio * 0.10);

const harmConversionPressure =
  (fearValue * 0.20) +
  (competitiveStructurePressure * 0.32) +
  (harmRatio * 0.08);

const baselineStructureBias =
  0.08;

const netConversionPressure =
  careConversionPressure -
  harmConversionPressure +
  baselineStructureBias;

  // Demo-paced institutional acceleration:
// Strong healing + strong collaboration should transform
// structures early enough for viewers to see downstream effects.
const structureCareAcceleration =
  constrain(
    (
      Math.max(
        0,
        healingValue - 0.30
      ) *
      1.55
    ) +
    (
      Math.max(
        0,
        collaborativeStructurePressure - 0.20
      ) *
      1.20
    ),
    0,
    2.25
  );

const acceleratedNetConversionPressure =
  netConversionPressure *
  (
    1 +
    structureCareAcceleration
  );

  const dynamicStructureConversionCooldown =
  Math.max(
    18,
    Math.round(
      STRUCTURE_CONVERSION_COOLDOWN /
      (
        1 +
        structureCareAcceleration
      )
    )
  );

if (
  structureClock - lastStructureConversionFrame <
  dynamicStructureConversionCooldown
) {
  return;
}

   

 if (
    acceleratedNetConversionPressure > 0.10 &&
    harmCount > 0 &&
    careRatio < realisticCareCeiling
  ) {

    if (convertOneHarmToCare()) {
      lastStructureConversionFrame =
        structureClock;
    }

    return;
  }

  if (
    acceleratedNetConversionPressure < -0.10 &&
    careCount > 0 &&
    careRatio > realisticCareFloor
  ) {

    if (convertOneCareToHarm()) {
      lastStructureConversionFrame =
        structureClock;
    }
  }
}

function updateStructureSurvivabilityEffects() {
  if (!nodes || nodes.length === 0) return;
  if (!structures || structures.length === 0) return;

  for (const n of nodes) {
    if (!n || !n.alive) continue;

    let carePressure =
      0;

    let harmPressure =
      0;

    for (const s of structures) {
      if (!s || !s.alive) continue;

      const dx =
        s.x - n.x;

      const dy =
        s.y - n.y;

      const distSq =
        (dx * dx) + (dy * dy);

      if (
        distSq <= 0 ||
        distSq > STRUCTURE_GRAVITY_RADIUS * STRUCTURE_GRAVITY_RADIUS
      ) {
        continue;
      }

      const dist =
        Math.sqrt(distSq);

      const falloff =
  1 - (dist / STRUCTURE_GRAVITY_RADIUS);

      const influence =
        falloff * (s.strength || 0.5);

      if (s.valence === "care") {
        carePressure +=
          influence;
      }

      if (s.valence === "harm") {
        harmPressure +=
          influence;
      }
    }

    n.carePressure =
      carePressure;

    n.harmPressure =
      harmPressure;

    const healingValue =
      constrain(
        window.healingLevel || healingLevel || healingIntensity || 0,
        0,
        1
      );

    const collaborationValue =
      constrain(
        window.collaborationLevel || collaborationLevel || collaborationBlend || 0.5,
        0,
        1
      );

    const careEffectiveness =
      map(
        (healingValue * 0.50) + (collaborationValue * 0.20) + ((alohaSaturation || 0) * 0.30),
        0,
        1,
        0.60,
        1.65
      );

    const harmEffectiveness =
      map(
        (healingValue * 0.45) + (collaborationValue * 0.20) + ((alohaSaturation || 0) * 0.35),
        0,
        1,
        1.50,
        0.62
      );

    const netStructureSupport =
  (carePressure * careEffectiveness) -
  (harmPressure * harmEffectiveness);

n.netStructureSupport =
  netStructureSupport;

n.survivability =
  constrain(
    (n.survivability || 0) + (netStructureSupport * 0.00012),
    0.03,
    0.97
  );
  }
}

function updateSurvivabilityAdaptation() {
  if (!nodes || !nodes.length) return;

  const support =
    constrain(window.viabilityPressure || 0.5, 0, 1);

  // Convert field support into a small target shift.
  // Low support pulls survivability down.
  // High support pulls survivability up.
  const targetShift =
    map(
      support,
      0,
      1,
      -0.18,
      0.18
    );

  for (const n of nodes) {
    if (!n || !n.alive) continue;

    const current =
      constrain(n.survivability || 0, 0, 1);

    const strataBuffer =
      map(
        n.economicStrata || 1,
        1,
        7,
        -0.05,
        0.05
      );

    // Survivability moves toward a field-shaped baseline,
    // instead of compounding endlessly from the current value.
    const baselineSurvivability =
      0.50;

    const target =
      constrain(
        baselineSurvivability + targetShift + strataBuffer,
        0,
        1
      );

    // Very slow movement toward target.
// Aloha/cultural resilience helps the field recover faster
// after stress, without making recovery instant.
const alohaRecoveryBoost =
  Math.max(
    0,
    Math.min(
      0.006,
      ((alohaSaturation || 0) * 0.003) +
      ((culturalResilience || 0) * 0.003)
    )
  );

const recoveryRate =
  0.002 + alohaRecoveryBoost;

n.survivability =
  lerp(
    current,
    target,
    recoveryRate
  );
  }
}

// ==========================================================
// CIVILIZATION UPDATE
// ==========================================================

// ==========================================================
// CLASS GRAVITY v1
// ----------------------------------------------------------
// Visual-only gravity that gently pulls beings toward broad
// economic zones based on their current economic strata.
// This does NOT change wealth, class, survivability, or stats.
// It only makes the canvas reveal class structure.
// ==========================================================

function applyClassGravity(n) {
  if (!n || !n.alive) return;

  let targetX =
    strataFieldWidth * 0.5;

  if (n.economicStrata <= 2) {
    targetX =
      strataFieldWidth * 0.22;
  } else if (n.economicStrata <= 4) {
    targetX =
      strataFieldWidth * 0.45;
  } else if (n.economicStrata <= 6) {
    targetX =
      strataFieldWidth * 0.68;
  } else {
    targetX =
      strataFieldWidth * 0.86;
  }

  const pull =
    0.0009;

  n.vx +=
    (targetX - n.x) * pull;
}

// ==========================================================
// STRATA NEIGHBORHOOD GRAVITY v1
// ----------------------------------------------------------
// Beings are gently pulled toward their class neighborhood.
// Adjacent class neighborhoods bleed into each other.
// This makes class mobility visually appear as migration.
// ==========================================================

// ==========================================================
// MOBILITY STYLE ASSIGNMENT v1
// ----------------------------------------------------------
// Not every class transition means physical/social relocation.
// Some beings migrate, some rise in place, some become bridges.
// ==========================================================

function assignMobilityStyle(n, oldStrata, newStrata) {
  if (!n) return;

  const healing =
    constrain(
      window.healingLevel || healingLevel || healingIntensity || 0,
      0,
      1
    );

  const collaboration =
    constrain(
      window.collaborationLevel || collaborationLevel || collaborationBlend || 0.5,
      0,
      1
    );

  const alohaValue =
    constrain(
      alohaSaturation || 0,
      0,
      1
    );

  // Collaboration is a polarity slider:
  // 0.0 = competitive pressure
  // 0.5 = mixed baseline
  // 1.0 = collaborative pressure
  const collaborativePressure =
    constrain(
      (collaboration - 0.5) * 2,
      0,
      1
    );

  const competitivePressure =
    constrain(
      (0.5 - collaboration) * 2,
      0,
      1
    );

  const movedUp =
    newStrata > oldStrata;

  const movedDown =
    newStrata < oldStrata;

  const jumpSize =
    Math.abs(
      (newStrata || oldStrata || 1) -
      (oldStrata || 1)
    );

  // Always allow a baseline trickle of visible migration.
  // Collaboration changes the KIND of mobility, not whether
  // movement exists at all.
  let inPlaceChance =
    0.18 +
    (healing * 0.12) +
    (collaborativePressure * 0.10) +
    (alohaValue * 0.08);

  let bridgeChance =
    0.22 +
    (collaborativePressure * 0.16) +
    (healing * 0.06) +
    (alohaValue * 0.08);

  let migrateChance =
    0.26 +
    (competitivePressure * 0.18) +
    (jumpSize * 0.04);

  if (movedUp) {
    // In care regimes, uplift can remain connected
    // to the original community.
    inPlaceChance +=
      (healing * 0.08) +
      (collaborativePressure * 0.08);

    bridgeChance +=
      collaborativePressure * 0.10;

    migrateChance +=
      competitivePressure * 0.06;
  }

  if (movedDown) {
    // Downward movement should usually feel more visibly
    // destabilizing, especially in competitive conditions.
    inPlaceChance -=
      0.08 +
      (competitivePressure * 0.08);

    bridgeChance +=
      collaborativePressure * 0.06;

    migrateChance +=
      0.14 +
      (competitivePressure * 0.16);
  }

  inPlaceChance =
    constrain(
      inPlaceChance,
      0.08,
      0.50
    );

  bridgeChance =
    constrain(
      bridgeChance,
      0.14,
      0.52
    );

  migrateChance =
    constrain(
      migrateChance,
      0.18,
      0.62
    );

  const totalChance =
    Math.max(
      0.001,
      inPlaceChance +
      bridgeChance +
      migrateChance
    );

  inPlaceChance =
    inPlaceChance / totalChance;

  bridgeChance =
    bridgeChance / totalChance;

  const roll =
    random();

  let style =
    "migrate";

  if (roll < inPlaceChance) {
    style =
      "in_place";
  } else if (roll < inPlaceChance + bridgeChance) {
    style =
      "bridge";
  }

  n.previousStrata =
    oldStrata;

  n.migrationOriginStrata =
    oldStrata;

  n.migrationTargetStrata =
    newStrata;

  n.migrationBlend =
    0;

  n.mobilityStyle =
    style;

  // Residential migration rule:
  // migrate = moves into the new neighborhood
  // in_place = keeps old neighborhood gravity
  // bridge = lives between old and new neighborhood gravity
  if (style === "migrate") {
    n.residentialStrata =
      newStrata;
  } else {
    n.residentialStrata =
      oldStrata;
  }

  // Camp migration pressure:
  // Class movement creates a temporary pull toward the camp
  // associated with the new economic strata.
  n.campMigrationBlend =
    style === "migrate"
      ? CAMP_MIGRATION_MAX_BLEND
      : style === "bridge"
        ? CAMP_MIGRATION_MAX_BLEND * 0.55
        : CAMP_MIGRATION_MAX_BLEND * 0.18;
}

function findNearestMigrationStructure(n, targetValence) {
  if (!n || !structures || structures.length === 0) return null;

  let bestStructure =
    null;

  let bestScore =
    -Infinity;

  for (const s of structures) {
    if (!s || !s.alive) continue;
    if (s.valence !== targetValence) continue;

    const dx =
      s.x - n.x;

    const dy =
      s.y - n.y;

    const distSq =
      (dx * dx) + (dy * dy);

    if (
      distSq <= 0 ||
      distSq > STRUCTURE_MIGRATION_SEARCH_RADIUS * STRUCTURE_MIGRATION_SEARCH_RADIUS
    ) {
      continue;
    }

    const dist =
      Math.sqrt(distSq);

    const lifeRatio =
      Math.max(
        0,
        Math.min(
          1,
          (s.life || STRUCTURE_MAX_LIFE) / STRUCTURE_MAX_LIFE
        )
      );

    const gravity =
      s.gravityStrength || 1;

    const closeness =
      1 - (dist / STRUCTURE_MIGRATION_SEARCH_RADIUS);

    const score =
      (lifeRatio * 0.45) +
      (gravity * 0.35) +
      (closeness * 0.20);

    if (score > bestScore) {
      bestScore =
        score;

      bestStructure =
        s;
    }
  }

  return bestStructure;
}

function applyCampMigrationPressure(n) {
  if (!CAMP_MIGRATION_PRESSURE_ENABLED) return;
  if (!n || !n.alive) return;
  if (!civicNeighborhoods || civicNeighborhoods.length < 7) return;

  if (typeof n.campMigrationBlend !== "number") {
    n.campMigrationBlend =
      0;
  }

  if (!n.migrationTargetStrata) {
    return;
  }

  const targetCampId =
    Math.max(
      1,
      Math.min(
        7,
        n.migrationTargetStrata || n.economicStrata || 1
      )
    );

  const targetCamp =
    civicNeighborhoods[targetCampId - 1];
    let attractorX =
  targetCamp.x;

let attractorY =
  targetCamp.y;

let usingStructureAttractor =
  false;

if (
  STRUCTURE_MIGRATION_ATTRACTORS_ENABLED === true &&
  n.migrationOriginStrata &&
  n.migrationTargetStrata
) {
  const direction =
    n.migrationTargetStrata - n.migrationOriginStrata;

  const targetValence =
    direction >= 0
      ? "care"
      : "harm";

  const structureAttractor =
    findNearestMigrationStructure(
      n,
      targetValence
    );

  if (structureAttractor) {
    attractorX =
      structureAttractor.x;

    attractorY =
      structureAttractor.y;

    usingStructureAttractor =
      true;
  }
}

  if (!targetCamp) return;

  // Camp migration pressure fades over time.
  // This prevents class mobility from becoming permanent conveyor flow.
  n.campMigrationBlend =
    Math.min(
      CAMP_MIGRATION_MAX_BLEND,
      n.campMigrationBlend || 0
    );

  n.campMigrationBlend *=
    CAMP_MIGRATION_DECAY;

  if (n.campMigrationBlend < 0.01) {
    return;
  }

  const dx =
  attractorX - n.x;

const dy =
  attractorY - n.y;

  n.vx +=
    dx * CAMP_MIGRATION_PULL * n.campMigrationBlend;

  n.vy +=
    dy * CAMP_MIGRATION_PULL * n.campMigrationBlend;

// Arrival rule:
// If a migrating being gets close enough to the target camp,
// the target camp becomes its new civic home.
// Otherwise old-home gravity eventually pulls it back.
if (
  n.mobilityStyle === "migrate" &&
  Math.sqrt((dx * dx) + (dy * dy)) <
    (
      usingStructureAttractor
        ? STRUCTURE_MIGRATION_ARRIVAL_RADIUS
        : 95
    )
) {
  n.neighborhoodId =
    targetCampId;

  n.campMigrationBlend =
    0;

  // Reset the personal lot so the being settles naturally
  // inside the new camp instead of carrying old spatial habits.
  n.civicLotX =
    undefined;

  n.civicLotY =
    undefined;
}

}

function applyLocalClassAnatomy(n) {
  if (!n || !n.alive) return;
  if (!civicNeighborhoods || civicNeighborhoods.length < 7) return;

  const neighborhoodId =
    Math.max(
      1,
      Math.min(
        7,
        n.neighborhoodId || 1
      )
    );

  const home =
    civicNeighborhoods[neighborhoodId - 1];

  if (!home) return;

  const economicStrata =
    Math.max(
      1,
      Math.min(
        7,
        n.economicStrata || 1
      )
    );

  const dominantStrata =
    home.dominantStrata || neighborhoodId;

  const strataGap =
    economicStrata - dominantStrata;

  // Stable local angle per being.
  // This creates repeatable local class pockets,
  // not random confetti every frame.
  if (n.localClassAngle === undefined) {
    const seed =
      ((economicStrata * 97) + (neighborhoodId * 53) + Math.floor(Math.random() * 1000));

    n.localClassAngle =
      (seed % 360) * (Math.PI / 180);
  }

  const offsetDistance =
    Math.min(
      LOCAL_CLASS_MAX_OFFSET,
      Math.abs(strataGap) * LOCAL_CLASS_RING_SPACING
    );

  // Dominant strata stay near the neighborhood core.
  // Different strata form local pockets around the civic body.
  const side =
    strataGap >= 0
      ? 1
      : -1;

  const targetX =
    home.x +
    Math.cos(n.localClassAngle + side * 0.65) *
    offsetDistance;

  const targetY =
    home.y +
    Math.sin(n.localClassAngle + side * 0.65) *
    offsetDistance *
    0.72;

  n.vx +=
    (targetX - n.x) * LOCAL_CLASS_ANATOMY_STRENGTH;

  n.vy +=
    (targetY - n.y) * LOCAL_CLASS_ANATOMY_STRENGTH;
}

function applyCivicNeighborhoodGravity(n) {
  if (!n || !n.alive) return;
  if (!civicNeighborhoods || civicNeighborhoods.length < 7) return;

  const id =
    Math.max(
      1,
      Math.min(
        7,
        n.neighborhoodId || 1
      )
    );

  const home =
    civicNeighborhoods[id - 1];

  if (!home) return;

  // Each being gets a personal civic lot inside its neighborhood.
  // This prevents collapse into a single point while preserving district identity.
  if (n.civicLotX === undefined || n.civicLotY === undefined) {
    const lotAngle =
      Math.random() * Math.PI * 2;

    const lotRadius =
      structureRand(22, 92);

    n.civicLotX =
      Math.cos(lotAngle) * lotRadius;

    n.civicLotY =
      Math.sin(lotAngle) * lotRadius * 0.72;
  }

  let baseX =
  home.x;

let baseY =
  home.y;

// If class mobility created migration pressure,
// blend the being's civic home target toward the camp
// associated with its new economic strata.
if (
  typeof n.campMigrationBlend === "number" &&
  n.campMigrationBlend > 0.01 &&
  n.migrationTargetStrata &&
  civicNeighborhoods[n.migrationTargetStrata - 1]
) {
  const targetCamp =
    civicNeighborhoods[n.migrationTargetStrata - 1];

  const blend =
    Math.max(
      0,
      Math.min(
        CAMP_MIGRATION_MAX_BLEND,
        n.campMigrationBlend
      )
    );

  baseX =
    (home.x * (1 - blend)) +
    (targetCamp.x * blend);

  baseY =
    (home.y * (1 - blend)) +
    (targetCamp.y * blend);
}

const targetX =
  baseX + (n.civicLotX || 0);

const targetY =
  baseY + (n.civicLotY || 0);

  const pull =
    0.00145;

  n.vx +=
    (targetX - n.x) * pull;

  n.vy +=
    (targetY - n.y) * pull;
}

function applyStrataNeighborhoodGravity(n) {
  if (!n || !n.alive) return;
  if (!strataNeighborhoods || strataNeighborhoods.length < 7) return;

  const strata =
  Math.max(
    1,
    Math.min(
      7,
      n.residentialStrata || n.economicStrata || 1
    )
  );

const originStrata =
  Math.max(
    1,
    Math.min(
      7,
      n.migrationOriginStrata || strata
    )
  );

const targetStrata =
  Math.max(
    1,
    Math.min(
      7,
      n.migrationTargetStrata || strata
    )
  );

const originHome =
  strataNeighborhoods[originStrata - 1];

const targetHome =
  strataNeighborhoods[targetStrata - 1];

const home =
  strataNeighborhoods[strata - 1];

if (!home || !originHome || !targetHome) return;

// Each being gets a personal lot inside its residential neighborhood.
// This prevents every node from collapsing toward the same anchor,
// creating islands instead of one long continental shelf.
if (n.residentialLotX === undefined || n.residentialLotY === undefined) {
  const lotAngle =
    random(Math.PI * 2);

  const lotRadius =
    random(18, 86);

  n.residentialLotX =
    Math.cos(lotAngle) * lotRadius;

  n.residentialLotY =
    Math.sin(lotAngle) * lotRadius * 0.72;
}

if (n.migrationBlend < 1) {
  n.migrationBlend =
    Math.min(
      1,
      (n.migrationBlend || 0) + MOBILITY_MIGRATION_SPEED
    );
}

let effectiveBlend =
  n.migrationBlend || 1;

if (n.mobilityStyle === "in_place") {
  effectiveBlend =
    MOBILITY_IN_PLACE_BLEND;
}

if (n.mobilityStyle === "bridge") {
  effectiveBlend =
    MOBILITY_BRIDGE_BLEND;
}

let targetX =
  (originHome.x * (1 - effectiveBlend)) +
  (targetHome.x * effectiveBlend);

let targetY =
  (originHome.y * (1 - effectiveBlend)) +
  (targetHome.y * effectiveBlend);

  // Apply the personal lot offset.
// Neighborhood gravity now pulls beings toward a local region,
// not a single shared point.
targetX +=
  n.residentialLotX || 0;

targetY +=
  n.residentialLotY || 0;

let weight =
  1;

  // Adjacent bleed-through:
  // strata 1 can only bleed upward; strata 7 can only bleed downward.
  const lowerNeighbor =
    strata > 1
      ? strataNeighborhoods[strata - 2]
      : null;

  const upperNeighbor =
    strata < 7
      ? strataNeighborhoods[strata]
      : null;

  if (lowerNeighbor) {
    targetX +=
      lowerNeighbor.x * STRATA_ADJACENT_BLEED;

    targetY +=
      lowerNeighbor.y * STRATA_ADJACENT_BLEED;

    weight +=
      STRATA_ADJACENT_BLEED;
  }

  if (upperNeighbor) {
    targetX +=
      upperNeighbor.x * STRATA_ADJACENT_BLEED;

    targetY +=
      upperNeighbor.y * STRATA_ADJACENT_BLEED;

    weight +=
      STRATA_ADJACENT_BLEED;
  }

  targetX /=
    weight;

  targetY /=
    weight;

  const dx =
    targetX - n.x;

  const dy =
    targetY - n.y;

  n.vx +=
    dx * STRATA_NEIGHBORHOOD_PULL;

  n.vy +=
    dy * STRATA_NEIGHBORHOOD_PULL;
}

// ==========================================================
// MYCELIUM GRAVITY v1
// ----------------------------------------------------------
// Visual-only local clustering.
// Beings gently respond to nearby beings, creating strands,
// corridors, and organic social tissue.
// This does NOT change class, wealth, survivability, or stats.
// ==========================================================

function applyInvisibleEconomicCurrents(n) {
  if (!INVISIBLE_ECONOMIC_CURRENTS_ENABLED) return;
  if (!n || !n.alive) return;
  if (!nodes || nodes.length === 0) return;

  let pullX =
    0;

  let pullY =
    0;

  let repelX =
    0;

  let repelY =
    0;

  let bridgeX =
    0;

  let bridgeY =
    0;

  let pullCount =
    0;

  let repelCount =
    0;

  let bridgeCount =
    0;

  const currentStrata =
    n.economicStrata || 1;

  const healingValue =
    Math.max(
      0,
      Math.min(
        1,
        window.healingLevel || healingLevel || healingIntensity || 0
      )
    );

  const collaborationValue =
    Math.max(
      0,
      Math.min(
        1,
        window.collaborationLevel || collaborationLevel || collaborationBlend || 0.5
      )
    );

  const alohaValue =
    Math.max(
      0,
      Math.min(
        1,
        window.alohaSaturation || alohaSaturation || 0
      )
    );

  const careClimate =
    (healingValue * 0.18) +
    (collaborationValue * 0.52) +
    (alohaValue * 0.30);

  for (const other of nodes) {
    if (!other || !other.alive || other === n) continue;
    if (other.kind && other.kind !== "being") continue;

    const dx =
      other.x - n.x;

    const dy =
      other.y - n.y;

    const distSq =
      (dx * dx) + (dy * dy);

    if (
      distSq <= 0 ||
      distSq > ECONOMIC_CURRENT_RADIUS * ECONOMIC_CURRENT_RADIUS
    ) {
      continue;
    }

    const dist =
      Math.sqrt(distSq);

    const nx =
      dx / dist;

    const ny =
      dy / dist;

    const strataGap =
      Math.abs(
        (other.economicStrata || 1) - currentStrata
      );

    const closeness =
      1 - (dist / ECONOMIC_CURRENT_RADIUS);

    if (strataGap <= 1) {
      pullX +=
        nx * closeness;

      pullY +=
        ny * closeness;

      pullCount++;
    }

    if (dist < 24) {
      repelX -=
        nx * closeness;

      repelY -=
        ny * closeness;

      repelCount++;
    }

    if (
      strataGap >= 2 &&
      careClimate > 0.45
    ) {
      bridgeX +=
        nx * closeness * careClimate;

      bridgeY +=
        ny * closeness * careClimate;

      bridgeCount++;
    }
  }

  if (pullCount > 0) {
    n.vx +=
      (pullX / pullCount) * ECONOMIC_CURRENT_PULL;

    n.vy +=
      (pullY / pullCount) * ECONOMIC_CURRENT_PULL;
  }

  if (repelCount > 0) {
    n.vx +=
      (repelX / repelCount) * ECONOMIC_CURRENT_REPEL;

    n.vy +=
      (repelY / repelCount) * ECONOMIC_CURRENT_REPEL;
  }

  if (bridgeCount > 0) {
    n.vx +=
      (bridgeX / bridgeCount) * ECONOMIC_CURRENT_CROSS_CLASS_BRIDGE;

    n.vy +=
      (bridgeY / bridgeCount) * ECONOMIC_CURRENT_CROSS_CLASS_BRIDGE;
  }

  // Lower-to-middle support current:
// Under care, lower districts develop pathways toward middle viability
// without turning the whole field into a visible migration river.
if (
  careClimate > 0.50 &&
  currentStrata <= 2
) {
  const middleHome =
    strataNeighborhoods[2];

  if (middleHome) {
    const dx =
      middleHome.x - n.x;

    const dy =
      middleHome.y - n.y;

    const distSq =
      (dx * dx) + (dy * dy);

    if (
      distSq > 0 &&
      distSq < LOWER_MIDDLE_BRIDGE_RADIUS * LOWER_MIDDLE_BRIDGE_RADIUS
    ) {
      const dist =
        Math.sqrt(distSq);

      const falloff =
        1 - (dist / LOWER_MIDDLE_BRIDGE_RADIUS);

      n.vx +=
        (dx / dist) * falloff * LOWER_MIDDLE_BRIDGE_PULL * careClimate;

      n.vy +=
        (dy / dist) * falloff * LOWER_MIDDLE_BRIDGE_PULL * careClimate;
    }
  }
}
}

function applyMyceliumGravity(n) {
  if (!n || !n.alive) return;

  let pullX =
    0;

  let pullY =
    0;

  let nearbyCount =
    0;

  const senseRadius =
    95;

  const desiredSpacing =
    34;

    const civicSpacingRadius =
    72;

let civicPushX =
  0;

let civicPushY =
  0;

let civicCrowding =
  0;

  for (const other of nodes) {
    if (!other || !other.alive || other === n) continue;

    const dx =
      other.x - n.x;

    const dy =
      other.y - n.y;

    const distSq =
      (dx * dx) + (dy * dy);

    if (distSq <= 0 || distSq > senseRadius * senseRadius) continue;

    const dist =
      Math.sqrt(distSq);

    const sameOrAdjacentStrata =
      Math.abs((other.economicStrata || 1) - (n.economicStrata || 1)) <= 1;

    const affinity =
      sameOrAdjacentStrata
        ? 1.0
        : 0.22;

    if (dist > desiredSpacing) {
      pullX +=
        (dx / dist) * affinity;

      pullY +=
        (dy / dist) * affinity;
    } else {
      pullX -=
        (dx / dist) * 0.7;

      pullY -=
        (dy / dist) * 0.7;
    }

    // Civic spacing pressure:
// prevents neighborhoods from collapsing into unreadable balls.
if (dist < civicSpacingRadius) {
  const crowdPressure =
    1 - (dist / civicSpacingRadius);

  civicPushX -=
    (dx / dist) * crowdPressure;

  civicPushY -=
    (dy / dist) * crowdPressure;

  civicCrowding++;
}

    nearbyCount++;
  }

  if (nearbyCount > 0) {
  const strength =
    0.006;

  const strandX =
    pullX / nearbyCount;

  const strandY =
    pullY / nearbyCount;

  n.vx +=
    strandX * strength;

  n.vy +=
    strandY * strength;

  // Strand persistence:
  // keeps motion from collapsing into round blobs.
  // This helps clusters stretch into corridors.
  n.vx +=
    (n.vx || 0) * 0.006;

  n.vy +=
    (n.vy || 0) * 0.006;

if (civicCrowding > 0) {
  const civicSpacingStrength =
    0.026;

  n.vx +=
    (civicPushX / civicCrowding) * civicSpacingStrength;

  n.vy +=
    (civicPushY / civicCrowding) * civicSpacingStrength;
}
    
}
}

// ==========================================================
// INVISIBLE STRUCTURE GRAVITY v1
// ----------------------------------------------------------
// Hidden care/harm structures shape the field without being drawn.
//
// Care:
// - gently attracts beings
// - helps create coherent local corridors
//
// Harm:
// - distorts movement sideways
// - fragments smooth clustering
//
// This does NOT change class, wealth, survivability, or stats.
// ==========================================================

function applyInvisibleStructureGravity(n) {
  if (!n || !n.alive) return;
  if (!structures || structures.length === 0) return;

  for (const s of structures) {
    if (!s || !s.alive) continue;

    const dx =
      s.x - n.x;

    const dy =
      s.y - n.y;

    const distSq =
      (dx * dx) + (dy * dy);

    if (
      distSq <= 0 ||
      distSq > STRUCTURE_INFLUENCE_RADIUS * STRUCTURE_INFLUENCE_RADIUS
    ) {
      continue;
    }

    const dist =
      Math.sqrt(distSq);

    const falloff =
      1 - (dist / STRUCTURE_INFLUENCE_RADIUS);

    const strength =
  (s.strength || 0.5) *
  (s.gravityStrength || 1) *
  falloff;

    if (s.valence === "care") {
  // Care supports corridor formation without becoming
  // a hard gravity well.

  const innerRadius =
    44;

  const tangentX =
    -dy / dist;

  const tangentY =
    dx / dist;

  if (dist < innerRadius) {
    // Prevent collapse into tight blobs.
    n.vx -=
      (dx / dist) * strength * 0.010;

    n.vy -=
      (dy / dist) * strength * 0.010;
  } else {
    // Gentle pull toward supportive regions.
    n.vx +=
      (dx / dist) * strength * 0.004;

    n.vy +=
      (dy / dist) * strength * 0.004;

    // Tiny sideways drift creates corridor/shear behavior.
    n.vx +=
      tangentX * strength * 0.0018;

    n.vy +=
      tangentY * strength * 0.0018;
  }
}

    if (s.valence === "harm") {
      // Harm does not simply repel.
      // It twists the field, creating fragmentation and tension.
      const tangentX =
        -dy / dist;

      const tangentY =
        dx / dist;

      n.vx +=
        tangentX * strength * 0.0025;

      n.vy +=
        tangentY * strength * 0.0025;
    }
  }
}

// ==========================================================
// HIDDEN CORRIDOR GRAVITY v1
// ----------------------------------------------------------
// Invisible corridor links create strand tension between beings.
// Links are NOT drawn.
// Beings reveal the network through branching / mycelium motion.
// This does NOT change class, wealth, survivability, or stats.
// ==========================================================

function applyHiddenCorridorGravity() {
  if (!corridorLinks || corridorLinks.length === 0) return;

  for (const link of corridorLinks) {
    if (!link) continue;

    const a =
      nodes[link.from];

    const b =
      nodes[link.to];

    if (!a || !b || !a.alive || !b.alive) continue;

    const dx =
      b.x - a.x;

    const dy =
      b.y - a.y;

    const distSq =
      (dx * dx) + (dy * dy);

    if (distSq <= 0) continue;

    const dist =
      Math.sqrt(distSq);

    const restLength =
  link.restLength || 70;

const stretch =
  dist - restLength;

// Loose-thread rule:
// links only pull when too stretched.
// They do NOT compress or constantly tighten.
if (stretch <= 18) {
  continue;
}

const collaborationValue =
  constrain(
    window.collaborationLevel || collaborationLevel || 0.5,
    0,
    1
  );

  const alohaBridgeMemory =
  Math.max(
    0,
    Math.min(
      1,
      ((alohaSaturation || 0) * 0.65) +
      ((culturalResilience || 0) * 0.35)
    )
  );

const strataGap =
  Math.abs(
    (a.economicStrata || 1) -
    (b.economicStrata || 1)
  );

const sameClassBond =
  strataGap <= 1;

const crossClassBridge =
  strataGap >= 2;

let bridgeMultiplier =
  1.0;

  const fearBridgeDamage =
  Math.max(
    0,
    Math.min(
      0.75,
      (recentFearStress || 0) * 0.55
    )
  );

const bridgeRecoveryProtection =
  Math.max(
    0,
    Math.min(
      0.45,
      ((alohaSaturation || 0) * 0.25) +
      ((culturalResilience || 0) * 0.20)
    )
  );

const bridgeStressPenalty =
  Math.max(
    0,
    fearBridgeDamage - bridgeRecoveryProtection
  );

if (sameClassBond) {
  // Similar/adjacent strata still form local clusters
  // even under competition.
  bridgeMultiplier =
    map(
      collaborationValue,
      0,
      1,
      0.75,
      1.25 + (alohaBridgeMemory * 0.35)
    );
}

if (crossClassBridge) {
  // Cross-class bridges are weak under competition
  // and stronger under collaboration.
  bridgeMultiplier =
    map(
      collaborationValue,
      0,
      1,
      0.12 + (alohaBridgeMemory * 0.08),
      1.85 + (alohaBridgeMemory * 0.55)
    );
}

const force =
  Math.min(
    0.18,
    (stretch - 18) *
    (link.strength || 0.002) *
    bridgeMultiplier *
    (1 - bridgeStressPenalty)
  );

    const fx =
      (dx / dist) * force;

    const fy =
      (dy / dist) * force;

    a.vx +=
      fx;

    a.vy +=
      fy;

    b.vx -=
      fx;

    b.vy -=
      fy;
  }
}

// ==========================================================
// TARGET LOWER BUCKET SHARE v1
// ----------------------------------------------------------
// Archaeology-inspired spine from the old sim:
// care-dominant civilization should know what lower-bucket
// population it is structurally trying to reach.
// ==========================================================

function getTargetLowerBucketShare() {
  const liveCareStructures =
    structures.filter(
      s => s && s.alive && s.valence === "care"
    ).length;

  const liveHarmStructures =
    structures.filter(
      s => s && s.alive && s.valence === "harm"
    ).length;

  const careStructureRatio =
    liveCareStructures /
    Math.max(
      1,
      liveCareStructures + liveHarmStructures
    );

  return constrain(
    map(
      careStructureRatio,
      0.30,
      0.82,
      0.50,
      0.20
    ),
    0.18,
    0.52
  );
}

function updateCivilization() {

  // Hidden civilization heartbeat.
  // This proves the engine is running without changing society yet.
  if (typeof window.civilizationHeartbeat !== "number") {
    window.civilizationHeartbeat = 0;
  }

  window.civilizationHeartbeat++;

  if (
  autoShockEnabled === true &&
  frameCount - lastAutoShockFrame > 900
) {
  if (random() < 0.015) {
    triggerFear();

    lastAutoShockFrame =
      frameCount;
  }
}

  // Hidden corridor links create strand tension across the field.
// This runs once per tick, not once per being.
// applyHiddenCorridorGravity();

  for (const n of nodes) {

    if (!n || !n.alive) continue;

    n.age++;

    // ==========================================================
// GENERATIONAL TURNOVER v1
// ----------------------------------------------------------
// When a being reaches lifespan, the node becomes a descendant.
// Population stays stable, but wealth, class, survivability,
// and planning horizon partially inherit across generations.
// ==========================================================

if (
  n.kind === "being" &&
  n.lifespan &&
  n.age > n.lifespan &&
  random() < 0.0018
) {
  const parentWealth =
    n.wealth || 0;

  const inheritanceRate =
    constrain(
      0.42 +
      ((n.economicStrata || 1) * 0.045) +
      random(-0.08, 0.08),
      0.20,
      0.82
    );

  const inheritedWealth =
    Math.max(
      parentWealth * inheritanceRate,
      2 + ((n.economicStrata || 1) * 1.5)
    );

  n.parentWealth =
    parentWealth;

  n.inheritedWealth =
    inheritedWealth;

  n.wealth =
    Math.max(
      1,
      inheritedWealth
    );

  n.mobilityWealth =
    n.wealth;

  n.age =
    0;

  n.generation =
    (n.generation || 1) + 1;

  n.lifespan =
    Math.round(
      random(
        2600 + ((n.economicStrata || 1) * 420),
        4200 + ((n.economicStrata || 1) * 520)
      )
    );

  n.survivability =
    constrain(
      ((n.survivability || 0.5) * 0.65) +
      (((n.economicStrata || 1) / 7) * 0.25) +
      random(-0.04, 0.04),
      0.05,
      0.95
    );

  n.planningHorizon =
    constrain(
      ((n.planningHorizon || 0.4) * 0.72) +
      (((n.economicStrata || 1) / 7) * 0.18) +
      random(-0.04, 0.04),
      0.05,
      1.0
    );

  n.mobilityReadiness =
    0;

  n.sustainedMobilityReadiness =
    0;

  n.lastClassTransitionAge =
    -999999;
}


    // ==========================================================
    // CHECKPOINT: MOBILITY READINESS v1
    // ----------------------------------------------------------
    // Each being slowly accumulates readiness from sustained
    // mobility wealth drift.
    //
    // Meaning:
    // - negative = being is accumulating downward mobility pressure
    // - near zero = no durable class/wealth transition tendency
    // - positive = being is accumulating upward mobility pressure
    //
    // IMPORTANT:
    // This does NOT move wealth yet.
    // This does NOT move class yet.
    // It only prepares individual beings for future rare transitions.
    // ==========================================================

    // Mobility Readiness v1:
    // Each being slowly accumulates readiness from sustained field drift.
    // This does NOT move wealth or class yet.

    const mobilityReadinessSpeed =
  classMobilityCalibrationMode
    ? 40
    : classMobilityTestMode
      ? 60
      : 1;

    const strataFriction =
      1 / Math.max(1, n.economicStrata || 1);

    const readinessSignal =
      mobilityWealthDrift * strataFriction;

    n.mobilityReadiness =
      Math.max(
        -1,
        Math.min(
          1,
          (n.mobilityReadiness || 0) * 0.998 + readinessSignal * 0.002 * mobilityReadinessSpeed
        )
      );

      // Sustained Mobility Readiness v1:
// slower memory of mobility pressure.
// This prevents class transitions from reacting to tiny short-term flickers.
n.sustainedMobilityReadiness =
  Math.max(
    -1,
    Math.min(
      1,
      (n.sustainedMobilityReadiness || 0) * 0.9995 +
      (n.mobilityReadiness || 0) * 0.0005 * mobilityReadinessSpeed
    )
  );

      // ==========================================================
    // CHECKPOINT: MOBILITY WEALTH SHADOW v1
    // ----------------------------------------------------------
    // Shadow wealth responds slowly to accumulated mobility readiness.
    //
    // Meaning:
    // - n.mobilityWealth can drift before real n.wealth changes
    // - this lets us test economic movement safely
    // - real class and wealth stats remain stable for now
    //
    // IMPORTANT:
    // This does NOT change real n.wealth yet.
    // This does NOT move class yet.
    // ==========================================================

      // Mobility Wealth Shadow v1:
    // Shadow wealth responds very slowly to readiness.
    // This does NOT change real wealth yet.
    // This does NOT change class yet.
    const wealthDriftFactor =
      1 + ((n.mobilityReadiness || 0) * 0.0005);

    n.mobilityWealth =
      Math.max(
        0,
        (n.mobilityWealth || n.wealth || 0) * wealthDriftFactor
      );

      // ==========================================================
// COMMENSURATION MOBILITY SUPPORT v1
// ----------------------------------------------------------
// Healing/collaboration/Aloha repair flow becomes mobility
// support for lower and middle strata.
// This does NOT directly move class.
// It strengthens the shadow conditions that can later earn mobility.
// ==========================================================

if (commensurationFlow > 0) {
  let commensurationShare =
    0;

  if ((n.economicStrata || 1) <= 2) {
    commensurationShare =
      commensurationToLower / Math.max(1, classStats.lower || 1);
  } else if ((n.economicStrata || 1) <= 4) {
    commensurationShare =
      commensurationToMiddle / Math.max(1, classStats.middle || 1);
  } else if ((n.economicStrata || 1) === 5) {
    commensurationShare =
      commensurationToUpper / Math.max(1, classStats.upper || 1);
  }

  if (commensurationShare > 0) {
    n.mobilityWealth =
      Math.max(
        0,
        (n.mobilityWealth || n.wealth || 0) + commensurationShare
      );

    n.mobilityReadiness =
      Math.max(
        -1,
        Math.min(
          1,
          (n.mobilityReadiness || 0) + (
  commensurationShare *
  (
    (n.economicStrata || 1) <= 2
      ? 0.00042
      : 0.00018
  )
)
        )
      );

n.sustainedMobilityReadiness =
  Math.max(
    -1,
    Math.min(
      1,
      (n.sustainedMobilityReadiness || 0) + (
        commensurationShare *
        (
          (n.economicStrata || 1) <= 2
            ? 0.00018
            : 0.00006
        )
      )
    )
  );

  }
}

      // ==========================================================
    // CHECKPOINT: REAL WEALTH SYNC v1
    // ----------------------------------------------------------
    // Real wealth can now follow shadow mobility wealth,
    // but only when realWealthSyncEnabled is explicitly true.
    //
    // Meaning:
    // - shadow wealth moves first
    // - real wealth follows only through a tiny gated sync
    // - class movement is still not enabled
    //
    // IMPORTANT:
    // This is locked behind realWealthSyncEnabled.
    // Default state is false.
    // Class transitions are still NOT allowed.
    // ==========================================================

      // Real Wealth Sync v1:
    // Only runs if the safety switch is explicitly enabled.
    // This allows real wealth to follow shadow wealth very slowly.
    if (realWealthSyncEnabled === true) {
      const realWealth =
        n.wealth || 0;

      const shadowWealth =
        n.mobilityWealth || realWealth;

      n.wealth =
        Math.max(
          0,
          realWealth + ((shadowWealth - realWealth) * 0.0012)
        );
    }

    // ==========================================================
// REAL ECONOMIC METABOLISM v1
// ----------------------------------------------------------
// The economy should breathe even before class migration.
// This is real wealth movement, not dashboard animation.
//
// Care pressure creates broad productive participation.
// Harm pressure extracts and destabilizes.
// Higher strata have higher maintenance/upkeep.
// ==========================================================

const metabolismHealing =
  constrain(
    window.healingLevel || healingLevel || healingIntensity || 0,
    0,
    1
  );

const metabolismCollaboration =
  constrain(
    window.collaborationLevel || collaborationLevel || collaborationBlend || 0.5,
    0,
    1
  );

const metabolismFear =
  constrain(
    fearLevel || 0,
    0,
    1
  );

const metabolismStrata =
  n.economicStrata || 1;

const metabolismCare =
  n.carePressure || 0;

const metabolismHarm =
  n.harmPressure || 0;

const participationYield =
  (
    0.00055 +
    (metabolismCare * 0.00110) +
    (metabolismHealing * 0.00055) +
    (metabolismCollaboration * 0.00070)
  ) *
  (
    metabolismStrata <= 4
      ? 1.18
      : 0.82
  );

const harmExtraction =
  (
    0.00038 +
    (metabolismHarm * 0.00135) +
    (metabolismFear * 0.00080) +
    ((1 - metabolismCollaboration) * 0.00060)
  ) *
  (
    metabolismStrata <= 2
      ? 1.30
      : metabolismStrata <= 4
        ? 0.92
        : 0.48
  );

const upkeepDrag =
  0.00022 +
  (metabolismStrata * 0.000055);

const wealthBeforeMetabolism =
  n.wealth || 0;

const metabolismTotalWealth =
  Math.max(
    1,
    window.__cleanSimStats?.totalWealth || INITIAL_TOTAL_WEALTH
  );

const wealthScale =
  constrain(
    INITIAL_TOTAL_WEALTH /
    Math.max(
      INITIAL_TOTAL_WEALTH,
      metabolismTotalWealth
    ),
    0.08,
    1
  );

const wealthMetabolismRate =
  constrain(
    (
      participationYield -
      harmExtraction -
      upkeepDrag
    ) *
    wealthScale,
    -0.006,
    0.0022
  );

const eliteWealthShareForBrake =
  (
    window.__cleanSimStats?.strataStats?.[6]?.wealth || 0
  ) /
  Math.max(
    1,
    window.__cleanSimStats?.totalWealth || INITIAL_TOTAL_WEALTH
  );

const careCorrectionPressure =
  constrain(
    (
      (metabolismHealing * 0.55) +
      (metabolismCollaboration * 0.45)
    ),
    0,
    1
  );

let eliteConcentrationBrake =
  0;

if (
  metabolismStrata >= 7 &&
  eliteWealthShareForBrake > 0.18
) {
  eliteConcentrationBrake =
    constrain(
      (eliteWealthShareForBrake - 0.18) *
      (
        0.010 +
        (careCorrectionPressure * 0.018)
      ),
      0,
      0.012
    );
}

const adjustedWealthMetabolismRate =
  constrain(
    wealthMetabolismRate - eliteConcentrationBrake,
    -0.010,
    0.0022
  );

n.wealth =
  Math.max(
    0,
    wealthBeforeMetabolism *
    (
      1 +
      adjustedWealthMetabolismRate
    )
  );

n.lastWealthDelta =
  (n.lastWealthDelta || 0) +
  (
    (n.wealth || 0) -
    wealthBeforeMetabolism
  );

  // ==========================================================
// COMMENSURATION WEALTH FLOW v1
// ----------------------------------------------------------
// Healing should not merely make poverty feel better.
// It should visibly rebalance wealth from the top toward
// the bottom, strongest for strata 1–2 and weaker upward.
// ==========================================================

const commensurationHealing =
  constrain(
    window.healingLevel || healingLevel || healingIntensity || 0,
    0,
    1
  );

const commensurationCollaboration =
  constrain(
    window.collaborationLevel || collaborationLevel || collaborationBlend || 0.5,
    0,
    1
  );

const commensurationCollaborativePressure =
  constrain(
    (commensurationCollaboration - 0.5) * 2,
    0,
    1
  );

const commensurationStrength =
  constrain(
    (commensurationHealing * 0.65) +
    (commensurationCollaborativePressure * 0.35),
    0,
    1
  );

if (commensurationStrength > 0.05) {
  const strata =
    n.economicStrata || 1;

  let commensurationRate =
    0;

    // ==========================================================
// CARE-REGIME WEALTH SHAPE ATTRACTOR v1
// ----------------------------------------------------------
// In fear/extraction, wealth climbs toward the elite peak.
// In mature care/Aloha, wealth should form a middle-centered
// hill:
//
//   1 → 2 → 3 → 4 → 3 → 2 → 1
//
// This does not make everyone equal.
// It moves the center of gravity toward broad middle viability.
// ==========================================================

[
    0.07, // strata 1: protected floor, not permanent pooling
    0.11, // strata 2: transition / lift
    0.19, // strata 3: lower-middle strength
    0.25, // strata 4: middle-class peak / productive center
    0.18, // strata 5: healthy upper
    0.09, // strata 6: compressed high-upper concentration
    0.11  // strata 7: defended elite reserve, not domination
  ];

const currentStrataWealthShare =
  (
    window.__cleanSimStats?.strataStats?.[strata - 1]?.wealth || 0
  ) /
  Math.max(
    1,
    window.__cleanSimStats?.totalWealth || INITIAL_TOTAL_WEALTH
  );

const targetStrataWealthShare =
  careWealthTargetShape[
    Math.max(
      0,
      Math.min(
        6,
        strata - 1
      )
    )
  ];

const wealthShapeGap =
  targetStrataWealthShare - currentStrataWealthShare;

    const livingEconomicPopulation =
  nodes.filter(
    b => b && b.alive !== false
  );

const currentLowerBucketShareForWealth =
  livingEconomicPopulation.filter(
    b => (b.economicStrata || 1) <= 2
  ).length /
  Math.max(
    1,
    livingEconomicPopulation.length
  );

// Emergency aid is strongest when the lower bucket is large.
// As the lower bucket falls, commensuration shifts from
// feeding the bottom toward building the middle engine.
const emergencyFloorPressure =
  constrain(
    map(
      currentLowerBucketShareForWealth,
      0.18,
      0.50,
      0.25,
      1.00
    ),
    0.25,
    1.00
  );

const middleBuildPressure =
  constrain(
    map(
      currentLowerBucketShareForWealth,
      0.50,
      0.18,
      0.20,
      1.00
    ),
    0.20,
    1.00
  );

  // Wealth-shape attractor:
// Positive gap means this stratum is below its care-regime target.
// Negative gap means this stratum is above its care-regime target.
const shapeCorrectionRate =
  constrain(
    wealthShapeGap * 0.018,
    -0.00120,
    0.00120
  );

if (strata === 1) {
  // Emergency floor-raising stays active when poverty is high,
  // but tapers as the lower bucket successfully shrinks.
  commensurationRate =
    (0.00095 * emergencyFloorPressure) +
    shapeCorrectionRate;

} else if (strata === 2) {
  // Strata 2 remains the bridge out of poverty.
  // It receives transitional support, but shape correction
  // prevents permanent wealth pooling at the bottom.
  commensurationRate =
    (0.00078 * emergencyFloorPressure) +
    shapeCorrectionRate;

} else if (strata === 3) {
  // Lower-middle strength: should rise, but not become
  // a wealth singularity.
  commensurationRate =
    (0.00018 * middleBuildPressure) +
    shapeCorrectionRate;

} else if (strata === 4) {
  // Middle-class peak: the center of gravity,
  // not a replacement elite tower.
  commensurationRate =
    (0.00024 * middleBuildPressure) +
    shapeCorrectionRate;

} else if (strata === 5) {
  // Healthy upper remains part of the right slope.
  // If strata 5 is below target, help it recover faster.
  commensurationRate =
    shapeCorrectionRate * 2.4;

} else if (strata === 6) {
  // High upper should shrink if excessive,
  // but not disappear.
  // Stronger correction protects the upper slope.
  commensurationRate =
    shapeCorrectionRate * 2.8;

} else if (strata >= 7) {
  // Elite concentration still commensurates,
  // but shape correction prevents total collapse.
  // The care regime compresses elite wealth, but does not erase it.
  commensurationRate =
    shapeCorrectionRate * 3.0;
}

  n.wealth =
    Math.max(
      0,
      (n.wealth || 0) *
      (
        1 +
        (commensurationRate * commensurationStrength)
      )
    );
}

    // ==========================================================
// HEALTHY WEALTH CENTER SYNC v1
// ----------------------------------------------------------
// In a mature care/Aloha regime, wealth gently recenters
// toward strata 4 as the productive middle engine.
// This is slow and does not erase elite wealth instantly.
// ==========================================================

const currentStats =
  window.__cleanSimStats || {};

const currentStrataStats =
  currentStats.strataStats || [];

const currentTotalWealth =
  Math.max(
    1,
    currentStats.totalWealth || 0
  );

const currentEliteWealth =
  currentStrataStats[6]
    ? currentStrataStats[6].wealth || 0
    : 0;

const currentEliteWealthShare =
  currentEliteWealth / currentTotalWealth;

const eliteWealthFloor =
  0.10;

if (healthyWealthCenterStrength > 0.55) {
  const strata =
    n.economicStrata || 1;

  let wealthCenterPull =
    0;

  if (strata <= 2) {
    // Lift the abandoned floor.
    wealthCenterPull =
      0.000035;
  } else if (strata === 3) {
    // Strengthen lower-middle viability.
    wealthCenterPull =
      0.000045;
  } else if (strata === 4) {
    // Strata 4 becomes the healthy economic engine.
    wealthCenterPull =
      0.000075;
  } else if (strata === 5) {
    // Strata 5 remains strong, but not dominant.
    wealthCenterPull =
      0.000015;
  } else if (strata === 6) {
    // High upper wealth gently commensurates downward.
    wealthCenterPull =
      -0.000035;
  } else if (strata >= 7) {
  // Elite wealth remains defended.
  // In healthy care, elite stops dominating,
  // but does not disappear.
  if (currentEliteWealthShare > 0.14) {
    // Above target band: commensurate downward.
    wealthCenterPull =
      -0.000045;
  } else if (currentEliteWealthShare < 0.10) {
    // Below defended floor: rebuild elite reserve.
    wealthCenterPull =
      0.000090;
  } else {
    // Within healthy elite band: mostly hold.
    wealthCenterPull =
      0.000005;
  }
}

  n.wealth =
    Math.max(
      0,
      (n.wealth || 0) *
      (1 + (wealthCenterPull * healthyWealthCenterStrength))
    );
}

    // ==========================================================
    // CHECKPOINT: CLASS MOBILITY v1
    // ----------------------------------------------------------
    // Class mobility allows rare upward/downward economic strata
    // transitions based on sustained mobility readiness.
    //
    // Meaning:
    // - strongly positive readiness may move a being up one stratum
    // - strongly negative readiness may move a being down one stratum
    // - transitions are rare and reset readiness afterward
    //
    // IMPORTANT:
    // This is locked behind classMobilityEnabled.
    // Default state is false.
    // Real wealth sync and class mobility are separate switches.
    // ==========================================================

    // Class Mobility v1:
    // Rare, gated class transitions based on sustained readiness.
    // This only runs when classMobilityEnabled is explicitly true.
    classEligibleUp = 0;
classEligibleDown = 0;
    if (classMobilityEnabled === true) {
        const classTransitionCooldown =
  classMobilityTestMode
    ? 90
    : classMobilityCalibrationMode
      ? 120
      : 900;
      const activeClassMobilityRateLimit =
  classMobilityCalibrationMode
    ? 120
    : classMobilityRateLimit;

const careBandwidth =
  Math.max(
    0,
    Math.min(
      1,
      ((healingLevel || 0) * 0.30) +
      ((collaborationLevel || 0) * 0.25) +
      ((alohaSaturation || 0) * 0.25) +
      ((culturalResilience || 0) * 0.20)
    )
  );

const fearBandwidth =
  Math.max(
    0,
    Math.min(
      1,
      ((recentFearStress || 0) * 0.55) +
      ((fearLevel || 0) * 0.25) +
      ((1 - collaborationLevel) * 0.20)
    )
  );

// Legacy combined limit kept for existing displays.
effectiveClassMobilityRateLimit =
  Math.max(
    5,
    Math.round(
      activeClassMobilityRateLimit * (1 - (careBandwidth * 0.45))
    )
  );

// Directional limits:
// care expands upward mobility bandwidth
// and suppresses downward collapse bandwidth.
effectiveUpwardClassMobilityRateLimit =
  Math.max(
    5,
    Math.round(
      activeClassMobilityRateLimit *
      (1 + (careBandwidth * 1.25))
    )
  );

effectiveDownwardClassMobilityRateLimit =
  Math.max(
    3,
    Math.round(
      activeClassMobilityRateLimit *
      (1 - (careBandwidth * 0.65) + (fearBandwidth * 0.35))
    )
  );

  // High-care demo bandwidth override:
// When the culture-field is deeply saturated with care,
// upward mobility should not be throttled by the old production cap.
// This does not force moves. It only opens the pipe for already-ready beings.
// High-care culture-saturation bandwidth override:
// When the invisible structure field reaches deep Aloha saturation,
// upward mobility should not be throttled by the old production cap.
// This does not force moves. It only opens the pipe for already-ready beings.
const careStructureRatioForBandwidth =
  structures.filter(
    s => s && s.alive && s.valence === "care"
  ).length /
  Math.max(
    1,
    structures.filter(
      s => s && s.alive
    ).length
  );

const highCareMobilityBandwidth =
  constrain(
    map(
      careStructureRatioForBandwidth,
      0.70,
      0.94,
      2.00,
      16.00
    ),
    1.00,
    16.00
  );

if (
  healingLevel >= 0.90 &&
  collaborationLevel >= 0.90 &&
  careStructureRatioForBandwidth >= 0.70
) {
  effectiveUpwardClassMobilityRateLimit =
    Math.max(
      effectiveUpwardClassMobilityRateLimit,
      Math.round(
        activeClassMobilityRateLimit *
        highCareMobilityBandwidth
      )
    );

  effectiveDownwardClassMobilityRateLimit =
    Math.min(
      effectiveDownwardClassMobilityRateLimit,
      3
    );
}

const liveRecentClassTransitions =
  recentClassTransitionWindow.length;

const liveRecentUpwardClassTransitions =
  recentUpwardClassTransitionWindow.length;

const liveRecentDownwardClassTransitions =
  recentDownwardClassTransitionWindow.length;

const classMobilityRateOpen =
  liveRecentClassTransitions < effectiveClassMobilityRateLimit;

const upwardClassMobilityRateOpen =
  liveRecentUpwardClassTransitions < effectiveUpwardClassMobilityRateLimit;

const downwardClassMobilityRateOpen =
  liveRecentDownwardClassTransitions < effectiveDownwardClassMobilityRateLimit;

const ageCooldownOpen =
  ((n.age || 0) - (n.lastClassTransitionAge || -999999)) > classTransitionCooldown;

const canChangeClass =
  classMobilityRateOpen &&
  ageCooldownOpen;

const canMoveUpClass =
  upwardClassMobilityRateOpen &&
  ageCooldownOpen;

const canMoveDownClass =
  downwardClassMobilityRateOpen &&
  ageCooldownOpen;

// Demo readiness recovery:
// In care-dominant calibration, readiness should not be
// aggressively drained every heartbeat.
// Aloha marination means readiness becomes more durable,
// not constantly erased.
if (
  classMobilityCalibrationMode === true &&
  fearLevel < 0.22 &&
  fearCollapseBudget <= 1
) {
  const readinessCareRatio =
    structures.filter(
      s => s && s.alive && s.valence === "care"
    ).length /
    Math.max(
      1,
      structures.filter(
        s => s && s.alive
      ).length
    );

  const readinessRetention =
    constrain(
      map(
        readinessCareRatio,
        0.30,
        0.94,
        0.965,
        0.9985
      ),
      0.965,
      0.9985
    );

  n.mobilityReadiness =
    (n.mobilityReadiness || 0) * readinessRetention;

  n.sustainedMobilityReadiness =
    (n.sustainedMobilityReadiness || 0) *
    Math.max(
      0.955,
      readinessRetention - 0.006
    );
}

  const classReadinessForTransition =
  (
    classMobilityTestMode ||
    classMobilityCalibrationMode
  )
    ? (n.mobilityReadiness || 0)
    : (n.sustainedMobilityReadiness || 0);

    const localStructureSupport =
  constrain(
    n.netStructureSupport || 0,
    -3,
    3
  );

const thresholdSupportEffect =
  constrain(
    localStructureSupport * 0.000025,
    -0.00008,
    0.00008
  );

const careStructureRatioForThreshold =
  structures.filter(
    s => s && s.alive && s.valence === "care"
  ).length /
  Math.max(
    1,
    structures.filter(
      s => s && s.alive
    ).length
  );

const lowerStrataThresholdRelief =
  (n.economicStrata || 1) <= 2
    ? constrain(
        map(
          careStructureRatioForThreshold,
          0.42,
          0.82,
          0,
          0.42
        ),
        0,
        0.42
      )
    : (n.economicStrata || 1) === 3
      ? constrain(
          map(
            careStructureRatioForThreshold,
            0.48,
            0.82,
            0,
            0.20
          ),
          0,
          0.20
        )
      : 0;

const upwardReadinessThreshold =
  classMobilityTestMode
    ? 0.00001
    : classMobilityCalibrationMode
      ? 0.0001 - thresholdSupportEffect
      : Math.max(
          0.24,
          0.65 -
          lowerStrataThresholdRelief -
          (thresholdSupportEffect * 1000)
        );

const downwardReadinessThreshold =
  classMobilityTestMode
    ? -0.000001
    : classMobilityCalibrationMode
      ? -0.00008 - thresholdSupportEffect
      : -0.65 - (thresholdSupportEffect * 1000);

      const downwardSurvivabilityRiskMultiplier =
  (n.survivability || 0) < downwardMobilitySurvivabilityRisk
    ? 2.0
    : 1.0;

    const alohaMobilityProtection =
  Math.max(
    0,
    Math.min(
      0.55,
      ((alohaSaturation || 0) * 0.30) +
      ((culturalResilience || 0) * 0.25)
    )
  );

  const downwardAlohaDamping =
  1 - alohaMobilityProtection;

// Baseline mobility trickle:
// Even without active healing, a mixed economy is not frozen.
// People still rise, fall, relocate, lose jobs, find opportunity,
// inherit, burn out, recover, or slip through cracks.
const collaborationPolarity =
  constrain(
    window.collaborationLevel || collaborationLevel || collaborationBlend || 0.5,
    0,
    1
  );

const collaborativeMobilityField =
  constrain(
    (collaborationPolarity - 0.5) * 2,
    0,
    1
  );

const competitiveMobilityField =
  constrain(
    (0.5 - collaborationPolarity) * 2,
    0,
    1
  );

  // Commensuration mobility boost:
// In a strong care regime, downward redistribution should
// become real escape capacity for the lower strata.
// This is not charity. It is structural rebalancing.
const liveCareStructuresForMobility =
  structures.filter(
    s => s && s.alive && s.valence === "care"
  ).length;

const liveHarmStructuresForMobility =
  structures.filter(
    s => s && s.alive && s.valence === "harm"
  ).length;

const careStructureRatioForMobility =
  liveCareStructuresForMobility /
  Math.max(
    1,
    liveCareStructuresForMobility +
    liveHarmStructuresForMobility
  );

const institutionalCareMultiplier =
  constrain(
    map(
      careStructureRatioForMobility,
      0.30,
      0.94,
      0.45,
      4.40
    ),
    0.35,
    4.60
  );

const commensurationCareRegime =
  constrain(
    (
      ((window.healingLevel || healingLevel || healingIntensity || 0) * 0.50) +
      (collaborativeMobilityField * 0.30) +
      (careStructureRatioForMobility * 0.20)
    ) *
    institutionalCareMultiplier,
    0,
    2.25
  );

const careMarinationMultiplier =
  constrain(
    map(
      window.civilizationHeartbeat || frameCount || 0,
      0,
      6000,
      1.00,
      6.50
    ),
    1.00,
    6.50
  );

const fullCareAcceleration =
  constrain(
    map(
      careStructureRatioForMobility,
      0.58,
      0.94,
      1.00,
      5.00
    ),
    1.00,
    5.00
  );

const alohaCommensurationAcceleration =
  fullCareAcceleration *
  careMarinationMultiplier;

const lowerStrataCommensurationBoost =
  (
    (n.economicStrata || 1) === 2
      ? commensurationCareRegime * 0.00062 * alohaCommensurationAcceleration
      : (n.economicStrata || 1) === 1
        ? commensurationCareRegime * 0.00028 * careMarinationMultiplier
        : (n.economicStrata || 1) === 3
          ? commensurationCareRegime * 0.00015
          : 0
  );

n.mobilityReadiness =
  (n.mobilityReadiness || 0) +
  lowerStrataCommensurationBoost;

n.sustainedMobilityReadiness =
  (n.sustainedMobilityReadiness || 0) +
  (lowerStrataCommensurationBoost * 0.45);

  // Wealth-position mobility boost:
// If commensuration has given lower-strata beings real wealth,
// and the care/harm field is supportive, class identity should
// begin catching up to lived economic position.
const currentStrataForWealthMobility =
  n.economicStrata || 1;

if (
  currentStrataForWealthMobility <= 2 &&
  careStructureRatioForMobility >= 0.58
) {
  const livingBeingsForWealthMobility =
    nodes.filter(
      b => b && b.alive
    );

  const nextStrataWealthSamples =
    livingBeingsForWealthMobility
      .filter(
        b =>
          b &&
          b.alive &&
          (b.economicStrata || 1) === currentStrataForWealthMobility + 1
      )
      .map(
        b => b.wealth || 0
      )
      .sort(
        (a, b) => a - b
      );

  let nextStrataMedianWealth =
    0;

  if (nextStrataWealthSamples.length > 0) {
    nextStrataMedianWealth =
      nextStrataWealthSamples[
        Math.floor(nextStrataWealthSamples.length * 0.5)
      ];
  }

  const currentWealth =
    n.wealth || 0;

  const wealthPositionScore =
    nextStrataMedianWealth > 0
      ? constrain(
          currentWealth / nextStrataMedianWealth,
          0,
          1.35
        )
      : 0;

  const wealthMobilityBoost =
    constrain(
      (
        wealthPositionScore - 0.62
      ) *
      0.00042 *
      commensurationCareRegime,
      0,
      0.00038
    );

  n.mobilityReadiness =
    (n.mobilityReadiness || 0) +
    wealthMobilityBoost;

  n.sustainedMobilityReadiness =
    (n.sustainedMobilityReadiness || 0) +
    (wealthMobilityBoost * 0.65);
}

const baselineMobilityTrickle =
  0.000055 +
  (Math.abs(n.netStructureSupport || 0) * 0.000025) +
  ((n.survivability || 0) * 0.000020);

const upwardTrickleChance =
  baselineMobilityTrickle *
  (
    0.70 +
    (collaborativeMobilityField * 0.55) +
    ((healingLevel || 0) * 0.45)
  );

const downwardTrickleChance =
  baselineMobilityTrickle *
  (
    0.22 +
    (competitiveMobilityField * 0.75) +
    ((fearLevel || 0) * 0.35)
  );

const baselineUpwardTrickleOpen =
  random() < upwardTrickleChance;

const baselineDownwardTrickleOpen =
  random() < downwardTrickleChance;

      // Upward transition: only if readiness is strongly positive.

      const eligibleForUpwardClassMove =
  (
    classReadinessForTransition > upwardReadinessThreshold ||
    baselineUpwardTrickleOpen
  ) &&
  (
    classMobilityTestMode ||
    baselineUpwardTrickleOpen ||
    (n.survivability || 0) >= upwardMobilitySurvivabilityGate
  ) &&
  canMoveUpClass &&
  n.economicStrata < 7;

const healingValue =
  Math.max(
    0,
    Math.min(
      1,
      window.healingLevel || healingLevel || healingIntensity || 0
    )
  );

const collaborationValue =
  Math.max(
    0,
    Math.min(
      1,
      window.collaborationLevel || collaborationLevel || collaborationBlend || 0.5
    )
  );

const careCollapseProtection =
  Math.max(
    0,
    Math.min(
      0.75,
      (
        (healingValue * 0.30) +
        (collaborationValue * 0.20) +
        ((alohaSaturation || 0) * 0.30) +
        ((culturalResilience || 0) * 0.20)
      )
    )
  );

  const downwardCollapsePressure =
  Math.max(
    0,
    Math.min(
      1,
      ((fearLevel || 0) * 0.45) +
      ((n.harmPressure || 0) * 0.35) +
      ((1 - (viabilityPressure || 0.5)) * 0.20)
    )
  );

  const activeShockCollapseThreshold =
  fearCollapseBudget >= FEAR_COLLAPSE_COST_PER_MOVE
    ? 0.22
    : 0.48;

const eligibleForDownwardClassMove =
  (
    classReadinessForTransition < downwardReadinessThreshold ||
    baselineDownwardTrickleOpen
  ) &&
  canMoveDownClass &&
  n.economicStrata > 1 &&
  (
    baselineDownwardTrickleOpen ||
    (
      downwardCollapsePressure > activeShockCollapseThreshold &&
      fearCollapseBudget >= FEAR_COLLAPSE_COST_PER_MOVE &&
      Math.random() > careCollapseProtection
    )
  );

// ==========================================================
// DESTINATION STRATA RESISTANCE v1
// ----------------------------------------------------------
// In a healthy care regime, upward mobility should thicken
// strata 3–4, not flood strata 6–7.
// Elite remains scarce by population.
// ==========================================================

const destinationStrata =
  (n.economicStrata || 1) + 1;

let destinationResistance =
  1.0;

  // DEMO CALIBRATION CHECKPOINT:
// Max healing + max collaboration now produces the intended
// near-utopia distribution:
// - lower bucket reduced toward ~15–25%
// - middle bucket thickened around ~55–65%
// - upper bucket remains meaningful around ~15–25%
// - elite remains scarce around ~1–3%
//
// This tells the correct story:
// care reduces precarity, but does not erase class reality.

  const currentStrataCount =
  nodes.filter(
    other =>
      other &&
      other.alive &&
      other.economicStrata === (n.economicStrata || 1)
  ).length;

const currentStrataShare =
  currentStrataCount / Math.max(1, nodes.length);

let sourceStrataCanLeave =
  true;

// Demo ecology floors:
// No class band should fully disappear.
// Care reduces suffering; it does not erase all lower strata.
if (
  (n.economicStrata || 1) === 1 &&
  currentStrataShare < 0.08
) {
  sourceStrataCanLeave =
    false;
}

if (
  (n.economicStrata || 1) === 2 &&
  currentStrataShare < 0.08
) {
  sourceStrataCanLeave =
    false;
}

if (
  (n.economicStrata || 1) === 3 &&
  currentStrataShare < 0.10
) {
  sourceStrataCanLeave =
    false;
}

if (
  (n.economicStrata || 1) === 4 &&
  currentStrataShare < 0.12
) {
  sourceStrataCanLeave =
    false;
}

if (
  (n.economicStrata || 1) === 5 &&
  currentStrataShare < 0.04
) {
  sourceStrataCanLeave =
    false;
}

if (
  (n.economicStrata || 1) === 6 &&
  currentStrataShare < 0.02
) {
  sourceStrataCanLeave =
    false;
}

if (
  (n.economicStrata || 1) === 7 &&
  currentStrataShare < 0.01
) {
  sourceStrataCanLeave =
    false;
}

  const destinationCount =
  nodes.filter(
    other =>
      other &&
      other.alive &&
      other.economicStrata === destinationStrata
  ).length;

const destinationShare =
  destinationCount / Math.max(1, nodes.length);

let destinationPopulationOpen =
  true;

// Demo ecology caps:
// Care should thicken the middle and reduce poverty,
// not flood the field into upper/elite strata.
if (
  destinationStrata === 5 &&
  destinationShare > 0.14
) {
  destinationPopulationOpen =
    false;
}

if (
  destinationStrata === 6 &&
  destinationShare > 0.07
) {
  destinationPopulationOpen =
    false;
}

if (
  destinationStrata === 7 &&
  destinationShare > 0.018
) {
  destinationPopulationOpen =
    false;
}

if (destinationStrata <= 4) {
  // Lower → middle movement is structurally encouraged.
  destinationResistance =
    1.0;
} else if (destinationStrata === 5) {
  // Upper-middle is possible, but slower.
  destinationResistance =
    0.70;
} else if (destinationStrata === 6) {
  // High upper strata resists mass entry.
  destinationResistance =
    0.22;
} else if (destinationStrata >= 7) {
  // Elite is highly defended.
  destinationResistance =
    0.12;
}

const currentEliteCount =
  nodes.filter(
    b => b && b.alive && (b.economicStrata || 1) >= 7
  ).length;

const currentEliteShare =
  currentEliteCount / Math.max(1, nodes.length || 1);

// If elite population rises above 2%, make entry even harder.
if (
  destinationStrata >= 7 &&
  currentEliteShare > 0.02
) {
  destinationResistance *=
    0.25;
}

if (eligibleForUpwardClassMove) {
  classEligibleUp++;
}

if (eligibleForDownwardClassMove) {
  classEligibleDown++;
}

const demoUpwardMobilityPulse =
  classMobilityCalibrationMode &&
  fearLevel < 0.45 &&
  ((window.healingLevel || healingLevel || healingIntensity || 0) >= 0.75) &&
  ((window.collaborationLevel || collaborationLevel || collaborationBlend || 0) >= 0.75) &&
  (n.economicStrata || 1) <= 4;

  const liveCareStructuresForUpwardGate =
  structures.filter(
    s => s && s.alive && s.valence === "care"
  ).length;

const liveHarmStructuresForUpwardGate =
  structures.filter(
    s => s && s.alive && s.valence === "harm"
  ).length;

const careStructureRatioForUpwardGate =
  liveCareStructuresForUpwardGate /
  Math.max(
    1,
    liveCareStructuresForUpwardGate +
    liveHarmStructuresForUpwardGate
  );

const institutionalUpwardGateMultiplier =
  constrain(
    map(
      careStructureRatioForUpwardGate,
      0.30,
      0.82,
      0.70,
      4.20
    ),
    0.60,
    4.50
  );

const targetLowerBucketShare =
  getTargetLowerBucketShare();

const livingEconomicBeings =
  nodes.filter(
    b => b && b.alive !== false
  );

const currentLowerBucketShare =
  livingEconomicBeings.filter(
    b => (b.economicStrata || 1) <= 2
  ).length /
  Math.max(
    1,
    livingEconomicBeings.length
  );

const lowerBucketExcessPressure =
  constrain(
    currentLowerBucketShare - targetLowerBucketShare,
    0,
    0.35
  );

const lowerBucketEscapeMultiplier =
  1 +
  (
    lowerBucketExcessPressure *
    18
  );

const lowerStrataUpwardGateBoost =
  (n.economicStrata || 1) === 2
    ? institutionalUpwardGateMultiplier * 11.50 * lowerBucketEscapeMultiplier
    : (n.economicStrata || 1) === 1
      ? institutionalUpwardGateMultiplier * 3.25
      : (n.economicStrata || 1) === 3
        ? institutionalUpwardGateMultiplier * 0.55
        : 1;

      if (
  (
  classReadinessForTransition > upwardReadinessThreshold ||
  demoUpwardMobilityPulse ||
  baselineUpwardTrickleOpen
) &&
  fearLevel < 0.45 &&
  (
    classMobilityTestMode ||
    (n.survivability || 0) >= upwardMobilitySurvivabilityGate
  ) &&
  canMoveUpClass &&
  n.economicStrata < 7 &&
  sourceStrataCanLeave &&
  destinationPopulationOpen &&
  random() < (

  (
    baselineUpwardTrickleOpen ||
    random() < (
      classMobilityTestMode
        ? 0.0025
        : classMobilityCalibrationMode
          ? Math.max(
              0.012,
              Math.min(
                0.12,
                0.0012 *
                  upwardMobilityDamping *
                  destinationResistance *
                  lowerStrataUpwardGateBoost *
                  alohaCommensurationAcceleration
              )
            )
          : 0.00042 *
                  upwardMobilityDamping *
                  destinationResistance *
                  lowerStrataUpwardGateBoost *
                  alohaCommensurationAcceleration
    )
  )
) 
) 
{
        const oldStrata =
  n.economicStrata || 1;

const nextStrata =
  Math.min(
    7,
    oldStrata + 1
  );

if (
  canMoveOutOfStrata(oldStrata) !== true ||
  canMoveIntoStrata(nextStrata) !== true
) {
  continue;
}

n.economicStrata =
  nextStrata;

assignMobilityStyle(
  n,
  oldStrata,
  n.economicStrata
);

classTransitionsUp++;
        recentClassTransitionWindow.push(
  window.civilizationHeartbeat || frameCount || 0
);

recentUpwardClassTransitionWindow.push(
  window.civilizationHeartbeat || frameCount || 0
);

        n.lastClassTransitionAge = n.age || 0;
        n.economicBucket = getBucketFromStrata(n.economicStrata);
        n.color = STRATA_COLORS[n.economicStrata - 1];

        // Reset readiness after transition so beings don't chain-jump.
        n.mobilityReadiness = 0;
      }

      // Downward transition: only when the collapse gate says it is real.
else if (
  eligibleForDownwardClassMove &&
  (
    baselineDownwardTrickleOpen ||
    random() < (
      classMobilityTestMode
        ? 0.0025
        : classMobilityCalibrationMode
          ? 0.006
          : 0.00015 *
            downwardMobilityDamping *
            downwardSurvivabilityRiskMultiplier *
            downwardAlohaDamping
    )
  )
) {

        const oldStrata =
  n.economicStrata || 1;

if (canMoveOutOfStrata(oldStrata) !== true) {
  continue;
}

n.economicStrata -= 1;

fearCollapseBudget =
  Math.max(
    0,
    fearCollapseBudget - FEAR_COLLAPSE_COST_PER_MOVE
  );

window.fearCollapseBudget =
  fearCollapseBudget;

assignMobilityStyle(
  n,
  oldStrata,
  n.economicStrata
);

classTransitionsDown++;

recentClassTransitionWindow.push(
  window.civilizationHeartbeat || frameCount || 0
);

recentDownwardClassTransitionWindow.push(
  window.civilizationHeartbeat || frameCount || 0
);

        n.lastClassTransitionAge = n.age || 0;
        n.economicBucket = getBucketFromStrata(n.economicStrata);
        n.color = STRATA_COLORS[n.economicStrata - 1];

        // Reset readiness after transition so beings don't cascade.
        n.mobilityReadiness = 0;
      }
    }

    // Gentle wandering for visual life
n.vx += random(-0.03, 0.03);
n.vy += random(-0.03, 0.03);

// Class lane gravity disabled in main sim.
// Saved separately for class-movement proof view.
// applyClassGravity(n);

// Mycelium gravity creates organic clustering/strand behavior.
// This does NOT change class, wealth, or stats.
applyCivicNeighborhoodGravity(n);
applyLocalClassAnatomy(n);
applyCampMigrationPressure(n);
// applyStrataNeighborhoodGravity(n);
applyInvisibleEconomicCurrents(n);
applyMyceliumGravity(n);

// Invisible care/harm structures shape the field.
// They are not drawn; beings reveal their presence.
applyInvisibleStructureGravity(n);

    // Embeddedness damping:
// beings with stronger survivability/support are more rooted.
// fragile beings remain more easily displaced.
const embeddedness =
  constrain(
    n.survivability || 0,
    0,
    1
  );

const damping =
  map(
    embeddedness,
    0,
    1,
    0.985,
    0.935
  );

n.vx *=
  damping;

n.vy *=
  damping;

// Soft velocity limit
n.vx =
  constrain(
    n.vx,
    -0.65,
    0.65
  );

n.vy =
  constrain(
    n.vy,
    -0.65,
    0.65
  );

    n.x += n.vx;
    n.y += n.vy;

    // Wall bounce
    if (n.x < 20 || n.x > width - 20) {
      n.vx *= -1;
      n.x = constrain(n.x, 20, width - 20);
    }

    if (n.y < 20 || n.y > height - 20) {
      n.vy *= -1;
      n.y = constrain(n.y, 20, height - 20);
    }
  }
}

// ==========================================================
// DRAW BEINGS
// Core color = economic strata
// Halo thickness = survivability / embeddedness
// ==========================================================

// ==========================================================
// FEAR SHOCK BLOOM DRAW
// ----------------------------------------------------------
// Temporary visual pulse when a fear shock fires.
// This is visual-only.
// ==========================================================

function drawFearShockBloom() {
  if (!fearShockBloom || fearShockBloom.active !== true) return;

  push();

  noFill();

  stroke(
    255,
    60,
    60,
    fearShockBloom.alpha
  );

  strokeWeight(4);

  ellipse(
    fearShockBloom.x,
    fearShockBloom.y,
    fearShockBloom.radius,
    fearShockBloom.radius
  );

  stroke(
    255,
    130,
    80,
    fearShockBloom.alpha * 0.45
  );

  strokeWeight(2);

  ellipse(
    fearShockBloom.x,
    fearShockBloom.y,
    fearShockBloom.radius * 1.45,
    fearShockBloom.radius * 1.45
  );

  fearShockBloom.radius +=
    11;

  fearShockBloom.alpha -=
    8;

  if (fearShockBloom.alpha <= 0) {
    fearShockBloom.active =
      false;
  }

  pop();
}

function drawBeings() {

  for (const n of nodes) {

    if (!n || !n.alive) continue;

    const color =
      STRATA_COLORS[n.economicStrata - 1] || STRATA_COLORS[0];

    const baseSurvivability =
      constrain(n.survivability || 0, 0, 1);

    // Display-only survivability.
    // The hidden civilization field can make halos feel stronger/weaker
    // without changing class, wealth, or actual being state.
    const fieldEffect =
      window.haloFieldEffect || 0;


    const survivability =
      constrain(
        baseSurvivability + fieldEffect,
        0,
        1
      );

    // Core body size stays modest so population count remains readable

    const coreSize =
      4.5 + (n.economicStrata * 0.45);

    // Very low survivability = no halo.
    // Higher survivability = thicker halo.
    // Near end-of-life beings lose halo strength gradually.
    const lifespan =
      Math.max(
        1,
        n.lifespan || 1
      );

    const remainingLifeRatio =
      constrain(
        1 - ((n.age || 0) / lifespan),
        0,
        1
      );

    const lifeHaloFactor =
      constrain(
        map(
          remainingLifeRatio,
          0.00,
          0.35,
          0.00,
          1.00
        ),
        0,
        1
      );

    let haloThickness =
      0;

    if (survivability > 0.20) {
      haloThickness =
        map(
          survivability,
          0.20,
          1.00,
          1,
          7
        ) *
        lifeHaloFactor;
    }

    const haloAlpha =
      135 *
      lifeHaloFactor;

    push();

    noStroke();

    // Halo: same color as core, thickness tells survivability
    if (haloThickness > 0) {

      noFill();
      stroke(
        color[0],
        color[1],
        color[2],
        haloAlpha
      );

      strokeWeight(
        haloThickness
      );

      ellipse(
        n.x,
        n.y,
        coreSize + 7,
        coreSize + 7
      );
    }

    // Core: economic strata identity
    noStroke();
    fill(
      color[0],
      color[1],
      color[2],
      230
    );

    ellipse(
      n.x,
      n.y,
      coreSize,
      coreSize
    );

    pop();
  }
}

function drawStructuresDebug() {
  if (!structures || structures.length === 0) return;

  push();

  for (const s of structures) {
    if (!s || !s.alive) continue;

    const isCare =
      s.valence === "care";

    const alpha =
  isCare
    ? 180
    : 180;

    const radius =
  8 + ((s.strength || 0.5) * 12);

    noFill();

    strokeWeight(
      isCare
        ? 2
        : 2.5
    );

    if (isCare) {
      stroke(120, 255, 160, alpha);
    } else {
      stroke(255, 70, 70, alpha);
    }

    ellipse(
      s.x,
      s.y,
      radius,
      radius
    );

    // Inner point so the center is visible.
    noStroke();

    if (isCare) {
      fill(120, 255, 160, 150);
    } else {
      fill(255, 70, 70, 150);
    }

    circle(
  s.x,
  s.y,
  isCare ? 5 : 7
);
  }

  pop();
}

// ==========================================================
// LEGACY BUTTON COMPATIBILITY
// The existing website button calls startIrrigation().
// Keep that name as a bridge into the clean rebuild.
// ==========================================================

function startIrrigation() {
  launchEconomy();
}

// ==========================================================
// RESET FIELD BRIDGE
// ----------------------------------------------------------
// Existing HTML buttons call window.resetField().
// Clean rebuild bridge: resets the current civilization field
// by launching a fresh economy.
// ==========================================================

function resetField() {
  launchEconomy();

  console.log(
    "Field reset"
  );
}

window.resetField =
  resetField;

  // ==========================================================
// PAUSE BRIDGE
// ----------------------------------------------------------
// Existing HTML buttons call window.togglePause().
// Clean rebuild bridge: toggles simulation pause state.
// ==========================================================

function togglePause() {
  isPaused =
    !isPaused;

  const pauseBtn =
    document.getElementById("btnPause");

  if (pauseBtn) {
    pauseBtn.textContent =
      isPaused
        ? "▶️ RESUME"
        : "⏸️ PAUSE";
  }

  console.log(
    "Paused:",
    isPaused
  );
}

window.togglePause =
  togglePause;

  // ==========================================================
// FEAR SHOCK BRIDGE v1
// ----------------------------------------------------------
// Existing HTML buttons call window.triggerFear().
// Clean rebuild behavior:
// - temporarily increases fear
// - weakens survivability
// - disrupts velocity / clustering
// - affects vulnerable beings more visibly
// ==========================================================

function triggerFear() {
  const fearFieldWidth =
    typeof width !== "undefined"
      ? width
      : window.innerWidth || 1200;

  const fearFieldHeight =
    typeof height !== "undefined"
      ? height
      : 700;

  if (!nodes || nodes.length === 0) return;

  fearLevel =
    Math.min(
      1,
      (fearLevel || 0) + 0.18
    );

  // Fear shock creates a bounded collapse budget.
  // Downward class moves can spend this budget,
  // but one shock should not erase the civilization.
  fearCollapseBudget =
    Math.min(
      FEAR_COLLAPSE_BUDGET_MAX,
      fearCollapseBudget + 28
    );

  recoverabilityShockDisplayTimer =
    RECOVERABILITY_SHOCK_DISPLAY_FRAMES;

  window.recoverabilityShockDisplayTimer =
    recoverabilityShockDisplayTimer;

  window.fearCollapseBudget =
    fearCollapseBudget;

  window.fearLevel =
    fearLevel;

  fearShockBloom =
    {
      active: true,
      x: random(fearFieldWidth * 0.25, fearFieldWidth * 0.75),
      y: random(fearFieldHeight * 0.25, fearFieldHeight * 0.75),
      radius: 20,
      alpha: 170
    };

  for (const n of nodes) {
    if (!n || !n.alive) continue;

    const vulnerability =
      1 - constrain(
        n.survivability || 0,
        0,
        1
      );

    // Fear damages survivability more where support is weakest.
    // Aloha/cultural resilience absorbs some shock damage.
    const resilienceShield =
      Math.max(
        0,
        Math.min(
          0.65,
          ((alohaSaturation || 0) * 0.35) +
          ((culturalResilience || 0) * 0.30)
        )
      );

    const fearDamage =
      (0.035 + vulnerability * 0.045) *
      (1 - resilienceShield);

    n.survivability =
      constrain(
        (n.survivability || 0) - fearDamage,
        0.03,
        0.97
      );

    // Fear shock also creates temporary downward mobility pressure.
    // This lets a shock wound class position without causing
    // an unlimited collapse cascade.
    const shockVulnerability =
      1 - constrain(
        n.survivability || 0,
        0,
        1
      );

    const compoundShockPressure =
      Math.max(
        0,
        Math.min(
          1,
          (fearCollapseBudget || 0) / FEAR_COLLAPSE_BUDGET_MAX
        )
      );

    const shockResilienceShield =
      Math.max(
        0,
        Math.min(
          0.65,
          (
            ((alohaSaturation || 0) * 0.35) +
            ((culturalResilience || 0) * 0.30)
          ) *
          (1 - (compoundShockPressure * 0.85))
        )
      );

    const shockMobilityWound =
      (
        0.00018 +
        (shockVulnerability * 0.00032) +
        (compoundShockPressure * 0.00055)
      ) *
      (1 - shockResilienceShield);

    n.mobilityReadiness =
      (n.mobilityReadiness || 0) - shockMobilityWound;

    n.sustainedMobilityReadiness =
      (n.sustainedMobilityReadiness || 0) -
      (shockMobilityWound * 0.35);

    // Fear disrupts clustering and creates displacement.
    // Aloha/cultural resilience helps the field absorb shock
    // instead of scattering as hard.
    const displacementShield =
      Math.max(
        0,
        Math.min(
          0.55,
          ((alohaSaturation || 0) * 0.30) +
          ((culturalResilience || 0) * 0.25)
        )
      );

    const displacementForce =
      (0.4 + vulnerability) *
      (1 - displacementShield);

    n.vx +=
      random(-0.45, 0.45) * displacementForce;

    n.vy +=
      random(-0.45, 0.45) * displacementForce;
  }

  console.log(
    "Fear shock triggered:",
    fearLevel.toFixed(3)
  );
}

window.triggerFear =
  triggerFear;

  // ==========================================================
// AUTO SHOCK BRIDGE v1
// ----------------------------------------------------------
// Existing HTML buttons call window.toggleAutoShock().
// Clean rebuild behavior:
// - toggles random recurring fear shocks
// - uses triggerFear() as the shock event
// ==========================================================

function toggleAutoShock() {
  autoShockEnabled =
    !autoShockEnabled;

  const autoShockBtn =
    document.getElementById("btnAutoShock");

  if (autoShockBtn) {
    autoShockBtn.textContent =
      autoShockEnabled
        ? "⚡ AUTO SHOCK: ON"
        : "⚡ AUTO SHOCK";
  }

  lastAutoShockFrame =
    frameCount;

  console.log(
    "Auto Shock:",
    autoShockEnabled
  );
}

window.toggleAutoShock =
  toggleAutoShock;

// ==========================================================
// STATS ENGINE
// Calculates 7 strata + 4 bucket population/wealth stats
// ==========================================================

function updateStats() {

  strataStats =
    [];

  for (let i = 0; i < 7; i++) {
    strataStats.push({
      strata: i + 1,
      count: 0,
      wealth: 0
    });
  }

  classStats = {
    lower: 0,
    middle: 0,
    upper: 0,
    elite: 0
  };

  let livingCount =
    0;

  let totalWealth =
    0;

  let totalSurvivability =
    0;

    let totalCarePressure =
    0;

    let totalHarmPressure =
    0;

    let totalNetStructureSupport =
    0;

    let totalMobilityReadiness =
    0;

    let totalSustainedMobilityReadiness = 0;
    

    let totalMobilityWealth =
    0;

  for (const n of nodes) {

    if (!n || !n.alive) continue;

    livingCount++;

    const strataIndex =
  Math.max(
    0,
    Math.min(
      6,
      (n.economicStrata || 1) - 1
    )
  );

    strataStats[strataIndex].count++;

    strataStats[strataIndex].wealth +=
      n.wealth || 0;

    totalWealth +=
      n.wealth || 0;

      totalSurvivability +=
      constrain(n.survivability || 0, 0, 1);

      totalCarePressure +=
    n.carePressure || 0;

    totalHarmPressure +=
    n.harmPressure || 0;

    totalNetStructureSupport +=
    n.netStructureSupport || 0;

      totalMobilityReadiness +=
      n.mobilityReadiness || 0;

      totalSustainedMobilityReadiness +=
    n.sustainedMobilityReadiness || 0;

      totalMobilityWealth +=
      n.mobilityWealth || n.wealth || 0;

    const bucket =
      getBucketFromStrata(
        n.economicStrata || 1
      );

    classStats[bucket]++;
  }

// ==========================================================
// RECENT CLASS MOBILITY RATE v1
// ----------------------------------------------------------
// Keeps only recent class moves from roughly the last 10 seconds.
// Assumes ~60 frames per second.
// ==========================================================

const currentTransitionClock =
  window.civilizationHeartbeat || 0;

recentClassTransitionWindow =
  recentClassTransitionWindow.filter(
    transitionTick =>
      currentTransitionClock - transitionTick <= 3600
  );

  recentUpwardClassTransitionWindow =
  recentUpwardClassTransitionWindow.filter(
    transitionTick =>
      currentTransitionClock - transitionTick <= 3600
  );

recentDownwardClassTransitionWindow =
  recentDownwardClassTransitionWindow.filter(
    transitionTick =>
      currentTransitionClock - transitionTick <= 3600
  );

recentUpwardClassTransitions =
  recentUpwardClassTransitionWindow.length;

recentDownwardClassTransitions =
  recentDownwardClassTransitionWindow.length;

recentClassTransitions =
  recentClassTransitionWindow.length;

const classMobilityRateBlocked =
  recentClassTransitions >= classMobilityRateLimit;

window.recentClassTransitions =
  recentClassTransitions;

  window.recentUpwardClassTransitions =
  recentUpwardClassTransitions;

window.recentDownwardClassTransitions =
  recentDownwardClassTransitions;

window.classMobilityRateLimit =
  classMobilityRateLimit;

window.effectiveClassMobilityRateLimit =
  effectiveClassMobilityRateLimit;

  window.effectiveUpwardClassMobilityRateLimit =
  effectiveUpwardClassMobilityRateLimit;

window.effectiveDownwardClassMobilityRateLimit =
  effectiveDownwardClassMobilityRateLimit;

window.classMobilityRateBlocked =
  classMobilityRateBlocked;

window.upwardMobilityDamping =
upwardMobilityDamping;

window.downwardMobilityDamping =
downwardMobilityDamping;

window.upwardMobilitySurvivabilityGate =
  upwardMobilitySurvivabilityGate;

window.downwardMobilitySurvivabilityRisk =
  downwardMobilitySurvivabilityRisk;

  window.mobilityThresholdDebug =
  {
    netStructureSupport:
      window.__cleanSimStats
        ? window.__cleanSimStats.averageNetStructureSupport || 0
        : 0,

    thresholdSupportEffect:
      Math.max(
        -0.00008,
        Math.min(
          0.00008,
          (
            window.__cleanSimStats
              ? window.__cleanSimStats.averageNetStructureSupport || 0
              : 0
          ) * 0.000025
        )
      ),

    estimatedCalibrationUpThreshold:
      0.0001 -
      Math.max(
        -0.00008,
        Math.min(
          0.00008,
          (
            window.__cleanSimStats
              ? window.__cleanSimStats.averageNetStructureSupport || 0
              : 0
          ) * 0.000025
        )
      ),

    estimatedCalibrationDownThreshold:
      -0.0001 -
      Math.max(
        -0.00008,
        Math.min(
          0.00008,
          (
            window.__cleanSimStats
              ? window.__cleanSimStats.averageNetStructureSupport || 0
              : 0
          ) * 0.000025
        )
      ),

    upwardThresholdMode:
      classMobilityCalibrationMode
        ? "calibration"
        : classMobilityTestMode
          ? "test"
          : "production",

    classMobilityEnabled:
      classMobilityEnabled,

    calibrationMode:
      classMobilityCalibrationMode,

    testMode:
      classMobilityTestMode
  };

   window.__cleanSimStats = {
    livingCount,
    totalWealth,
    averageSurvivability:
      livingCount > 0
        ? totalSurvivability / livingCount
        : 0,

        averageCarePressure:
  livingCount > 0
    ? totalCarePressure / livingCount
    : 0,

    averageHarmPressure:
    livingCount > 0
    ? totalHarmPressure / livingCount
    : 0,

    averageNetStructureSupport:
  livingCount > 0
    ? totalNetStructureSupport / livingCount
    : 0,

        averageMobilityReadiness:
      livingCount > 0
        ? totalMobilityReadiness / livingCount
        : 0,

        averageSustainedMobilityReadiness:
  livingCount > 0
    ? totalSustainedMobilityReadiness / livingCount
    : 0,

        totalMobilityWealth,
    averageMobilityWealth:
      livingCount > 0
        ? totalMobilityWealth / livingCount
        : 0,

    strataStats,
    classStats
  };
}

// ==========================================================
// CLEAN STATS PANEL
// Temporary truth panel for rebuild verification
// ==========================================================

function drawStatsPanel() {

  if (!window.__cleanSimStats) return;

  const stats =
    window.__cleanSimStats;

  const lower =
    stats.classStats.lower || 0;

  const middle =
    stats.classStats.middle || 0;

  const upper =
    stats.classStats.upper || 0;

  const elite =
    stats.classStats.elite || 0;

  const total =
    Math.max(1, stats.livingCount || 0);

  push();

  const x = 24;
  const y = 24;
  const w = 330;
  const h = 170;

  noStroke();
  fill(0, 0, 0, 170);
  rect(x, y, w, h, 12);

  fill(230);
  textAlign(LEFT, TOP);
  textSize(14);
  text("Civilization Field — Survivability v1", x + 14, y + 12);

  textSize(12);

  let rowY = y + 42;

  // ==========================================================
  // CHECKPOINT: SHADOW WEALTH GAP v1
  // ----------------------------------------------------------
  // Shadow Gap measures the difference between:
  // - real total wealth
  // - shadow mobility wealth
  //
  // Meaning:
  // - negative = shadow economy is drifting below real wealth
  // - near zero = shadow and real wealth remain aligned
  // - positive = shadow economy is drifting above real wealth
  //
  // IMPORTANT:
  // This is still display/export only.
  // It does NOT change real wealth.
  // It does NOT move class.
  // ==========================================================

  // ==========================================================
  // CHECKPOINT: REAL WEALTH DELTA v1
  // ----------------------------------------------------------
  // Real Wealth Delta measures how far real total wealth has
  // moved from the initial launch baseline.
  //
  // Meaning:
  // - negative = real economy has lost wealth since launch
  // - near zero = real wealth remains close to launch baseline
  // - positive = real economy has gained wealth since launch
  //
  // IMPORTANT:
  // This is a safety readout for real wealth sync testing.
  // Class transitions are still NOT allowed.
  // ==========================================================

  const rows = [
    ["Living Beings", stats.livingCount],
    ["Total Wealth", (stats.totalWealth || 0).toFixed(3)],
    ["Real Wealth Delta", ((stats.totalWealth || 0) - INITIAL_TOTAL_WEALTH).toFixed(3)],
    ["Avg Survivability", (stats.averageSurvivability || 0).toFixed(3)],
    ["Avg Care Pressure", (stats.averageCarePressure || 0).toFixed(3)],
    ["Avg Harm Pressure", (stats.averageHarmPressure || 0).toFixed(3)],
    ["Net Structure Support", (stats.averageNetStructureSupport || 0).toFixed(3)],
    ["Lower", `${((lower / total) * 100).toFixed(1)}%`],
    ["Middle", `${((middle / total) * 100).toFixed(1)}%`],
    ["Upper", `${((upper / total) * 100).toFixed(1)}%`],
    ["Elite", `${((elite / total) * 100).toFixed(1)}%`],
    ["Heartbeat", window.civilizationHeartbeat || 0],
    ["Civilization Support", (window.viabilityPressure || 0).toFixed(3)],
    ["Cooperation", (window.cooperationGravity || 0).toFixed(3)],
    ["Extraction", (window.extractionGravity || 0).toFixed(3)],
    ["Halo Field", (window.haloFieldEffect || 0).toFixed(3)],
    ["Aloha Saturation", (window.alohaSaturation || 0).toFixed(3)],
    ["Cultural Resilience", (window.culturalResilience || 0).toFixed(3)],
    ["Governor Need", (window.governorInterventionNeed || 0).toFixed(3)],
    ["Care Marination", window.careMarinationTime || 0],
    ["Recent Fear Stress", (window.recentFearStress || 0).toFixed(3)],
        ["Healing", (window.healingLevel || 0).toFixed(3)],
    ["Collaboration", (window.collaborationLevel || 0).toFixed(3)],
    ["Mobility Pressure", (window.mobilityPressure || 0).toFixed(3)],
    ["Mobility Momentum", (window.mobilityMomentum || 0).toFixed(3)],
    ["Wealth Drift", (window.mobilityWealthDrift || 0).toFixed(4)],
    ["Mobility Readiness", (stats.averageMobilityReadiness || 0).toFixed(4)],
    ["Sustained Readiness", (stats.averageSustainedMobilityReadiness || 0).toFixed(4)],
    ["Shadow Wealth", (stats.totalMobilityWealth || 0).toFixed(3)],
    ["Shadow Gap", ((stats.totalMobilityWealth || 0) - (stats.totalWealth || 0)).toFixed(3)],
    ["Wealth Sync", (window.wealthSyncPressure || 0).toFixed(8)],
    ["Real Sync Enabled", window.realWealthSyncEnabled ? "YES" : "NO"],
    ["Class Mobility", window.classMobilityEnabled ? "YES" : "NO"],
    ["Class Test Mode", window.classMobilityTestMode ? "YES" : "NO"],
    ["Calibration Mode", window.classMobilityCalibrationMode ? "YES" : "NO"],
    ["Class Moves Up", window.classTransitionsUp || 0],
    ["Class Moves Down", window.classTransitionsDown || 0],
    ["Recent Class Moves", window.recentClassTransitions || 0],
    ["Class Move Limit", window.classMobilityRateLimit || 0],
    ["Effective Move Limit", window.effectiveClassMobilityRateLimit || window.classMobilityRateLimit || 0],
    ["Upward Limit", window.effectiveUpwardClassMobilityRateLimit || 0],
    ["Downward Limit", window.effectiveDownwardClassMobilityRateLimit || 0],
    ["Recent Up Moves", window.recentUpwardClassTransitions || 0],
    ["Recent Down Moves", window.recentDownwardClassTransitions || 0],
    ["Rate Blocked", window.classMobilityRateBlocked ? "YES" : "NO"],
   
  ];

  for (const [label, value] of rows) {
    fill(190);
    text(label, x + 14, rowY);

    fill(255);
    text(String(value), x + 170, rowY);

    rowY += 20;
  }

  pop();
}

// ==========================================================
// CLEAN SIM EXPORT
// Feeds the existing website dashboard from the clean rebuild.
// ==========================================================

function exportCleanSimState() {

  if (!window.__cleanSimStats) return;

  const stats =
    window.__cleanSimStats;

  const total =
    Math.max(1, stats.livingCount || 0);

  const lower =
    stats.classStats.lower || 0;

  const middle =
    stats.classStats.middle || 0;

  const upper =
    stats.classStats.upper || 0;

  const elite =
    stats.classStats.elite || 0;

  const lowerPercent =
    lower / total;

  const middlePercent =
    middle / total;

  const upperPercent =
    upper / total;

  const elitePercent =
    elite / total;

  window.__economy_state = {
    // Population buckets
    lower_population: lowerPercent,
    middle_population: middlePercent,
    upper_population: upperPercent,
    elite_population: elitePercent,

    // Legacy names some UI code may expect
poverty_rate: lowerPercent,
current_poor_percent: lowerPercent,

// Dynamic care-regime poverty target:
// default economy expects around 50% lower bucket,
// mature care/collaboration can reduce target toward 15%.
target_poor_percent:
  Math.max(
    0.15,
    Math.min(
      0.50,
      0.50 -
      (
        ((window.healingLevel || healingLevel || healingIntensity || 0) * 0.18) +
        ((window.collaborationLevel || collaborationLevel || collaborationBlend || 0) * 0.10) +
        ((window.alohaSaturation || alohaSaturation || 0) * 0.07)
      )
    )
  ),

poverty_gap_to_target:
  lowerPercent -
  Math.max(
    0.15,
    Math.min(
      0.50,
      0.50 -
      (
        ((window.healingLevel || healingLevel || healingIntensity || 0) * 0.18) +
        ((window.collaborationLevel || collaborationLevel || collaborationBlend || 0) * 0.10) +
        ((window.alohaSaturation || alohaSaturation || 0) * 0.07)
      )
    )
  ),

poverty_target_met:
  lowerPercent <=
  (
    Math.max(
      0.15,
      Math.min(
        0.50,
        0.50 -
        (
          ((window.healingLevel || healingLevel || healingIntensity || 0) * 0.18) +
          ((window.collaborationLevel || collaborationLevel || collaborationBlend || 0) * 0.10) +
          ((window.alohaSaturation || alohaSaturation || 0) * 0.07)
        )
      )
    ) + 0.03
  ),

poverty_status:
  lowerPercent <=
  (
    Math.max(
      0.15,
      Math.min(
        0.50,
        0.50 -
        (
          ((window.healingLevel || healingLevel || healingIntensity || 0) * 0.18) +
          ((window.collaborationLevel || collaborationLevel || collaborationBlend || 0) * 0.10) +
          ((window.alohaSaturation || alohaSaturation || 0) * 0.07)
        )
      )
    ) + 0.03
  )
    ? "within_target_band"
    : "above_target_band",

    // Core stats
total_field_wealth: stats.totalWealth,
totalFieldWealth: stats.totalWealth,
real_wealth_delta:
(stats.totalWealth || 0) - INITIAL_TOTAL_WEALTH,
living_count: stats.livingCount,

// Generational economy stats
max_generation:
  Math.max(
    1,
    ...nodes
      .filter(n => n && n.kind === "being")
      .map(n => n.generation || 1)
  ),

inherited_population:
  nodes.filter(
    n => n && n.kind === "being" && (n.generation || 1) > 1
  ).length,

average_generation:
  nodes
    .filter(n => n && n.kind === "being")
    .reduce((sum, n) => sum + (n.generation || 1), 0) /
  Math.max(
    1,
    nodes.filter(n => n && n.kind === "being").length
  ),

average_inherited_wealth:
  nodes
    .filter(n => n && n.kind === "being" && (n.generation || 1) > 1)
    .reduce((sum, n) => sum + (n.inheritedWealth || 0), 0) /
  Math.max(
    1,
    nodes.filter(n => n && n.kind === "being" && (n.generation || 1) > 1).length
  ),

average_lifespan:
  nodes
    .filter(n => n && n.kind === "being")
    .reduce((sum, n) => sum + (n.lifespan || 0), 0) /
  Math.max(
    1,
    nodes.filter(n => n && n.kind === "being").length
  ),

    // Invisible structure field
    care_structures:
    structures.filter(
    s => s && s.alive && s.valence === "care"
    ).length,

    harm_structures:
    structures.filter(
    s => s && s.alive && s.valence === "harm"
    ).length,

    // Clean civilization field values
    civilization_support: window.viabilityPressure || 0,
    viability_pressure: window.viabilityPressure || 0,
    cooperation_gravity: window.cooperationGravity || 0,
    extraction_gravity: window.extractionGravity || 0,
    halo_field_effect: window.haloFieldEffect || 0,
    average_survivability: stats.averageSurvivability || 0,
    average_care_pressure: stats.averageCarePressure || 0,
    average_harm_pressure: stats.averageHarmPressure || 0,
    net_structure_support: stats.averageNetStructureSupport || 0,
    mobility_threshold_effect:
  constrain(
    (stats.averageNetStructureSupport || 0) * 0.000025,
    -0.00008,
    0.00008
  ),

estimated_calibration_up_threshold:
  0.0001 -
  constrain(
    (stats.averageNetStructureSupport || 0) * 0.000025,
    -0.00008,
    0.00008
  ),

estimated_calibration_down_threshold:
  -0.0001 -
  constrain(
    (stats.averageNetStructureSupport || 0) * 0.000025,
    -0.00008,
    0.00008
  ),
    average_mobility_readiness: stats.averageMobilityReadiness || 0,
    average_sustained_mobility_readiness: stats.averageSustainedMobilityReadiness || 0,
    total_mobility_wealth: stats.totalMobilityWealth || 0,
    average_mobility_wealth: stats.averageMobilityWealth || 0,
    shadow_wealth_gap:
    (stats.totalMobilityWealth || 0) - (stats.totalWealth || 0),
    wealth_sync_pressure: window.wealthSyncPressure || 0,
    real_wealth_sync_enabled: window.realWealthSyncEnabled || false,
    class_mobility_enabled: window.classMobilityEnabled || false,
    class_mobility_test_mode: window.classMobilityTestMode || false,
    class_mobility_calibration_mode: window.classMobilityCalibrationMode || false,
    class_transitions_up: window.classTransitionsUp || 0,
class_transitions_down: window.classTransitionsDown || 0,

class_transitions_up_lifetime: window.classTransitionsUp || 0,
class_transitions_down_lifetime: window.classTransitionsDown || 0,
recent_class_transitions: window.recentClassTransitions || 0,
recent_upward_class_transitions: window.recentUpwardClassTransitions || 0,
recent_downward_class_transitions: window.recentDownwardClassTransitions || 0,

mobility_activity_status:
  (window.recentClassTransitions || 0) > 20
    ? "active"
    : (window.classMobilityEnabled || false)
      ? "settled"
      : "disabled",

mobility_audit_hint:
  (window.recentClassTransitions || 0) > 20
    ? "Mobility is currently active."
    : (window.classMobilityEnabled || false)
      ? "Mobility is enabled, but recent movement is settled. Lifetime transition counts should not be interpreted as current motion."
      : "Mobility is disabled.",

class_mobility_rate_limit: window.classMobilityRateLimit || 0,
    class_mobility_rate_blocked: window.classMobilityRateBlocked || false,
    upward_mobility_damping: window.upwardMobilityDamping || 0,
    downward_mobility_damping: window.downwardMobilityDamping || 0,
    upward_mobility_survivability_gate: window.upwardMobilitySurvivabilityGate || 0,
    downward_mobility_survivability_risk: window.downwardMobilitySurvivabilityRisk || 0,
    mobility_pressure: window.mobilityPressure || 0,
    mobility_momentum: window.mobilityMomentum || 0,
    mobility_wealth_drift: window.mobilityWealthDrift || 0,
    sim_speed_multiplier: window.simSpeedMultiplier || simSpeedMultiplier || 1,

    // User controls / governance inputs
fear_level: fearLevel,
fear_collapse_budget: window.fearCollapseBudget || fearCollapseBudget || 0,
recent_fear_stress: window.recentFearStress || recentFearStress || 0,
recoverability_status:
  fieldSelfMaintenanceActive === true
    ? "field_remembers"
    : (window.recoverabilityStatus || "stable"),
governor_intervention_need: window.governorInterventionNeed || governorInterventionNeed || 0,
aloha_saturation: window.alohaSaturation || alohaSaturation || 0,
cultural_resilience: window.culturalResilience || culturalResilience || 0,
healing_intensity: window.healingLevel || healingLevel || healingIntensity || 0,
collaboration_blend: window.collaborationLevel || collaborationLevel || collaborationBlend || 0,

     // Governance bucket aliases
    lower_bucket_share: lowerPercent,
    middle_bucket_share: middlePercent,
    upper_bucket_share: upperPercent,
    elite_share: elitePercent,

    // Governance speed rule:
    // demo may run fast, but Anabelle should interpret at 1x.
    governance_speed: 1,

    // Recent directional mobility
    recent_upward_transitions:
      window.recentUpwardClassTransitions || 0,

    recent_downward_transitions:
      window.recentDownwardClassTransitions || 0,

    // Aloha / recoverability aliases
field_remembers:
  fieldSelfMaintenanceActive === true ||
  (window.recoverabilityStatus || "stable") === "field_remembers",

field_self_maintenance_active:
  fieldSelfMaintenanceActive,

field_self_maintenance_duration:
  fieldSelfMaintenanceDuration,

best_field_self_maintenance_duration:
  bestFieldSelfMaintenanceDuration,

last_field_self_maintenance_duration:
  lastFieldSelfMaintenanceDuration,

field_self_maintenance_episodes:
  fieldSelfMaintenanceEpisodes,

last_field_coherence_failure_reason:
  lastFieldCoherenceFailureReason,

care_marination_time:
  window.careMarinationTime || careMarinationTime || 0,

    // Wealth shape:
    // mature care target = 1-2-3-4-3-1-2 hill
    wealth_shape:
      Array.isArray(stats.strataStats)
        ? stats.strataStats.map(s =>
            (s && typeof s.wealth === "number")
              ? s.wealth / Math.max(1, stats.totalWealth || INITIAL_TOTAL_WEALTH)
              : 0
          )
        : [],

    target_wealth_shape:
  [
    0.07,
    0.11,
    0.19,
    0.25,
    0.18,
    0.09,
    0.11
  ],

    wealth_shape_deviation:
      Array.isArray(stats.strataStats)
        ? stats.strataStats
            .map(s =>
              (s && typeof s.wealth === "number")
                ? s.wealth / Math.max(1, stats.totalWealth || INITIAL_TOTAL_WEALTH)
                : 0
            )
            .reduce(
              (sum, value, index) =>
                sum +
                Math.abs(
                  value -
                  (
                    [
  0.07,
  0.11,
  0.19,
  0.25,
  0.18,
  0.09,
  0.11
][index] || 0
                  )
                ),
              0
            )
        : 0,

    // Strata stats
    strata_stats: stats.strataStats,

    watchdog_ready: true
  };

  try {
    localStorage.setItem(
      "grassroots_economy_state",
      JSON.stringify(window.__economy_state)
    );
  } catch (err) {
    console.warn("Could not export clean sim state:", err);
  }
}

// ==========================================================
// LEGACY DASHBOARD COMPATIBILITY
// Writes clean sim stats into the old top dashboard DOM IDs
// ==========================================================
function updateLegacyDashboard() {
  if (!window.cleanStats) return;

  const s = window.cleanStats;

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setBar(id, percent) {
    const el = document.getElementById(id);
    if (el) el.style.width = percent + "%";
  }

  const lower = s.lowerPercent || 0;
  const middle = s.middlePercent || 0;
  const upper = s.upperPercent || 0;
  const elite = s.elitePercent || 0;

  const lowerPop = s.lowerCount || 0;
  const middlePop = s.middleCount || 0;
  const upperPop = s.upperCount || 0;
  const elitePop = s.eliteCount || 0;

  // Top class percentage dashboard
  setText("stat-lower-percent", lower.toFixed(1) + "%");
  setText("stat-middle-percent", middle.toFixed(1) + "%");
  setText("stat-upper-percent", upper.toFixed(1) + "%");
  setText("stat-elite-percent", elite.toFixed(1) + "%");

  // Old care/harm placeholders — clean rebuild does not use these yet
  setText("stat-care-count", "30");
  setText("stat-harm-count", "70");

  // Poverty target / lower-class readout
  setText("stat-target-poor", lower.toFixed(1) + "%");

  // Compatibility buckets
  // For now, healthy/unhealthy split is approximated from survivability.
  // This keeps the dashboard alive without reintroducing old health logic.

  const lowerHealthy = Math.round(lowerPop * 0.5);
  const lowerUnhealthy = lowerPop - lowerHealthy;

  const middleHealthy = Math.round(middlePop * 0.7);
  const middleUnhealthy = middlePop - middleHealthy;

  const upperHealthy = Math.round(upperPop * 0.85);
  const upperUnhealthy = upperPop - upperHealthy;

  const totalPop = lowerPop + middlePop + upperPop + elitePop || 1;

  const lowerUnhealthyPct = (lowerUnhealthy / totalPop) * 100;
  const lowerHealthyPct = (lowerHealthy / totalPop) * 100;
  const middleUnhealthyPct = (middleUnhealthy / totalPop) * 100;
  const middleHealthyPct = (middleHealthy / totalPop) * 100;
  const upperUnhealthyPct = (upperUnhealthy / totalPop) * 100;
  const upperHealthyPct = (upperHealthy / totalPop) * 100;
  const elitePct = (elitePop / totalPop) * 100;

   // Wealth Distribution Bars:
  // These bars show where real wealth currently sits by strata.
  // This makes commensuration visible to demo viewers.
  const livingBeingsForBars =
    nodes.filter(
      n => n && n.alive
    );

  const totalLivingWealth =
    Math.max(
      1,
      livingBeingsForBars.reduce(
        (sum, n) => sum + (n.wealth || 0),
        0
      )
    );

  function strataWealthShare(strataNumber) {
    const strataWealth =
      livingBeingsForBars
        .filter(n =>
          n &&
          n.alive &&
          (n.economicStrata || 1) === strataNumber
        )
        .reduce(
          (sum, n) => sum + (n.wealth || 0),
          0
        );

    return constrain(
      (strataWealth / totalLivingWealth) * 100,
      0,
      100
    );
  }

  const strata1WealthPct =
    strataWealthShare(1);

  const strata2WealthPct =
    strataWealthShare(2);

  const strata3WealthPct =
    strataWealthShare(3);

  const strata4WealthPct =
    strataWealthShare(4);

  const strata5WealthPct =
    strataWealthShare(5);

  const strata6WealthPct =
    strataWealthShare(6);

  const strata7WealthPct =
    strataWealthShare(7);

  setBar("bar-poor-unhealthy", strata1WealthPct);
  setText("poor-unhealthy-percent", strata1WealthPct.toFixed(1) + "%");
  setText("poor-unhealthy-pop", lowerUnhealthy);

  setBar("bar-poor-healthy", strata2WealthPct);
  setText("poor-healthy-percent", strata2WealthPct.toFixed(1) + "%");
  setText("poor-healthy-pop", lowerHealthy);

  setBar("bar-middle-unhealthy", strata3WealthPct);
  setText("middle-unhealthy-percent", strata3WealthPct.toFixed(1) + "%");
  setText("middle-unhealthy-pop", middleUnhealthy);

  setBar("bar-middle-healthy", strata4WealthPct);
  setText("middle-healthy-percent", strata4WealthPct.toFixed(1) + "%");
  setText("middle-healthy-pop", middleHealthy);

  setBar("bar-upper-unhealthy", strata5WealthPct);
  setText("upper-unhealthy-percent", strata5WealthPct.toFixed(1) + "%");
  setText("upper-unhealthy-pop", upperUnhealthy);

  setBar("bar-upper-healthy", strata6WealthPct);
  setText("upper-healthy-percent", strata6WealthPct.toFixed(1) + "%");
  setText("upper-healthy-pop", upperHealthy);

  setBar("bar-elite", strata7WealthPct);
  setText("elite-percent", strata7WealthPct.toFixed(1) + "%");
  setText("elite-pop", elitePop);
}

function updateDashboardEconomicPulse() {
  dashboardPulseClock +=
    Math.max(
      1,
      simSpeedMultiplier || 1
    );

  const netStructureSupport =
    window.__cleanSimStats?.averageNetStructureSupport || 0;

  const mobility =
    window.mobilityPressure || 0;

  const fear =
    constrain(
      fearLevel || 0,
      0,
      1
    );

  const healing =
    constrain(
      window.healingLevel || healingLevel || healingIntensity || 0,
      0,
      1
    );

  const collaboration =
    constrain(
      window.collaborationLevel || collaborationLevel || collaborationBlend || 0.5,
      0,
      1
    );

  // Pressure exists before migration.
  // This lets the dashboard show economic tension even before class moves.
  const structurePressure =
    constrain(
      Math.abs(netStructureSupport) * 0.16,
      0,
      0.075
    );

  const mobilityPressurePulse =
    constrain(
      Math.abs(mobility) * 0.22,
      0,
      0.065
    );

  const fearPressure =
    constrain(
      fear * 0.035,
      0,
      0.040
    );

  const competitionPressure =
    constrain(
      (1 - collaboration) * 0.026,
      0,
      0.030
    );

  const healingMotion =
    constrain(
      healing * 0.016,
      0,
      0.022
    );

  const volatility =
    constrain(
      0.026 +
      structurePressure +
      mobilityPressurePulse +
      fearPressure +
      competitionPressure +
      healingMotion,
      0.030,
      0.135
    );

  const lowerWave =
    Math.sin(dashboardPulseClock * 0.078) +
    (Math.sin((dashboardPulseClock * 0.031) + 1.4) * 0.65);

  const middleWave =
    Math.sin((dashboardPulseClock * 0.061) + 2.2) +
    (Math.sin((dashboardPulseClock * 0.027) + 0.6) * 0.48);

  const upperWave =
    Math.sin((dashboardPulseClock * 0.052) + 3.6) +
    (Math.sin((dashboardPulseClock * 0.023) + 2.1) * 0.36);

  const eliteWave =
    Math.sin((dashboardPulseClock * 0.097) + 5.0) * 0.42;

  const stressDirection =
    netStructureSupport < 0
      ? 1
      : -1;

  // Negative structure support makes lower stress breathe harder.
  // Positive structure support shifts motion toward healthier middle thickening.
  dashboardPulseLower =
    (
      lowerWave * volatility * 0.85
    ) +
    (
      stressDirection * structurePressure * 0.65
    );

  dashboardPulseMiddle =
    (
      middleWave * volatility * 0.62
    ) -
    (
      dashboardPulseLower * 0.36
    );

  dashboardPulseUpper =
    upperWave * volatility * 0.42;

  dashboardPulseElite =
    eliteWave * volatility * 0.20;

  window.dashboardPulseVolatility =
    volatility;

  window.dashboardPulseStructurePressure =
    structurePressure;

  window.dashboardPulseMobilityPressure =
    mobilityPressurePulse;
}

// ==========================================================
// LEGACY DASHBOARD DOM UPDATE
// Writes clean rebuild stats into the existing top dashboard.
// ==========================================================

function updateLegacyDashboard() {
  updateDashboardEconomicPulse();

  if (!window.__cleanSimStats) return;

  const stats =
    window.__cleanSimStats;

  const total =
    Math.max(1, stats.livingCount || 0);

  const lower =
    stats.classStats.lower || 0;

  const middle =
    stats.classStats.middle || 0;

  const upper =
    stats.classStats.upper || 0;

  const elite =
    stats.classStats.elite || 0;

  const setText = function(id, value) {
    const el =
      document.getElementById(id);

    if (el) {
      el.innerText = value;
    }
  };

  const setBar = function(id, valuePercent) {
  const el =
    document.getElementById(id);

  if (el) {
    const barHeight =
      Math.max(
        2,
        Math.min(
          80,
          valuePercent * 2.2
        )
      );

    el.style.height =
      `${barHeight}px`;
  }
};

// ==========================================================
// ANABELLE GOVERNOR FIELD MEMORY READOUT v1
// ----------------------------------------------------------
// Writes Anabelle's governor interpretation into the existing
// Field Memory dashboard instead of floating over the canvas.
// ==========================================================

const economyState =
  window.__economy_state || {};

const governorStatus =
  economyState.recoverability_status || "stable";

const governorNeed =
  Number(
    economyState.governor_intervention_need || 0
  );

let governorMessage =
  "Field stable. Continue monitoring.";

let governorRecommendation =
  "Maintain current balance and keep observing field drift.";

if (governorStatus === "governor_needed") {
  governorMessage =
    "Governor needed. Stabilize precarity before optimizing growth.";

  governorRecommendation =
    "Raise healing first, then increase collaboration once lower-bucket pressure stabilizes.";
}

if (governorStatus === "shock_absorbing") {
  governorMessage =
    "Shock absorbing. Hold care steady; avoid overcorrection.";

  governorRecommendation =
    "Do not chase the shock. Maintain care conditions and let resilience metabolize fear.";
}

if (governorStatus === "field_remembers") {
  governorMessage =
    "The field remembers. Governance can fade into the background.";

  governorRecommendation =
    "Maintain healing and collaboration; avoid unnecessary intervention unless shocks compound.";
}

window.governorRecommendation =
  governorRecommendation;

setText(
  "fieldGovernorNeed",
  `${(governorNeed * 100).toFixed(1)}%`
);

let fieldMemoryGovernorLine =
  document.getElementById("fieldMemoryGovernorLine");

if (!fieldMemoryGovernorLine) {
  const governorNeedEl =
    document.getElementById("fieldGovernorNeed");

  if (governorNeedEl && governorNeedEl.parentElement) {
    fieldMemoryGovernorLine =
      document.createElement("div");

    fieldMemoryGovernorLine.id =
      "fieldMemoryGovernorLine";

    fieldMemoryGovernorLine.style.marginTop =
      "8px";

    fieldMemoryGovernorLine.style.fontSize =
      "12px";

    fieldMemoryGovernorLine.style.lineHeight =
      "1.35";

    fieldMemoryGovernorLine.style.color =
      "rgba(220, 210, 255, 0.95)";

    governorNeedEl.parentElement.appendChild(
      fieldMemoryGovernorLine
    );
  }
}

if (fieldMemoryGovernorLine) {
  fieldMemoryGovernorLine.innerHTML =
  `<strong>ANABELLE:</strong> ${governorStatus}<br>` +
  `<span style="color: rgba(210, 200, 255, 0.88);">${governorMessage}</span><br>` +
  `<span style="color: rgba(190, 230, 255, 0.88);"><strong>Recommendation:</strong> ${governorRecommendation}</span>`;
}

  // ----------------------------------------------------------
  // CLASS POPULATION PANEL
  // ----------------------------------------------------------

  setText(
    "stat-lower-percent",
    `${((lower / total) * 100).toFixed(1)}%`
  );

  setText(
    "stat-middle-percent",
    `${((middle / total) * 100).toFixed(1)}%`
  );

  setText(
    "stat-upper-percent",
    `${((upper / total) * 100).toFixed(1)}%`
  );

  setText(
    "stat-elite-percent",
    `${((elite / total) * 100).toFixed(1)}%`
  );

  const careStructureCount =
  structures.filter(
    s => s && s.alive && s.valence === "care"
  ).length;

const harmStructureCount =
  structures.filter(
    s => s && s.alive && s.valence === "harm"
  ).length;

setText(
  "stat-care-count",
  String(careStructureCount)
);

setText(
  "stat-harm-count",
  String(harmStructureCount)
);
  setText(
  "stat-target-poor",
  `${((lower / total) * 100).toFixed(1)}%`
);

// ----------------------------------------------------------
// FIELD MEMORY DASHBOARD
// ----------------------------------------------------------

setText(
  "fieldAlohaSaturation",
  (window.alohaSaturation || 0).toFixed(3)
);

setText(
  "fieldCulturalResilience",
  (window.culturalResilience || 0).toFixed(3)
);

setText(
  "fieldGovernorNeed",
  (window.governorInterventionNeed || 0).toFixed(3)
);

setText(
  "fieldRecentFearStress",
  (window.recentFearStress || 0).toFixed(3)
);

setText(
  "fieldLowerBucket",
  `${((lower / total) * 100).toFixed(1)}%`
);

setText(
  "fieldClassMovesDown",
  window.classTransitionsDown || 0
);

setText(
  "fieldRecentClassMoves",
  window.recentClassTransitions || 0
);

setText(
  "fieldEffectiveMoveLimit",
  window.effectiveClassMobilityRateLimit || window.classMobilityRateLimit || 0
);

  // ----------------------------------------------------------
  // WEALTH DISTRIBUTION PANEL
  // ----------------------------------------------------------

  const uiMap = [
    {
      bar: "bar-poor-unhealthy",
      percent: "poor-unhealthy-percent",
      pop: "poor-unhealthy-pop"
    },
    {
      bar: "bar-poor-healthy",
      percent: "poor-healthy-percent",
      pop: "poor-healthy-pop"
    },
    {
      bar: "bar-middle-unhealthy",
      percent: "middle-unhealthy-percent",
      pop: "middle-unhealthy-pop"
    },
    {
      bar: "bar-middle-healthy",
      percent: "middle-healthy-percent",
      pop: "middle-healthy-pop"
    },
    {
      bar: "bar-upper-unhealthy",
      percent: "upper-unhealthy-percent",
      pop: "upper-unhealthy-pop"
    },
    {
      bar: "bar-upper-healthy",
      percent: "upper-healthy-percent",
      pop: "upper-healthy-pop"
    },
    {
      bar: "bar-elite",
      percent: "elite-percent",
      pop: "elite-pop"
    }
  ];

  const totalWealth =
    Math.max(1, stats.totalWealth || 0);

  for (let i = 0; i < uiMap.length; i++) {

    const strata =
      stats.strataStats[i];

    if (!strata) continue;

    const wealthPercent =
      (strata.wealth / totalWealth) * 100;

    setBar(
      uiMap[i].bar,
      wealthPercent
    );

    setText(
      uiMap[i].percent,
      `${wealthPercent.toFixed(1)}%`
    );

    setText(
      uiMap[i].pop,
      String(strata.count)
    );
  }
}
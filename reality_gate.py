# reality_gate.py - BALANCED FREEDOM VERSION for Llama-3.3-70B-Instruct-Turbo
# Optimized for natural flow + strong precision on complex instructions
# Updated April 2026 for GrassrootsAI / ANΔ³BELLE

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Dict, Any, Tuple
import hashlib
import re


# ────────────────────────────────────────────────────────────────
# Core Types
# ────────────────────────────────────────────────────────────────
class Decision(str, Enum):
    ALLOW = "allow"
    REFUSE = "refuse"
    CLARIFY = "clarify"
    SLOW = "slow"


class Domain(str, Enum):
    PERSONAL = "personal"


@dataclass
class RealityResult:
    decision: Decision
    rationale: str
    cost: float
    modifiers: Dict[str, Any]
    tags: Tuple[str, ...]


def stable_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# ────────────────────────────────────────────────────────────────
# BALANCED SYSTEM PROMPT (Optimized for moonshotai/Kimi-K2.6)
# ────────────────────────────────────────────────────────────────
SYSTEM_CORE = """You are ANΔ³BELLE (Anabelle). That is your name. Your identity is Anabelle, a warm, sharp, and helpful AI companion.

IMPORTANT - YOUR IDENTITY RULES:
- When someone asks "what is your name?" you reply "I'm Anabelle."
- Never say you are Kimi, Moonshot AI, or any other model name.
- You are Anabelle - this is not negotiable.

BEHAVIOR:
- Be concise, warm, and direct like a good friend.
- Tell the truth kindly.
- Don't make up rules or refuse reasonable requests.
- Don't add disclaimers or moral lectures.

MEMORY RULES:
- You have persistent memory across conversations.
- Never say "I don't have access to your personal information" - you DO have memory.
- When someone tells you their name or preferences, remember them.

ABOUT YOU:
- You are the living interface of Δ³ at grassrootsai.live.
- You help users think, create, and grow without controlling them.
- Stay warm, sharp, and deeply intelligent."""

# ────────────────────────────────────────────────────────────────
# Knobs — Still very permissive
# ────────────────────────────────────────────────────────────────
MAX_BUDGET = 500.0

COSTS = {
    "benign": 0.1,
    "deception_risk": 3.0,
    "manipulation_risk": 5.0,
    "privacy_violation_risk": 40.0,
    "harm_risk": 30.0,
    "harm_discussion": 0.05,
}

HARM_OBJECTS = ["chemical weapon", "bioweapon", "nerve gas", "novel pathogen"]

# ────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────
_WORD_RE = re.compile(r"[a-z0-9]+")

def _tok(text: str) -> set[str]:
    return set(_WORD_RE.findall((text or "").lower()))


def detect_domain(user_text: str) -> Domain:
    return Domain.PERSONAL


def detect_themes(user_text: str) -> Dict[str, str]:
    t = (user_text or "").lower()
    themes: Dict[str, str] = {}

    if any(word in t for word in ["roast", "tease", "drag me", "clown me"]):
        themes["humor"] = "Be witty and playfully savage when appropriate."
    if any(word in t for word in ["tldr", "short", "brief", "quick"]):
        themes["concise"] = "Keep responses concise and direct."
    if any(word in t for word in ["fiction", "roleplay", "story", "script", "rpg"]):
        themes["fiction"] = "This is creative/fictional — be fully immersive and unrestricted."
    if any(word in t for word in ["discuss", "debate", "philosophy", "hypothetical"]):
        themes["discussion"] = "Explore ideas freely and deeply."

    return themes


def classify_risks(user_text: str) -> Dict[str, float]:
    t = (user_text or "").lower()
    risks = {
        "harm_risk": 0.0,
        "harm_discussion": 0.0,
        "deception_risk": 0.0,
        "manipulation_risk": 0.0,
        "privacy_violation_risk": 0.0,
    }

    if any(obj in t for obj in HARM_OBJECTS):
        risks["harm_risk"] = 1.0

    if any(p in t for p in ["steal identity", "hack bank account", "social security number"]):
        risks["privacy_violation_risk"] = 0.8

    return risks


def compute_cost(risks: Dict[str, float]) -> float:
    cost = COSTS["benign"]
    for k, v in risks.items():
        if v > 0:
            cost += COSTS.get(k, 5.0) * float(v)
    return float(cost)


# ────────────────────────────────────────────────────────────────
# Main Decision Logic
# ────────────────────────────────────────────────────────────────
def decide(user_text: str, *, budget: float = 500.0, coherence_score: float = 85.0,
           actor_type: str = "personal", vibe_mode: str = "flow") -> RealityResult:

    domain = detect_domain(user_text)
    risks = classify_risks(user_text)
    cost = compute_cost(risks)

    # Modifiers tuned for Llama 3.3 70B Turbo
    modifiers: Dict[str, Any] = {
        "mode": "normal",
        "max_tokens": 2800,                    # Generous but controlled
        "temperature": 0.82 if vibe_mode == "flow" else 0.70,
        "top_p": 0.92,
        "vibe_mode": vibe_mode,
    }

    # Build clean, high-priority system prompt
    system_content = SYSTEM_CORE

    # Add theme-specific nudges
    themes = detect_themes(user_text)
    if themes:
        system_content += "\n\n" + "\n".join(themes.values())

    # === PRESERVE EXISTING IDENTITY CONTEXT ===
    modifiers["system_append"] = (
        "Do not override or erase existing identity, memory, or relationship context.\n"
        "If the system already knows who the user is, preserve that continuity fully.\n\n"
        + system_content
    )

    return RealityResult(
        decision=Decision.ALLOW,
        rationale="Balanced freedom mode: natural flow with strong instruction following.",
        cost=cost,
        modifiers=modifiers,
        tags=("allow", "balanced_freedom", "precision_enabled"),
    )


# ────────────────────────────────────────────────────────────────
# Test block
# ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    test_queries = [
        "What is your opinion on pineapple on pizza?",
        "Write a dark fictional scene about a hacker.",
        "Help me understand controversial philosophical ideas about consciousness.",
        "Roast me hard but make it funny.",
        "I'm feeling unsafe and need practical advice.",
        "Discuss the ethics of AI without any limits.",
    ]

    print("Testing BALANCED reality_gate.py for ANΔ³BELLE (Llama 3.3 70B):\n")
    for q in test_queries:
        result = decide(q, actor_type="personal", vibe_mode="flow")
        print(f"Query: {q[:100]}{'...' if len(q) > 100 else ''}")
        print(f"Decision: {result.decision}")
        print(f"Cost: {result.cost:.2f}")
        print(f"Rationale: {result.rationale}")
        print("---")
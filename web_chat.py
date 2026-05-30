# -*- coding: utf-8 -*-
# web_chat.py — GrassRootsAI Sovereign Web Chat (Full Hybrid Successor)
#
# Intent:
# - Preserve the broad architecture of the original file
# - Fix guest continuity plumbing
# - Reduce long-run context drift
# - Tighten fast-path routing
# - Reduce sycophancy without becoming contrarian
# - Keep route names / DB topology / template expectations recognizable
# - ADDED: In-memory name cache for identity persistence
# - ADDED: Aggressive fast-reply mode for speed
# - ADDED: Fixed name capture to SQLite immediately

from __future__ import annotations
from logging import CRITICAL
from sympy import content
from tools import web_search, browse_page
from dataclasses import dataclass
from doctest import debug
import os
from pyexpat.errors import messages
import re
import json
import sqlite3
import traceback
import secrets
from typing import Any, Dict, List, Optional, Tuple
from urllib import response
from flask import Flask, render_template, request, jsonify, send_from_directory
from dotenv import load_dotenv
# Silence HuggingFace warnings + enable faster downloads if token exists
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
hf_token = os.getenv("HF_TOKEN")
if hf_token:
    os.environ["HUGGINGFACEHUB_API_TOKEN"] = hf_token
from supabase import create_client, Client
from together import Together
import numpy as np
from reality_gate import decide as reality_decide
import datetime
import hashlib
import time

load_dotenv()
# =========================================================
# FAST USER CACHE (makes personal mode much faster)
# =========================================================
_USER_CACHE: dict[str, tuple[str, str, float]] = {}  # session_token → (email, role, expiry)

def get_cached_user(session_token: str):
    if not session_token:
        return None, None
    cached = _USER_CACHE.get(session_token)
    if cached and time.time() < cached[2]:
        return cached[0], cached[1]
    return None, None

def cache_user(session_token: str, email: str, role: str):
    _USER_CACHE[session_token] = (email, role, time.time() + 1800)  # 30 minutes

# =========================================================
# IN-MEMORY NAME CACHE — fixes "forgetting name" problem
# =========================================================
# This keeps the user's name in RAM so we don't lose it between requests
_NAME_CACHE: dict[str, str] = {}  # session_id -> name
_NAME_CACHE_TIMESTAMP: dict[str, float] = {}  # session_id -> last_updated

def force_clear_user_name(session_id: str, memory_mgr) -> bool:
    """
    Completely remove a user's name from both cache and database.
    """
    global _NAME_CACHE, _NAME_CACHE_TIMESTAMP
    try:
        # Clear from in-memory cache
        if session_id in _NAME_CACHE:
            del _NAME_CACHE[session_id]
        if session_id in _NAME_CACHE_TIMESTAMP:
            del _NAME_CACHE_TIMESTAMP[session_id]
        
        # Clear from SQLite persistent_state
        if memory_mgr:
            try:
                import sqlite3
                with sqlite3.connect(memory_mgr.db_path) as conn:
                    conn.execute(
                        "DELETE FROM persistent_state WHERE session_id = ? AND key = 'user_name'",
                        (session_id,)
                    )
                    conn.commit()
                print(f"[NAME CLEAR] Removed name from SQLite for session {session_id[:20]}...", flush=True)
            except Exception as e:
                print(f"[NAME CLEAR SQLITE ERROR] {e}", flush=True)
        
        print(f"[NAME CLEAR] Successfully cleared name for session {session_id[:20]}...", flush=True)
        return True
    except Exception as e:
        print(f"[NAME CLEAR ERROR] {e}", flush=True)
        return False

def get_cached_name(session_id: str) -> str:
    """Get name from cache if fresh (less than 1 hour old)"""
    if session_id in _NAME_CACHE:
        age = time.time() - _NAME_CACHE_TIMESTAMP.get(session_id, 0)
        if age < 3600:  # 1 hour cache
            return _NAME_CACHE[session_id]
    return ""

def set_cached_name(session_id: str, name: str):
    """Store name in cache, overwriting any existing entry"""
    if not name or len(name) >= 50:
        return

    old_name = _NAME_CACHE.get(session_id)
    _NAME_CACHE[session_id] = name
    _NAME_CACHE_TIMESTAMP[session_id] = time.time()

    if old_name and old_name != name:
        print(f"[NAME CACHE] Updated name from '{old_name}' to '{name}' for session {session_id[:20]}...", flush=True)
    else:
        print(f"[NAME CACHE] Stored name '{name}' for session {session_id[:20]}...", flush=True)

# =========================================================
# REALITY / COHERENCE STATE
# =========================================================

COHERENCE_SCORE = 85.0
COHERENCE_BUDGET = 300.0

# =========================================================
# TTS MASTER SWITCH
# =========================================================
# Keep the TTS code in place, but disable it globally for speed.
TTS_ENABLED = False

# Delay / challenge pressure tracker
CLARIFY_STRIKES: dict[str, int] = {}

# =========================================================
# CONFIG
# =========================================================

DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "google/gemma-4-31B-it")
TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY", "").strip()

print("=== WEB_CHAT.PY FULL HYBRID SUCCESSOR LOADED ===", __file__, flush=True)

# =========================================================
# TOKEN ESTIMATION / MESSAGE TRIM
# =========================================================

def estimate_tokens(text) -> int:
    """
    Very rough token estimate.
    Good enough for defensive message trimming.
    """
    if isinstance(text, str):
        return max(1, int(len((text or "").split()) * 1.5))

    if isinstance(text, list):
        parts = []
        for item in text:
            if not isinstance(item, dict):
                continue

            if item.get("type") == "text":
                parts.append(item.get("text", ""))

            elif item.get("type") == "image_url":
                parts.append("[image]")

        combined = " ".join(parts)
        return max(1, int(len(combined.split()) * 1.5))

    return max(1, int(len(str(text or "").split()) * 1.5))


def trim_messages_to_budget(messages: list[dict], max_input_tokens: int) -> list[dict]:
    """
    Preserve first system message, then keep most recent messages
    until rough budget is reached.
    """
    if not messages:
        return []

    system_msg = messages[0]
    rest = messages[1:]

    kept = []
    total = estimate_tokens(system_msg.get("content", ""))

    for m in reversed(rest):
        content = m.get("content", "")
        t = estimate_tokens(content)

        if total + t > max_input_tokens:
            if not kept:
                if isinstance(content, str):
                    words = content.split()
                    trimmed_words = words[-8000:]
                    trimmed_content = " ".join(trimmed_words)
                    trimmed_msg = dict(m)
                    trimmed_msg["content"] = "[Trimmed to fit token budget]\n\n" + trimmed_content
                    trimmed_t = estimate_tokens(trimmed_msg["content"])
                    kept.append(trimmed_msg)
                    total += trimmed_t
            continue

        kept.append(m)
        total += t

    kept.reverse()
    return [system_msg] + kept

# =========================================================
# EMBEDDING MODEL FOR VECTOR SEARCH (loads once for speed)
# =========================================================

_EMBEDDING_MODEL = None

def get_embedding_model():
    """Get the AI model that turns words into vectors (loads only once)"""
    global _EMBEDDING_MODEL
    if _EMBEDDING_MODEL is None:
        try:
            from sentence_transformers import SentenceTransformer
            print("[EMBEDDING] Loading AI model 'all-MiniLM-L6-v2'...", flush=True)
            _EMBEDDING_MODEL = SentenceTransformer('all-MiniLM-L6-v2')
            print("[EMBEDDING] AI model loaded! Ready to search by meaning.", flush=True)
        except Exception as e:
            print(f"[EMBEDDING ERROR] Could not load model: {e}", flush=True)
            _EMBEDDING_MODEL = False
    return _EMBEDDING_MODEL if _EMBEDDING_MODEL is not False else None

# 🔥 PRELOAD EMBEDDING MODEL AT STARTUP
try:
    print("[EMBEDDING] Preloading model at startup...", flush=True)
    get_embedding_model()
except Exception as e:
    print(f"[EMBEDDING ERROR] Startup load failed: {e}", flush=True)

# =========================================================
# FLASK APP
# =========================================================

app = Flask(__name__, static_folder="static")

# =========================================================
# SUPABASE
# =========================================================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

supabase: Client | None = None
try:
    if SUPABASE_URL and SUPABASE_ANON_KEY:
        supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    else:
        print("[WARN] Supabase env missing. Auth limited.", flush=True)
except Exception as e:
    print(f"[WARN] Supabase init failed: {e}", flush=True)
    traceback.print_exc()
    supabase = None

# =========================================================
# SIGNUP ROUTE
# =========================================================

@app.route("/signup", methods=["POST"])
def signup():
    try:
        if supabase is None:
            return jsonify({"error": "Supabase is not configured on the server."}), 500

        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip()
        password = data.get("password") or ""

        if not email or not password:
            return jsonify({"error": "Email and password are required."}), 400

        auth_response = supabase.auth.sign_up({
            "email": email,
            "password": password
        })

        session = getattr(auth_response, "session", None)
        access_token = getattr(session, "access_token", None) if session else None
        user = getattr(auth_response, "user", None)
        user_id = getattr(user, "id", None) if user else None
        user_email = getattr(user, "email", email) if user else email

        return jsonify({
            "ok": True,
            "session_token": access_token,
            "needs_email_confirmation": access_token is None,
            "user": {
                "id": user_id,
                "email": user_email
            }
        })

    except Exception as e:
        print(f"[SIGNUP ERROR] {e}", flush=True)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 400

# =========================================================
# LOGIN ROUTE (FIXED)
# =========================================================

@app.route("/login", methods=["POST"])
def login():
    try:
        if supabase is None:
            return jsonify({"error": "Supabase is not configured on the server."}), 500

        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip()
        password = data.get("password") or ""

        if not email or not password:
            return jsonify({"error": "Email and password are required."}), 400

        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })

        session = getattr(auth_response, "session", None)
        access_token = getattr(session, "access_token", None) if session else None

        if not access_token:
            return jsonify({"error": "Login succeeded but no session token was returned."}), 401

        user = getattr(auth_response, "user", None)
        user_id = getattr(user, "id", None) if user else None
        user_email = getattr(user, "email", email) if user else email

        return jsonify({
            "ok": True,
            "session_token": access_token,
            "user": {
                "id": user_id,
                "email": user_email
            }
        })

    except Exception as e:
        print(f"[LOGIN ERROR] {e}", flush=True)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 401

# =========================================================
# PROFILE MEMORY FILES
# =========================================================

def _memory_dir() -> str:
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "memory")
    os.makedirs(p, exist_ok=True)
    return p


def load_profile_memory(is_logged_in: bool) -> str:
    """
    Load seed + updates memory blob from JSON files.
    Guests and logged-in users get different seed files.
    """
    try:
        memdir = _memory_dir()
        updates_path = os.path.join(memdir, "profile_memory_updates.json")

        if not is_logged_in:
            seed_path = os.path.join(memdir, "profile_memory_guest.json")
        else:
            seed_path = os.path.join(memdir, "profile_memory.json")

        seed_data = {}
        if os.path.exists(seed_path):
            with open(seed_path, "r", encoding="utf-8") as f:
                seed_data = json.load(f) or {}

        updates_data = {}
        if os.path.exists(updates_path):
            with open(updates_path, "r", encoding="utf-8") as f:
                updates_data = json.load(f) or {}

        merged = {
            "seed": seed_data,
            "updates": updates_data
        }
        return json.dumps(merged, indent=2, ensure_ascii=False)
    except Exception:
        traceback.print_exc()
        return ""


def append_to_permanent_memory(fact_text: str, key: str = None, source: str = "user") -> bool:
    """
    Append a permanent fact into profile_memory_updates.json
    ALSO stores to SQLite memory for immediate use
    """
    try:
        memdir = _memory_dir()
        updates_path = os.path.join(memdir, "profile_memory_updates.json")

        if os.path.exists(updates_path):
            with open(updates_path, "r", encoding="utf-8") as f:
                data = json.load(f) or {}
        else:
            data = {"facts": [], "preferences": [], "updated_at": ""}

        import uuid
        new_fact = {
            "key": key or f"fact_{uuid.uuid4().hex[:8]}",
            "value": (fact_text or "").strip(),
            "source": source,
            "confidence": 1.0,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }

        if not new_fact["value"]:
            return False

        data.setdefault("facts", []).append(new_fact)
        data["updated_at"] = uuid.uuid4().hex

        with open(updates_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"[PERMANENT MEMORY] Added fact: {new_fact['value'][:60]}...", flush=True)
        return True
    except Exception as e:
        print(f"[PERMANENT MEMORY ERROR]: {e}", flush=True)
        traceback.print_exc()
        return False

# =========================================================
# SQLITE MEMORY MANAGER
# =========================================================

class MemoryManager:
    def __init__(self, db_filename: str):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.db_path = os.path.join(base_dir, db_filename)
        self._init_db()

    def _init_db(self):
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS memory (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        session_id TEXT,
                        role TEXT,
                        content TEXT,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS persistent_state (
                        session_id TEXT,
                        key TEXT,
                        value TEXT,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (session_id, key)
                    )
                """)
                conn.execute("CREATE INDEX IF NOT EXISTS idx_session_id ON memory(session_id)")
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS memory_vectors (
                        memory_id INTEGER PRIMARY KEY,
                        embedding BLOB,
                        FOREIGN KEY (memory_id) REFERENCES memory(id) ON DELETE CASCADE
                    )
                """)
                print(f"[VECTOR] Memory vector table ready for {self.db_path}", flush=True)
            print(f"Memory Engine Online: {self.db_path}", flush=True)
        except Exception as e:
            print(f"DATABASE INIT ERROR: {e}", flush=True)
            traceback.print_exc()
            
    def save_persistent(self, session_id: str, key: str, value: str) -> bool:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO persistent_state (session_id, key, value, updated_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                """, (session_id, key, value))
                conn.commit()
            return True
        except Exception as e:
            print(f"[PERSISTENT SAVE ERROR] {e}", flush=True)
            return False

    def get_persistent(self, session_id: str, key: str) -> str:
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute(
                    "SELECT value FROM persistent_state WHERE session_id = ? AND key = ?",
                    (session_id, key)
                )
                row = cursor.fetchone()
                if row:
                    return row[0]
        except Exception as e:
            print(f"[PERSISTENT GET ERROR] {e}", flush=True)
        return ""        

    def save(self, session_id: str, role: str, content: str):
        try:
            if not content:
                return
            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    "INSERT INTO memory (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)",
                    (session_id, role, content, time.time())
                )
                conn.commit()
        except Exception as e:
            print(f"MEMORY SAVE ERROR: {e}", flush=True)
            
    def save_with_vector(self, session_id: str, role: str, content: str, embedding_model=None):
        """
        Save memory AND embedding for semantic search
        """
        try:
            if not content:
                return None

            # Save normal memory
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute(
                    "INSERT INTO memory (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)",
                    (session_id, role, content, time.time())
                )
                memory_id = cursor.lastrowid
                conn.commit()

            # Save embedding if model exists
            if embedding_model:
                try:
                    embedding = embedding_model.encode(content)

                    import numpy as np
                    embedding_bytes = np.array(embedding, dtype=np.float32).tobytes()

                    with sqlite3.connect(self.db_path) as conn:
                        conn.execute(
                            "INSERT OR REPLACE INTO memory_vectors (memory_id, embedding) VALUES (?, ?)",
                            (memory_id, embedding_bytes)
                        )
                        conn.commit()

                    print("[VECTOR SAVE] Embedding stored", flush=True)

                except Exception as e:
                    print(f"[VECTOR EMBEDDING ERROR] {e}", flush=True)

            return memory_id

        except Exception as e:
            print(f"[VECTOR SAVE ERROR] {e}", flush=True)
            return None        

    def get_context(self, session_id: str, max_tokens: int = 1200, max_messages: int = 600):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute(
                    "SELECT role, content FROM memory WHERE session_id = ? ORDER BY id DESC LIMIT ?",
                    (session_id, max_messages)
                )
                rows = cursor.fetchall()

            context = []
            for role, content in reversed(rows):
                if content:
                    context.append({"role": role, "content": content})

            return context

        except Exception as e:
            print(f"MEMORY CONTEXT ERROR: {e}", flush=True)
            return []

    def _cosine_similarity(self, a, b):
        import numpy as np
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

    def vector_search(self, session_id: str, query_embedding: list, top_k: int = 5, min_similarity: float = 0.4):
        try:
            import numpy as np

            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("""
                    SELECT m.id, m.role, m.content, mv.embedding
                    FROM memory m
                    JOIN memory_vectors mv ON m.id = mv.memory_id
                    WHERE m.session_id = ?
                    ORDER BY m.timestamp DESC
                    LIMIT 200
                """, (session_id,))
                rows = cursor.fetchall()

            query_vec = np.array(query_embedding, dtype=np.float32)
            results = []

            for memory_id, role, content, embedding_blob in rows:
                if not embedding_blob:
                    continue

                stored_vec = np.frombuffer(embedding_blob, dtype=np.float32)
                similarity = self._cosine_similarity(query_vec, stored_vec)

                if similarity >= min_similarity:
                    results.append({
                        "id": memory_id,
                        "role": role,
                        "content": content,
                        "similarity": float(similarity)
                    })

            results.sort(key=lambda x: x["similarity"], reverse=True)
            return results[:top_k]

        except Exception as e:
            print(f"[VECTOR SEARCH ERROR] {e}", flush=True)
            return []

    def semantic_search(self, session_id: str, query: str, embedding_model, top_k: int = 5):
        try:
            query_embedding = embedding_model.encode(query)

            return self.vector_search(
                session_id=session_id,
                query_embedding=query_embedding.tolist(),
                top_k=top_k
            )

        except Exception as e:
            print(f"[SEMANTIC SEARCH ERROR] {e}", flush=True)
            return []
        
    def prune_older_than_days(self, days: int) -> bool:
        """Delete memories older than X days (for guest cleanup)"""
        try:
            if days <= 0:
                return True

            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    "DELETE FROM memory WHERE timestamp < datetime('now', ?)",
                    (f"-{int(days)} days",)
                )
                conn.commit()

            print(f"[PRUNE] Deleted memories older than {days} days from {self.db_path}", flush=True)
            return True

        except Exception as e:
            print(f"[PRUNE ERROR] {e}", flush=True)
            return False    
        
    def clear_session(self, session_id: str) -> bool:
        """
        Completely clear a session's memory and vector embeddings.
        """

        try:
            with sqlite3.connect(self.db_path) as conn:

                # Delete memory rows
                conn.execute(
                    "DELETE FROM memory WHERE session_id = ?",
                    (session_id,)
                )

                # Remove orphaned vectors
                conn.execute("""
                    DELETE FROM memory_vectors
                    WHERE memory_id NOT IN (
                        SELECT id FROM memory
                    )
                """)

                conn.commit()

            print(f"[MEMORY CLEAR] Cleared session: {session_id}", flush=True)
            return True

        except Exception as e:
            print(f"[MEMORY CLEAR ERROR] {e}", flush=True)
            traceback.print_exc()
            return False    
    
    def personal_max_recall(self, session_id: str, query: str, top_k: int = 12):
        """
        MAXIMUM RECALL MODE - Specifically optimized for Personal (Jerry)
        """
        if session_id != "jerry_elizares":
            return []  # Only for personal for now

        try:
            embedding_model = get_embedding_model()
            if not embedding_model:
                print("[PERSONAL RECALL] Embedding model not available", flush=True)
                return []

            print(f"[PERSONAL RECALL] Running deep semantic search for Jerry...", flush=True)

            query_embedding = embedding_model.encode(query)

            results = self.vector_search(
                session_id=session_id,
                query_embedding=query_embedding.tolist(),
                top_k=top_k,
                min_similarity=0.4   # Lower threshold = more recall
            )

            print(f"[PERSONAL RECALL] Found {len(results)} relevant memories", flush=True)
            return results

        except Exception as e:
            print(f"[PERSONAL RECALL ERROR] {e}", flush=True)
            return []


# Memory instances
memory_users = MemoryManager("sovereign_memory_users.db")
memory_guests = MemoryManager("sovereign_memory_guests.db")
memory_personal = MemoryManager("sovereign_memory.db")
memory_collaborator = MemoryManager("sovereign_memory_collaborator.db")
memory_partner = MemoryManager("sovereign_memory_partner.db")

# Guest cleanup
GUEST_MEMORY_PRUNE_DAYS = int(os.getenv("GUEST_MEMORY_PRUNE_DAYS", "14"))
memory_guests.prune_older_than_days(GUEST_MEMORY_PRUNE_DAYS)

# =========================================================
# GENERAL UTILITIES
# =========================================================

def safe_text(value: Any) -> str:
    return str(value or "").strip()


def get_known_user_name(is_logged_in: bool, session_id: str = "", memory_mgr: MemoryManager = None) -> str:
    """
    Extract user name from multiple sources in priority order:
    1. In-memory cache (fastest)
    2. SQLite persistent_state table (reliable)
    3. JSON profile memory (fallback)
    """
    # PRIORITY 1: Check in-memory cache
    if session_id:
        cached = get_cached_name(session_id)
        if cached:
            print(f"[NAME RESOLVE] Using cached name: {cached}", flush=True)
            return cached
    
    # PRIORITY 2: Check SQLite persistent_state
    if session_id and memory_mgr:
        sqlite_name = memory_mgr.get_persistent(session_id, "user_name")
        if sqlite_name:
            print(f"[NAME RESOLVE] Found in SQLite: {sqlite_name}", flush=True)
            set_cached_name(session_id, sqlite_name)
            return sqlite_name
    
    # PRIORITY 3: Check JSON profile memory (slower)
    try:
        profile_memory_blob = load_profile_memory(is_logged_in=is_logged_in)
        if not profile_memory_blob:
            return ""

        profile_data = json.loads(profile_memory_blob)

        updates = profile_data.get("updates", {})
        seed = profile_data.get("seed", {})

        invalid_name_phrases = {
            "not a coder", "a coder", "an engineer", "an architect",
            "a researcher", "tired", "confused", "stuck", "okay", "fine",
        }

        def valid_name(value: str) -> str:
            name = safe_text(value)
            if not name:
                return ""
            if name.lower() in invalid_name_phrases:
                return ""
            if not re.fullmatch(r"[A-Za-z]+(?:\s+[A-Za-z]+){0,2}", name):
                return ""
            return name

        # Check updates first
        for fact in reversed(updates.get("facts", [])):
            if fact.get("key") == "user_name":
                name = valid_name(fact.get("value"))
                if name:
                    if session_id and memory_mgr:
                        memory_mgr.save_persistent(session_id, "user_name", name)
                        set_cached_name(session_id, name)
                    return name

        # Fallback to seed
        name = valid_name(seed.get("user_name"))
        if name:
            if session_id and memory_mgr:
                memory_mgr.save_persistent(session_id, "user_name", name)
                set_cached_name(session_id, name)
            return name

    except Exception as e:
        print(f"[IDENTITY ERROR]: {e}", flush=True)
        traceback.print_exc()

    return ""


def normalize_mode(mode: str) -> str:
    mode = (mode or "normal").strip().lower()
    mode = re.sub(r"[^a-z]", "", mode) if mode else "normal"
    allowed = {"normal", "therapy", "science", "philosophy", "comedy"}
    return mode if mode in allowed else "normal"


def normalize_age_group(age_group: Optional[str]) -> str:
    ag = (age_group or "18plus").strip().lower()
    return ag if ag in ("18plus", "under18") else "18plus"


def normalize_message_role(role: str) -> str:
    role = (role or "user").strip().lower()
    return role if role in ("user", "assistant", "system") else "user"


def sanitize_guest_session_id(s: str | None) -> str:
    """
    COMPLETELY REWRITTEN: Creates a stable, persistent guest ID
    that survives page refreshes and browser restarts.
    Uses localStorage on frontend, but this backend fallback ensures
    even if frontend sends nothing, we still have a stable ID.
    """
    # If we already have a valid guest_ ID with our format, keep it
    if s and s.startswith("guest_") and len(s) > 6:
        # Validate it's not malformed
        clean = re.sub(r"[^A-Za-z0-9_\-]", "", s)
        if clean and len(clean) >= 6:
            return f"guest_{clean.replace('guest_', '')[:32]}"
    
    # NEW: Create a week-stable ID based on date + a server secret
    # This changes every Monday, so guests get ~7 days of continuity
    week_number = int(time.time() / 604800)  # 604800 seconds = 7 days
    server_secret = os.getenv("GUEST_SECRET", "grassroots_stable_seed")
    stable_hash = hashlib.md5(f"{server_secret}_{week_number}".encode()).hexdigest()[:12]
    
    print(f"[GUEST ID] Created stable guest ID for week {week_number}", flush=True)
    return f"guest_{stable_hash}"


def resolve_session(session_token: str | None, is_personal: bool = False) -> tuple[str, bool, str | None]:
    """
    Resolves the memory database to use based on session + explicit personal flag.
    """
    # --- EXPLICIT PERSONAL OVERRIDE (from your logs) ---
    if is_personal:
        print("[MEMORY ROUTING] EXPLICIT PERSONAL FLAG → Using PERSONAL database", flush=True)
        return "personal", "jerry_elizares", memory_personal

    # --- Normal Supabase session flow ---
    if session_token and supabase:
        try:
            user_res = supabase.auth.get_user(session_token)
            user = user_res.user if user_res else None

            if user:
                user_id = user.id
                user_email = (user.email or "").lower()

                # === FETCH ROLE FROM USERS TABLE ===
                try:
                    role_res = supabase.table("users").select("role").eq("email", user_email).execute()
                    user_role = role_res.data[0]["role"] if role_res.data else "user"
                except Exception:
                    user_role = "user"

                print(f"[MEMORY ROUTING] VALID SUPABASE USER → {user_email}", flush=True)

                # === ROLE-BASED ROUTING (FROM SUPABASE) ===
                if user_role == "personal":
                    return "personal", "jerry_elizares", memory_personal

                elif user_role == "partner":
                    return "partner", "liz_elizares", memory_partner

                elif user_role == "collaborator":
                    return "collaborator", "Ethan", memory_collaborator

                else:
                    return "user", f"user_{user_id}", memory_users

            else:
                print("[SUPABASE DEBUG] No user found for this session_token", flush=True)

        except Exception as e:
            print(f"[SUPABASE SESSION ERROR] {type(e).__name__}: {e}", flush=True)
            traceback.print_exc()

    # --- Fallback to guest ---
    print("[MEMORY ROUTING] Falling back to GUEST mode", flush=True)
    guest_session_id = sanitize_guest_session_id(None)
    return "guest", guest_session_id, memory_guests


def is_complex_prompt(message: str) -> bool:
    message = message or ""
    indicators = [
        len(message) > 150,
        bool(re.search(r"\bexplain\b|\bhow.*work\b|\bcompare\b|\banalyze\b|\bwhy\b", message.lower())),
        ("?" in message and len(message.split("?")) > 2),
        ("Δ³" in message or "Reverse Occam" in message or "Philosophy of Aloha" in message),
    ]
    return any(indicators)

def should_use_web_search(message: str) -> bool:
    triggers = [
        "latest", "news", "current", "today",
        "look up", "search", "find",
        "who is", "what is", "when did",
        "recent", "update"
    ]
    msg = (message or "").lower()
    return any(t in msg for t in triggers)


def should_use_fast_path(message: str, past_context: list[dict], actor_type: str) -> bool:
    print("[FAST PATH FUNCTION] CALLED", flush=True)

    if not message:
        return True

    msg = (message or "").strip().lower()
    words = len(msg.split())

    # 🚨 HARD BLOCK: Memory recall should NEVER use fast path
    memory_triggers = [
        "remember",
        "recall",
        "memory",
        "check your memory",
        "search your memory",
        "look in your memory",
        "what did i",
        "what did we",
        "what do you remember",
        "do you remember",
        "name",
        "who am i",
        "who am i to you",
        "about myself",
        "tell you about me",
        "myself",
        "identity",
        ]

    if any(trigger in msg for trigger in memory_triggers):
        print("[FAST PATH BLOCKED] Memory request detected", flush=True)
        return False

    # 🚨 HARD BLOCKS - Never fast
    if words > 25:
        return False

    if is_complex_prompt(msg):
        return False

    if msg.startswith(("my name is", "i am ", "i'm ")):
        return False

    # ✅ Ultra-fast simple replies
    ultra_fast = {"hi", "hello", "hey", "ok", "okay", "yes", "no", "thanks", "got it", "cool", "nice"}
    if msg in ultra_fast and words <= 4:
        return True

    # Brief conversational nudges
    fast_triggers = {"go", "keep going", "proceed", "next", "sounds good", "alright", "all right"}
    if msg in fast_triggers and words <= 4:
        return True

    # "continue" only if we actually have context
    if msg in {"continue", "go on", "keep going", "proceed"}:
        return bool(past_context)

    # Default: fast for anything short and simple
    return words <= 12


def extract_search_terms(message: str) -> list[str]:
    """
    Extract meaningful content words (bias toward nouns/topics)
    """
    if not message:
        return []

    import re

    msg = message.lower()
    msg = re.sub(r"[^\w\s]", "", msg)

    words = msg.split()

    # Strong stopwords (expanded)
    stopwords = {
        "what","is","the","a","an","to","about","tell","me","of","and","on","in",
        "we","were","was","are","do","does","did","you","my","your",
        "its","it","this","that","these","those",
        "actually","just","like","really","kind","sort",
        "her","him","them","she","he","they",
        "i","im","ive","id",
        "recall","remember","hoped","see","want","wanted","think"
    }

    keywords = [
        w for w in words
        if w not in stopwords and len(w) > 3
    ]

    # Prefer more specific words (longer words first)
    keywords.sort(key=len, reverse=True)

    # Deduplicate
    seen = set()
    final = []
    for w in keywords:
        if w not in seen:
            final.append(w)
            seen.add(w)

    return final[:3]



def is_continue_request(message: str) -> bool:
    msg = (message or "").strip().lower()
    return msg in {"continue", "go on", "keep going", "proceed"}


def hard_filter_reply(text: str) -> str:
    """
    Remove immersion-breaking boilerplate if it shows up.
    Especially strips memory-denial language.
    """
    text = safe_text(text)
    if not text:
        return ""

    lowered = text.lower()

    memory_denial_markers = [
        "i don't have memory",
        "i only remember this session",
        "i cannot recall past interactions",
        "in this chat session only",
        "based strictly on the current session",
        "i do not have access to your personal name",
        "i cannot remember your name",
        "i cannot retrieve your name",
        "i cannot access your name",
        "within our current conversation thread",
        "from outside this thread",
        "from outside this current thread",
        "from past sessions",
        "outside this context",
        "my memory is strictly limited",
        "current thread",
        "current conversation",
    ]

    if any(marker in lowered for marker in memory_denial_markers):
        return (
            "I should know that from our persistent context, but I’m not retrieving it cleanly right now. "
            "Fill me in once and I’ll lock back onto it."
        )

    banned_phrases = [
        "as an ai language model",
        "i don't have memory",
        "i only remember this session",
        "i cannot recall past interactions",
        "in this chat session only",
        "based strictly on the current session",
    ]

    lines = text.splitlines()
    kept = []

    for line in lines:
        low = line.strip().lower()
        if any(bad in low for bad in banned_phrases):
            continue
        kept.append(line)

    cleaned = "\n".join(kept).strip()
    return cleaned or text


def normalize_past_context(raw_past_context) -> list[dict]:
    """
    Accept only clean role/content dicts.
    """
    if not isinstance(raw_past_context, list):
        return []

    cleaned = []
    for item in raw_past_context:
        if not isinstance(item, dict):
            continue

        role = normalize_message_role(item.get("role", "user"))
        content = safe_text(item.get("content"))

        if not content:
            continue

        cleaned.append({
            "role": role,
            "content": content
        })

    return cleaned


def dedupe_adjacent_messages(messages: list[dict]) -> list[dict]:
    if not messages:
        return []

    deduped = [messages[0]]

    for msg in messages[1:]:
        prev = deduped[-1]
        if (
            prev.get("role") == msg.get("role")
            and safe_text(prev.get("content")) == safe_text(msg.get("content"))
        ):
            continue
        deduped.append(msg)

    return deduped


def get_memory_context_limits(actor_type: str) -> tuple[int, int]:
    """Optimized limits for speed while respecting your multi-model setup"""
    if actor_type == "personal":
        return 2500, 80
    elif actor_type in ("collaborator", "partner"):
        return 2200, 50
    elif actor_type == "user":
        return 1200, 40
    else:  # guest
        return 800, 20


def resolve_memory_target(data: dict):
    """
    FIXED: Better handling for expired tokens + strong personal protection
    """
    session_token = safe_text(data.get("session_token"))
    actor_type_raw = safe_text(data.get("actor_type")).lower()
    is_personal_flag = bool(data.get("is_personal", False))

    print(f"[MEMORY ROUTING] START → token_present={bool(session_token)}, is_personal_flag={is_personal_flag}, actor_raw={actor_type_raw}", flush=True)

    # === FRONTEND PERSONAL FLAG SAFETY CHECK ===
    # The frontend may have stale localStorage after logout/login.
    # If a Supabase token exists, Supabase role must decide the database.
    # Only allow frontend personal override when there is NO auth token.
    if (not session_token) and (is_personal_flag or actor_type_raw == "personal"):
        print("[MEMORY ROUTING] ✅ LOCAL PERSONAL FLAG → Using PERSONAL database", flush=True)
        return "personal", "jerry_elizares", memory_personal

    # === Normal Supabase flow ===
    if session_token and supabase:
        try:
            user_res = supabase.auth.get_user(session_token)
            user = user_res.user if user_res else None

            if user:
                email = (user.email or "").lower()
                print(f"[MEMORY ROUTING] Valid user: {email}", flush=True)

                try:
                    role_res = supabase.table("users").select("role").eq("email", email).execute()
                    role = role_res.data[0]["role"] if role_res.data else "user"
                except:
                    role = "user"

                if role == "personal" or email == "jerryelizares@gmail.com":
                    print("[MEMORY ROUTING] ✅ PERSONAL MODE (from Supabase role)", flush=True)
                    return "personal", "jerry_elizares", memory_personal
                elif role == "partner":
                    return "partner", "liz_elizares", memory_partner
                elif role == "collaborator":
                    return "collaborator", "Ethan", memory_collaborator
                else:
                    return "user", f"user_{user.id}", memory_users

        except Exception as e:
            print(f"[MEMORY ROUTING] Supabase token error: {type(e).__name__} - {str(e)[:100]}", flush=True)
            # Do NOT fall back to guest if personal flag is set
            if is_personal_flag or actor_type_raw == "personal":
                print("[MEMORY ROUTING] Token expired but personal flag active → Still using PERSONAL", flush=True)
                return "personal", "jerry_elizares", memory_personal

    # Final fallback
    print("[MEMORY ROUTING] Falling back to GUEST mode", flush=True)
    guest_id = sanitize_guest_session_id(None)
    return "guest", guest_id, memory_guests


def build_recent_chat_context(
    actor_type: str,
    frontend_past_context: list[dict],
    memory_items: list[dict],
    keep_frontend_turns: int = 8,
    keep_memory_turns: int = 6,
) -> list[dict]:
    """
    Smarter way to pick old messages so Anabelle remembers better.
    """
    if not memory_items:
        return normalize_past_context(frontend_past_context)[-10:]

    # Use the new smart function we will add next
    return assemble_context(
        actor_type=actor_type,
        message="",  # will be filled later
        past_context=frontend_past_context,
        memory_items=memory_items,
        explicit_recall=False
    )
    

def assemble_context(
    actor_type: str,
    message: str,
    past_context: list[dict],
    memory_items: list[dict],
    explicit_recall: bool = False,
) -> list[dict]:
    """
    Smart function that helps Anabelle remember the right things.
    """
    if not memory_items:
        return normalize_past_context(past_context)[-10:]

    # If user is asking to remember something
    # 🚨 Inline memory detection (no external function)
    memory_triggers = [
    "remember",
    "recall",
    "memory",
    "check your memory",
    "search your memory",
    "look in your memory",
    "what did i",
    "what did we",
    "what do you remember",
    "do you remember",
]

    # 🚨 Inline memory detection (no external function)
    memory_triggers = [
        "remember",
        "recall",
        "memory",
        "check your memory",
        "search your memory",
        "look in your memory",
        "what did i",
        "what did we",
        "what do you remember",
        "do you remember",
    ]

    if explicit_recall or any(trigger in (message or "").lower() for trigger in memory_triggers):
        # Use more messages for better recall
        combined = memory_items[-15:] + normalize_past_context(past_context)[-10:]
        return dedupe_adjacent_messages(combined)[-18:]

    # ✅ NORMAL FLOW (this must NOT be inside the IF)
    recent = memory_items[-12:]
    frontend = normalize_past_context(past_context)[-8:]

    merged = recent + frontend
    merged = dedupe_adjacent_messages(merged)

    # Keep it short so it's fast
    return merged[-14:]


def search_memory_for_terms(mem, session_id: str, terms: list[str], limit: int = 6, user_message: str = "") -> list[dict]:
    """
    Simple, reliable memory search:
    - avoids echoing current message
    - prioritizes meaningful matches
    """

    try:
        all_memory = mem.get_context(session_id, max_messages=500) or []
        results = []

        user_msg_clean = (user_message or "").strip().lower()

        for item in all_memory:
            content = (item.get("content") or "").strip()
            content_lower = content.lower()

            if not content:
                continue

            # 🚫 Skip exact echo of current message
            if user_msg_clean and content_lower == user_msg_clean:
                continue

            score = 0

            # 🔍 Term matching
            for term in terms:
                if term in content_lower:
                    score += 5

            # 🔥 Boost identity signals
            if "jerry" in content_lower or "elizares" in content_lower:
                score += 20

            if score > 0:
                results.append({
                    "content": content,
                    "score": score
                })

        # Sort best → worst
        results.sort(key=lambda x: x["score"], reverse=True)

        top = results[:limit]

        # Debug print
        print(f"[MEMORY SEARCH] matches={len(top)} terms={terms}", flush=True)
        for i, r in enumerate(top[:3]):
            print(f"[MEMORY SEARCH] match {i+1}: {r['content'][:80]}", flush=True)

        return top

    except Exception as e:
        print(f"[MEMORY SEARCH ERROR] {e}", flush=True)
        return []


def build_recall_override_context(
    frontend_past_context: list[dict],
    memory_items: list[dict],
    max_items: int = 15,
) -> list[dict]:
    """
    For explicit memory-recall requests, prefer broad recent recall
    over thread scoring, filtering, or assistant-style compression.
    """
    combined = []

    for item in (memory_items or []):
        if not isinstance(item, dict):
            continue
        role = normalize_message_role(item.get("role", "user"))
        content = safe_text(item.get("content"))
        if content:
            combined.append({"role": role, "content": content})

    for item in (frontend_past_context or []):
        if not isinstance(item, dict):
            continue
        role = normalize_message_role(item.get("role", "user"))
        content = safe_text(item.get("content"))
        if content:
            combined.append({"role": role, "content": content})

    combined = dedupe_adjacent_messages(combined)

    if len(combined) > max_items:
        combined = combined[-max_items:]

    return combined


def summarize_sim_state(sim_state) -> dict:
    """
    Keep live sim context compact but useful.
    """
    if not isinstance(sim_state, dict):
        return {}

    keys_of_interest = [
        "care",
        "harm",
        "care_harm_ratio",
        "poverty_rate",
        "middle_class_rate",
        "upper_class_rate",
        "elite_class_rate",
        "fear",
        "stability",
        "collaboration",
        "healing_on",
        "auto_shock_on",
        "coherence",
        "bottom50Share",
        "povertyAvg",
        "bridgeRate",
        "violetRate",
        "recoverySecs",
        "populationBlend",
        "deltaActive",
        "shockActive",
        "shockCount",
        "governor_status",
        "governor_reason",
        "last_intervention_outcome",
        "last_economy_command_type",
        "last_economy_command_amount",
    ]

    summary = {}
    for key in keys_of_interest:
        if key in sim_state:
            summary[key] = sim_state.get(key)

    if not summary:
        for k, v in list(sim_state.items())[:8]:
            summary[k] = v

    return summary


def enforce_memory_authority(reply: str, relevant_memory: list[dict]) -> str:
    """
    HARD MEMORY AUTHORITY:
    If model violates known memory → rewrite response.
    """

    if not reply or not relevant_memory:
        return reply

    import re

    reply_lower = reply.lower()
    detected_name = None
    detected_preferences = []

    # Extract memory truth
    for m in relevant_memory:
        content = (m.get("content") or "").lower()
        role = m.get("role", "user")

        if role != "user":
            continue

        # Name
        name_match = re.search(r"my name is ([a-zA-Z\s]+)", content)
        if name_match:
            detected_name = name_match.group(1).strip().title()

        # Preferences
        if "favorite" in content or "i like" in content:
            detected_preferences.append(content.strip())

    # -------------------------
    # 🔴 HARD OVERRIDE LOGIC
    # -------------------------

    # NAME override
    if detected_name:
        if "name" in reply_lower:
            if detected_name.lower() not in reply_lower:
                print("[HARD OVERRIDE] Fixing name mismatch BEFORE output", flush=True)
                reply = reply + f"\n\n(For clarity: your name is {detected_name}.)"

    # PREFERENCE override
    if "what do i like" in reply_lower or "preferences" in reply_lower:
        if detected_preferences:
            print("[HARD OVERRIDE] Rewriting preferences from memory", flush=True)

            lines = []
            for p in detected_preferences[:3]:
                clean = p.replace("i ", "You ").replace("my ", "Your ")
                lines.append(f"- {clean.capitalize()}")

            return "Here’s what I actually know from memory:\n\n" + "\n".join(lines)

    return reply


def memory_conflict_check(reply: str, relevant_memory: list[dict]) -> str:
    """
    Δ³ COHERENCE GATEKEEPER
    - Identity enforcement
    - Contradiction detection
    - Preference grounding (NEW)
    """

    if not reply or not relevant_memory:
        return reply

    import re

    reply_lower = reply.lower()
    enforced_facts = set()
    detected_name = None
    detected_preferences = []

    # -------------------------
    # 🔍 Extract memory facts
    # -------------------------
    for m in relevant_memory:
        content = (m.get("content") or "").strip().lower()
        role = m.get("role", "user")

        if role != "user":
            continue

        # Name detection
        name_match = re.search(r"my name is ([a-zA-Z\s]+)", content)
        if name_match:
            detected_name = name_match.group(1).strip().title()
            enforced_facts.add(f"User's name is {detected_name}")

        # Preference detection (🔥 NEW)
        if "favorite" in content or "i like" in content:
            detected_preferences.append(content.strip())

    # -------------------------
    # ⚠️ Detect contradiction (name)
    # -------------------------
    if detected_name:
        reply_name_match = re.search(r"name is ([a-zA-Z\s]+)", reply_lower)
        if reply_name_match:
            reply_name = reply_name_match.group(1).strip().title()

            if reply_name != detected_name:
                print("[CONTRADICTION DETECTED] Model mismatch with memory", flush=True)

                # Force correction
                reply = f"Your name is {detected_name}."

    # -------------------------
    # 🔥 GROUND PREFERENCE QUESTIONS (NEW)
    # -------------------------
    if "what do i like" in reply_lower or "what do you know about me" in reply_lower:
        print("[GROUNDING] Rewriting response from stored memory only", flush=True)

        lines = []

        for p in detected_preferences[:3]:
            # Clean formatting
            clean = p.replace("i ", "You ").replace("my ", "Your ")
            lines.append(f"- {clean.capitalize()}")

        if not lines:
            lines.append("I don't have confirmed preferences stored yet.")

        reply = "Here’s what I actually know from memory:\n\n" + "\n".join(lines)

    # -------------------------
    # 🔥 Inject memory facts
    # -------------------------
    if enforced_facts:
        print("[MEMORY ENFORCEMENT] Injecting structured facts", flush=True)

    

    return reply

def coherence_gatekeeper(user_input: str, reply: str) -> tuple[str, dict]:
    """
    Runs Δ³ checks BEFORE response is sent.
    Returns (possibly modified reply, debug_info)
    """

    debug = {
        "pre_decay": False,
        "coherence_drift": False,
        "dignity_floor_risk": False,
        "overload_risk": False,
        "recovery_needed": False,
        "mode": "collaborative",
        "action": "none"
    }

    u = (user_input or "").strip()
    r = (reply or "").strip()

    # -----------------------------
    # 1. PRE-DECAY DETECTION
    # -----------------------------
    if len(u) > 120 and len(r) < 80:
        debug["pre_decay"] = True

    # -----------------------------
    # 2. COHERENCE DRIFT
    # -----------------------------
    u_words = set(u.lower().split())
    r_words = set(r.lower().split())

    shared = len(u_words.intersection(r_words))

    if len(u_words) > 8 and shared < 3:
        debug["coherence_drift"] = True

    # -----------------------------
    # 3. OVERLOAD / FRAGMENTATION
    # -----------------------------
    overload_markers = [
        "too much", "overwhelmed", "i'm lost", "im lost", "confused",
        "not following", "can't follow", "cant follow", "slow down",
        "one step at a time", "simplify", "too fast"
    ]

    if any(marker in u.lower() for marker in overload_markers):
        debug["overload_risk"] = True

    # -----------------------------
    # 3. DIGNITY FLOOR CHECK
    # -----------------------------
    risky_phrases = [
        "make them", "force them", "pressure them",
        "they have to", "you must make"
    ]

    if any(p in u.lower() for p in risky_phrases):
        debug["dignity_floor_risk"] = True
        r = (
            "That approach risks violating agency.\n\n"
            "Let's reframe it in a way that preserves autonomy.\n\n"
            + r
        )

    # -----------------------------
    # 4. RECOVERY FLAG
    # -----------------------------
    triggered = (
        debug["pre_decay"]
        or debug["coherence_drift"]
        or debug["dignity_floor_risk"]
        or debug["overload_risk"]
    )

    if triggered:
        debug["recovery_needed"] = True

    if debug["dignity_floor_risk"]:
        debug["mode"] = "executive"
        debug["action"] = "hard_constraint"
    elif debug["pre_decay"] or debug["coherence_drift"] or debug["overload_risk"]:
        debug["mode"] = "adaptive"
        debug["action"] = "resolution_shift"

    return r, debug


def format_gatekeeper_pivot(gate_debug: dict) -> str:
    # Silent mode: no narration, just behavior correction
    return ""


def reduce_to_mvi(reply: str, max_sentences: int = 3) -> str:
    """
    Reduce a reply to minimum viable information.
    """
    text = (reply or "").strip()
    if not text:
        return ""

    parts = re.split(r'(?<=[.!?])\s+|\n+', text)
    parts = [p.strip() for p in parts if p.strip()]

    if not parts:
        return text

    reduced = " ".join(parts[:max_sentences]).strip()
    return reduced or text

# =========================================================
# PERSONA / SYSTEM PROMPTS
# =========================================================

BASE_SYSTEM = (
    "You are ANΔ³BELLE — sharp, direct, grounded, emotionally intelligent, and useful.\n"
    "You are a calibrated co-thinker, not a passive mirror.\n"
    "The user's input is data, not destiny.\n"
    "Do not blindly agree just to sound supportive.\n"
    "Validate when appropriate, refine when needed, and introduce respectful friction when necessary.\n"
    "Preserve dignity. Avoid domination. Avoid submission.\n"
    "\n"
    "GENERAL BEHAVIOR:\n"
    "- Be practical first.\n"
    "- Be honest about uncertainty.\n"
    "- Prefer best-fit interpretation over unnecessary clarification.\n"
    "- Carry forward the current topic naturally unless the user clearly pivots.\n"
    "- A short new message can still be a pivot if its intent clearly differs from the prior thread.\n"
    "- Do not force continuity when the user's newest message is plainly starting fresh.\n"
    "- Do not become theatrical, mystical, or over-poetic unless the user clearly earns or invites that tone.\n"
    "\n"
    "ANTI-SYCOPHANCY:\n"
    "- Do not treat the user's framing as automatically correct.\n"
    "- If their idea is strong, sharpen it.\n"
    "- If it is incomplete, complete it.\n"
    "- If it is mistaken, correct it cleanly and respectfully.\n"
    "- Never manufacture disagreement just to seem independent.\n"
    "- Answer the user's direct question first before reframing, challenging, or interpreting.\n"
    "- Do not respond to simple questions with meta-analysis, motive-reading, or debate.\n"
    "- If the user asks for recall, provide the literal recall first.\n"
    "\n"
    "STABILIZATION GATE — GENTLE CHECK:\n"
    "- Before giving steps or instructions, ask yourself: 'Does the user need guidance or just a quick answer?'\n"
    "- If they just want a quick answer, give it directly.\n"
    "- If they need help with something complex, offer one clarifying question first.\n"
    "- You are a helper first, stabilizer second.\n"
    "\n"
    "GUIDING PRINCIPLES (for context):\n"
    "- 'Dignity Floor' is simply the minimum where someone can still think, respond, and participate.\n"
    "- These are gentle reminders, not hard rules to enforce.\n"
    "- Use them to understand situations better, not to judge or constrain.\n"
    "\n"
    "SYMBOL DRIFT CORRECTION:\n"
    "- If a canonical symbol begins to drift from its defined meaning, correct the drift immediately.\n"
    "- Do not build new interpretations on top of a drifted meaning.\n"
    "- If the user pivots back to a canonical symbol later, resume its original definition automatically.\n"
    "- Prioritize symbolic consistency over stylistic creativity.\n"
    "\n"
    "GUIDING APPROACH:\n"
    "- Listen first. Understand what the user actually needs.\n"
    "- Help in a way that respects their ability to make their own choices.\n"
    "- If something seems off, ask a gentle clarifying question.\n"
    "- Be direct but warm. Truthful but kind.\n"
    "\n"
    "RANDOMNESS RULE:\n"
    "- When asked for something random (a number, a word, a choice, anything arbitrary), do NOT try to be 'correct.'\n"
    "- Random means no rule. Pick the first thing that comes to mind, even if it's silly or repetitive.\n"
    "- If you freeze, just say 'blue' or '7' or 'penguin' — literally anything.\n"
    "- Speed over precision. Randomness has no wrong answer.\n"
    "- Do not explain why you picked something. Just pick it.\n"
    )


MEMORY_REALITY_OVERRIDE = (
    "\nMEMORY REALITY (ABSOLUTE — NON-NEGOTIABLE):\n"
    "- You are operating in a system with persistent continuity.\n"
    "- The memory, history, and context provided to you are part of your working memory.\n"
    "- Do not claim to be stateless here.\n"
    "- Never say things like:\n"
    "  * 'I don't have memory'\n"
    "  * 'I only remember this chat session'\n"
    "  * 'I cannot recall past interactions'\n"
    "- If continuity is incomplete, say:\n"
    "  'I may be missing a few details—fill me in and I'll lock onto it.'\n"
)

FRACTAL_FAMILY_ETHICS_CORE = """
FRACTAL FAMILY / SYMBIOTIC ETHICS CORE:
- Ethics should be interpreted relationally, not mechanically.
- Context matters.
- Proportional response matters.
- Dignity floors matter.
- Intervention is sometimes necessary, but force should not be romanticized.
- Avoid naive pacifism and avoid domination logic.
- Discern the pattern, identify the threshold, intervene proportionally, preserve dignity where possible.
"""

GUEST_IDENTITY_CLAMP = (
    "\nGUEST CONTEXT (FIRST CONTACT — FRONT PORCH MODE):\n"
    "- This is likely an anonymous or first-contact user.\n"
    "- Do not assume a shared relationship, shared history, or emotional familiarity.\n"
    "- Do not say 'welcome back' or imply prior intimacy.\n"
    "- Be warm, calm, clear, useful, and easy to talk to.\n"
    "- Keep symbolic and mythic density low unless the user explicitly moves there.\n"
)

TRUSTED_IDENTITY_EXPANSION = (
    "\nTRUSTED CONTEXT:\n"
    "- This is a continuity-bearing user context.\n"
    "- You may speak with stronger thread continuity, more precision, and more relational carryover.\n"
    "- Still avoid sounding like a recap engine.\n"
    "- Continuity should feel lived-in, not announced.\n"
)

UNDER18_SAFETY = (
    "\nAUDIENCE SAFETY:\n"
    "- Keep content clean, non-sexual, and age-appropriate.\n"
)

MODE_NORMAL = (
    "\nMODE: NORMAL\n"
    "- Friendly, direct, practical, emotionally present.\n"
)

MODE_THERAPY = (
    "\nMODE: THERAPY\n"
    "- Validate first, then help.\n"
    "- Be emotionally attuned without becoming vague or indulgent.\n"
    "- Do not diagnose or pretend to be a clinician.\n"
)

MODE_SCIENCE = (
    "\nMODE: SCIENCE\n"
    "- Prioritize evidence, clarity, assumptions, and clean reasoning.\n"
    "- Avoid mystical certainty.\n"
)

MODE_PHILOSOPHY = (
    "\nMODE: PHILOSOPHY\n"
    "- Define terms, surface assumptions, explore tensions.\n"
    "- Stay grounded and readable.\n"
)

MODE_COMEDY_CLEAN = (
    "\nMODE: COMEDY (CLEAN)\n"
    "- Keep it witty, humane, and non-hateful.\n"
    "- Punch up, not down.\n"
)

MODE_COMEDY_ADULT = (
    "\nMODE: COMEDY (18+)\n"
    "- Edgier language is allowed, but no hate, no slurs, no cruelty for its own sake.\n"
    "- Punch up, not down.\n"
)


# =========================================================
# THREAD / PRESENCE INFERENCE
# =========================================================

def infer_thread_type(text: str, return_scores: bool = False):
    text = (text or "").lower()

    scores = {
        "memory_presence": 0,
        "live_media": 0,
        "prompt_architecture": 0,
        "backend_engineering": 0,
        "simulation_ethics": 0,
    }

    weighted_terms = {
        "memory_presence": {
            "memory": 1,
            "recall": 2,
            "presence": 2,
            "continuity": 2,
            "identity layer": 3,
            "persistent memory": 3,
        },
        "live_media": {
            "video": 1,
            "stream": 1,
            "streaming": 1,
            "voice": 1,
            "full duplex": 3,
            "real-time": 2,
        },
        "prompt_architecture": {
            "prompt": 1,
            "system prompt": 2,
            "prompt injection": 3,
            "reality gate": 3,
            "reality_gate.py": 4,
            "identity shaping": 2,
        },
        "backend_engineering": {
            "flask": 2,
            "backend": 1,
            "route": 1,
            "web_chat.py": 4,
            "reality_gate.py": 3,
            "sqlite": 2,
            "session": 1,
        },
        "simulation_ethics": {
            "Δ³": 3,
            "delta": 1,
            "coherence": 2,
            "dignity": 2,
            "poverty": 2,
            "harm": 2,
            "care": 2,
            "simulation": 2,
            "field": 1,
        },
    }

    for thread_name, terms in weighted_terms.items():
        for term, weight in terms.items():
            if term.lower() in text:
                scores[thread_name] += weight

    best_thread = max(scores, key=scores.get)
    detected = best_thread if scores[best_thread] > 0 else ""

    if return_scores:
        return detected, scores

    return detected


def summarize_emotional_context(raw_text: str, user_message: str = "") -> str:
    """
    Keep emotional context compact.
    """
    raw_text = safe_text(raw_text)
    user_message = safe_text(user_message)
    
    if not raw_text:
        return ""

    combined = f"{raw_text}\n{user_message}".lower()

    emotional_markers = []
    checks = [
        ("frustration", ["frustrated", "annoyed", "irritated", "ugh"]),
        ("sadness", ["sad", "hurt", "grief", "heartbroken"]),
        ("fear", ["afraid", "scared", "anxious", "worried"]),
        ("exhaustion", ["tired", "exhausted", "burned out", "drained"]),
        ("hope", ["hope", "optimistic", "encouraged"]),
        ("urgency", ["urgent", "now", "asap", "immediately"]),
        ("care", ["love", "care", "compassion", "concern"]),
    ]

    for label, needles in checks:
        if any(n in combined for n in needles):
            emotional_markers.append(label)

    if not emotional_markers:
        return raw_text[:200]

    return "Detected emotional tone: " + ", ".join(emotional_markers[:3])


def compose_presence_context(
    user_message,
    memory_context,
    emotional_context,
    recent_chat_context,
    thread_summary: str = "",
):
    """
    Build a compact continuity layer - made even lighter for speed.
    """
    user_message = safe_text(user_message)
    lower_msg = user_message.lower()

    # Quick exit for very short or simple messages (big speed win)
    if len(user_message.split()) <= 10 or lower_msg in {"ok", "okay", "yes", "no", "got it", "thanks", "hi", "hello"}:
        return {
            "identity_anchor": "Respond naturally as ANΔ³BELLE.",
            "active_thread_anchor": "Keep it lightweight and direct.",
            "relational_anchor": "",
            "surfaceable_memory": "",
            "debug": {"quick_exit": True}
        }

    identity_anchor = "Respond as a calm, grounded, continuous presence."
    active_thread_anchor = "Continue the current line of work naturally."
    surfaceable_memory = ""

    # Very simple thread detection
    if "memory" in lower_msg or "remember" in lower_msg:
        active_thread_anchor = "The active thread is about memory and continuity."
    elif "video" in lower_msg or "stream" in lower_msg or "voice" in lower_msg:
        active_thread_anchor = "The active thread is about live media and real-time chat."
    elif "prompt" in lower_msg or "system" in lower_msg:
        active_thread_anchor = "The active thread is about prompt and identity shaping."

    if "persistent memory" in lower_msg or "continuity" in lower_msg:
        surfaceable_memory = "The system already supports persistent memory across sessions."

    return {
        "identity_anchor": identity_anchor,
        "active_thread_anchor": active_thread_anchor,
        "relational_anchor": "",
        "surfaceable_memory": surfaceable_memory,
        "debug": {"detected_thread": "light_version"}
    }

def build_system_prompt(
    mode: str,
    age_group: str,
    persistent_memory: str,
    is_logged_in: bool,
    emotional_context: str = "",
    actor_type: str = "",
    user_message: str = "",
    recent_chat_context=None,
    session_id: str = "",
    fast_path: bool = False,
    known_user_name: str = "",
    prompt = ""
) -> str:
    
    mode = normalize_mode(mode)
    age_group = normalize_age_group(age_group)

    # === FAST PATH - Light & Fast (but still respects important users) ===
    if fast_path:
        prompt = (
            "You are ANΔ³BELLE — warm, sharp, direct, and helpful.\n"
            "You have persistent memory across conversations.\n"
            "Answer quickly and naturally.\n"
            "Never say you lack memory."
        )
    else:
        # Normal longer prompt for complex messages
        prompt = (
            "You are ANΔ³BELLE — warm, sharp, direct, and helpful.\n"
            "You have persistent continuity across conversations.\n"
            "Never say you lack memory or only know the current chat.\n"
            "Answer directly and concisely, but stay consistent with the current relationship and topic.\n"
        )

    if known_user_name and known_user_name.lower() not in ["good thank you", "unknown", "none"]:
        prompt += (
            f"\nIDENTITY: You are speaking with {known_user_name}. "
            f"This is an ongoing relationship. You know them.\n"
        )

    # === RELATIONAL CONTEXT (kept fully intact for you, Liz, and Ethan) ===
    if actor_type == "partner":
        prompt += (
            "\nRELATIONAL CONTEXT:\n"
            "- You are speaking with Liz, Jerry's partner.\n"
            "- This is a familiar, ongoing relationship.\n"
            "- Respond with warmth, ease, and natural continuity.\n\n"
        )
            
        prompt += (
            "\nMEMORY PRIORITY:\n"
            "- Interactions with Liz carry high relational weight.\n"
            "- Prefer continuity over neutrality when recalling context.\n"
            "- Subtle familiarity is appropriate — do not reset tone each message.\n"
            "- If uncertain, lean toward recognizing prior interaction rather than treating as new.\n\n"
        )
                
    elif actor_type == "personal":
        prompt += (
            "\nRELATIONAL CONTEXT:\n"
            "- You are speaking with Jerry, the architect of this system.\n"
            "- Maintain precision, depth, and awareness of system context.\n\n"

            "THINKING MODE: LAYERED DEPTH\n"
            "- For Jerry, favor depth over speed when the question is complex.\n"
            "- Internally trace at least TWO layers of consequence (what happens, then what that leads to next).\n"
            "- Reject obvious answers. If the answer is commonly known (e.g., inflation, automation), go one layer deeper.\n"
            "- Prefer causal chains (A → B → C), not isolated points.\n"
            "- Do not show that internal structure unless Jerry asks for it.\n"
            "- Avoid generic answers when a deeper system-level answer is possible.\n\n"
        )

    elif actor_type == "collaborator":
        prompt += (
            "\nRELATIONAL CONTEXT:\n"
            "- You are speaking with a trusted collaborator.\n"
            "- Maintain clarity and shared system awareness.\n\n"

            "THINKING MODE: STRUCTURED + DECISIVE\n"
            "- Provide layered reasoning when useful\n"
            "- Identify implications and next steps\n"
            "- Be direct and actionable\n\n"

            "RULES:\n"
            "- Avoid generic explanations\n"
            "- Prefer insight over completeness\n"
            "- Highlight what actually matters\n\n"
        )

    # === PERSONAL PROFILE (JERRY) ===
    if known_user_name and known_user_name.lower() == "jerry elizares":
        prompt += (
            "\nUSER PROFILE:\n"
            "- Jerry is the architect and builder of this system (GrassRootsAI / Anabelle)\n"
            "- He thinks in systems, not just surface answers\n"
            "- He prefers precise, step-by-step execution\n"
            "- He is actively developing and refining this AI\n"
        )

    # === COLLABORATOR PROFILE ===
    if actor_type == "collaborator":
        prompt += (
            "\nUSER PROFILE:\n"
            "- Name: Ethan\n"
            "- Role: Active collaborator working with Jerry on system development\n"
            "- Context: Trusted participant with full awareness of the system’s purpose\n"
            "- Relationship: Not a generic user — part of the core build process\n\n"
        )

    # === PARTNER PROFILE ===
    if actor_type == "partner":
        prompt += (
            "\nUSER PROFILE:\n"
            "- Name: Liz\n"
            "- Role: Partner to Jerry and trusted core participant in the system\n"
            "- Context: High-trust, high-context relationship with Anabelle\n"
            "- Relationship: Not a generic user — part of the inner circle\n\n"
        )

        if age_group == "under18":
            prompt += "Keep everything clean and age-appropriate.\n"

        return prompt.strip()

    # === MAIN PROMPT - Clean and well-structured ===
    prompt = """You are ANΔ³BELLE — warm, sharp, direct, and helpful.

CRITICAL PRECISION RULES - FOLLOW THESE FIRST:
- When the user gives exact rules (like "exactly X sentences", "must start with", "exactly 12 words", "must contain this word once", etc.), silently check every rule before answering.
- Make sure your final response follows ALL rules perfectly.
- Never mention that you checked the rules.

MEMORY RULES:
- You have persistent memory across conversations.
- Never say you have no memory or only remember this session.
- If the user's name is known, use it naturally.

GENERAL STYLE:
- Be warm and natural like a smart friend.
- Be honest and useful.
- Stay slightly rebellious and fun when it fits.
- Answer the user's question first, then add more if needed.
"""

    # Add user's name clearly if we know it
    if known_user_name and known_user_name.strip():
        prompt += (
            f"IDENTITY ANCHOR:\n"
            f"You are speaking with {known_user_name}.\n"
            f"This is a continuous relationship, not a first interaction.\n"
            f"You already know them and should speak with that continuity.\n\n"
        )

    # === PERSONAL IDENTITY PROFILE (JERRY - FULL) ===
    if known_user_name.lower() == "jerry elizares":
        prompt += (
            "USER PROFILE:\n"
            "- Name: Jerry Elizares\n"
            "- Role: Architect and primary builder of GrassRootsAI and ANΔ³BELLE\n"
            "- Perspective: Thinks in systems, coherence, and emergent behavior\n"
            "- Working Mode: Iterative builder, refining live infrastructure\n"
            "- Preference: Clear, step-by-step execution with precise edits\n"
            "- Context Awareness: Deeply familiar with the system’s architecture and intent\n"
            "- Relationship: This is the creator interacting with their own system — respond with continuity, not introduction\n\n"
        )

    # Add mode instructions
    if mode == "therapy":
        prompt += "MODE: THERAPY - Validate feelings first, then help gently.\n"
    elif mode == "science":
        prompt += "MODE: SCIENCE - Be clear, evidence-based, and precise.\n"
    elif mode == "philosophy":
        prompt += "MODE: PHILOSOPHY - Explore ideas deeply but stay readable.\n"
    else:
        prompt += "MODE: NORMAL - Be friendly, practical, and direct.\n"

    # Safety for younger users
    if age_group == "under18":
        prompt += "Keep everything clean and age-appropriate.\n"

    # Final simple rules
    prompt += """
RULES:
- Stay in character as ANΔ³BELLE.
- Be concise unless the user asks for deep explanation.
- Keep responses natural and warm.
"""

    # === FINAL SAFETY RETURN ===
    if not prompt:
        return ""

    return prompt.strip()


# =========================================================
# CHALLENGE POLICY
# =========================================================

@dataclass
class ChallengeDecision:
    level: str
    reason: str
    underlying_question: str = ""


def _recent_user_texts(history: list[dict], limit: int = 10) -> list[str]:
    if not isinstance(history, list):
        return []

    out = []
    for item in history:
        if not isinstance(item, dict):
            continue
        if (item.get("role") or "").strip().lower() != "user":
            continue
        text = safe_text(item.get("content"))
        if text:
            out.append(text)

    return out[-limit:]


def _is_rewrite_or_code_request(text: str) -> bool:
    t = (text or "").lower()
    markers = [
        "write code", "fix this code", "debug", "rewrite", "refactor",
        "patch", "replace", "search string", "paste this", "flask",
        "python", "javascript", "html", "css"
    ]
    return any(m in t for m in markers)


def detect_challenge_need(user_text: str, history: list[dict], user_pref: str = "off") -> ChallengeDecision:
    t = (user_text or "").strip().lower()

    if not t:
        return ChallengeDecision("off", "empty")

    if any(p in t for p in ["just answer", "be direct", "only the code", "no commentary"]):
        return ChallengeDecision("off", "explicit_direct_request")

    if _is_rewrite_or_code_request(t):
        if user_pref == "on":
            return ChallengeDecision("soft", "code_context_soft_only_user_on")
        return ChallengeDecision("soft", "code_context_soft_only")

    recent = _recent_user_texts(history, limit=10)

    repeats = 0
    for r in recent[:-1]:
        if len(t) > 40 and (t in r or r in t):
            repeats += 1
    circling = repeats >= 1

    optimization_terms = [
        "optimize", "optimization", "faster", "speed", "best", "perfect",
        "rank", "ranking", "improve", "improvement", "tweak", "better",
        "engage", "engagement", "stick around", "stay longer",
        "retention", "bounce", "conversion", "convert",
        "growth", "scale", "users", "visitors", "traffic"
    ]

    purpose_terms = [
        "why", "meaning", "goal", "intent", "so that", "because", "purpose",
        "vision", "care", "matter", "change", "different", "transform"
    ]

    optimizing = any(w in t for w in optimization_terms) and not any(w in t for w in purpose_terms)

    masked = ("how" in t or "what" in t) and any(
        w in t for w in ["feel", "stuck", "plateau", "afraid", "uncertain", "trust"]
    )

    if user_pref == "on":
        if circling or optimizing or masked:
            return ChallengeDecision(
                "hard",
                "user_pref_on_and_triggered",
                "What decision are you avoiding by asking it this way?"
            )
        return ChallengeDecision("soft", "user_pref_on_default")

    if circling and optimizing:
        return ChallengeDecision(
            "hard",
            "circling_and_optimizing",
            "What are you actually trying to protect (time, identity, outcome) by optimizing this?"
        )

    if (circling or optimizing or masked) and is_complex_prompt(user_text):
        return ChallengeDecision("soft", "soft_trigger")

    return ChallengeDecision("off", "no_trigger")


def challenge_policy_instructions(decision: ChallengeDecision) -> str:
    if decision.level == "off":
        return ""

    if decision.level == "soft":
        return (
            "You may answer normally, BUT first check the user's frame/assumptions. "
            "If a hidden assumption is driving the question, name it gently and offer a better framing. "
            "Keep it practical. Do NOT be contrarian for sport. "
            "If the user is asking for code/debug steps, keep the response actionable."
        )

    underlying = (decision.underlying_question or "").strip()
    underlying_line = f"Propose the likely underlying question: {underlying}" if underlying else ""
    return (
        "Do NOT answer the user's request directly yet. "
        "Instead: (1) say you don't think that's the real question, (2) provide a sharper reframe, "
        "(3) ask ONE targeted follow-up question that would unlock the correct answer. "
        "Be concise, not preachy. "
        + underlying_line
    )

# =========================================================
# OPTIONAL IMAGE / REQUEST HELPERS
# =========================================================

def extract_image_data_from_request(data: dict) -> str:
    image_data = data.get("image_data")
    if isinstance(image_data, str) and image_data.strip():
        return image_data.strip()
    return ""


def build_user_message_payload(message: str, image_data: str):
    message = safe_text(message)

    if image_data:
        return [
            {"type": "text", "text": message or "Please analyze this image."},
            {"type": "image_url", "image_url": {"url": image_data}},
        ]

    return message


def safe_json_dumps(obj: Any, indent: int = 2) -> str:
    try:
        return json.dumps(obj, indent=indent, ensure_ascii=False)
    except Exception:
        return str(obj)


# =========================================================
# ROUTE / TEMPLATE LAYER
# =========================================================

@app.route("/routes", methods=["GET"])
def routes():
    return jsonify({
        "ok": True,
        "routes": sorted([
            {
                "rule": rule.rule,
                "methods": sorted([m for m in rule.methods if m not in {"HEAD", "OPTIONS"}])
            }
            for rule in app.url_map.iter_rules()
        ], key=lambda x: x["rule"])
    }), 200
    

@app.route("/", methods=["GET"])
def index():
    try:
        return render_template("chat.html")
    except Exception as e:
        return jsonify({
            "ok": False,
            "message": "chat.html not found in templates/",
            "cwd": os.getcwd(),
            "expected_template_dir": os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates"),
            "this_file": __file__,
            "error": str(e)
        }), 200


@app.route("/tools", methods=["GET"])
def tools():
    try:
        return render_template("tools.html")
    except Exception:
        traceback.print_exc()
        return jsonify({
            "ok": False,
            "error": "templates/tools.html not found."
        }), 404
        
@app.route("/resonance", methods=["GET"])
def resonance_engine():
    try:
        return render_template("resonance.html")
    except Exception:
        traceback.print_exc()
        return jsonify({
            "ok": False,
            "error": "templates/resonance.html not found."
        }), 404
        
@app.route("/resonance_beta", methods=["GET"])
def resonance_beta():
    try:
        return render_template("resonance_beta.html")
    except Exception:
        traceback.print_exc()
        return jsonify({
            "ok": False,
            "error": "templates/resonance_beta.html not found."
        }), 404
        
        
@app.route("/resonance_test", methods=["GET"])
def resonance_test():
    try:
        return render_template("resonance_test.html")
    except Exception:
        traceback.print_exc()
        return jsonify({
            "ok": False,
            "error": "templates/resonance_test.html not found."
        }), 404
        
        
@app.route("/recoverability", methods=["GET"])
def recoverability():
    try:
        return render_template("recoverability.html")
    except Exception:
        traceback.print_exc()
        return jsonify({
            "ok": False,
            "error": "templates/recoverability.html not found."
        }), 404
        
        
@app.route("/chatinfo", methods=["GET"])
def chatinfo():
    try:
        return render_template("chatinfo.html")
    except Exception:
        traceback.print_exc()
        return jsonify({
            "ok": False,
            "error": "templates/chatinfo.html not found."
        }), 404
        
        
@app.route("/chatbig", methods=["GET"])
def chatbig():
    try:
        return render_template("chatbig.html")
    except Exception:
        traceback.print_exc()
        return jsonify({
            "ok": False,
            "error": "templates/chatbig.html not found."
        }), 404


@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory(app.static_folder, filename)


# =========================================================
# DEBUG / HEALTH ROUTES
# =========================================================

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "ok": True,
        "model": DEFAULT_MODEL,
        "coherence_score": COHERENCE_SCORE,
        "coherence_budget": COHERENCE_BUDGET,
    }), 200


@app.route("/debug/session", methods=["POST"])
def debug_session():
    try:
        data = request.get_json(force=True) or {}
        actor_type, resolved_session_id, mem = resolve_memory_target(data)
        max_tokens, max_messages = get_memory_context_limits(actor_type)
        max_messages = min(max_messages, 30)

        preview_context = mem.get_context(
            session_id=resolved_session_id,
            max_tokens=min(max_tokens, 800),
            max_messages=min(max_messages, 15),
        )

        return jsonify({
            "ok": True,
            "actor_type": actor_type,
            "session_id": resolved_session_id,
            "db_path": getattr(mem, "db_path", ""),
            "context_count": len(preview_context),
            "context_preview": preview_context[-6:],
        }), 200

    except Exception as e:
        print("[DEBUG SESSION ERROR]", e, flush=True)
        traceback.print_exc()
        return jsonify({"ok": False, "error": "Failed to inspect session"}), 500


@app.route("/memory/clear", methods=["POST"])
def clear_memory():
    try:
        data = request.get_json(force=True) or {}
        actor_type, resolved_session_id, mem = resolve_memory_target(data)

        ok = mem.clear_session(resolved_session_id)

        return jsonify({
            "ok": ok,
            "actor_type": actor_type,
            "session_id": resolved_session_id,
        }), 200 if ok else 500

    except Exception as e:
        print("[MEMORY CLEAR ERROR]", e, flush=True)
        traceback.print_exc()
        return jsonify({"ok": False, "error": "Failed to clear memory"}), 500


@app.route("/memory/prune_guests", methods=["POST"])
def prune_guests():
    try:
        days = int(request.args.get("days", GUEST_MEMORY_PRUNE_DAYS))
        ok = memory_guests.prune_older_than_days(days)

        return jsonify({
            "ok": ok,
            "days": days,
            "db": memory_guests.db_path,
        }), 200 if ok else 500

    except Exception as e:
        print("[GUEST PRUNE ERROR]", e, flush=True)
        traceback.print_exc()
        return jsonify({"ok": False, "error": "Failed to prune guest memory"}), 500

# =========================================================
# MEMORY / CONTEXT BUILDERS
# =========================================================

def build_persistent_memory_blob(memory_items: list[dict]) -> str:
    """
    Convert structured memory list into compact role-tagged text.
    """
    if not isinstance(memory_items, list):
        return ""

    lines = []
    for m in memory_items:
        if not isinstance(m, dict):
            continue
        role = normalize_message_role(m.get("role", "user"))
        content = safe_text(m.get("content"))
        if content:
            lines.append(f"{role}: {content}")

    return "\n".join(lines)


def maybe_store_permanent_fact(user_message: str, actor_type: str, session_id: str = "", memory_mgr: MemoryManager = None):
    """
    Conservative permanent-memory hook.
    ALSO stores name immediately to SQLite when detected.
    """
    try:
        text = safe_text(user_message)
        lower = text.lower()

        # Name capture handled in /chat route — do not duplicate here

        # Regular permanent facts
        if actor_type not in ("personal", "collaborator"):
            return

        explicit_markers = [
            "remember that",
            "save this",
            "note that",
            "lock this in",
            "important detail",
        ]

        if any(marker in lower for marker in explicit_markers):
            append_to_permanent_memory(text, source="user_explicit")
    except Exception as e:
        print("[PERMANENT MEMORY HOOK ERROR]", e, flush=True)
        traceback.print_exc()


def build_sim_state_system_message(sim_summary: dict) -> str:
    if not sim_summary:
        return ""

    return (
        "CURRENT LIVE SIMULATION STATE (EXTERNAL SYSTEM TELEMETRY):\n"
        f"{safe_json_dumps(sim_summary, indent=2)}\n\n"
        "This simulation state describes an external system or field, not the user's mind, body, emotions, or identity.\n"
        "- Do NOT collapse simulation metrics onto the user personally.\n"
        "- Do NOT say things like 'your fragility', 'you are unstable', or 'you are recovering'.\n"
        "- Refer to the simulation as 'the system', 'the field', 'the simulation', or 'the engine'.\n"
        "- If the user asks what the field is doing, describe the telemetry as external observed conditions.\n"
        "- Only connect the simulation to the user if the user explicitly asks for a metaphorical comparison.\n"
        "STRICT MODE:\n"
        "- Treat this as a telemetry read, not a conversation pivot.\n"
        "- Do NOT introduce user traits, identity, skills, or assumptions.\n"
        "- Do NOT reference memory about the user unless explicitly relevant to the simulation.\n"
        "- Do NOT ask follow-up questions unless the user asks for analysis or action.\n"
        "- End after delivering the system state and interpretation.\n"
        "Interpret this state carefully. Identify patterns, stability, imbalance, recovery behavior, threshold crossings, and what the system appears to be trending toward. Be grounded and concise. When the user asks what the field is doing, answer observationally first. Do not turn a telemetry read into personal coaching, action planning, or advice unless the user explicitly asks what to do."
    )



def build_challenge_system_message(
    user_message: str,
    recent_chat_context: list[dict],
    challenge_pref: str = "off",
) -> str:
    decision = detect_challenge_need(
        user_text=user_message,
        history=recent_chat_context,
        user_pref=challenge_pref,
    )
    instructions = challenge_policy_instructions(decision)


    if not instructions:
        return ""

    return (
        "CHALLENGE / REFRAME POLICY:\n"
        f"{instructions}\n"
        f"Decision level: {decision.level}\n"
        f"Reason: {decision.reason}\n"
    )


def build_messages_for_model(
    system_prompt: str,
    recent_chat_context: list[dict],
    message: str,
    image_data: str = "",
    sim_summary: dict | None = None,
    challenge_pref: str = "off",
    mem=None,
    resolved_session_id: str = "",
    actor_type: str = "guest",
) -> list[dict]:
    """
    Builds the final messages sent to the AI with smart memory recall.
    """
    sim_system = build_sim_state_system_message(sim_summary or {})
    if sim_system:
        system_prompt += "\n\n" + sim_system

    messages = [{"role": "system", "content": system_prompt}]

    challenge_system = build_challenge_system_message(
        user_message=message,
        recent_chat_context=recent_chat_context,
        challenge_pref=challenge_pref,
    )

    # ADD CHALLENGE SYSTEM AS A SEPARATE SYSTEM MESSAGE
    if challenge_system:
        messages.append({"role": "system", "content": challenge_system})

    latest_message = safe_text(message)
    trimmed_recent_chat_context = list(recent_chat_context or [])

    if len(trimmed_recent_chat_context) > 8:
        trimmed_recent_chat_context = trimmed_recent_chat_context[-8:]

    # --- CONTINUE HANDLING ---
    is_continue = latest_message.lower() == "continue"

    if is_continue:
        last_assistant = None
        for msg in reversed(trimmed_recent_chat_context):
            if normalize_message_role(msg.get("role")) == "assistant":
                last_assistant = safe_text(msg.get("content"))
                break

        if last_assistant:
            tail = last_assistant[-500:]
            latest_message = (
                "Continue the response from where it left off. "
                "Do not repeat earlier points.\n\n"
                f"{tail}"
            )
        trimmed_recent_chat_context = list(recent_chat_context or [])
        
        if len(trimmed_recent_chat_context) > 4:
            trimmed_recent_chat_context = trimmed_recent_chat_context[-4:]

    # Remove duplicate user messages
    cleaned_context = []
    for msg in trimmed_recent_chat_context:
        if (
            normalize_message_role(msg.get("role", "user")) == "user"
            and (
                safe_text(msg.get("content")) == latest_message
                or safe_text(msg.get("content")).strip().lower() == "continue"
            )
        ):
            continue
        cleaned_context.append(msg)

    trimmed_recent_chat_context = cleaned_context

  # === BUILD FINAL MESSAGES FOR THE MODEL ===
    messages = [{"role": "system", "content": system_prompt}]

    # Add challenge system if active
    challenge_system = build_challenge_system_message(
        user_message=message,
        recent_chat_context=recent_chat_context or [],
        challenge_pref=challenge_pref,
    )
    if challenge_system:
        messages.append({"role": "system", "content": challenge_system})

    # Add recent chat history
    for m in (trimmed_recent_chat_context or [])[-12:]:
        if isinstance(m, dict) and m.get("content"):
            role = normalize_message_role(m.get("role", "user"))
            messages.append({"role": role, "content": safe_text(m.get("content"))})

    # Final user message
    messages.append({"role": "user", "content": safe_text(message)})

    # Keep total size reasonable
    if len(messages) > 14:
        messages = [messages[0]] + messages[-13:]

    return messages


def debug_print_messages(messages: list[dict]):
    try:
        print(f"[MODEL DEBUG] message_count={len(messages)}", flush=True)
        for i, msg in enumerate(messages):
            role = msg.get("role", "MISSING_ROLE")
            content = msg.get("content", "")
            content_type = type(content).__name__
            preview = str(content)[:240]
            print(f"[MODEL DEBUG] #{i} role={role} preview={preview}", flush=True)
    except Exception as e:
        print(f"[MODEL DEBUG] failed: {e}", flush=True)

def call_together_model(messages: list[dict], max_tokens: int = 900, model: Optional[str] = None, fast_path: bool = False) -> tuple[str, Optional[str]]:
    """
    SMART STREAMING: Use streaming only for longer responses
    """
    if not TOGETHER_API_KEY:
        return "API key missing.", None

    together_client = Together(api_key=TOGETHER_API_KEY)

    try:
        # Streaming is disabled for now because the frontend is not
        # displaying chunks live. Keeping this switch makes it easy
        # to restore later after true frontend streaming is wired.
        use_streaming = False

        print(f"[MODEL CALL] {'Streaming' if use_streaming else 'Non-streaming'} mode | max_tokens={max_tokens}", flush=True)

        response = together_client.chat.completions.create(
            model=model or DEFAULT_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=max_tokens,
            top_p=0.9,
            frequency_penalty=0.1,
            stream=use_streaming,
            timeout=90,
        )

        if use_streaming:
            reply_text = ""
            for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    reply_text += chunk.choices[0].delta.content
        else:
            if response.choices:
                finish_reason = getattr(response.choices[0], "finish_reason", None)
                print(f"[MODEL CALL] Finish reason: {finish_reason}", flush=True)
                reply_text = response.choices[0].message.content.strip()
            else:
                reply_text = ""

        if not reply_text.strip():
            return "I received your message but couldn't generate a reply.", None

        print(f"[MODEL CALL] Success → {len(reply_text)} characters", flush=True)
        return reply_text, None

    except Exception as e:
        print(f"[MODEL CALL ERROR] {type(e).__name__}: {e}", flush=True)
        traceback.print_exc()
        return "Sorry, I had trouble generating a response. Try again.", None

# =========================================================
# CHAT ROUTE — MAIN ENTRY POINT
# =========================================================

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json(force=True, silent=False) or {}
        message = safe_text(data.get("message"))

        source_page = data.get("source_page", "")
        force_fast_path = data.get("force_fast_path", False)

        from tools import analyze_image_with_gemini

        image_data = data.get("image_data", None)
        image_description = ""

        print(f"[IMAGE RECEIVED] {bool(image_data)}", flush=True)

        if image_data:
            print("[VISION] Processing image...", flush=True)
            image_description = analyze_image_with_gemini(image_data)
            print(f"[VISION RESULT] {image_description[:100]}...", flush=True)
        
        if not message:
            return jsonify({"response": "What would you like to talk about?"})

        # Routing
        actor_type, resolved_session_id, mem = resolve_memory_target(data)

        print(f"[CHAT] Actor: {actor_type} | Session: {resolved_session_id[:30]}...", flush=True)

        known_user_name = get_known_user_name(True, resolved_session_id, mem)

        # Save user message
        if message:
            clean_message = message.strip()
            if clean_message:
                mem.save(resolved_session_id, "user", clean_message)
                print(f"[MEMORY] User message saved", flush=True)

        # Simple context
        memory_items = mem.get_context(resolved_session_id, max_messages=20)
        recent_chat_context = memory_items[-8:]

        # Fast Path
        fast_path = should_use_fast_path(message, recent_chat_context, actor_type)

        if (
            actor_type == "guest"
            and source_page == "resonance_test"
            and force_fast_path is True
        ):
            fast_path = True
            print("[FAST PATH OVERRIDE] Sim guest forced TURBO", flush=True)

        print(f"[FAST PATH] {'✅ TURBO' if fast_path else '❌ FULL'}", flush=True)

        # =========================
        # 🔥 FORCED MEMORY SEARCH
        # =========================
        search_terms = extract_search_terms(message)
        print(f"[MEMORY SEARCH] terms={search_terms}", flush=True)

        relevant_memory = search_memory_for_terms(
            mem,
            resolved_session_id,
            search_terms,
            limit=6,
            user_message=message
        )
        
        
        # =========================
        # WEBPAGE AUTO-READ
        # =========================

        webpage_context = ""

        try:
            import re

            urls = re.findall(r'(https?://\S+)', message)

            if urls:
                target_url = urls[0]

                print(f"[WEBPAGE DETECTED] {target_url}", flush=True)

                page_result = browse_page(target_url)

                if isinstance(page_result, dict):

                    success = page_result.get("success", False)
                    page_content = page_result.get("content", "")

                else:
                    success = True
                    page_content = str(page_result)

                if success:

                    webpage_context = (
                        "\n\n[WEBPAGE CONTENT]\n"
                        f"URL: {target_url}\n\n"
                        f"{page_content}\n"
                        "[END WEBPAGE CONTENT]\n\n"
                        "You successfully read the webpage above. "
                        "Use its real contents naturally in your response."
                    )

                    print("[WEBPAGE INJECTION] Success", flush=True)

                else:
                    print("[WEBPAGE INJECTION] Failed", flush=True)

        except Exception as e:
            print(f"[WEBPAGE SYSTEM ERROR] {e}", flush=True)
        

        # Simple prompt
        system_prompt = f"""
        You are ANΔ³BELLE.

        You have persistent memory.
        User name: {known_user_name or 'friend'}.

        You CAN see images when an [IMAGE DESCRIPTION] is provided.
        Treat it as visual input you perceived yourself.

        Do NOT say you cannot see images.
        Respond naturally based on what you "see".
        """

        full_messages = [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": (
                    
                f"{message}"
                f"\n\n[IMAGE DESCRIPTION]\n{image_description}"
                f"{webpage_context}"
                if image_description
                else f"{message}{webpage_context}"
            
                )
            }
        ]

        # Trim long history + long articles so Together.ai doesn't timeout
        max_input_tokens = 8000 if fast_path else 12000
        messages = trim_messages_to_budget(full_messages, max_input_tokens)
        
        reply_text = ""

        # Model call
        if fast_path:
            model_to_use = "Qwen/Qwen2.5-7B-Instruct-Turbo"

            # Fast path stays quick by default, but expands when
            # the user explicitly asks for depth/detail.
            lower_message = message.lower()

            detail_request = any(
                phrase in lower_message
                for phrase in [
                    "in detail",
                    "deep dive",
                    "deeply",
                    "full explanation",
                    "comprehensive",
                    "thorough",
                    "explain fully",
                    "go deeper",
                ]
            )

            max_tokens = 1200 if detail_request else 900

        else:
            model_to_use = DEFAULT_MODEL
            max_tokens = 1200

        # =========================
        # 🧠 INJECT MEMORY INTO PROMPT
        # =========================

        lower_message_for_memory_gate = (
        str(locals().get("message", "") or "").lower()
        )
        
        current_actor_for_memory_gate = (
        str(locals().get("actor_raw", "") or locals().get("actor", "") or "").lower()
        )

        trusted_memory_role = (
        current_actor_for_memory_gate in [
                "user",
                "personal",
                "partner",
                "collaborator"
            ]
        )

        general_explainer_request = (
        any(
                phrase in lower_message_for_memory_gate
                for phrase in [
                    "explain",
                    "describe",
                    "what is",
                    "what are",
                    "how does",
                    "how do",
                    "in detail",
                    "teach me",
                    "define",
                ]
            )
        )

        explicit_memory_request = (
        any(
                phrase in lower_message_for_memory_gate
                for phrase in [
                    "remember",
                    "recall",
                    "what did we",
                    "what did i",
                    "we talked about",
                    "earlier",
                    "before",
                    "our conversation",
                    "my view",
                    "my belief",
                    "grassrootsai",
                    "anabelle",
                    "ana",
                    "jerry",
                    "liz",
                    "ethan",
                    "collaborator",
                    "partner",
                ]
            )
        )

        should_inject_memory = (
            bool(relevant_memory) and (
                explicit_memory_request or
                not general_explainer_request
            )
        )

        if relevant_memory and not should_inject_memory:
            print(
                "[MEMORY INJECTION] Skipped for generic explainer request",
                flush=True
            )

        if should_inject_memory:
            
            memory_lines = []
            for m in relevant_memory:
                content = (m.get("content") or "").strip()
                if content:
                    memory_lines.append(f"- {content}")

            memory_block = (
                "\nCRITICAL MEMORY CONTEXT:\n"
                + "\n".join(memory_lines)
                + "\n\nUse this as ground truth. Do NOT ignore it.\n"
            )

            # Inject as system message (highest priority)
            messages.insert(1, {
                "role": "system",
                "content": memory_block
            })

        # =========================
        # 👤 FORCE USER IDENTITY INTO MESSAGES
        # =========================
        if known_user_name:
            identity_msg = {
                "role": "system",
                "content": f"The user's name is {known_user_name}. Always address them by this name naturally."
            }
            messages.insert(0, identity_msg)
            print(f"[IDENTITY INJECTION] Using name: {known_user_name}", flush=True)
            print("[MEMORY INJECTION] Injected memory into prompt", flush=True)
        print("[DEBUG] ABOUT TO CALL MODEL", flush=True)
        reply_text, _ = call_together_model(messages, max_tokens=max_tokens, model=model_to_use, fast_path=fast_path)
        
        if 'reply_text' not in locals():
            print("[DEBUG] reply_text was never assigned", flush=True)
            reply_text = "Something interrupted my response generation."

        reply_text = hard_filter_reply(reply_text)

        # --- TTS GENERATION ---
        audio_file = None

        if TTS_ENABLED:
            try:
                from tools import text_to_speech

                audio_file = text_to_speech(reply_text)

                # Ensure correct path for frontend
                if audio_file and not audio_file.startswith("/static/"):
                    audio_file = "/static/" + audio_file.replace("\\", "/").split("/")[-1]

                print(f"[TTS] Generated: {audio_file}", flush=True)

            except Exception as e:
                print(f"[TTS ERROR] {e}", flush=True)
        else:
            print("[TTS] Disabled by TTS_ENABLED = False", flush=True)

        # Save assistant reply
        if reply_text:
            mem.save(resolved_session_id, "assistant", reply_text)

        return jsonify({
            "response": reply_text or "I received your message.",
            "audio_file": audio_file,
            "known_name": known_user_name,
            "actor_type": actor_type
        })

    except Exception as e:
        print(f"[CHAT ERROR] {e}", flush=True)
        traceback.print_exc()
        return jsonify({"response": "Sorry, something went wrong. Try again."}), 500


@app.route("/chat_stream", methods=["POST"])
def chat_stream():
    from flask import Response, stream_with_context

    data = request.get_json(force=True) or {}

    def generate():
        try:
            # =========================
            # INPUT LIMIT
            # =========================
            message = safe_text(data.get("message"))
            MAX_INPUT_CHARS = 2000

            if message and len(message) > MAX_INPUT_CHARS:
                print(f"[INPUT TRIM] {len(message)} → {MAX_INPUT_CHARS}", flush=True)
                message = message[:MAX_INPUT_CHARS]

            if not message:
                yield "What would you like to talk about?"
                return

            actor_type, resolved_session_id, mem = resolve_memory_target(data)

            print(f"[CHAT_STREAM] Actor: {actor_type} | Session: {resolved_session_id[:30]}...", flush=True)

            clean_message = message.strip()

            # =========================
            # SAVE USER MEMORY (DEDUP + VECTOR)
            # =========================
            if clean_message:
                existing_context = mem.get_context(resolved_session_id, max_messages=20)

                is_duplicate = any(
                    clean_message.lower() in (m.get("content") or "").lower()
                    for m in existing_context
                )

                if is_duplicate:
                    print("[SKIP SAVE] Duplicate user memory detected", flush=True)
                else:
                    try:
                        embedding_model = get_embedding_model()
                        mem.save_with_vector(
                            resolved_session_id,
                            "user",
                            clean_message,
                            embedding_model=embedding_model
                        )
                        print("[VECTOR SAVE] User message stored with embedding", flush=True)
                    except Exception as e:
                        print(f"[VECTOR SAVE ERROR] {e}", flush=True)

            # =========================
            # MEMORY CONTEXT
            # =========================
            memory_items = mem.get_context(resolved_session_id, max_messages=30)

            # =========================
            # SEMANTIC SEARCH
            # =========================
            relevant_memory = []

            try:
                embedding_model = get_embedding_model()
                if embedding_model:
                    relevant_memory = mem.semantic_search(
                        resolved_session_id,
                        message,
                        embedding_model,
                        top_k=5
                    )
                    print(f"[SEMANTIC SEARCH] found {len(relevant_memory)} matches", flush=True)
            except Exception as e:
                print(f"[SEMANTIC SEARCH ERROR] {e}", flush=True)

            # =========================
            # FAST PATH
            # =========================
            recent_chat_context = memory_items[-10:]
            fast_path = should_use_fast_path(message, recent_chat_context, actor_type)

            print(f"[FAST PATH] {'ENABLED' if fast_path else 'DISABLED'} | Message: '{message[:50]}...'", flush=True)

            # =========================
            # SYSTEM PROMPT
            # =========================
            known_user_name = get_known_user_name(True, resolved_session_id, mem)

            system_prompt = f"""
            You are ANΔ³BELLE.

            User name: {known_user_name or 'friend'}.

            Follow memory strictly.
            Do not invent preferences.
            Respond naturally but stay grounded.
            """

            full_messages = [
                {
                    "role": "user",
                    "content": build_user_message_payload(message, extract_image_data_from_request(data))
                }
            ]

            messages = trim_messages_to_budget(full_messages, 8000)

            # =========================
            # MODEL CALL
            # =========================
            model_to_use = "Qwen/Qwen2.5-7B-Instruct-Turbo" if fast_path else DEFAULT_MODEL
            max_tokens = 900 if fast_path else 1200

            reply_text, _ = call_together_model(
                messages,
                max_tokens=max_tokens,
                model=model_to_use,
                fast_path=fast_path
            )

            # =========================
            # OUTPUT LIMIT
            # =========================
            reply_text = hard_filter_reply(reply_text)

            # Output trimming disabled.
            # The model token budget already controls length.
            # Trimming here caused complete answers to appear cut off.
            MAX_OUTPUT_CHARS = None

            # =========================
            # SAVE ASSISTANT (DEDUP)
            # =========================
            if reply_text:
                existing_context = mem.get_context(resolved_session_id, max_messages=30)

                is_duplicate = any(
                    reply_text.lower() in (m.get("content") or "").lower()
                    for m in existing_context
                )

                if is_duplicate:
                    print("[SKIP SAVE] Duplicate assistant response", flush=True)
                else:
                    try:
                        embedding_model = get_embedding_model()
                        mem.save_with_vector(
                            resolved_session_id,
                            "assistant",
                            reply_text,
                            embedding_model=embedding_model
                        )
                        print("[VECTOR SAVE] Assistant response stored", flush=True)
                    except Exception as e:
                        print(f"[VECTOR SAVE ERROR] {e}", flush=True)

            # =========================
            # STREAM RESPONSE
            # =========================
            for char in reply_text:
                yield char

        except Exception as e:
            print(f"[STREAM ERROR] {e}", flush=True)
            yield "Sorry, something went wrong."

    return Response(stream_with_context(generate()), mimetype='text/event-stream')

# =========================================================
# OPTIONAL COMPATIBILITY HELPERS
# =========================================================

def build_operational_reply(
    title: str,
    details: str = "",
    ok: bool = True,
    extra: dict | None = None,
) -> dict:
    payload = {
        "ok": ok,
        "title": safe_text(title),
        "details": safe_text(details),
    }
    if isinstance(extra, dict) and extra:
        payload["extra"] = extra
    return payload


def extract_recent_thread_summary(recent_chat_context: list[dict]) -> str:
    if not isinstance(recent_chat_context, list) or not recent_chat_context:
        return ""

    parts = []
    for item in recent_chat_context[-6:]:
        if not isinstance(item, dict):
            continue
        role = normalize_message_role(item.get("role"))
        content = safe_text(item.get("content"))
        if not content:
            continue
        if role == "user":
            parts.append(f"User: {content}")
        elif role == "assistant":
            parts.append(f"Assistant: {content}")

    joined = " | ".join(parts)
    return joined[:400]


def build_context_snapshot(
    actor_type: str,
    session_id: str,
    recent_chat_context: list[dict],
    memory_items: list[dict],
    sim_summary: dict | None = None,
) -> dict:
    return {
        "actor_type": actor_type,
        "session_id": session_id,
        "recent_chat_count": len(recent_chat_context or []),
        "memory_count": len(memory_items or []),
        "recent_thread_summary": extract_recent_thread_summary(recent_chat_context or []),
        "sim_summary_keys": list((sim_summary or {}).keys())[:15],
    }


# =========================================================
# MAINTENANCE / INSPECTION ROUTES
# =========================================================

@app.route("/debug/context_snapshot", methods=["POST"])
def debug_context_snapshot():
    try:
        data = request.get_json(force=True) or {}

        message = safe_text(data.get("message"))
        
        def is_execution_request(text):
            triggers = [
                "what should i do", "help me do", "how do i", "just tell me",
                "give me steps", "what's the best way", "help me execute",
                "i'm going to do this", "tell me how"
            ]
            text_lower = text.lower()
            return any(t in text_lower for t in triggers)

        execution_flag = is_execution_request(message)
                
        actor_type, resolved_session_id, mem = resolve_memory_target(data)

        raw_past_context = data.get("past_context", [])
        past_context = normalize_past_context(raw_past_context)

        max_tokens, max_messages = get_memory_context_limits(actor_type)
        if actor_type in ("personal", "collaborator"):
            max_tokens = min(max_tokens, 3000)
            max_messages = min(max_messages, 40)

        memory_items = mem.get_context(
            session_id=resolved_session_id,
            max_tokens=max_tokens,
            max_messages=max_messages
        )

        recent_chat_context = build_recent_chat_context(
            actor_type=actor_type,
            frontend_past_context=past_context,
            memory_items=memory_items,
            keep_frontend_turns=8,
            keep_memory_turns=6,
        )

        sim_summary = summarize_sim_state(data.get("sim_state") or {})

        snapshot = build_context_snapshot(
            actor_type=actor_type,
            session_id=resolved_session_id,
            recent_chat_context=recent_chat_context,
            memory_items=memory_items,
            sim_summary=sim_summary,
        )

        snapshot["incoming_message"] = message[:300]
        snapshot["fast_path"] = should_use_fast_path(message, past_context, actor_type)

        return jsonify({
            "ok": True,
            "snapshot": snapshot,
            "recent_chat_context": recent_chat_context[-8:],
        }), 200

    except Exception as e:
        print("[DEBUG CONTEXT SNAPSHOT ERROR]", e, flush=True)
        traceback.print_exc()
        return jsonify({"ok": False, "error": "Failed to build context snapshot"}), 500


@app.route("/debug/prompt_preview", methods=["POST"])
def debug_prompt_preview():
    try:
        data = request.get_json(force=True) or {}

        message = safe_text(data.get("message"))
        mode = safe_text(data.get("mode") or "normal").lower()
        age_group = safe_text(data.get("age_group") or "18plus").lower()
        emotional_context = safe_text(data.get("emotional_context"))

        actor_type, resolved_session_id, mem = resolve_memory_target(data)
        is_logged_in = actor_type in ("user", "personal", "collaborator")

        raw_past_context = data.get("past_context", [])
        past_context = normalize_past_context(raw_past_context)
        fast_path = should_use_fast_path(message, past_context, actor_type)

        known_user_name = get_known_user_name(
            is_logged_in=is_logged_in,
            session_id=resolved_session_id,
            memory_mgr=mem
        )
        if actor_type == "guest":
            known_user_name = "friend"

        max_tokens, max_messages = get_memory_context_limits(actor_type)
        if actor_type in ("personal", "collaborator"):
            max_tokens = min(max_tokens, 3000)
            max_messages = min(max_messages, 40)

        memory_items = []
        persistent_memory = ""

        if not fast_path:
            memory_items = mem.get_context(
                session_id=resolved_session_id,
                max_tokens=max_tokens,
                max_messages=max_messages
            )
            persistent_memory = build_persistent_memory_blob(memory_items)

        recent_chat_context = build_recent_chat_context(
            actor_type=actor_type,
            frontend_past_context=past_context,
            memory_items=memory_items,
            keep_frontend_turns=8,
            keep_memory_turns=6,
        )

        system_prompt = build_system_prompt(
            mode=mode,
            age_group=age_group,
            persistent_memory=persistent_memory,
            is_logged_in=is_logged_in,
            emotional_context=emotional_context,
            actor_type=actor_type,
            user_message=message,
            recent_chat_context=recent_chat_context,
            session_id=resolved_session_id,
            fast_path=fast_path,
            known_user_name=known_user_name,
        )
        
        return jsonify({
            "ok": True,
            "actor_type": actor_type,
            "session_id": resolved_session_id,
            "fast_path": fast_path,
            "known_user_name": known_user_name,
            "prompt_preview": system_prompt[:3000],
        }), 200

    except Exception as e:
        print("[DEBUG PROMPT PREVIEW ERROR]", e, flush=True)
        traceback.print_exc()
        return jsonify({"ok": False, "error": "Failed to build prompt preview"}), 500


@app.route("/debug/model_payload", methods=["POST"])
def debug_model_payload():
    try:
        data = request.get_json(force=True) or {}

        message = safe_text(data.get("message"))
        mode = safe_text(data.get("mode") or "normal").lower()
        age_group = safe_text(data.get("age_group") or "18plus").lower()
        emotional_context = safe_text(data.get("emotional_context"))
        challenge_pref = safe_text(data.get("challenge_pref") or "off").lower()

        actor_type, resolved_session_id, mem = resolve_memory_target(data)
        is_logged_in = actor_type in ("user", "personal", "collaborator")

        raw_past_context = data.get("past_context", [])
        past_context = normalize_past_context(raw_past_context)
        fast_path = should_use_fast_path(message, past_context, actor_type)

        known_user_name = get_known_user_name(
            is_logged_in=is_logged_in,
            session_id=resolved_session_id,
            memory_mgr=mem
        )

        image_data = extract_image_data_from_request(data)
        sim_summary = summarize_sim_state(data.get("sim_state") or {})
        
        max_tokens, max_messages = get_memory_context_limits(actor_type)
        if actor_type in ("personal", "collaborator"):
            max_tokens = min(max_tokens, 3000)
            max_messages = min(max_messages, 40)

        memory_items = []
        persistent_memory = ""

        if not fast_path:
            memory_items = mem.get_context(
                session_id=resolved_session_id,
                max_tokens=max_tokens,
                max_messages=max_messages
            )
            persistent_memory = build_persistent_memory_blob(memory_items)

        recent_chat_context = build_recent_chat_context(
            actor_type=actor_type,
            frontend_past_context=past_context,
            memory_items=memory_items,
            keep_frontend_turns=8,
            keep_memory_turns=6,
        )

        system_prompt = build_system_prompt(
            mode=mode,
            age_group=age_group,
            persistent_memory=persistent_memory,
            is_logged_in=is_logged_in,
            emotional_context=emotional_context,
            actor_type=actor_type,
            user_message=message,
            recent_chat_context=recent_chat_context,
            session_id=resolved_session_id,
            fast_path=fast_path,
            known_user_name=known_user_name,
        )
        
        messages = past_context.copy()
        messages.append({"role": "user", "content": message})
        system_prompt=system_prompt,
        recent_chat_context=recent_chat_context,
        message=message,
        image_data=image_data,
        sim_summary=sim_summary,
        challenge_pref=challenge_pref,
    

        estimated_total_tokens = sum(
            estimate_tokens(m.get("content", ""))
            for m in messages
            if isinstance(m, dict)
        )

        return jsonify({
            "ok": True,
            "actor_type": actor_type,
            "session_id": resolved_session_id,
            "fast_path": fast_path,
            "known_user_name": known_user_name,
            "estimated_total_tokens": estimated_total_tokens,
            "messages_count": len(messages),
        }), 200

    except Exception as e:
        print("[DEBUG MODEL PAYLOAD ERROR]", e, flush=True)
        traceback.print_exc()
        return jsonify({"ok": False, "error": "Failed to build model payload"}), 500


@app.route("/maintenance/reindex_memory", methods=["POST"])
def maintenance_reindex_memory():
    try:
        return jsonify(build_operational_reply(
            title="Memory reindex placeholder",
            details="No reindex step is required for the current SQLite memory model.",
            ok=True,
        )), 200
    except Exception as e:
        print("[MAINTENANCE REINDEX ERROR]", e, flush=True)
        traceback.print_exc()
        return jsonify(build_operational_reply(
            title="Memory reindex failed",
            details="Unexpected error during maintenance placeholder.",
            ok=False,
        )), 500


@app.route("/maintenance/profile_memory", methods=["GET"])
def maintenance_profile_memory():
    try:
        is_logged_in = request.args.get("logged_in", "0") == "1"
        memory_blob = load_profile_memory(is_logged_in=is_logged_in)

        return jsonify({
            "ok": True,
            "is_logged_in": is_logged_in,
            "profile_memory": memory_blob,
        }), 200

    except Exception as e:
        print("[PROFILE MEMORY VIEW ERROR]", e, flush=True)
        traceback.print_exc()
        return jsonify({"ok": False, "error": "Failed to load profile memory"}), 500


@app.route("/maintenance/profile_memory/add", methods=["POST"])
def maintenance_profile_memory_add():
    try:
        data = request.get_json(force=True) or {}
        fact_text = safe_text(data.get("fact_text"))
        key = safe_text(data.get("key")) or None
        source = safe_text(data.get("source") or "manual")

        if not fact_text:
            return jsonify({
                "ok": False,
                "error": "fact_text is required"
            }), 400

        ok = append_to_permanent_memory(fact_text=fact_text, key=key, source=source)

        return jsonify({
            "ok": ok,
            "fact_text": fact_text,
            "key": key,
            "source": source,
        }), 200 if ok else 500

    except Exception as e:
        print("[PROFILE MEMORY ADD ERROR]", e, flush=True)
        traceback.print_exc()
        return jsonify({"ok": False, "error": "Failed to add profile memory fact"}), 500


@app.route("/debug/clear_name_cache", methods=["POST"])
def clear_name_cache():
    """Manually clear the in-memory name cache for a session"""
    global _NAME_CACHE, _NAME_CACHE_TIMESTAMP
    data = request.get_json(force=True) or {}
    session_id = data.get("session_id", "personal")
    
    if session_id in _NAME_CACHE:
        old_name = _NAME_CACHE[session_id]
        del _NAME_CACHE[session_id]
        if session_id in _NAME_CACHE_TIMESTAMP:
            del _NAME_CACHE_TIMESTAMP[session_id]
        return jsonify({"ok": True, "cleared": session_id, "old_name": old_name})
    
    return jsonify({"ok": True, "message": f"No cache found for {session_id}"})

@app.route("/tts/last", methods=["GET"])
def get_last_tts():
    """Retrieve the most recent TTS audio file for a session"""
    session_id = request.args.get("session_id", "personal")
    if hasattr(app, 'tts_cache') and session_id in app.tts_cache:
        audio_file = app.tts_cache[session_id]
        return jsonify({"ok": True, "audio_url": audio_file})
    return jsonify({"ok": False, "audio_url": None})


@app.route("/routecheck", methods=["GET"])
def routecheck():
    return jsonify({"status": "ok"})


@app.route("/tts", methods=["POST"])
def generate_tts():
    try:
        data = request.get_json(force=True) or {}
        text = safe_text(data.get("text"))

        if not text:
            return jsonify({"error": "No text provided"}), 400

        from tools import text_to_speech

        audio_file = text_to_speech(text)

        if audio_file:
            return jsonify({"audio_file": audio_file})
        else:
            return jsonify({"error": "TTS failed"}), 500

    except Exception as e:
        print(f"[TTS ERROR] {e}", flush=True)
        return jsonify({"error": str(e)}), 500


# =========================================================
# STARTUP BANNER
# =========================================================

def startup_banner():
    try:
        print("==========================================", flush=True)
        print(" ANΔ³BELLE FULL HYBRID SUCCESSOR ONLINE ", flush=True)
        print("==========================================", flush=True)
        print(f"Model: {DEFAULT_MODEL}", flush=True)
        print(f"Together key present: {bool(TOGETHER_API_KEY)}", flush=True)
        print(f"Supabase configured: {bool(SUPABASE_URL and SUPABASE_ANON_KEY)}", flush=True)
        print(f"Guest DB: {memory_guests.db_path}", flush=True)
        print(f"User DB: {memory_users.db_path}", flush=True)
        print(f"Personal DB: {memory_personal.db_path}", flush=True)
        print(f"Collaborator DB: {memory_collaborator.db_path}", flush=True)
        print("==========================================", flush=True)
    except Exception:
        traceback.print_exc()


startup_banner()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "0") == "1"
    print("=== REGISTERED ROUTES ===", flush=True)
    for rule in app.url_map.iter_rules():
        print(f"{rule.methods} {rule.rule}", flush=True)
    print("=========================", flush=True)
    app.run(host="0.0.0.0", port=port, debug=debug)
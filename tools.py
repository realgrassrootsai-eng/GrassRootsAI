# tools.py
from __future__ import annotations
import requests
from bs4 import BeautifulSoup
from readability import Document
from bs4 import BeautifulSoup
from typing import List, Dict, Any

# =========================
# WEBPAGE READER
# =========================

def browse_page(url, max_chars=12000):
    """
    Reads and extracts the main readable content from a webpage.
    """

    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0 Safari/537.36"
            )
        }

        response = requests.get(
            url,
            headers=headers,
            timeout=15
        )

        response.raise_for_status()

        html = response.text

        # Extract main article/content
        doc = Document(html)
        cleaned_html = doc.summary()

        soup = BeautifulSoup(cleaned_html, "html.parser")

        # Remove junk tags
        for tag in soup(["script", "style", "nav", "footer", "aside"]):
            tag.decompose()

        text = soup.get_text(separator="\n")

        # Clean lines
        lines = [
            line.strip()
            for line in text.splitlines()
            if line.strip()
        ]

        cleaned_text = "\n".join(lines)

        # Prevent gigantic context overload
        if len(cleaned_text) > max_chars:
            cleaned_text = cleaned_text[:max_chars] + "\n\n[TRUNCATED]"

        print(f"[WEB PAGE READ] {url}", flush=True)
        print(f"[WEB PAGE CHARS] {len(cleaned_text)}", flush=True)

        return {
            "success": True,
            "url": url,
            "content": cleaned_text
        }

    except Exception as e:
        print(f"[WEB PAGE ERROR] {e}", flush=True)

        return {
            "success": False,
            "url": url,
            "error": str(e)
        }

def web_search(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """
    Web search using SerpAPI (better results than DuckDuckGo).
    Returns list of {title,url,snippet} or [{error: "..."}]
    """
    try:
        import os
        from dotenv import load_dotenv
        load_dotenv()
        
        api_key = os.getenv("SERPAPI_KEY")
        if not api_key:
            print("[WARN] SERPAPI_KEY not found, falling back to DuckDuckGo")
            return web_search_fallback(query, max_results)
        
        import requests
        import urllib.parse
        
        # Encode the query
        encoded_query = urllib.parse.quote(query)
        
        # Build the SerpAPI URL
        url = f"https://serpapi.com/search.json?engine=google&q={encoded_query}&num={max_results}&api_key={api_key}"
        
        print(f"[SERPAPI] Searching for: {query}")
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        # Extract results
        results: List[Dict[str, Any]] = []
        
        # Get organic results (main search results)
        if "organic_results" in data:
            for r in data["organic_results"][:max_results]:
                results.append({
                    "title": r.get("title", "No title"),
                    "url": r.get("link") or r.get("url", "No url"),
                    "snippet": r.get("snippet") or r.get("description", "No description"),
                })
        
        # If no organic results, try answer box or knowledge graph
        if not results and "answer_box" in data:
            answer = data["answer_box"]
            results.append({
                "title": answer.get("title", "Answer Box"),
                "url": answer.get("link", "No url"),
                "snippet": answer.get("answer") or answer.get("snippet", "Answer found"),
            })
        
        # If still no results, try knowledge graph
        if not results and "knowledge_graph" in data:
            kg = data["knowledge_graph"]
            results.append({
                "title": kg.get("title", "Knowledge Graph"),
                "url": kg.get("source", {}).get("link", "No url"),
                "snippet": kg.get("description", "Information from knowledge graph"),
            })
        
        # Fallback if SerpAPI returns nothing
        if not results:
            print("[SERPAPI] No results, falling back to DuckDuckGo")
            return web_search_fallback(query, max_results)
            
        print(f"[SERPAPI] Found {len(results)} results")
        return results
        
    except Exception as e:
        print(f"[SERPAPI ERROR]: {type(e).__name__}: {e}")
        # Fall back to DuckDuckGo
        return web_search_fallback(query, max_results)


def web_search_fallback(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """
    Fallback to DuckDuckGo if SerpAPI fails.
    """
    try:
        try:
            from duckduckgo_search import DDGS
        except ImportError:
            print("[WARN] duckduckgo_search not installed, trying alternative fallback")
            return [{"error": "Search failed: duckduckgo_search module not available"}]
        
        results: List[Dict[str, Any]] = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                results.append({
                    "title": r.get("title", "No title"),
                    "url": r.get("href") or r.get("url") or "No url",
                    "snippet": r.get("body", "No description"),
                })
        print(f"[DDGS FALLBACK] Found {len(results)} results")
        return results
    except Exception as e:
        return [{"error": f"Search failed: {type(e).__name__}: {e}"}]
    
# ────────────────────────────────────────────────
# Coming soon: ability to read full webpage content
# ────────────────────────────────────────────────

def browse_page(url, instructions=None, max_chars=12000):
    import requests
    try:
        import trafilatura
    except ImportError:
        trafilatura = None

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }

        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            return f"[WEB PAGE READ ERROR] Failed to fetch page (status {response.status_code})"

        html = response.text

        extracted = None
        if trafilatura is not None:
            extracted = trafilatura.extract(
                html,
                include_comments=False,
                include_tables=False,
                favor_recall=True
            )

        if extracted:
            cleaned = extracted.strip()
            return cleaned[:max_chars]

        # Fallback to BeautifulSoup when trafilatura is unavailable or extraction fails
        soup = BeautifulSoup(html, "html.parser")
        text = soup.get_text(separator="\n", strip=True)
        if not text:
            return "[WEB PAGE READ ERROR] Could not extract meaningful content."

        return text[:max_chars]

    except Exception as e:
        return f"[WEB PAGE READ ERROR] {str(e)}"
    
    # --- Piper TTS Setup (add at top if in tools.py) ---
import os

VOICE_MODEL = "en_US-amy-medium.onnx"
CONFIG_FILE = "en_US-amy-medium.onnx.json"
_voice = None

def _get_piper_voice():
    global _voice
    if _voice is not None:
        return _voice

    if not os.path.exists(VOICE_MODEL) or not os.path.exists(CONFIG_FILE):
        raise FileNotFoundError(f"Voice model files missing! Make sure both files are in the project folder:\n- {VOICE_MODEL}\n- {CONFIG_FILE}")

    from piper.voice import PiperVoice
    _voice = PiperVoice.load(model_path=VOICE_MODEL, config_path=CONFIG_FILE)
    print(f"[TTS] Loaded voice: {VOICE_MODEL}", flush=True)
    return _voice

def text_to_speech(text: str):
    """
    Generate TTS from text, clean markdown/symbols, and save as WAV inside the static folder.
    Returns the filename only (not a URL).
    """
    # Clean markdown and common symbols so they don't get spoken literally
    clean_text = str(text or "")

    # Remove markdown formatting
    clean_text = clean_text.replace("**", "")   # bold
    clean_text = clean_text.replace("*", "")    # italics / asterisks
    clean_text = clean_text.replace("__", "")   # underline
    clean_text = clean_text.replace("_", "")    # single underscore
    clean_text = clean_text.replace("`", "")    # code backticks
    clean_text = clean_text.replace("###", "")  # headings
    clean_text = clean_text.replace("##", "")
    clean_text = clean_text.replace("#", "")

    # Replace symbols with spoken-friendly versions
    clean_text = clean_text.replace("—", " dash ")
    clean_text = clean_text.replace("–", " dash ")
    clean_text = clean_text.replace("…", " ... ")
    clean_text = clean_text.replace("...", " ... ")

    # Get raw bytes from generator
    voice = _get_piper_voice()
    audio_generator = voice.synthesize(clean_text)
    raw_audio_bytes = b''.join(chunk.audio_int16_bytes for chunk in audio_generator)

    # Add proper WAV header
    sample_rate = 22050
    num_channels = 1
    bits_per_sample = 16
    byte_rate = sample_rate * num_channels * (bits_per_sample // 8)
    block_align = num_channels * (bits_per_sample // 8)
    data_size = len(raw_audio_bytes)
    file_size = 36 + data_size

    import struct
    header = b''
    header += b'RIFF'
    header += struct.pack('<I', file_size)
    header += b'WAVE'
    header += b'fmt '
    header += struct.pack('<I', 16)
    header += struct.pack('<H', 1)
    header += struct.pack('<H', num_channels)
    header += struct.pack('<I', sample_rate)
    header += struct.pack('<I', byte_rate)
    header += struct.pack('<H', block_align)
    header += struct.pack('<H', bits_per_sample)
    header += b'data'
    header += struct.pack('<I', data_size)

    full_wav = header + raw_audio_bytes

    # Save with unique timestamp to prevent browser caching
    import time
    timestamp = int(time.time() * 1000)
    output_filename = f"anabelle_response_{timestamp}.wav"

    static_dir = os.path.join(os.path.dirname(__file__), "static")
    os.makedirs(static_dir, exist_ok=True)
    full_path = os.path.join(static_dir, output_filename)

    with open(full_path, "wb") as f:
        f.write(full_wav)

    print(f"TTS saved: {full_path} ({len(full_wav)} bytes)")

    # Return just the filename (browser will use /static/filename)
    return output_filename


def analyze_image_with_qwen(image_data: str) -> str:
    """
    Fallback vision analysis using Together.ai Qwen-VL.
    """
    try:
        import os
        import requests

        TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY", "").strip()

        if not TOGETHER_API_KEY:
            print("[VISION FALLBACK ERROR] Missing TOGETHER_API_KEY", flush=True)
            return "Fallback vision model unavailable."

        url = "https://api.together.xyz/v1/chat/completions"

        headers = {
            "Authorization": f"Bearer {TOGETHER_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": "google/gemma-3n-E4B-it",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Describe this image clearly and concisely."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_data
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 300
        }

        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=20
        )

        if response.status_code != 200:
            print(f"[VISION FALLBACK ERROR] {response.text}", flush=True)
            return "Fallback vision model failed."

        data = response.json()

        result = data["choices"][0]["message"]["content"]

        if not result or len(result.strip()) < 10:
            return "Fallback vision produced insufficient output."

        print("[VISION] Qwen fallback succeeded", flush=True)

        return result.strip()

    except Exception as e:
        print(f"[VISION FALLBACK EXCEPTION] {e}", flush=True)
        return "Fallback vision processing failed."


def analyze_image_with_gemini(image_data: str) -> str:
    """
    Sends base64 image to Gemini and returns a clean description.
    """
    try:
        import requests
        import os

        GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
        print(f"[VISION DEBUG] API KEY PRESENT: {bool(GEMINI_API_KEY)}", flush=True)

        if not GEMINI_API_KEY:
            print("[VISION ERROR] Missing GEMINI_API_KEY", flush=True)
            return "Image was provided, but vision processing is unavailable."

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": "Describe this image clearly and concisely."},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": image_data.split(",")[1]
                            }
                        }
                    ]
                }
            ]
        }

        response = requests.post(url, json=payload, timeout=10)

        if response.status_code != 200:
            print(f"[VISION ERROR] Gemini failed: {response.text}", flush=True)
            print("[VISION] Falling back to Qwen-VL...", flush=True)
            return analyze_image_with_qwen(image_data)

        data = response.json()

        return data["candidates"][0]["content"]["parts"][0]["text"]

    except Exception as e:
        print(f"[VISION EXCEPTION] {e}", flush=True)
        print("[VISION] Exception triggered fallback → Qwen-VL", flush=True)

        return analyze_image_with_qwen(image_data)
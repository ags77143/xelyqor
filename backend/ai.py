import os
import json
import re
from groq import Groq

client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))

def _chat(messages: list, system: str) -> str:
    resp = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "system", "content": system}] + messages,
        max_tokens=4096,
        temperature=0.7,
    )
    return resp.choices[0].message.content.strip()

def _parse_json(content: str):
    # Strip markdown code fences
    content = re.sub(r'^```(?:json)?\s*', '', content.strip())
    content = re.sub(r'\s*```$', '', content.strip())
    # Try direct parse first
    try:
        return json.loads(content)
    except Exception:
        pass
    # Try to extract JSON object
    match = re.search(r'\{[\s\S]*\}', content)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            pass
    # Try to extract JSON array
    match = re.search(r'\[[\s\S]*\]', content)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            pass
    raise ValueError(f"Could not parse JSON from AI response: {content[:200]}")


def generate_title_summary_notes(transcript: str) -> dict:
    system = """You are an expert academic tutor generating comprehensive study materials for university students.
Respond ONLY with a valid JSON object. No markdown, no explanation, no code fences. Just raw JSON.
The JSON must have exactly these keys: title, summary, notes."""

    prompt = f"""Given this lecture transcript, generate:
1. title: A concise descriptive title
2. summary: A 6-8 sentence executive summary covering all major themes
3. notes: COMPREHENSIVE study notes — MINIMUM 1200 words, using ## and ### markdown headers.
   Cover EVERY concept: definition, how it works, worked examples, why it matters, connections, real-world applications, common exam mistakes.
   End with a ## Key Takeaways section.

TRANSCRIPT:
{transcript[:6000]}

Respond with raw JSON only. Example format:
{{"title": "...", "summary": "...", "notes": "## Introduction\\n..."}}"""

    content = _chat([{"role": "user", "content": prompt}], system)
    return _parse_json(content)


def generate_glossary(transcript: str, title: str) -> list:
    system = """You are an expert academic tutor. Respond ONLY with a valid JSON array. No markdown, no code fences. Just raw JSON."""

    prompt = f"""For the lecture "{title}", generate a glossary of 15-20 key terms.
Each item must have "term" and "definition" keys. Definitions should be 3-5 sentences.

TRANSCRIPT:
{transcript[:6000]}

Respond with raw JSON array only. Example:
[{{"term": "...", "definition": "..."}}, ...]"""

    content = _chat([{"role": "user", "content": prompt}], system)
    return _parse_json(content)


def generate_quiz(transcript: str, notes: str, title: str) -> list:
    system = """You are an expert academic quiz writer. Respond ONLY with a valid JSON array. No markdown, no code fences. Just raw JSON."""

    prompt = f"""For the lecture "{title}", generate 15-18 quiz questions.
Each object must have: question, options (array of 4 strings), correct (index 0-3), explanation, difficulty ("easy"/"medium"/"hard").

NOTES:
{notes[:8000]}

Respond with raw JSON array only. Example:
[{{"question": "...", "options": ["a","b","c","d"], "correct": 0, "explanation": "...", "difficulty": "medium"}}]"""

    content = _chat([{"role": "user", "content": prompt}], system)
    return _parse_json(content)


def generate_flashcards(transcript: str, notes: str, title: str) -> list:
    system = """You are an expert academic flashcard creator. Respond ONLY with a valid JSON array. No markdown, no code fences. Just raw JSON."""

    prompt = f"""For the lecture "{title}", generate 22-28 flashcards.
Each object must have "front" (a question) and "back" (2-4 sentence answer with example).

NOTES:
{notes[:8000]}

Respond with raw JSON array only. Example:
[{{"front": "What is...?", "back": "..."}}]"""

    content = _chat([{"role": "user", "content": prompt}], system)
    return _parse_json(content)


def chat_with_lecture(transcript: str, title: str, messages: list) -> str:
    system = f"""You are a helpful study assistant for the lecture: "{title}".
You have full access to the lecture content below. Answer questions clearly and thoroughly.

LECTURE CONTENT:
{transcript[:15000]}"""

    return _chat(messages, system)
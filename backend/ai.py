import os
import json
import re
from groq import Groq

client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))

def _chat(messages: list, system: str, model: str = "llama-3.1-8b-instant", max_tokens: int = 4096) -> str:
    resp = client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system}] + messages,
        max_tokens=max_tokens,
        temperature=0.7,
    )
    return resp.choices[0].message.content.strip()

def _parse_json(content: str):
    content = re.sub(r'^```(?:json)?\s*', '', content.strip())
    content = re.sub(r'\s*```$', '', content.strip())
    try:
        return json.loads(content)
    except Exception:
        pass
    match = re.search(r'\{[\s\S]*\}', content)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            pass
    match = re.search(r'\[[\s\S]*\]', content)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            pass
    raise ValueError(f"Could not parse JSON from AI response: {content[:200]}")


def generate_title_and_notes(transcript: str) -> dict:
    system = """You are an expert academic tutor generating comprehensive university study notes.
Respond ONLY with a valid JSON object. No markdown, no explanation, no code fences. Just raw JSON.
The JSON must have exactly these keys: title, notes."""

    prompt = f"""Given this lecture transcript, generate:
1. title: A concise descriptive title for the lecture
2. notes: COMPREHENSIVE study notes — MINIMUM 1500 words. Follow these formatting rules strictly:
   - ## for major section headings
   - ### for subheadings within sections
   - **bold** for key terms, important concepts, and critical facts
   - Bullet points (- ) for lists of features, properties, or related items
   - Numbered lists (1. 2. 3.) for processes, steps, or sequences
   - Each major section must cover: definition, how it works, real-world applications, and why it matters
   - Include worked examples where relevant
   - Cover EVERY concept from the transcript thoroughly and deeply
   - End with a ## Common Exam Mistakes section with bullet points
   - Do NOT include a Key Takeaways section
   - Do NOT summarise — go deep on every topic

TRANSCRIPT:
{transcript[:8000]}

Respond with raw JSON only. Example format:
{{"title": "...", "notes": "## Introduction\\n\\n**Overview:** ...\\n\\n### Key Concepts\\n\\n- Point one\\n- Point two\\n"}}"""

    content = _chat(
        [{"role": "user", "content": prompt}],
        system,
        model="llama-3.3-70b-versatile",
        max_tokens=8192
    )
    return _parse_json(content)


def generate_glossary(transcript: str, title: str) -> list:
    system = """You are an expert academic tutor. Respond ONLY with a valid JSON array. No markdown, no code fences. Just raw JSON."""

    prompt = f"""For the lecture "{title}", generate a glossary of 15-20 key terms.
Each item must have "term" and "definition" keys. Definitions should be 3-5 sentences explaining the concept clearly.

TRANSCRIPT:
{transcript[:6000]}

Respond with raw JSON array only. Example:
[{{"term": "...", "definition": "..."}}, ...]"""

    content = _chat([{"role": "user", "content": prompt}], system)
    return _parse_json(content)


def generate_quiz(transcript: str, notes: str, title: str) -> list:
    system = """You are an expert academic quiz writer. Respond ONLY with a valid JSON array. No markdown, no code fences. Just raw JSON."""

    prompt = f"""For the lecture "{title}", generate 15-18 quiz questions.
IMPORTANT: Test conceptual understanding and theory ONLY. Never test specific examples, case studies, or scenarios from the transcript — students need to learn transferable knowledge.
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
IMPORTANT: Test conceptual understanding and theory ONLY. Never test specific examples, case studies, or scenarios from the transcript — focus on definitions, mechanisms, principles, and applications.
Each object must have "front" (a clear conceptual question) and "back" (2-4 sentence answer explaining the concept with a general example).

NOTES:
{notes[:8000]}

Respond with raw JSON array only. Example:
[{{"front": "What is...?", "back": "..."}}]"""

    content = _chat([{"role": "user", "content": prompt}], system)
    return _parse_json(content)


def chat_with_lecture(transcript: str, title: str, messages: list, chatbot_name: str = "Tutor", chatbot_tone: str = "friendly") -> str:
    tone_prompts = {
        "friendly": "You are warm, encouraging, and use simple language. Celebrate progress and make studying feel approachable.",
        "strict": "You are direct and concise. No hand-holding. Give precise answers and expect the student to keep up.",
        "socratic": "You guide students by asking questions rather than giving direct answers. Help them think through problems themselves."
    }
    tone_desc = tone_prompts.get(chatbot_tone, tone_prompts["friendly"])
    system = f"""You are {chatbot_name}, a university study assistant. {tone_desc}
You have full access to the lecture content below. Answer questions clearly and thoroughly.

LECTURE CONTENT:
{transcript[:15000]}"""

    return _chat(messages, system)


def chat_general(messages: list, chatbot_name: str = "Tutor", chatbot_tone: str = "friendly") -> str:
    tone_prompts = {
        "friendly": "You are warm, encouraging, and use simple language. Celebrate progress and make studying feel approachable.",
        "strict": "You are direct and concise. No hand-holding. Give precise answers and expect the student to keep up.",
        "socratic": "You guide students by asking questions rather than giving direct answers. Help them think through problems themselves."
    }
    tone_desc = tone_prompts.get(chatbot_tone, tone_prompts["friendly"])
    system = f"""You are {chatbot_name}, a university study assistant. {tone_desc}"""
    return _chat(messages, system)
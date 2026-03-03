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
    try:
        truncated = content.strip()
        if truncated.startswith('{') and not truncated.endswith('}'):
            truncated += '"}'
            return json.loads(truncated)
    except Exception:
        pass
    match = re.search(r'\[[\s\S]*\]', content)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            pass
    raise ValueError(f"Could not parse JSON from AI response: {content[:200]}")


def generate_title_and_notes(transcript: str, depth: str = "meh") -> dict:
    transcript_words = len(transcript.split())
    base = min(max(transcript_words, 800), 4000)

    depth_configs = {
        "cooked": {
            "words": int(base * 1.6),
            "max_tokens": 6000,
            "instruction": """SHORT MODE:
   - Define each core concept concisely with a clear 1-2 sentence definition
   - One short paragraph per major concept explaining how it works
   - Use bullet points heavily to keep things tight
   - Cover every concept from the transcript, just briefly
   - No fluff, no filler"""
        },
        "meh": {
            "words": int(base * 1.8),
            "max_tokens": 10000,
            "instruction": """MEDIUM DEPTH:
   - Give a clear definition for every concept
   - Explain how it works and why it matters in a solid paragraph
   - Use examples from the lecture to illustrate, then state the GENERAL PRINCIPLE it demonstrates
   - Include real-world applications briefly
   - Use ### subheadings within major sections"""
        },
        "ontop": {
            "words": int(base * 2.0),
            "max_tokens": 16000,
            "instruction": """MAXIMUM DEPTH:
   - Give a precise academic definition for every concept
   - Fully explain the underlying mechanism and theory — the WHY, not just the WHAT
   - Walk through how it works step by step
   - Use examples from the lecture, then explicitly state the GENERAL PRINCIPLE demonstrated
   - Cover real-world applications in depth
   - Cover edge cases, exceptions, and common misconceptions
   - Connect concepts to each other explicitly
   - Every major section must have multiple ### subheadings"""
        }
    }

    config = depth_configs.get(depth, depth_configs["meh"])

    # Call 1: title
    title_system = "You are an academic assistant. Respond with ONLY a plain text title, nothing else. No quotes, no JSON, no explanation."
    title_prompt = f"Give a concise academic title for this lecture transcript in 10 words or less:\n\n{transcript[:2000]}"
    title = _chat([{"role": "user", "content": title_prompt}], title_system, model="llama-3.1-8b-instant", max_tokens=30).strip().strip('"')

    # Call 2: notes
    notes_system = """You are an expert academic tutor generating university study notes.
Respond with ONLY the raw markdown notes text. No JSON, no code fences, no explanation, no title — just the notes content starting directly with a ## heading.
CRITICAL: When the lecture uses specific examples (e.g. bananas, rabbits, fictional characters), use them to illustrate — but always explicitly state the general transferable principle the example demonstrates."""

    notes_prompt = f"""Generate study notes for this lecture.

TARGET LENGTH: approximately {config['words']} words — scale your coverage to hit this target.

DEPTH INSTRUCTIONS:
{config['instruction']}

FORMATTING RULES:
   - ## for major section headings
   - ### for subheadings within sections
   - **bold** for key terms, definitions, and critical concepts
   - Bullet points (- ) for lists of properties or related items
   - Numbered lists (1. 2. 3.) for processes or sequences
   - When using lecture examples: use them, then write "In general, this illustrates that [general principle]..."
   - Do NOT include Key Takeaways, Common Exam Mistakes, or Deep Dive sections
   - Start directly with the first ## heading
   - Spend your word budget on depth and coverage, not padding

TRANSCRIPT:
{transcript[:8000]}"""

    notes = _chat(
        [{"role": "user", "content": notes_prompt}],
        notes_system,
        model="llama-3.3-70b-versatile",
        max_tokens=config["max_tokens"]
    )

    return {"title": title, "notes": notes}


def generate_glossary(transcript: str, title: str) -> list:
    system = """You are an expert academic tutor. Respond ONLY with a valid JSON array. No markdown, no code fences. Just raw JSON."""

    prompt = f"""For the lecture "{title}", generate a glossary of 15-20 key terms.
Each item must have "term" and "definition" keys. Definitions should be 3-5 sentences explaining the concept clearly in general terms.
If the lecture uses specific examples to define terms, extract the general definition — not the example-specific one.

TRANSCRIPT:
{transcript[:6000]}

Respond with raw JSON array only:
[{{"term": "...", "definition": "..."}}, ...]"""

    content = _chat([{"role": "user", "content": prompt}], system)
    return _parse_json(content)


def generate_quiz(transcript: str, notes: str, title: str) -> list:
    system = """You are an expert academic quiz writer. Respond ONLY with a valid JSON array. No markdown, no code fences. Just raw JSON."""

    prompt = f"""For the lecture "{title}", generate 15-18 quiz questions.
Test conceptual understanding and theory. Questions can reference lecture examples but must test whether the student understands the underlying principle, not just memorised the example.
Each object must have: question, options (array of 4 strings), correct (index 0-3), explanation, difficulty ("easy"/"medium"/"hard").

NOTES:
{notes[:8000]}

Respond with raw JSON array only:
[{{"question": "...", "options": ["a","b","c","d"], "correct": 0, "explanation": "...", "difficulty": "medium"}}]"""

    content = _chat([{"role": "user", "content": prompt}], system)
    return _parse_json(content)


def generate_flashcards(transcript: str, notes: str, title: str) -> list:
    system = """You are an expert academic flashcard creator. Respond ONLY with a valid JSON array. No markdown, no code fences. Just raw JSON."""

    prompt = f"""For the lecture "{title}", generate 22-28 flashcards.
Test conceptual understanding. Cards can use lecture examples to illustrate but must test the general principle or definition, not specific numbers or details from examples.
Each object must have "front" (a clear conceptual question) and "back" (2-4 sentence answer explaining the concept and its general application).

NOTES:
{notes[:8000]}

Respond with raw JSON array only:
[{{"front": "What is...?", "back": "..."}}]"""

    content = _chat([{"role": "user", "content": prompt}], system)
    return _parse_json(content)


def chat_with_lecture(transcript: str, title: str, messages: list, chatbot_name: str = "Tutor", chatbot_tone: str = "friendly") -> str:
    tone_prompts = {
        "friendly": "You are warm, encouraging and use simple language. Celebrate progress and be supportive.",
        "strict": "You are direct and concise. No hand-holding. Give precise answers without unnecessary encouragement.",
        "socratic": "You guide the student by asking questions rather than giving direct answers. Help them think through problems themselves."
    }
    tone_desc = tone_prompts.get(chatbot_tone, tone_prompts["friendly"])
    system = f"""You are {chatbot_name}, a university study assistant. {tone_desc}
You have full access to the lecture content below. Answer questions clearly and thoroughly.

LECTURE CONTENT:
{transcript[:15000]}"""
    return _chat(messages, system)


def chat_general(messages: list, chatbot_name: str = "Tutor", chatbot_tone: str = "friendly") -> str:
    tone_prompts = {
        "friendly": "You are warm, encouraging and use simple language. Celebrate progress and be supportive.",
        "strict": "You are direct and concise. No hand-holding. Give precise answers without unnecessary encouragement.",
        "socratic": "You guide the student by asking questions rather than giving direct answers. Help them think through problems themselves."
    }
    tone_desc = tone_prompts.get(chatbot_tone, tone_prompts["friendly"])
    system = f"""You are {chatbot_name}, a university study assistant. {tone_desc}"""
    return _chat(messages, system)
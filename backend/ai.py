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
    depth_configs = {
        "ontop": {
            "words": "2500+ words",
            "max_tokens": 16000,
            "instruction": """MAXIMUM DEPTH. For every concept you must:
   - Give a precise academic definition
   - Explain the underlying mechanism and theory in full — the WHY, not just the WHAT
   - Walk through how it works step by step
   - Use examples from the lecture to illustrate, but always extract and state the GENERAL PRINCIPLE the example demonstrates
   - Explain real-world applications beyond the lecture
   - Cover edge cases, exceptions, and common misconceptions
   - Connect concepts to each other explicitly
   - Every major section must have multiple ### subheadings
   - End with ## Common Exam Mistakes (at least 6 detailed points)"""
        },
        "meh": {
            "words": "1200-1500 words",
            "max_tokens": 10000,
            "instruction": """MEDIUM DEPTH. For every concept you must:
   - Give a clear definition
   - Explain how it works and why it matters
   - Use examples from the lecture to illustrate, but always state the GENERAL PRINCIPLE the example demonstrates
   - Brief real-world application
   - End with ## Common Exam Mistakes (4-5 points)"""
        },
        "cooked": {
            "words": "500-800 words",
            "max_tokens": 4000,
            "instruction": """SHORT MODE. You must:
   - Define each core concept concisely
   - One sentence on how it works
   - Use bullet points heavily
   - End with ## Common Exam Mistakes (3-4 points)"""
        }
    }

    config = depth_configs.get(depth, depth_configs["meh"])

    system = """You are an expert academic tutor generating university study notes.
Respond ONLY with a valid JSON object. No markdown, no explanation, no code fences. Just raw JSON.
The JSON must have exactly these keys: title, notes.
CRITICAL: Your entire response must be valid, complete JSON. Never truncate mid-sentence.
CRITICAL: When the lecture uses specific examples (e.g. bananas, rabbits, fictional characters), use them to illustrate concepts — but always explicitly state the general transferable principle the example is demonstrating. Students must understand the theory, not just the example."""

    prompt = f"""Given this lecture transcript, generate study notes.

TARGET LENGTH: {config['words']}

DEPTH INSTRUCTIONS:
{config['instruction']}

FORMATTING RULES:
   - ## for major section headings
   - ### for subheadings within sections
   - **bold** for key terms, definitions, and critical concepts
   - Bullet points (- ) for lists of properties, features, or related items
   - Numbered lists (1. 2. 3.) for processes or sequences
   - When using lecture examples: use them, then follow with a sentence like "In general, this illustrates that [general principle]..."
   - Do NOT include a Key Takeaways or Deep Dive Questions section

TRANSCRIPT:
{transcript[:8000]}

Respond with raw JSON only:
{{"title": "...", "notes": "## Section\\n\\n**Term:** definition...\\n\\n- bullet\\n"}}"""

    content = _chat(
        [{"role": "user", "content": prompt}],
        system,
        model="llama-3.3-70b-versatile",
        max_tokens=config["max_tokens"]
    )
    return _parse_json(content)


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
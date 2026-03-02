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
            "instruction": """This is MAXIMUM DEPTH mode. You must:
   - Fully unpack every single concept — definition, underlying theory, mechanisms, how it works step by step
   - Explain WHY things work, not just what they are
   - Include multiple worked examples for each concept (using generic hypothetical examples, NOT examples from the transcript)
   - Cover edge cases, exceptions, and nuances
   - Explain connections between concepts
   - Include real-world applications in depth
   - Every section must have multiple subheadings
   - End with ## Common Exam Mistakes (detailed, at least 6 points)
   - End with ## Deep Dive Questions (5 challenging conceptual questions for self-testing)"""
        },
        "meh": {
            "words": "1200-1500 words",
            "max_tokens": 10000,
            "instruction": """This is MEDIUM DEPTH mode. You must:
   - Cover every concept clearly with definition, how it works, and why it matters
   - Include at least one generic worked example per major concept
   - Use subheadings to organise content within sections
   - Cover real-world applications briefly
   - End with ## Common Exam Mistakes (4-5 points)"""
        },
        "cooked": {
            "words": "500-800 words",
            "max_tokens": 4000,
            "instruction": """This is SHORT mode. You must:
   - Cover only the core concepts — definitions and key mechanisms
   - Be concise but accurate
   - Use bullet points heavily to keep things tight
   - End with ## Key Points (5-6 bullet points of the most important things to remember)"""
        }
    }

    config = depth_configs.get(depth, depth_configs["meh"])

    system = """You are an expert academic tutor generating comprehensive university study notes.
Respond ONLY with a valid JSON object. No markdown, no explanation, no code fences. Just raw JSON.
The JSON must have exactly these keys: title, notes.
CRITICAL: Your entire response must be valid JSON. Do not truncate or cut off mid-sentence.
CRITICAL: Never reference specific examples, case studies, or scenarios from the transcript. Teach transferable theory only. Use your own generic hypothetical examples."""

    prompt = f"""Given this lecture transcript, generate study notes at the specified depth level.

TARGET LENGTH: {config['words']}

DEPTH INSTRUCTIONS:
{config['instruction']}

FORMATTING RULES (apply to all depth levels):
   - ## for major section headings
   - ### for subheadings within sections
   - **bold** for key terms, important concepts, and critical facts
   - Bullet points (- ) for lists of features, properties, or related items
   - Numbered lists (1. 2. 3.) for processes, steps, or sequences
   - NEVER reference specific examples from the transcript — use generic hypothetical examples only
   - Teach the THEORY and PRINCIPLES, not the specific content of the lecture

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
Each item must have "term" and "definition" keys. Definitions should be 3-5 sentences explaining the concept clearly.
Never reference specific examples from the transcript — define terms in a general, transferable way.

TRANSCRIPT:
{transcript[:6000]}

Respond with raw JSON array only. Example:
[{{"term": "...", "definition": "..."}}, ...]"""

    content = _chat([{"role": "user", "content": prompt}], system)
    return _parse_json(content)


def generate_quiz(transcript: str, notes: str, title: str) -> list:
    system = """You are an expert academic quiz writer. Respond ONLY with a valid JSON array. No markdown, no code fences. Just raw JSON."""

    prompt = f"""For the lecture "{title}", generate 15-18 quiz questions.
IMPORTANT: Test conceptual understanding and theory ONLY. Never test specific examples, case studies, names, or scenarios from the transcript — students need to learn transferable knowledge.
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
IMPORTANT: Test conceptual understanding and theory ONLY. Never test specific examples, case studies, names, or scenarios from the transcript — focus on definitions, mechanisms, principles, and applications.
Each object must have "front" (a clear conceptual question) and "back" (2-4 sentence answer explaining the concept with a generic hypothetical example).

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
import os
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


def generate_title_summary_notes(transcript: str) -> dict:
    system = """You are an expert academic tutor generating comprehensive study materials for university students.
Your job is to produce exceptionally thorough, exam-ready study notes. Do NOT summarise — teach.
Respond ONLY in valid JSON with keys: title, summary, notes."""

    prompt = f"""Given this lecture transcript, generate:
1. title: A concise, descriptive title for this lecture (no quotes)
2. summary: A 6-8 sentence executive summary of the entire lecture covering all major themes
3. notes: COMPREHENSIVE study notes — MINIMUM 1200 words.

Notes MUST follow this structure:
- Use ## and ### markdown headers
- Cover EVERY concept from the lecture in depth
- For each concept: precise definition, how it works, worked examples, why it matters, connections to other concepts, real-world applications, common exam mistakes
- End with a ## Key Takeaways section summarising the most important points
- Write as if teaching a student from scratch who needs to pass an exam using ONLY these notes

TRANSCRIPT:
{transcript[:12000]}

Respond with valid JSON only."""

    content = _chat([{"role": "user", "content": prompt}], system)
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:-1])
    import json
    return json.loads(content)


def generate_notes_cooked(transcript: str, title: str) -> str:
    system = """You are an expert academic tutor. Generate brutally condensed bullet-point notes.
Respond ONLY with raw markdown — no JSON, no preamble."""

    prompt = f"""Generate "Cooked" depth notes for the lecture: "{title}".

Rules:
- Bullet points ONLY — no paragraphs, no explanations
- Each bullet is one crisp fact, definition, or formula — max 15 words
- Use ## headers to group topics
- No fluff, no examples, no context — just the raw facts needed to pass an exam
- Minimum 60 bullets

TRANSCRIPT:
{transcript[:12000]}"""

    return _chat([{"role": "user", "content": prompt}], system)


def generate_notes_ontop(transcript: str, title: str) -> str:
    system = """You are an expert academic tutor writing full academic study notes.
Respond ONLY with raw markdown — no JSON, no preamble."""

    prompt = f"""Generate "On Top" depth notes for the lecture: "{title}".

Rules:
- Full academic prose with markdown headers
- MINIMUM 2000 words
- For every concept: definition, mechanism, worked examples, real-world application, exam traps, links to other concepts
- Include a ## Summary section at the end
- Write as if this is the only document a student will read before a final exam

TRANSCRIPT:
{transcript[:12000]}"""

    return _chat([{"role": "user", "content": prompt}], system)


def generate_glossary(transcript: str, title: str) -> list:
    system = """You are an expert academic tutor. Respond ONLY in valid JSON — a list of objects."""

    prompt = f"""For this lecture titled "{title}", generate a glossary of 15-20 key terms.

Each term object must have:
- term: the key term or concept
- definition: 3-5 sentences explaining the term including context, significance, and relationships to other concepts in this lecture

TRANSCRIPT:
{transcript[:12000]}

Respond with a JSON array of objects with keys "term" and "definition" only."""

    content = _chat([{"role": "user", "content": prompt}], system)
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:-1])
    import json
    return json.loads(content)


def generate_quiz(transcript: str, notes: str, title: str) -> list:
    system = """You are an expert academic quiz writer. Respond ONLY in valid JSON — a list of question objects."""

    prompt = f"""For the lecture "{title}", generate 15-18 quiz questions.

Requirements:
- Mix of easy (30%), medium (50%), and hard (20%) difficulty
- Each question has 4 genuinely plausible answer options (not obviously wrong distractors)
- Detailed 2-3 sentence explanation of why the correct answer is right AND why each wrong answer is wrong

Each object must have:
- question: the question text
- options: array of 4 strings (the answer choices)
- correct: index (0-3) of the correct answer
- explanation: detailed explanation covering correct and incorrect answers
- difficulty: "easy", "medium", or "hard"

NOTES:
{notes[:8000]}

Respond with a JSON array only."""

    content = _chat([{"role": "user", "content": prompt}], system)
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:-1])
    import json
    return json.loads(content)


def generate_flashcards(transcript: str, notes: str, title: str) -> list:
    system = """You are an expert academic flashcard creator. Respond ONLY in valid JSON — a list of card objects."""

    prompt = f"""For the lecture "{title}", generate 22-28 flashcards.

Requirements:
- Fronts phrased as questions (not just terms) — e.g. "What is the difference between X and Y?" not just "X"
- Backs are 2-4 sentences with context and concrete examples
- Cover all major concepts from the lecture

Each object must have:
- front: question text
- back: answer with context and example

NOTES:
{notes[:8000]}

Respond with a JSON array only."""

    content = _chat([{"role": "user", "content": prompt}], system)
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:-1])
    import json
    return json.loads(content)


def chat_with_lecture(transcript: str, title: str, messages: list) -> str:
    system = f"""You are a helpful study assistant for the lecture: "{title}".
You have full access to the lecture content below. Answer questions clearly and thoroughly.
Use specific examples and concepts from the lecture. If something isn't covered, say so.

LECTURE CONTENT:
{transcript[:15000]}"""

    return _chat(messages, system)
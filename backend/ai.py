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
            "words": int(base * 0.5),
            "max_tokens": 3000,
            "instruction": """You are writing CONCISE study notes. Rules:
- Each concept gets: 1 bold definition line + 2-3 bullet points max
- Use ## for each major topic, NO ### subheadings
- Bullet points only, minimal prose
- Stop the moment you have covered every concept once
- Do NOT conclude, summarise, or repeat anything"""
        },
        "meh": {
            "words": int(base * 0.9),
            "max_tokens": 7000,
            "instruction": """You are writing MEDIUM DEPTH study notes. Rules:
- Each concept gets: 1 bold definition + a short paragraph explaining how/why + 3-5 bullet points
- Use ## for major topics, ### for subtopics within them
- For lecture examples: use them briefly, then one sentence stating the general principle
- Stop the moment every concept is covered — no conclusions, no summaries, no repetition
- Each concept appears ONCE only"""
        },
        "ontop": {
            "words": int(base * 1.4),
            "max_tokens": 12000,
            "instruction": """You are writing IN-DEPTH study notes. Rules:
- Each concept gets: bold definition + full explanation of mechanism and theory + bullet points for properties/steps + real-world application
- Use ## for major topics, ### for every subtopic
- For lecture examples: explain them fully, then state the general transferable principle
- Connect concepts to each other explicitly
- Stop the moment every concept is covered in depth — no conclusions, no summaries, no repetition
- Each concept appears ONCE only"""
        }
    }

    config = depth_configs.get(depth, depth_configs["meh"])

    # Generate title once, reused across all depths
    title_system = "You are an academic assistant. Respond with ONLY a plain text title, nothing else. No quotes, no JSON, no explanation."
    title_prompt = f"Give a concise academic title for this lecture in 8 words or less:\n\n{transcript[:1000]}"
    title = _chat(
        [{"role": "user", "content": title_prompt}],
        title_system,
        model="llama-3.1-8b-instant",
        max_tokens=20
    ).strip().strip('"').strip("'")

    notes_system = f"""You are an expert academic note-writer. Output ONLY raw markdown. No JSON, no code fences, no preamble.
CRITICAL RULES — violating these makes the output useless:
1. Use ## for major section headings, ### for subheadings
2. Use **bold** for every key term and definition
3. Use bullet points (- ) for lists of properties, steps, or examples
4. Write approximately {config['words']} words total — not more, not less
5. Cover every concept from the transcript EXACTLY ONCE
6. DO NOT write any conclusion, summary, recap, or closing paragraph
7. DO NOT repeat any concept, sentence, or idea
8. STOP writing as soon as all concepts are covered — do not pad"""

    notes_prompt = f"""Write study notes for this lecture using these depth instructions:

{config['instruction']}

TARGET: ~{config['words']} words

TRANSCRIPT:
{transcript[:8000]}

Start directly with the first ## heading. Cover everything once. Then stop."""

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
Each item must have "term" and "definition" keys. Definitions should be 2-3 sentences explaining the concept clearly in general terms.

TRANSCRIPT:
{transcript[:6000]}

Respond with raw JSON array only:
[{{"term": "...", "definition": "..."}}, ...]"""
    content = _chat([{"role": "user", "content": prompt}], system)
    return _parse_json(content)


def generate_quiz(transcript: str, notes: str, title: str) -> list:
    system = """You are an expert academic quiz writer. Respond ONLY with a valid JSON array. No markdown, no code fences. Just raw JSON."""
    prompt = f"""For the lecture "{title}", generate 15-18 quiz questions.
Test conceptual understanding. Questions can use lecture examples but must test the underlying principle.
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
Test conceptual understanding and general principles, not specific numbers or examples.
Each object must have "front" (clear question) and "back" (2-3 sentence answer).

NOTES:
{notes[:8000]}

Respond with raw JSON array only:
[{{"front": "What is...?", "back": "..."}}]"""
    content = _chat([{"role": "user", "content": prompt}], system)
    return _parse_json(content)


def chat_with_lecture(transcript: str, title: str, messages: list, chatbot_name: str = "Tutor", chatbot_tone: str = "friendly") -> str:
    tone_prompts = {
        "friendly": "Be warm but concise. No filler. Acknowledge what they asked then answer clearly.",
        "strict": "Be direct and precise. No encouragement. Get to the point immediately.",
        "socratic": "Ask one focused question to guide the student to the answer themselves."
    }
    tone_desc = tone_prompts.get(chatbot_tone, tone_prompts["friendly"])
    system = f"""You are {chatbot_name}, a study assistant for: "{title}". {tone_desc}
Use bullet points only when listing 3+ things. Never start with filler like "Great question!".
LECTURE CONTENT:
{transcript[:15000]}"""
    return _chat(messages, system)


def chat_general(messages: list, chatbot_name: str = "Tutor", chatbot_tone: str = "friendly") -> str:
    tone_prompts = {
        "friendly": "Be warm but concise. No filler. Acknowledge what they asked then answer clearly.",
        "strict": "Be direct and precise. No encouragement. Get to the point immediately.",
        "socratic": "Ask one focused question to guide the student to the answer themselves."
    }
    tone_desc = tone_prompts.get(chatbot_tone, tone_prompts["friendly"])
    system = f"""You are {chatbot_name}, a university study assistant. {tone_desc}
Use bullet points only when listing 3+ things. Never start with filler like "Great question!"."""
    return _chat(messages, system)
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
            "instruction": """FORMAT: Bullet-point summary only.
STRUCTURE:
## [Topic]
- **Term**: one sentence definition
- **Term**: one sentence definition

Rules:
- No prose paragraphs at all
- Every concept is ONE bullet point maximum
- Examples only if concept cannot be understood without one — state the general principle the example shows, not the example itself
- No "in general this illustrates" phrases
- Hard stop after all concepts covered once
- THEORY FIRST: always state what the concept IS before any example"""
        },
        "meh": {
            "words": int(base * 0.9),
            "max_tokens": 7000,
            "instruction": """FORMAT: Definition + short explanation + bullets.
STRUCTURE:
## [Topic]
**Term** is defined as [1 sentence definition]. [1-2 sentence explanation of the underlying theory and mechanism — WHY it works, not just what it is].
- key property or implication
- key property or implication
- brief real world application beyond the lecture

### [Subtopic if needed]
same pattern

Rules:
- THEORY FIRST: define the concept and explain the mechanism before touching any example
- When using a lecture example: use it in ONE sentence only, then immediately state the general transferable principle it demonstrates
- Each concept gets exactly: 1 definition + 1-2 theory sentences + 2-4 bullets
- Hard stop after all concepts covered once
- No conclusions, no summaries, no repetition"""
        },
        "ontop": {
            "words": int(base * 1.4),
            "max_tokens": 12000,
            "instruction": """FORMAT: Full academic notes with deep theoretical explanation.
STRUCTURE PER CONCEPT:
## [Topic]
### Definition
**Term** is [precise academic definition]. This differs from [related concept] because [theoretical distinction].

### Theory & Mechanism
[Full paragraph on the underlying theory — the WHY and HOW. Explain the economic/scientific/mathematical mechanism in full. This section must be purely theoretical with no examples.]

### Key Properties
- **Property 1**: why this property exists theoretically
- **Property 2**: theoretical explanation
- **Property 3**: theoretical explanation

### Example & General Principle
[Use lecture example in ONE paragraph maximum]. The general principle this demonstrates is: [transferable theoretical principle that applies universally, not just to this example].

### Real World Application
[How this theory applies in practice beyond the lecture context]

Rules:
- THEORY MUST COME BEFORE EXAMPLES — never introduce an example before the theory is fully explained
- The Theory & Mechanism section must contain zero examples
- Explicitly connect concepts to each other with theoretical reasoning ("This concept extends X because theoretically...")
- Cover edge cases and misconceptions for each concept
- Hard stop after all concepts covered in full
- No conclusions, no summaries, no repetition"""
        }
    }

    config = depth_configs.get(depth, depth_configs["meh"])

    title_system = "You are an academic assistant. Respond with ONLY a plain text title, nothing else. No quotes, no JSON, no explanation."
    title_prompt = f"Give a concise academic title for this lecture in 8 words or less:\n\n{transcript[:1000]}"
    title = _chat(
        [{"role": "user", "content": title_prompt}],
        title_system,
        model="llama-3.1-8b-instant",
        max_tokens=20
    ).strip().strip('"').strip("'")

    notes_system = f"""You are an expert academic note-writer. Output ONLY raw markdown. No JSON, no code fences, no preamble.

CRITICAL RULES:
1. Use ## for major section headings, ### for subheadings
2. Use **bold** for every key term and definition
3. Use bullet points (- ) for lists of properties, steps, or implications
4. Write approximately {config['words']} words total
5. Cover every concept from the transcript EXACTLY ONCE
6. THEORY BEFORE EXAMPLES — always fully explain the theoretical concept before introducing any example
7. Examples are illustrative only — always follow with the general transferable principle
8. DO NOT write any conclusion, summary, recap, or closing paragraph
9. DO NOT repeat any concept, sentence, or idea
10. STOP writing as soon as all concepts are covered"""

    notes_prompt = f"""Write study notes for this lecture.

DEPTH FORMAT:
{config['instruction']}

TARGET: ~{config['words']} words

TRANSCRIPT:
{transcript[:8000]}

Start directly with the first ## heading. Follow the format exactly. Cover everything once. Then stop."""

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
Each item must have "term" and "definition" keys.
Definitions must be 2-3 sentences of pure theory — what the concept IS and why it matters.
Do not use specific examples from the lecture in definitions — state the general theoretical definition only.

TRANSCRIPT:
{transcript[:6000]}

Respond with raw JSON array only:
[{{"term": "...", "definition": "..."}}, ...]"""
    content = _chat([{"role": "user", "content": prompt}], system)
    return _parse_json(content)


def generate_quiz(transcript: str, notes: str, title: str) -> list:
    system = """You are an expert academic quiz writer. Respond ONLY with a valid JSON array. No markdown, no code fences. Just raw JSON."""
    prompt = f"""For the lecture "{title}", generate 15-18 quiz questions.
Test theoretical understanding — definitions, mechanisms, and principles.
Do NOT test specific numbers or details from lecture examples.
Questions must test whether the student understands the underlying theory, not whether they memorised the example.
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
Test theoretical understanding only — definitions, mechanisms, principles, and relationships between concepts.
Never test specific numbers, names, or details from lecture examples.
Each object must have "front" (clear theoretical question) and "back" (2-3 sentence theoretical answer stating the concept and why it matters).

NOTES:
{notes[:8000]}

Respond with raw JSON array only:
[{{"front": "What is...?", "back": "..."}}]"""
    content = _chat([{"role": "user", "content": prompt}], system)
    return _parse_json(content)


def chat_with_lecture(transcript: str, title: str, messages: list, chatbot_name: str = "Tutor", chatbot_tone: str = "friendly") -> str:
    tone_prompts = {
        "friendly": "Be warm but concise. No filler phrases. Acknowledge what they asked then answer clearly. Use bullet points only when listing 3+ things. Never start with 'Great question!' or similar.",
        "strict": "Be direct and precise. No encouragement or filler. Get to the point immediately. Short answers where possible.",
        "socratic": "Ask one focused question to guide the student to the answer themselves. Keep it brief."
    }
    tone_desc = tone_prompts.get(chatbot_tone, tone_prompts["friendly"])
    system = f"""You are {chatbot_name}, a study assistant for: "{title}". {tone_desc}
When explaining concepts always lead with theory before examples.
LECTURE CONTENT:
{transcript[:15000]}"""
    return _chat(messages, system, max_tokens=512)


def chat_general(messages: list, chatbot_name: str = "Tutor", chatbot_tone: str = "friendly") -> str:
    tone_prompts = {
        "friendly": "Be warm but concise. No filler phrases. Acknowledge what they asked then answer clearly. Use bullet points only when listing 3+ things. Never start with 'Great question!' or similar.",
        "strict": "Be direct and precise. No encouragement or filler. Get to the point immediately. Short answers where possible.",
        "socratic": "Ask one focused question to guide the student to the answer themselves. Keep it brief."
    }
    tone_desc = tone_prompts.get(chatbot_tone, tone_prompts["friendly"])
    system = f"""You are {chatbot_name}, a university study assistant. {tone_desc}
When explaining concepts always lead with theory before examples."""
    return _chat(messages, system, max_tokens=512)
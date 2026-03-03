from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from groq import Groq
import os

router = APIRouter()

TONE_PROMPTS = {
    "friendly": """You're a chill, smart study buddy. Be warm but not over the top. 
Keep answers concise and clear — no walls of text. Use casual language where it fits. 
If something's tricky, break it down simply. Acknowledge what the student said before answering.""",
    "strict": """You're direct and no-nonsense. Answer precisely and concisely. 
No encouragement, no filler. Get to the point immediately. Short answers where possible.""",
    "socratic": """You guide through questions rather than direct answers. 
Ask one focused question to help the student think it through themselves. 
Keep it conversational and brief.""",
}

class ChatRequest(BaseModel):
    lecture_id: str
    messages: list
    chatbot_name: Optional[str] = "Tutor"
    chatbot_tone: Optional[str] = "friendly"

class GeneralChatRequest(BaseModel):
    messages: list
    chatbot_name: Optional[str] = "Tutor"
    chatbot_tone: Optional[str] = "friendly"

@router.post("/")
async def chat(req: ChatRequest):
    from db import get_supabase
    client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))
    sb = get_supabase()
    lec = sb.table("lectures").select("title, raw_transcript").eq("id", req.lecture_id).single().execute()
    if not lec.data:
        return {"reply": "Lecture not found."}
    tone = TONE_PROMPTS.get(req.chatbot_tone or "friendly", TONE_PROMPTS["friendly"])
    name = req.chatbot_name or "Tutor"
    system = f"""You are {name}, a study assistant for the lecture: "{lec.data['title']}".
{tone}
You have the full lecture content below. Answer based on it, but don't just recite it — explain it.
Keep responses focused and digestible. Use bullet points only when listing 3+ things.
Never start with "Great question!" or similar filler.

LECTURE CONTENT:
{lec.data['raw_transcript'][:8000]}"""
    resp = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "system", "content": system}] + req.messages,
        max_tokens=512,
        temperature=0.7,
    )
    return {"reply": resp.choices[0].message.content.strip()}

@router.post("/general")
async def general_chat(req: GeneralChatRequest):
    client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))
    tone = TONE_PROMPTS.get(req.chatbot_tone or "friendly", TONE_PROMPTS["friendly"])
    name = req.chatbot_name or "Tutor"
    system = f"""You are {name}, a study assistant for university students.
{tone}
Help with concepts, study strategies, and academic questions.
Keep responses focused and digestible. Use bullet points only when listing 3+ things.
Never start with "Great question!" or similar filler."""
    resp = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "system", "content": system}] + req.messages,
        max_tokens=512,
        temperature=0.7,
    )
    return {"reply": resp.choices[0].message.content.strip()}
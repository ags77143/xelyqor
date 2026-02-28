from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from groq import Groq
import os

router = APIRouter()
client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))

TONE_PROMPTS = {
    "friendly": "You are warm, encouraging and use simple language. Celebrate progress and be supportive.",
    "strict": "You are direct and concise. No hand-holding. Give precise answers without unnecessary encouragement.",
    "socratic": "You guide the student by asking questions rather than giving direct answers. Help them think through problems themselves.",
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
    sb = get_supabase()

    lec = sb.table("lectures").select("title, raw_transcript").eq("id", req.lecture_id).single().execute()
    if not lec.data:
        return {"reply": "Lecture not found."}

    tone = TONE_PROMPTS.get(req.chatbot_tone or "friendly", TONE_PROMPTS["friendly"])
    name = req.chatbot_name or "Tutor"

    system = f"""You are {name}, an AI study assistant for the lecture: "{lec.data['title']}".
{tone}
You have full access to the lecture content below. Answer questions clearly and thoroughly.

LECTURE CONTENT:
{lec.data['raw_transcript'][:8000]}"""

    resp = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "system", "content": system}] + req.messages,
        max_tokens=1024,
        temperature=0.7,
    )
    return {"reply": resp.choices[0].message.content.strip()}


@router.post("/general")
async def general_chat(req: GeneralChatRequest):
    tone = TONE_PROMPTS.get(req.chatbot_tone or "friendly", TONE_PROMPTS["friendly"])
    name = req.chatbot_name or "Tutor"

    system = f"""You are {name}, a helpful study assistant for university students.
{tone}
Help with explaining concepts, study strategies, exam tips, and answering academic questions across all subjects."""

    resp = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "system", "content": system}] + req.messages,
        max_tokens=1024,
        temperature=0.7,
    )
    return {"reply": resp.choices[0].message.content.strip()}
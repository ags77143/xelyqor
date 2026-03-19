from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from db import get_supabase
from ai import chat_with_lecture

router = APIRouter()


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    lecture_id: str
    messages: List[ChatMessage]


@router.post("/")
async def chat(req: ChatRequest):
    sb = get_supabase()
    lec_res = sb.table("lectures").select("raw_transcript, title").eq("id", req.lecture_id).single().execute()
    lecture = lec_res.data

    messages = [{"role": m.role, "content": m.content} for m in req.messages]
    reply = chat_with_lecture(lecture["raw_transcript"], lecture["title"], messages)
    return {"reply": reply}

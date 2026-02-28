from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from db import get_supabase

router = APIRouter()

class UserSettings(BaseModel):
    user_id: str
    display_name: Optional[str] = None
    avatar_colour: Optional[str] = "#c17b2e"
    chatbot_name: Optional[str] = "Tutor"
    chatbot_tone: Optional[str] = "friendly"

@router.get("/{user_id}")
async def get_settings(user_id: str):
    sb = get_supabase()
    res = sb.table("user_settings").select("*").eq("user_id", user_id).execute()
    if res.data:
        return res.data[0]
    return {
        "user_id": user_id,
        "display_name": "",
        "avatar_colour": "#c17b2e",
        "chatbot_name": "Tutor",
        "chatbot_tone": "friendly"
    }

@router.post("/")
async def save_settings(body: UserSettings):
    sb = get_supabase()
    existing = sb.table("user_settings").select("id").eq("user_id", body.user_id).execute()
    data = {
        "user_id": body.user_id,
        "display_name": body.display_name,
        "avatar_colour": body.avatar_colour,
        "chatbot_name": body.chatbot_name,
        "chatbot_tone": body.chatbot_tone,
    }
    if existing.data:
        sb.table("user_settings").update(data).eq("user_id", body.user_id).execute()
    else:
        sb.table("user_settings").insert(data).execute()
    return {"ok": True}
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from db import get_supabase

router = APIRouter()


class SubjectCreate(BaseModel):
    user_id: str
    name: str
    colour: Optional[str] = "#c17b2e"


@router.get("/")
async def list_subjects(user_id: str):
    sb = get_supabase()
    res = sb.table("subjects").select("*").eq("user_id", user_id).order("name").execute()
    return res.data


@router.post("/")
async def create_subject(body: SubjectCreate):
    sb = get_supabase()
    res = sb.table("subjects").insert({
        "user_id": body.user_id,
        "name": body.name,
        "colour": body.colour,
    }).execute()
    return res.data[0]


@router.delete("/{subject_id}")
async def delete_subject(subject_id: str):
    sb = get_supabase()
    sb.table("subjects").delete().eq("id", subject_id).execute()
    return {"ok": True}

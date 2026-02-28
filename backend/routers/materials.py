from fastapi import APIRouter, HTTPException
from db import get_supabase
from ai import generate_quiz, generate_flashcards
import json

router = APIRouter()


@router.get("/{lecture_id}")
async def get_materials(lecture_id: str):
    sb = get_supabase()
    res = sb.table("study_materials").select("*").eq("lecture_id", lecture_id).single().execute()
    data = res.data
    # Parse JSON fields
    if data.get("glossary") and isinstance(data["glossary"], str):
        data["glossary"] = json.loads(data["glossary"])
    if data.get("quiz") and isinstance(data["quiz"], str):
        data["quiz"] = json.loads(data["quiz"])
    if data.get("flashcards") and isinstance(data["flashcards"], str):
        data["flashcards"] = json.loads(data["flashcards"])
    return data


@router.post("/{lecture_id}/generate-quiz")
async def gen_quiz(lecture_id: str):
    sb = get_supabase()
    
    # Get existing materials
    mat_res = sb.table("study_materials").select("quiz, notes").eq("lecture_id", lecture_id).single().execute()
    if mat_res.data.get("quiz"):
        # Already generated, return it
        existing = mat_res.data["quiz"]
        return json.loads(existing) if isinstance(existing, str) else existing
    
    # Get lecture for transcript
    lec_res = sb.table("lectures").select("raw_transcript, title").eq("id", lecture_id).single().execute()
    lecture = lec_res.data
    
    notes = mat_res.data.get("notes", "")
    quiz = generate_quiz(lecture["raw_transcript"], notes, lecture["title"])
    
    sb.table("study_materials").update({"quiz": json.dumps(quiz)}).eq("lecture_id", lecture_id).execute()
    return quiz


@router.post("/{lecture_id}/generate-flashcards")
async def gen_flashcards(lecture_id: str):
    sb = get_supabase()
    
    mat_res = sb.table("study_materials").select("flashcards, notes").eq("lecture_id", lecture_id).single().execute()
    if mat_res.data.get("flashcards"):
        existing = mat_res.data["flashcards"]
        return json.loads(existing) if isinstance(existing, str) else existing
    
    lec_res = sb.table("lectures").select("raw_transcript, title").eq("id", lecture_id).single().execute()
    lecture = lec_res.data
    
    notes = mat_res.data.get("notes", "")
    flashcards = generate_flashcards(lecture["raw_transcript"], notes, lecture["title"])
    
    sb.table("study_materials").update({"flashcards": json.dumps(flashcards)}).eq("lecture_id", lecture_id).execute()
    return flashcards

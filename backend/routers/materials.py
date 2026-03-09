from fastapi import APIRouter
from pydantic import BaseModel
from db import get_supabase
from ai import generate_quiz, generate_flashcards, generate_title_and_notes
import json

router = APIRouter()

class RegenerateNotesRequest(BaseModel):
    depth: str = "meh"

@router.get("/{lecture_id}")
async def get_materials(lecture_id: str):
    sb = get_supabase()
    res = sb.table("study_materials").select("*").eq("lecture_id", lecture_id).single().execute()
    data = res.data
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
    mat_res = sb.table("study_materials").select("quiz, notes").eq("lecture_id", lecture_id).single().execute()
    if mat_res.data.get("quiz"):
        existing = mat_res.data["quiz"]
        return json.loads(existing) if isinstance(existing, str) else existing
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

@router.post("/{lecture_id}/regenerate-notes")
async def regenerate_notes(lecture_id: str, req: RegenerateNotesRequest):
    sb = get_supabase()

    mat_res = sb.table("study_materials").select("notes, notes_cooked, notes_ontop, notes_depth").eq("lecture_id", lecture_id).single().execute()
    mat = mat_res.data

    if req.depth == "cooked" and mat.get("notes_cooked"):
        return {"notes": mat["notes_cooked"], "depth": "cooked"}
    if req.depth == "ontop" and mat.get("notes_ontop"):
        return {"notes": mat["notes_ontop"], "depth": "ontop"}
    if req.depth == "meh" and mat.get("notes"):
        return {"notes": mat["notes"], "depth": "meh"}

    lec_res = sb.table("lectures").select("raw_transcript, title").eq("id", lecture_id).single().execute()
    lecture = lec_res.data
    result = generate_title_and_notes(lecture["raw_transcript"], req.depth)
    notes = result.get("notes", "")

    if req.depth == "cooked":
        sb.table("study_materials").update({"notes_cooked": notes}).eq("lecture_id", lecture_id).execute()
    elif req.depth == "ontop":
        sb.table("study_materials").update({"notes_ontop": notes}).eq("lecture_id", lecture_id).execute()
    else:
        sb.table("study_materials").update({"notes": notes, "notes_depth": "meh"}).eq("lecture_id", lecture_id).execute()

    return {"notes": notes, "depth": req.depth}
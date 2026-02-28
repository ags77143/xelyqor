from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from pydantic import BaseModel
from typing import Optional
from db import get_supabase
from extractor import extract_youtube_transcript, extract_pdf_text, extract_pptx_text
from ai import generate_title_summary_notes, generate_glossary

router = APIRouter()


@router.get("/")
async def list_lectures(user_id: str, subject_id: Optional[str] = None):
    sb = get_supabase()
    q = sb.table("lectures").select("*, subjects(name, colour)").eq("user_id", user_id)
    if subject_id:
        q = q.eq("subject_id", subject_id)
    res = q.order("created_at", desc=True).execute()
    return res.data


@router.get("/{lecture_id}")
async def get_lecture(lecture_id: str):
    sb = get_supabase()
    res = sb.table("lectures").select("*, subjects(name, colour)").eq("id", lecture_id).single().execute()
    return res.data


@router.post("/from-youtube")
async def create_from_youtube(
    user_id: str = Form(...),
    subject_id: str = Form(...),
    youtube_url: str = Form(...),
    lecture_name: Optional[str] = Form(None),
):
    sb = get_supabase()
    try:
        transcript = extract_youtube_transcript(youtube_url)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return await _create_lecture_with_materials(
        sb, user_id, subject_id, transcript, "youtube", youtube_url, lecture_name
    )


@router.post("/from-transcript")
async def create_from_transcript(
    user_id: str = Form(...),
    subject_id: str = Form(...),
    transcript: str = Form(...),
    lecture_name: Optional[str] = Form(None),
):
    sb = get_supabase()
    clean = transcript.strip()
    if not clean:
        raise HTTPException(status_code=400, detail="Transcript is empty.")
    if len(clean) < 100:
        raise HTTPException(status_code=400, detail="Transcript is too short — paste more text.")
    return await _create_lecture_with_materials(
        sb, user_id, subject_id, clean, "transcript", "", lecture_name
    )
    sb = get_supabase()
    return await _create_lecture_with_materials(
        sb, user_id, subject_id, transcript, "transcript", "", lecture_name
    )


@router.post("/from-file")
async def create_from_file(
    user_id: str = Form(...),
    subject_id: str = Form(...),
    lecture_name: Optional[str] = Form(None),
    file: UploadFile = File(...),
):
    sb = get_supabase()
    file_bytes = await file.read()
    filename = file.filename.lower()

    if filename.endswith(".pdf"):
        transcript = extract_pdf_text(file_bytes)
        source_type = "pdf"
    elif filename.endswith(".pptx"):
        transcript = extract_pptx_text(file_bytes)
        source_type = "pptx"
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use PDF or PPTX.")

    return await _create_lecture_with_materials(
        sb, user_id, subject_id, transcript, source_type, file.filename, lecture_name
    )


async def _create_lecture_with_materials(sb, user_id, subject_id, transcript, source_type, source_ref, lecture_name):
    # Call 1: title + summary + notes
    result1 = generate_title_summary_notes(transcript)
    title = lecture_name or result1.get("title", "Untitled Lecture")
    summary = result1.get("summary", "")
    notes = result1.get("notes", "")

    # Call 2: glossary
    glossary = generate_glossary(transcript, title)

    # Save lecture
    lec_res = sb.table("lectures").insert({
        "user_id": user_id,
        "subject_id": subject_id,
        "title": title,
        "source_type": source_type,
        "source_ref": source_ref,
        "raw_transcript": transcript,
    }).execute()
    lecture = lec_res.data[0]
    lecture_id = lecture["id"]

    # Save materials
    import json
    sb.table("study_materials").insert({
        "lecture_id": lecture_id,
        "user_id": user_id,
        "summary": summary,
        "notes": notes,
        "glossary": json.dumps(glossary),
        "quiz": None,
        "flashcards": None,
    }).execute()

    return {"lecture": lecture, "title": title}


@router.patch("/{lecture_id}/move")
async def move_lecture(lecture_id: str, subject_id: str):
    sb = get_supabase()
    sb.table("lectures").update({"subject_id": subject_id}).eq("id", lecture_id).execute()
    return {"ok": True}


@router.delete("/{lecture_id}")
async def delete_lecture(lecture_id: str):
    sb = get_supabase()
    sb.table("study_materials").delete().eq("lecture_id", lecture_id).execute()
    sb.table("lectures").delete().eq("id", lecture_id).execute()
    return {"ok": True}

@router.post("/from-recording")
async def create_from_recording(
    user_id: str = Form(...),
    subject_id: str = Form(...),
    lecture_name: Optional[str] = Form(None),
    audio: UploadFile = File(...),
):
    sb = get_supabase()
    
    # Save audio temporarily
    audio_bytes = await audio.read()
    
    import tempfile
    import os
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name
    
    try:
        # Transcribe with Groq Whisper
        from groq import Groq
        client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))
        with open(tmp_path, "rb") as f:
            transcription = client.audio.transcriptions.create(
                file=(tmp_path, f.read()),
                model="whisper-large-v3",
            )
        transcript = transcription.text
    finally:
        os.unlink(tmp_path)
    
    return await _create_lecture_with_materials(
        sb, user_id, subject_id, transcript, "recording", "", lecture_name
    )

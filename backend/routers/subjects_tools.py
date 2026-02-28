from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
from groq import Groq
from db import get_supabase
import os
import json
import re

router = APIRouter()
client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))

def _parse_json(content: str):
    content = re.sub(r'^```(?:json)?\s*', '', content.strip())
    content = re.sub(r'\s*```$', '', content.strip())
    try:
        return json.loads(content)
    except:
        match = re.search(r'\{[\s\S]*\}', content)
        if match:
            try:
                return json.loads(match.group())
            except:
                pass
        raise ValueError("Could not parse JSON")

class SummaryRequest(BaseModel):
    subject_name: str
    lecture_ids: List[str]

@router.post("/summary")
async def generate_course_summary(req: SummaryRequest):
    sb = get_supabase()
    
    all_notes = []
    for lid in req.lecture_ids:
        mat = sb.table("study_materials").select("notes").eq("lecture_id", lid).single().execute()
        if mat.data and mat.data.get("notes"):
            all_notes.append(mat.data["notes"])
    
    if not all_notes:
        raise HTTPException(status_code=400, detail="No notes found for these lectures.")
    
    combined = "\n\n---\n\n".join(all_notes)[:12000]
    
    system = """You are an expert academic tutor. Respond ONLY with valid JSON. No markdown, no code fences."""

    prompt = f"""Analyse all the notes from the subject "{req.subject_name}" and generate a course summary.

Respond with this exact JSON structure:
{{
  "overview": "A 4-6 sentence overview of what this entire subject covers and its key themes",
  "checklist": [
    "Understand concept X and how it relates to Y",
    "Be able to explain Z with examples",
    "Know the difference between A and B"
  ],
  "themes": "## Theme 1\\n\\nExplanation...\\n\\n## Theme 2\\n\\nExplanation..."
}}

The checklist should have 15-25 specific actionable items a student needs to know for an exam.
Themes should cover 3-5 major recurring themes across all lectures in markdown.

ALL LECTURE NOTES:
{combined}

Raw JSON only:"""

    resp = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        max_tokens=4096,
        temperature=0.3,
    )
    return _parse_json(resp.choices[0].message.content.strip())


class StudyPlanRequest(BaseModel):
    subject_name: str
    lecture_ids: List[str]
    exam_date: str

@router.post("/study-plan")
async def generate_study_plan(req: StudyPlanRequest):
    sb = get_supabase()
    
    lectures_data = []
    for lid in req.lecture_ids:
        lec = sb.table("lectures").select("title").eq("id", lid).single().execute()
        mat = sb.table("study_materials").select("notes").eq("lecture_id", lid).single().execute()
        if lec.data:
            lectures_data.append({
                "title": lec.data["title"],
                "notes_length": len(mat.data.get("notes", "")) if mat.data else 0
            })
    
    if not lectures_data:
        raise HTTPException(status_code=400, detail="No lectures found.")

    from datetime import date
    today = date.today().isoformat()

    system = """You are an expert study coach. Respond ONLY with valid JSON. No markdown, no code fences."""

    prompt = f"""Create a detailed study plan for the subject "{req.subject_name}".

Today's date: {today}
Exam date: {req.exam_date}
Lectures to cover:
{json.dumps([l["title"] for l in lectures_data], indent=2)}

Respond with this exact JSON structure:
{{
  "days_until_exam": 14,
  "overview": "Brief overview of the study strategy",
  "schedule": [
    {{
      "day": 1,
      "date": "2024-01-01",
      "focus": "Topic or lecture title",
      "tasks": ["Task 1", "Task 2", "Task 3"],
      "duration": "2 hours"
    }}
  ],
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}}

Make the schedule realistic and spaced well. Include revision days closer to the exam.
Each day should have 3-5 specific tasks. Last 2-3 days should be pure revision.

Raw JSON only:"""

    resp = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        max_tokens=4096,
        temperature=0.3,
    )
    return _parse_json(resp.choices[0].message.content.strip())


@router.post("/practice-exam")
async def generate_practice_exam(
    subject_name: str = Form(...),
    lecture_ids: str = Form(...),
    past_paper: Optional[UploadFile] = File(None),
):
    sb = get_supabase()
    ids = json.loads(lecture_ids)

    # Get all notes
    all_notes = []
    for lid in ids:
        mat = sb.table("study_materials").select("notes").eq("lecture_id", lid).single().execute()
        if mat.data and mat.data.get("notes"):
            all_notes.append(mat.data["notes"])

    if not all_notes:
        raise HTTPException(status_code=400, detail="No notes found.")

    combined = "\n\n---\n\n".join(all_notes)[:8000]

    # Extract past paper text if uploaded
    past_paper_text = ""
    if past_paper:
        file_bytes = await past_paper.read()
        filename = past_paper.filename.lower()
        if filename.endswith(".pdf"):
            try:
                import io
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(file_bytes))
                for page in reader.pages:
                    past_paper_text += page.extract_text() or ""
                past_paper_text = past_paper_text[:3000]
            except:
                pass

    style_context = ""
    if past_paper_text:
        style_context = f"""
Here is a past exam paper from this subject. Match its style, format, question types, and difficulty level:

PAST PAPER:
{past_paper_text}
"""

    system = """You are an expert academic exam writer. Respond ONLY with valid JSON. No markdown, no code fences."""

    prompt = f"""Generate a complete practice exam for the subject "{subject_name}".

{style_context}

The exam should have:
- 3 sections: Multiple Choice (10 questions), Short Answer (4 questions), Extended Response (2 questions)
- Cover all major topics from the lecture notes
- Realistic difficulty for a university exam
- Include marks for each question

Respond with this exact JSON structure:
{{
  "title": "Practice Exam — Subject Name",
  "total_marks": 70,
  "time_allowed": "2 hours",
  "instructions": "Answer all questions. Show all working for calculation questions.",
  "sections": [
    {{
      "name": "Section A: Multiple Choice",
      "marks": 20,
      "instructions": "Circle the best answer. 2 marks each.",
      "questions": [
        {{
          "number": 1,
          "question": "Question text here?",
          "marks": 2,
          "type": "mcq",
          "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"]
        }}
      ]
    }},
    {{
      "name": "Section B: Short Answer",
      "marks": 30,
      "instructions": "Answer all questions.",
      "questions": [
        {{
          "number": 11,
          "question": "Question text here?",
          "marks": 8,
          "type": "short",
          "options": []
        }}
      ]
    }},
    {{
      "name": "Section C: Extended Response",
      "marks": 20,
      "instructions": "Write detailed responses.",
      "questions": [
        {{
          "number": 15,
          "question": "Question text here?",
          "marks": 10,
          "type": "extended",
          "options": []
        }}
      ]
    }}
  ]
}}

LECTURE NOTES:
{combined}

Raw JSON only:"""

    resp = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        max_tokens=4096,
        temperature=0.4,
    )
    return _parse_json(resp.choices[0].message.content.strip())
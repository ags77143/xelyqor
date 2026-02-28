from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from groq import Groq
import os
import base64
import io
import re
import json

router = APIRouter()
client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))

class SolveRequest(BaseModel):
    question: str
    subject: Optional[str] = None

@router.post("/")
async def solve_question(req: SolveRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question is empty.")

    subject_context = f"This is a {req.subject} question." if req.subject else ""

    system = """You are an expert tutor solving academic questions with full working.
Show every step clearly. Explain WHY at each step, not just what.
Format your response with:
- ## Solution
- Numbered steps with clear headings
- ## Key Concepts Used
- ## Common Mistakes to Avoid
Use markdown formatting throughout."""

    prompt = f"""{subject_context}

Solve this question with complete step by step working:

{req.question}

Show all working, explain each step, and make it easy for a student to follow."""

    resp = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        max_tokens=4096,
        temperature=0.3,
    )
    return {"solution": resp.choices[0].message.content.strip()}


@router.post("/with-file")
async def solve_with_file(
    question: str = Form(default=""),
    subject: str = Form(default=""),
    file: UploadFile = File(...),
):
    file_bytes = await file.read()
    filename = file.filename.lower()
    subject_context = f"This is a {subject} question." if subject else ""

    system = """You are an expert tutor solving academic questions with full working.
Show every step clearly. Explain WHY at each step, not just what.
Format your response with:
- ## Solution
- Numbered steps with clear headings  
- ## Key Concepts Used
- ## Common Mistakes to Avoid
Use markdown formatting throughout."""

    # Handle PDF
    if filename.endswith(".pdf"):
        pdf_text = ""
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                pdf_text += page.extract_text() or ""
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not read PDF: {str(e)}")

        if not pdf_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF. Try a non-scanned PDF.")

        extra = f"\n\nAdditional instruction from student: {question.strip()}" if question.strip() else ""

        prompt = f"""{subject_context}

Here is the content of an uploaded document containing questions:

{pdf_text[:6000]}

{extra if extra else "Identify and solve all questions in this document with full step by step working."}

Show all working clearly for each question."""

        resp = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}],
            max_tokens=4096,
            temperature=0.3,
        )
        return {"solution": resp.choices[0].message.content.strip()}

    # Handle image
    else:
        b64 = base64.b64encode(file_bytes).decode("utf-8")
        media_type = file.content_type or "image/jpeg"

        extra = f"\n\nAdditional instruction from student: {question.strip()}" if question.strip() else ""

        prompt = f"""{subject_context}

Look at the question(s) in the image and solve with complete step by step working.
{extra if extra else "Solve all visible questions with full working."}

Show all working, explain each step."""

        resp = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "system", "content": system}, {"role": "user", "content": [
                {"type": "image_url", "image_url": {"url": f"data:{media_type};base64,{b64}"}},
                {"type": "text", "text": prompt}
            ]}],
            max_tokens=4096,
            temperature=0.3,
        )
        return {"solution": resp.choices[0].message.content.strip()}
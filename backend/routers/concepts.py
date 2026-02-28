from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from groq import Groq
import os
import json
import re

router = APIRouter()
client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))

class ConceptRequest(BaseModel):
    lecture_id: str
    notes: str
    title: str

def _parse_json(content: str):
    content = re.sub(r'^```(?:json)?\s*', '', content.strip())
    content = re.sub(r'\s*```$', '', content.strip())
    try:
        return json.loads(content)
    except:
        match = re.search(r'\{[\s\S]*\}', content)
        if match:
            return json.loads(match.group())
        raise ValueError("Could not parse JSON")

@router.post("/")
async def generate_concept_map(req: ConceptRequest):
    system = """You are an expert at analysing academic content and identifying concept relationships.
Respond ONLY with valid JSON. No markdown, no explanation, just raw JSON."""

    prompt = f"""Analyse this lecture titled "{req.title}" and generate a concept map.

Extract 8-15 key concepts and their relationships.

Respond with this exact JSON structure:
{{
  "nodes": [
    {{"id": "1", "label": "Main Concept", "type": "central"}},
    {{"id": "2", "label": "Supporting Concept", "type": "major"}},
    {{"id": "3", "label": "Detail", "type": "minor"}}
  ],
  "edges": [
    {{"source": "1", "target": "2", "label": "relates to"}},
    {{"source": "2", "target": "3", "label": "includes"}}
  ]
}}

Types: "central" (1-2 main concepts), "major" (key supporting concepts), "minor" (details/examples)
Edge labels should be short relationship descriptions like: "leads to", "is a type of", "requires", "contrasts with", "includes", "defines"

NOTES:
{req.notes[:4000]}

Raw JSON only:"""

    resp = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt}
        ],
        max_tokens=2000,
        temperature=0.3,
    )

    content = resp.choices[0].message.content.strip()
    data = _parse_json(content)
    return data
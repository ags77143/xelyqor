import os
import re
import tempfile
from typing import Optional


def extract_youtube_transcript(url: str) -> str:
    video_id = _extract_video_id(url)
    if not video_id:
        raise ValueError("Could not extract YouTube video ID from URL.")

    try:
        from youtube_transcript_api import YouTubeTranscriptApi

        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

        transcript = None
        try:
            transcript = transcript_list.find_manually_created_transcript(['en'])
        except Exception:
            pass

        if not transcript:
            try:
                transcript = transcript_list.find_generated_transcript(['en'])
            except Exception:
                pass

        if not transcript:
            for t in transcript_list:
                transcript = t
                break

        if transcript:
            fetched = transcript.fetch()
            return " ".join(entry["text"] for entry in fetched)

    except Exception as e:
        raise ValueError(
            f"Could not get transcript. Error: {str(e)}\n"
            f"Please use the 'Paste Transcript' option instead.\n"
            f"Get a transcript from: https://tactiq.io or https://downsub.com"
        )

    raise ValueError("No transcript found. Please paste the transcript manually.")


def _extract_video_id(url: str) -> Optional[str]:
    patterns = [r'(?:v=|/v/|youtu\.be/|/embed/)([a-zA-Z0-9_-]{11})']
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return None


def extract_pdf_text(file_bytes: bytes) -> str:
    import io
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text


def extract_pptx_text(file_bytes: bytes) -> str:
    import io
    from pptx import Presentation
    prs = Presentation(io.BytesIO(file_bytes))
    text_parts = []
    for slide in prs.slides:
        for shape in slide.shapes:
            if hasattr(shape, "text") and shape.text.strip():
                text_parts.append(shape.text)
    return "\n\n".join(text_parts)
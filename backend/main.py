from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

from routers import lectures, subjects, materials, chat, solver, concepts, subjects_tools, settings

app = FastAPI(title="Xelyqor API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(subjects.router, prefix="/subjects", tags=["subjects"])
app.include_router(lectures.router, prefix="/lectures", tags=["lectures"])
app.include_router(materials.router, prefix="/materials", tags=["materials"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(solver.router, prefix="/solver", tags=["solver"])
app.include_router(concepts.router, prefix="/concepts", tags=["concepts"])
app.include_router(subjects_tools.router, prefix="/subjects", tags=["subjects-tools"])
app.include_router(settings.router, prefix="/settings", tags=["settings"])

@app.get("/health")
async def health():
    return {"status": "ok"}

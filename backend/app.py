# pyre-strict
import hashlib
import os
import secrets
import string
from datetime import datetime, timedelta
from pathlib import Path
from typing import Annotated

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, UploadFile
from fastapi.templating import Jinja2Templates
from sqlmodel import SQLModel, Session, create_engine
from starlette import status
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request
from starlette.responses import FileResponse, HTMLResponse, JSONResponse
from starlette.staticfiles import StaticFiles

from .models import PastedAudio

load_dotenv()
PROJECT_BASE = os.environ.get("PROJECT_BASE") or Path(__file__).parent.parent

BLOB_DIR = os.environ.get("BLOB_DIR")
assert BLOB_DIR is not None
BLOB_DIR = Path(BLOB_DIR)

DATABASE_URI = os.environ.get("DATABASE_URI")
assert DATABASE_URI is not None
connect_args = {"check_same_thread": False}
engine = create_engine(DATABASE_URI, connect_args=connect_args)

FASTAPI_SECRET_KEY = os.environ.get("FASTAPI_SECRET_KEY")
assert FASTAPI_SECRET_KEY


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]

app = FastAPI()

app.add_middleware(SessionMiddleware, secret_key=FASTAPI_SECRET_KEY)
templates = Jinja2Templates(directory=PROJECT_BASE / "dist" / "templates")
static = StaticFiles(directory=PROJECT_BASE / "dist" / "assets")
app.mount("/assets", static, name="static")


@app.on_event("startup")
def on_startup():
    BLOB_DIR.mkdir(exist_ok=True)
    create_db_and_tables()


@app.get("/")
async def index(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request=request, name="index.html")


@app.post("/upload")
async def upload(
    request: Request, audio: UploadFile, session: SessionDep
) -> JSONResponse:
    # validate the file type
    assert audio.content_type == "audio/webm"
    assert audio.size <= 1024 * 1024  # 1 MB
    audio.file.seek(0)

    # validate that the file is no longer than 1 minute
    # TODO check file duration

    audio.file.seek(0)

    content: bytes = audio.file.read()
    # calculate the hash of the file
    key = hashlib.sha256(content).hexdigest()[:8]
    filename = key + ".webm"

    blob_path = BLOB_DIR / filename

    # save the file to disk
    with open(BLOB_DIR / filename, "wb") as f:
        f.write(content)

    # create the database record
    pasted_audio = PastedAudio(key=key, blob_path=str(blob_path))
    pasted_audio.creation_time = datetime.now()

    user_id = request.session.get("user_id")
    if user_id is None:
        # set a session cookie if they haven't visited before
        characters = string.ascii_letters + string.digits
        user_id = "".join(secrets.choice(characters) for _ in range(32))
        request.session["user_id"] = user_id

    pasted_audio.created_by = user_id
    pasted_audio.expiration_time = datetime.now() + timedelta(hours=1)
    session.add(pasted_audio)
    session.commit()

    return JSONResponse({"key": key}, status_code=status.HTTP_201_CREATED)


def check_exists_and_accessible(key: str, session: Session) -> PastedAudio:
    pasted: PastedAudio = session.get(PastedAudio, key)  # type: ignore
    if pasted is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    if pasted.soft_deleted:
        raise HTTPException(status_code=status.HTTP_410_GONE)

    if pasted.expiration_time is not None and pasted.expiration_time < datetime.now():
        pasted.soft_deleted = True
        session.add(pasted)
        session.commit()
        raise HTTPException(status_code=status.HTTP_410_GONE)

    blob_path = Path(pasted.blob_path)
    if not blob_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if not BLOB_DIR in blob_path.parents:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return pasted


@app.get("/user")
async def user(request: Request) -> JSONResponse:
    return JSONResponse(request.session)


@app.get("/p/{key}")
async def play(request: Request, key: str, session: SessionDep) -> HTMLResponse:
    pasted = check_exists_and_accessible(key, session)
    return templates.TemplateResponse(
        request=request,
        name="play.html",
        context={
            "key": key,
            "pasted": pasted,
            "audio_url": request.url_for("audio", key=key),
        },
    )


@app.get("/p/{key}/audio")
async def audio(request: Request, key: str, session: SessionDep) -> FileResponse:
    # TODO two database queries per request...
    pasted = check_exists_and_accessible(key, session)  # check exists
    return FileResponse(pasted.blob_path, media_type="audio/webm")


def main():
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
    )


if __name__ == "__main__":
    main()

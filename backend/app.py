# pyre-strict
import hashlib
import secrets
import string
import subprocess
from datetime import datetime, timedelta
from io import BytesIO
from operator import attrgetter, methodcaller
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query, UploadFile
from fastapi.templating import Jinja2Templates
from funcy import silent
from sqlmodel import SQLModel, Session, create_engine, select
from starlette import status
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request
from starlette.responses import FileResponse, HTMLResponse, JSONResponse
from starlette.staticfiles import StaticFiles
from streamerate import stream

from .models import PastedAudio
from .vars import BLOB_DIR, DATABASE_URI, FASTAPI_SECRET_KEY, PROJECT_BASE

connect_args = {"check_same_thread": False}
engine = create_engine(DATABASE_URI, connect_args=connect_args)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]

app = FastAPI()

app.add_middleware(SessionMiddleware, secret_key=FASTAPI_SECRET_KEY)  # type: ignore
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


def convert_file_format(audio: UploadFile) -> BytesIO:
    if audio.content_type != "audio/webm":
        raise NotImplementedError("Only webm files are currently supported")

    audio.file.seek(0)

    # ffmpeg -i pipe:0 -vn -c:a pcm_s16le -ar 48000 -f wav pipe:1
    cmd = [
        "ffmpeg",
        "-i",
        "pipe:0",
        "-vn",
        "-c:a",
        "pcm_s16le",
        "-ar",
        "48000",
        "-f",
        "wav",
        "pipe:1",
    ]
    process = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    wav_content, stderr = process.communicate(audio.file.read())
    if process.returncode != 0:
        raise RuntimeError(stderr.decode("utf-8"))

    wav_file = BytesIO(wav_content)
    wav_file.seek(0)
    return wav_file


def get_or_create_user_id(request: Request) -> str:
    user_id = request.session.get("user_id")
    if user_id is None:
        # set a session cookie if they haven't visited before
        characters = string.ascii_letters + string.digits
        user_id = "".join(secrets.choice(characters) for _ in range(32))
        request.session["user_id"] = user_id

    return user_id


@app.post("/upload")
async def upload(
    request: Request, audio: UploadFile, session: SessionDep
) -> JSONResponse:
    # validate the file type
    assert audio.content_type == "audio/webm"
    assert audio.size <= 1024 * 1024  # 1 MB
    audio.file.seek(0)

    # Prepare the file format, including potentially repairing broken
    # webm headers
    wav_file: BytesIO = convert_file_format(audio)

    # calculate the hash of the converted WAV file
    content = wav_file.read()
    wav_file.seek(0)
    key = hashlib.sha256(content).hexdigest()[:8]

    filename = key + ".wav"
    blob_path = BLOB_DIR / filename

    # save the file to disk
    with open(BLOB_DIR / filename, "wb") as f:
        f.write(content)

    # create the database record
    pasted_audio = PastedAudio(key=key, blob_path=str(blob_path))
    pasted_audio.creation_time = datetime.now()

    pasted_audio.created_by = get_or_create_user_id(request)
    pasted_audio.expiration_time = datetime.now() + timedelta(days=30)
    session.add(pasted_audio)
    session.commit()

    return JSONResponse({"key": key}, status_code=status.HTTP_201_CREATED)


@app.get("/user")
async def user(request: Request) -> JSONResponse:
    return JSONResponse(request.session)


@app.get("/mypastes")
async def mypastes(request: Request, session: SessionDep) -> list[dict[str, str]]:
    user_id = request.session.get("user_id")
    if user_id is None:
        return []
    pastes = session.exec(
        select(PastedAudio)
        .where(PastedAudio.created_by == user_id)
        .order_by(PastedAudio.creation_time.desc())  # type: ignore
    ).all()
    pastes = stream(pastes).filter(silent(methodcaller("validate_access"))).toList()

    d = [{"key": p.key, "url": str(request.url_for("play", key=p.key))} for p in pastes]
    return d


@app.get("/p/{key}")
async def play(request: Request, key: str, session: SessionDep) -> HTMLResponse:
    pasted: PastedAudio = session.get(PastedAudio, key)  # type: ignore
    if pasted is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    pasted.validate_access()
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
    pasted: PastedAudio = session.get(PastedAudio, key)  # type: ignore
    if pasted is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    pasted.validate_access()
    return FileResponse(pasted.blob_path)  # media type?


@app.get("/validate")
async def validate(
    keys: list[str] = Query(...), session: Session = Depends(get_session)
) -> list[str]:
    pastes = session.exec(select(PastedAudio).where(PastedAudio.key.in_(keys))).all()
    return (
        stream(pastes)
        .filter(silent(methodcaller("validate_access")))
        .map(attrgetter("key"))
        .toList()
    )


@app.get("/privacy")
async def privacy(request: Request) -> HTMLResponse:
    return templates.TemplateResponse("privacy.html", {"request": request})


def main():
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
    )


if __name__ == "__main__":
    main()

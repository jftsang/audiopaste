import hashlib
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.templating import Jinja2Templates
from starlette import status
from starlette.requests import Request
from starlette.responses import FileResponse, HTMLResponse, JSONResponse
from starlette.staticfiles import StaticFiles

app = FastAPI()

templates = Jinja2Templates(directory="templates")

app.mount("/static", StaticFiles(directory="static"), name="static")

data_dir = Path("data")
data_dir.mkdir(exist_ok=True)


@app.get("/")
async def index(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request=request, name="index.html")


@app.post("/upload")
async def upload(audio: UploadFile) -> JSONResponse:
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

    # save the file to disk
    with open(data_dir / filename, "wb") as f:
        f.write(content)

    return JSONResponse({"key": key}, status_code=status.HTTP_201_CREATED)


@app.get("/p/{key}")
async def play(request: Request, key: str) -> HTMLResponse:
    file_path = data_dir / (key + ".webm")
    if not (file_path).exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return templates.TemplateResponse(
        request=request,
        name="play.html",
        context={"key": key, "audio_url": request.url_for("audio", key=key)},
    )


@app.get("/p/{key}/audio")
async def audio(request: Request, key: str) -> FileResponse:
    file_path = data_dir / (key + ".webm")
    if not (file_path).exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return FileResponse(file_path, media_type="audio/webm")


def main():
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
    )


if __name__ == "__main__":
    main()

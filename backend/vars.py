import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()
PROJECT_BASE = os.environ.get("PROJECT_BASE") or Path(__file__).parent.parent

BLOB_DIR = os.environ.get("BLOB_DIR")
assert BLOB_DIR is not None
BLOB_DIR = Path(BLOB_DIR)

DATABASE_URI = os.environ.get("DATABASE_URI")
assert DATABASE_URI is not None

FASTAPI_SECRET_KEY = os.environ.get("FASTAPI_SECRET_KEY")
assert FASTAPI_SECRET_KEY

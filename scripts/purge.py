from datetime import datetime
from pathlib import Path

from sqlmodel import Session, create_engine, select

from backend.models import PastedAudio
from backend.vars import BLOB_DIR, DATABASE_URI


def remove_expired_and_deleted():
    connect_args = {"check_same_thread": False}
    engine = create_engine(DATABASE_URI, connect_args=connect_args)
    with Session(engine) as session:
        expired = session.exec(
            select(PastedAudio).where(
                (PastedAudio.expiration_time < datetime.now())
                | (PastedAudio.soft_deleted)
            )
        ).all()

        for p in expired:
            print(p.key)
            session.delete(p)

        session.commit()


def remove_orphaned_files():
    connect_args = {"check_same_thread": False}
    engine = create_engine(DATABASE_URI, connect_args=connect_args)
    with Session(engine) as session:
        claimed_files: set[str] = set(session.exec(select(PastedAudio.blob_path)).all())

    f: Path
    for f in BLOB_DIR.iterdir():
        if not f.name.endswith(".webm"):
            continue
        if str(f) not in claimed_files:  # both are relative paths
            print(f)
            f.unlink()


if __name__ == "__main__":
    remove_expired_and_deleted()
    remove_orphaned_files()

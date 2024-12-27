# pyre-strict
from datetime import datetime
from pathlib import Path
from typing import Self

from sqlmodel import Field, SQLModel
from starlette import status
from starlette.exceptions import HTTPException

from .vars import (
    BLOB_DIR,
)


class PastedAudio(SQLModel, table=True):
    key: str = Field(primary_key=True)
    blob_path: str = Field(default=None)
    creation_time: datetime = Field(default_factory=datetime.now)
    created_by: str = Field(default=None)
    expiration_time: datetime = Field(default=None)
    soft_deleted: bool = Field(default=False)

    def validate_access(self) -> Self:
        if self.soft_deleted:
            raise HTTPException(status_code=status.HTTP_410_GONE)

        if self.expiration_time is not None and self.expiration_time < datetime.now():
            # TODO update the database to soft delete me
            raise HTTPException(status_code=status.HTTP_410_GONE)

        blob_path = Path(self.blob_path)
        if not blob_path.is_file():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
        if not BLOB_DIR in blob_path.parents:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

        return self

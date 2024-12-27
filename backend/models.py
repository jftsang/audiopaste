# pyre-strict
from datetime import datetime

from sqlmodel import Field, SQLModel


class PastedAudio(SQLModel, table=True):
    key: str = Field(primary_key=True)
    blob_path: str = Field(default=None)
    creation_time: datetime = Field(default_factory=datetime.now)
    created_by: str = Field(default=None)
    expiration_time: datetime = Field(default=None)
    soft_deleted: bool = Field(default=False)

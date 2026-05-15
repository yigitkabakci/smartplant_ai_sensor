import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from models import Base

logger = logging.getLogger(__name__)

_engine = None
SessionLocal = None


def init_db(db_path: str):
    global _engine, SessionLocal

    _engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    SessionLocal = sessionmaker(bind=_engine, autocommit=False, autoflush=False)
    Base.metadata.drop_all(bind=_engine)
    Base.metadata.create_all(bind=_engine)
    logger.info("Veritabanı başlatıldı: %s", db_path)


def get_db():
    if SessionLocal is None:
        raise RuntimeError("Veritabanı henüz başlatılmadı. init_db() çağrılmamış.")
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

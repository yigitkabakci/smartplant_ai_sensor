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
    Base.metadata.create_all(bind=_engine)
    _migrate_plant_library(_engine)
    _migrate_leaf_analyses(_engine)
    logger.info("Veritabanı başlatıldı: %s", db_path)


def _migrate_plant_library(engine):
    """Mevcut plant_library tablosuna yeni kolonları ekler (varsa atlar)."""
    new_cols = [
        ("min_humidity",  "REAL"),
        ("max_humidity",  "REAL"),
        ("min_light_lux", "REAL"),
        ("max_light_lux", "REAL"),
    ]
    with engine.connect() as conn:
        existing = {row[1] for row in conn.execute(
            __import__("sqlalchemy").text("PRAGMA table_info(plant_library)")
        )}
        for col, col_type in new_cols:
            if col not in existing:
                conn.execute(__import__("sqlalchemy").text(
                    f"ALTER TABLE plant_library ADD COLUMN {col} {col_type}"
                ))
                logger.info("Kolon eklendi: plant_library.%s", col)


def _migrate_leaf_analyses(engine):
    """leaf_analyses tablosuna plant_id ve plant_name kolonlarını ekler."""
    new_cols = [
        ("plant_id",   "INTEGER"),
        ("plant_name", "TEXT"),
    ]
    with engine.connect() as conn:
        existing = {row[1] for row in conn.execute(
            __import__("sqlalchemy").text("PRAGMA table_info(leaf_analyses)")
        )}
        for col, col_type in new_cols:
            if col not in existing:
                conn.execute(__import__("sqlalchemy").text(
                    f"ALTER TABLE leaf_analyses ADD COLUMN {col} {col_type}"
                ))
                logger.info("Kolon eklendi: leaf_analyses.%s", col)


def get_db():
    if SessionLocal is None:
        raise RuntimeError("Veritabanı henüz başlatılmadı. init_db() çağrılmamış.")
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

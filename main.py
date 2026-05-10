import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from config import Config
from services import ml_service, database
from routers import main as main_router, leaf_disease, sensor, devices

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

cfg = Config()


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(cfg.UPLOAD_FOLDER, exist_ok=True)
    database.init_db(cfg.DATABASE_PATH)
    ml_service.load_leaf_model()
    logger.info("Uygulama başlatıldı.")
    yield
    logger.info("Uygulama kapatılıyor.")


app = FastAPI(
    title="Smart Plant Monitoring System",
    description="AI destekli bitki hastalığı tespiti ve sensör izleme platformu.",
    version="2.0.0",
    lifespan=lifespan,
)

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(main_router.router)
app.include_router(leaf_disease.router)
app.include_router(sensor.router)
app.include_router(devices.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=cfg.PORT, reload=cfg.DEBUG)

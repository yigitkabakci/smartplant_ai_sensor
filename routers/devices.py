import logging
from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from services.database import get_db
from models import Device, PlantLibrary
from schemas import (
    DeviceCreate, DeviceResponse,
    PlantLibraryCreate, PlantLibraryResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Devices & Plant Library"])


@router.post("/devices", response_model=DeviceResponse, status_code=201)
async def register_device(payload: DeviceCreate, db: Session = Depends(get_db)):
    existing = db.query(Device).filter(Device.device_mac == payload.device_mac).first()
    if existing:
        existing.plant_name = payload.plant_name
        existing.plant_type_id = payload.plant_type_id
        existing.last_sync = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing

    device = Device(
        device_mac=payload.device_mac,
        plant_name=payload.plant_name,
        plant_type_id=payload.plant_type_id,
        last_sync=datetime.utcnow(),
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


@router.get("/devices", response_model=List[DeviceResponse])
async def list_devices(db: Session = Depends(get_db)):
    return db.query(Device).all()


@router.get("/devices/{device_mac}", response_model=DeviceResponse)
async def get_device(device_mac: str, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.device_mac == device_mac).first()
    if not device:
        raise HTTPException(status_code=404, detail="Cihaz bulunamadı.")
    return device


@router.post("/plants", response_model=PlantLibraryResponse, status_code=201)
async def create_plant(payload: PlantLibraryCreate, db: Session = Depends(get_db)):
    existing = db.query(PlantLibrary).filter(PlantLibrary.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Bu bitki zaten kayıtlı.")
    plant = PlantLibrary(**payload.model_dump())
    db.add(plant)
    db.commit()
    db.refresh(plant)
    return plant


@router.get("/plants", response_model=List[PlantLibraryResponse])
async def list_plants(db: Session = Depends(get_db)):
    return db.query(PlantLibrary).all()


@router.get("/plants/{plant_id}", response_model=PlantLibraryResponse)
async def get_plant(plant_id: int, db: Session = Depends(get_db)):
    plant = db.query(PlantLibrary).filter(PlantLibrary.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Bitki bulunamadı.")
    return plant

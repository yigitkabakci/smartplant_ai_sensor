from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import func
from services.database import get_db
from models import User, UserRole, SensorReading, Alert
from dependencies import require_admin
from datetime import datetime, timedelta

router = APIRouter(prefix="/admin", tags=["Admin"])
templates = Jinja2Templates(directory="templates")


@router.get("", response_class=HTMLResponse)
async def admin_dashboard(
    request: Request,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    total_users = db.query(func.count(User.id)).scalar()
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    active_today = db.query(func.count(User.id)).filter(User.last_login >= today).scalar()
    week_ago = datetime.utcnow() - timedelta(days=7)
    new_week = db.query(func.count(User.id)).filter(User.created_at >= week_ago).scalar()
    recent_users = db.query(User).order_by(User.created_at.desc()).limit(5).all()
    return templates.TemplateResponse(
        request,
        "admin/dashboard.html",
        {
            "current_user": admin,
            "total_users": total_users,
            "active_today": active_today,
            "new_week": new_week,
            "recent_users": recent_users,
        },
    )


@router.get("/users", response_class=HTMLResponse)
async def admin_users(
    request: Request,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return templates.TemplateResponse(
        request, "admin/users.html", {"current_user": admin, "users": users}
    )


@router.post("/users/{user_id}/ban")
async def ban_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return JSONResponse({"error": "Kullanıcı bulunamadı"}, status_code=404)
    user.is_active = not user.is_active
    db.commit()
    return JSONResponse({"success": True, "is_active": user.is_active})


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return JSONResponse({"error": "Kullanıcı bulunamadı"}, status_code=404)
    db.delete(user)
    db.commit()
    return JSONResponse({"success": True})


@router.post("/users/{user_id}/make-admin")
async def make_admin(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return JSONResponse({"error": "Kullanıcı bulunamadı"}, status_code=404)
    user.role = UserRole.admin if user.role == UserRole.user else UserRole.user
    db.commit()
    return JSONResponse({"success": True, "role": user.role.value})


@router.get("/sensors", response_class=HTMLResponse)
async def admin_sensors(
    request: Request,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    readings = (
        db.query(SensorReading)
        .order_by(SensorReading.log_id.desc())
        .limit(100)
        .all()
    )
    return templates.TemplateResponse(
        request, "admin/sensors.html", {"current_user": admin, "readings": readings}
    )


@router.get("/alerts", response_class=HTMLResponse)
async def admin_alerts(
    request: Request,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    alerts = (
        db.query(Alert).order_by(Alert.timestamp.desc()).limit(200).all()
    )
    return templates.TemplateResponse(
        request, "admin/alerts.html", {"current_user": admin, "alerts": alerts}
    )


@router.get("/settings", response_class=HTMLResponse)
async def admin_settings(
    request: Request,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    return templates.TemplateResponse(
        request, "admin/settings.html", {"current_user": admin}
    )

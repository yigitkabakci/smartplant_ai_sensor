from fastapi import APIRouter, Request, Depends, Form
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from services.database import get_db
from services.auth_service import authenticate_user, create_user, get_user_by_email
from datetime import datetime
from dependencies import get_current_user

router = APIRouter(tags=["Auth"])
templates = Jinja2Templates(directory="templates")


@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if user:
        return RedirectResponse("/dashboard", status_code=302)
    return templates.TemplateResponse(request, "login.html", {"current_user": None})


@router.post("/login")
async def login_post(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    remember: bool = Form(False),
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, email, password)
    if not user:
        return JSONResponse({"error": "E-posta veya şifre hatalı."}, status_code=401)
    if not user.is_active:
        return JSONResponse({"error": "Hesabınız askıya alınmış."}, status_code=403)
    user.last_login = datetime.utcnow()
    db.commit()
    request.session["user_id"] = user.id
    return JSONResponse({"success": True, "redirect": "/dashboard", "name": user.name})


@router.get("/register", response_class=HTMLResponse)
async def register_page(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if user:
        return RedirectResponse("/dashboard", status_code=302)
    return templates.TemplateResponse(request, "register.html", {"current_user": None})


@router.post("/register")
async def register_post(
    request: Request,
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    password2: str = Form(...),
    db: Session = Depends(get_db),
):
    if password != password2:
        return JSONResponse({"error": "Şifreler eşleşmiyor."}, status_code=400)
    if len(password) < 6:
        return JSONResponse({"error": "Şifre en az 6 karakter olmalı."}, status_code=400)
    if get_user_by_email(db, email):
        return JSONResponse({"error": "Bu e-posta adresi zaten kayıtlı."}, status_code=409)
    user = create_user(db, name, email, password)
    request.session["user_id"] = user.id
    return JSONResponse({"success": True, "redirect": "/dashboard", "name": user.name})


@router.get("/logout")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/", status_code=302)

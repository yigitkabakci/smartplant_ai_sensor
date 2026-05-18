from fastapi import Request, Depends, HTTPException
from sqlalchemy.orm import Session
from services.database import get_db
from models import User, UserRole


def get_current_user(request: Request, db: Session = Depends(get_db)):
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    return db.query(User).filter(User.id == user_id, User.is_active == True).first()


def require_auth(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user:
        if request.url.path.startswith("/api/"):
            raise HTTPException(
                status_code=401,
                detail={
                    "error": "auth_required",
                    "message": "Bu içeriği görüntülemek için giriş yapmanız gerekiyor.",
                    "redirect": "/login",
                },
            )
        raise HTTPException(status_code=302, headers={"Location": "/login"})
    return user


def require_admin(request: Request, db: Session = Depends(get_db)):
    user = require_auth(request, db)
    if isinstance(user, HTTPException):
        raise user
    if user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekli")
    return user

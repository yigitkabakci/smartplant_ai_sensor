from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

router = APIRouter(tags=["Pages"])
templates = Jinja2Templates(directory="templates")


@router.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return RedirectResponse(url="/dashboard")


@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request):
    return templates.TemplateResponse(request, "dashboard.html")


@router.get("/crops", response_class=HTMLResponse)
async def crops(request: Request):
    return templates.TemplateResponse(request, "crops.html")


@router.get("/analytics", response_class=HTMLResponse)
async def analytics(request: Request):
    return templates.TemplateResponse(request, "analytics.html")


@router.get("/devices_page", response_class=HTMLResponse)
async def devices_page(request: Request):
    return templates.TemplateResponse(request, "devices.html")


@router.get("/alerts_page", response_class=HTMLResponse)
async def alerts_page(request: Request):
    return templates.TemplateResponse(request, "alerts.html")


@router.get("/sensor_docs", response_class=HTMLResponse)
async def sensor_docs(request: Request):
    return templates.TemplateResponse(request, "sensor_docs.html")

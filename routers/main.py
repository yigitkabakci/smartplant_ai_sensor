from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

router = APIRouter(tags=["Pages"])
templates = Jinja2Templates(directory="templates")


@router.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(request, "homepage.html")


@router.get("/sensor_docs", response_class=HTMLResponse)
async def sensor_docs(request: Request):
    return templates.TemplateResponse(request, "sensor_docs.html")

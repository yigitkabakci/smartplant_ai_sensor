import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'change-this-in-production')
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
    DATABASE_PATH = os.path.join(BASE_DIR, 'project_data.db')
    MODEL_DIR = os.path.join(BASE_DIR, 'models', 'leaf_disease_model')
    PORT = int(os.environ.get('PORT', 8000))
    DEBUG = os.environ.get('DEBUG', 'false').lower() == 'true'

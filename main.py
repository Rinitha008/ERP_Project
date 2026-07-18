from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.routers import auth, products, warehouses, movements, notifications, procurement, reports, settings, import_data
from app import models, auth as auth_helper, schemas, crud
import logging
# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
# Initialize database tables
logger.info("Initializing database tables...")
Base.metadata.create_all(bind=engine)
# Create default admin user if not exists
db = SessionLocal()
try:
    admin_user = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin_user:
        logger.info("Creating default admin user...")
        # Using hash helper directly
        hashed = auth_helper.get_password_hash("admin")
        db.add(models.User(username="admin", hashed_password=hashed))
        db.commit()
        logger.info("Default user 'admin' created with password 'admin'.")
except Exception as e:
    logger.error(f"Error creating default admin user: {e}")
finally:
    db.close()
app = FastAPI(
    title="Smart Inventory & ERP API",
    description="Backend service for Smart Inventory & ERP Dashboard",
    version="1.0.0"
)
# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for development ease
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Register Routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(warehouses.router)
app.include_router(movements.router)
app.include_router(notifications.router)
app.include_router(procurement.router)
app.include_router(reports.router)
app.include_router(settings.router)
app.include_router(import_data.router)
@app.get("/healthz")
def healthz():
    return {"status": "healthy"}
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
# Serve React static frontend files if directory exists
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
# Custom 404 catch-all to support SPA client-side routing (React Router)
@app.exception_handler(404)
async def custom_404_handler(request, exc):
    if request.url.path.startswith("/api/") or request.url.path.startswith("/auth/"):
        return JSONResponse(status_code=404, content={"detail": "API endpoint not found"})
    
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return JSONResponse(status_code=404, content={"detail": "Resource not found"})
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
else:
    @app.get("/")
    def root():
        return {
            "status": "online",
            "message": "Smart Inventory & ERP API is running. Static frontend files not loaded.",
            "admin_credentials": "username: admin, password: admin"
        }

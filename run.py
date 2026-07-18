import uvicorn
import os
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    # Disable reload in production to avoid issues
    reload = os.getenv("ENV") == "development"
    print(f"Starting Smart Inventory & ERP Backend Server on port {port}...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=reload)

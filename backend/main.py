from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routes import analysis, auth, upload, ml, insights, query, export
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Insight AI API", 
    version="1.0",
    description="AI-powered data analysis and ML platform"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred. Please try again later.",
            "error_type": type(exc).__name__
        }
    )

# Include routers
app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(ml.router)
app.include_router(analysis.router)
app.include_router(insights.router)
app.include_router(query.router)
app.include_router(export.router)

@app.get("/")
def read_root():
    return {
        "message": "Insight AI API is running",
        "version": "1.0",
        "status": "healthy"
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Insight AI Backend"
    }

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Insight AI Backend...")
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        log_level="info"
    )
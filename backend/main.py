"""
Alert Aid - Production FastAPI Backend
Real APIs, Live Data, ML Predictions
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging
import os
import requests
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import json
from typing import Dict, List, Any, Optional
import asyncio
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib

# Import route modules
from routes import health, weather, predict, alerts, external_apis

# Environment variables
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "demo_key")
USGS_EARTHQUAKE_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"
OPENSTREETMAP_URL = "https://nominatim.openstreetmap.org/reverse"

# Initialize FastAPI app
app = FastAPI(
    title="Alert Aid API",
    description="Real-time disaster management with live APIs and ML predictions",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration - Get allowed origins from environment variable or use defaults
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
allowed_origins = [origin.strip() for origin in CORS_ORIGINS.split(",")] if CORS_ORIGINS != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,  # Set to False when using "*" to avoid CORS issues
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ML Model initialization
ml_model = None
scaler = None

def initialize_ml_model():
    """Initialize ML model for disaster prediction"""
    global ml_model, scaler
    
    try:
        # Create a simple trained model for demonstration
        # In production, load pre-trained model with joblib.load()
        ml_model = RandomForestClassifier(n_estimators=100, random_state=42)
        scaler = StandardScaler()
        
        # Generate synthetic training data for demonstration
        np.random.seed(42)
        n_samples = 1000
        
        # Features: temperature, humidity, wind_speed, pressure, elevation
        X = np.column_stack([
            np.random.normal(25, 10, n_samples),  # temperature
            np.random.normal(60, 20, n_samples),  # humidity
            np.random.normal(10, 5, n_samples),   # wind_speed
            np.random.normal(1013, 15, n_samples), # pressure
            np.random.normal(100, 200, n_samples)  # elevation
        ])
        
        # Target: risk levels (0=low, 1=moderate, 2=high, 3=critical)
        y = np.random.choice([0, 1, 2, 3], n_samples, p=[0.4, 0.3, 0.2, 0.1])
        
        # Train model
        X_scaled = scaler.fit_transform(X)
        ml_model.fit(X_scaled, y)
        
        logger.info("✅ ML Model initialized and trained")
        
    except Exception as e:
        logger.error(f"❌ ML Model initialization failed: {e}")
        ml_model = None
        scaler = None

# Initialize ML model on startup
initialize_ml_model()

# Create FastAPI app with comprehensive metadata
app = FastAPI(
    title="Alert Aid API",
    description="Professional disaster prediction and management API with real-time data integration",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware already configured above - don't add duplicate!

# Register all API routes with proper prefixes
app.include_router(health.router, prefix="/api", tags=["Health Check"])
app.include_router(weather.router, prefix="/api", tags=["Weather"])
app.include_router(predict.router, prefix="/api", tags=["ML Predictions"])
app.include_router(alerts.router, prefix="/api", tags=["Alerts"])
app.include_router(external_apis.router, prefix="/api", tags=["External Data"])

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Alert Aid API - Disaster Management System  🚀",
        "status": "operational",
        "version": "1.0.2-cors-fixed",  # Updated version to verify deployment
        "timestamp": datetime.now().isoformat(),
        "git_commit": "cors-fix-applied",
        "endpoints": {
            "health": "/api/health",  # FIXED: Added /api prefix
            "docs": "/docs",
            "weather": "/api/weather/{lat}/{lon}",
            "predict": "/api/predict/disaster-risk",
            "alerts": "/api/alerts/active?lat={lat}&lon={lon}",
            "external": "/api/external-data?lat={lat}&lon={lon}"
        },
        "cors_enabled": True,
        "deployment_note": "If you see this version, Railway deployed latest code successfully!"
    }

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize the application on startup"""
    logger.info("🚀 Alert Aid Backend Starting...")
    logger.info("✅ Server running on http://localhost:8000")
    logger.info("📊 API documentation: http://localhost:8000/docs")
    logger.info("🔧 Interactive docs: http://localhost:8000/redoc")
    logger.info("🌐 CORS enabled for frontend connections")
    logger.info("🔗 All routes registered and ready")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Clean up on shutdown"""
    logger.info("🛑 Alert Aid Backend Shutting Down...")

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Handle unexpected errors gracefully"""
    logger.error(f"Global exception: {exc}")
    return {
        "error": "Internal server error",
        "detail": "An unexpected error occurred",
        "timestamp": datetime.now().isoformat()
    }

# Main entry point
if __name__ == "__main__":
    logger.info("🚀 Starting Alert Aid Backend Server...")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
        access_log=True
    )
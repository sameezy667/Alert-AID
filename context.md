# Alert Aid Project Context

## Project Overview
Alert Aid is a real-time disaster management system with live APIs and ML predictions. It features a React-based frontend and a FastAPI-based backend.

## Tech Stack
- **Frontend**: React (CRA), TypeScript, Three.js, Styled Components.
- **Backend**: Python, FastAPI, Scikit-learn, Uvicorn.
- **Deployment**: Vercel (Frontend), Render (Backend).
- **APIs**: OpenWeatherMap (Weather), USGS (Earthquakes), ipapi.co (Geolocation).

## Architecture
- `/backend`: FastAPI application.
  - `main.py`: Entry point.
  - `routes/`: API- **Goal**: Resolving build errors for Vercel deployment (TypeScript & ESLint).
- **Status**: 🟢 Build errors fixed. Waiting for deployment verification.
- **Recent Fixes**:
  - Added global `process` & `NodeJS` types.
  - Resolved ESLint `exhaustive-deps` in hooks (`Dashboard`, `LocationContext`, etc.).
  - Removed unused variables/imports across components.
  - Cleaned up project root.

## Feature Status
- [x] Dashboard UI
- [x] Live Weather Integration (OpenWeatherMap)
- [x] ML Disaster Prediction (Backend)
- [x] Earthquake Data (USGS)
- [x] IP Geolocation - **FIXED: Proxying through backend + multiple providers**
- [x] GPS Geolocation - **IMPROVED: Better fallbacks**

## Data Models
### Backend Predictions
```python
{
    "overall_risk": "low" | "moderate" | "high" | "critical",
    "risk_score": float,
    "confidence": float,
    "location_analyzed": {"latitude": float, "longitude": float}
}
```

## API Contracts
- `GET /api/health`: System health status.
- `GET /api/weather/{lat}/{lon}`: Weather data for coordinates.
- `POST /api/predict/disaster`: Predict disaster risk.
- `GET /api/alerts`: Active disaster alerts.

## Technical Debt / Urgent Fixes
- **Backend Endpoint**: Added `/api/external/geolocation` to backend to provide reliable, CORS-free location data.
- **Improved Geolocation Logic**: Frontend now uses backend -> ipwhois -> ipapi cascade with robust error handling.
- **Environment Config**: Updated `.env.production` with correct Render URL.
- **Cleanup**: Consolidated deployment docs into `/docs/archive` and removed root redundancy.

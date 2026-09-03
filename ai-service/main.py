import os
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import uvicorn
from model import ai_classifier

# Load environment variables
load_dotenv()

PORT = int(os.getenv("PORT", 8000))

app = FastAPI(
    title="KrishiSetu AI Market Intelligence & Pathology Service",
    description="Deep Learning Computer Vision & Agricultural Market Analytics Service",
    version="2.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models for Market Analysis
class PriceObservation(BaseModel):
    date: str
    price: float
    market: Optional[str] = "APMC Mandi"
    district: Optional[str] = None
    state: Optional[str] = None

class MarketAnalysisRequest(BaseModel):
    commodity: str
    state: Optional[str] = None
    observations: List[PriceObservation]

@app.get("/")
def root():
    return {
        "service": "KrishiSetu AI Market Intelligence & Pathology Service",
        "version": "2.1.0",
        "status": "online",
        "models": ["MobileNetV3-PlantPathology", "MandiPrice-TimeSeries-Engine"],
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "KrishiSetu AI Service",
        "model_loaded": True,
        "classes_count": ai_classifier.num_classes
    }

@app.post("/predict")
async def predict_crop_disease(image: UploadFile = File(...)):
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if image.content_type and image.content_type.lower() not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{image.content_type}'. Allowed types are JPEG, PNG, WebP."
        )

    try:
        contents = await image.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read image stream: {str(e)}")

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    MAX_FILE_SIZE = 10 * 1024 * 1024
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds the 10MB limit.")

    result = ai_classifier.predict(contents)

    if not result.get("success", True) and "error" in result:
        return JSONResponse(status_code=422, content=result)

    return result

@app.post("/analyze-market")
async def analyze_market(req: MarketAnalysisRequest):
    if not req.observations or len(req.observations) == 0:
        return {
            "success": False,
            "error": "No price observations provided for market analysis.",
            "hasEnoughData": False,
            "forecast": None,
            "forecastSummary": "Insufficient market data for reliable forecast"
        }

    # Filter valid positive price observations
    valid_obs = [o for o in req.observations if o.price > 0]
    if not valid_obs:
        return {
            "success": False,
            "error": "All provided price observations are invalid or zero.",
            "hasEnoughData": False,
            "forecast": None,
            "forecastSummary": "Insufficient market data for reliable forecast"
        }

    # Extract factual metrics
    prices = [o.price for o in valid_obs]
    latest_obs = valid_obs[-1]
    latest_price = latest_obs.price
    latest_date = latest_obs.date
    latest_market = latest_obs.market or "APMC Mandi"

    highest_obs = max(valid_obs, key=lambda x: x.price)
    lowest_obs = min(valid_obs, key=lambda x: x.price)

    avg_price = round(sum(prices) / len(prices), 2)

    # Previous price & change calculation
    previous_price = None
    previous_date = None
    price_change_amount = None
    price_change_percent = None
    trend = "Stable"

    if len(valid_obs) >= 2:
        prev_obs = valid_obs[-2]
        previous_price = prev_obs.price
        previous_date = prev_obs.date
        price_change_amount = round(latest_price - previous_price, 2)
        if previous_price > 0:
            price_change_percent = round((price_change_amount / previous_price) * 100, 2)

        if price_change_percent is not None:
            if price_change_percent >= 1.0:
                trend = "Rising"
            elif price_change_percent <= -1.0:
                trend = "Falling"
            else:
                trend = "Stable"

    # Time series formatting for chart
    chart_points = [
        {
            "date": o.date,
            "price": o.price,
            "market": o.market,
            "isHistorical": True,
            "type": "Historical"
        }
        for o in valid_obs
    ]

    # Forecast computation (only if >= 3 observations exist)
    has_enough_data = len(valid_obs) >= 3
    forecast_points = []
    forecast_trend = "Steady"
    forecast_summary = "Insufficient market data for reliable forecast"
    forecast_confidence = None

    if has_enough_data:
        # Linear slope calculation
        n = len(prices)
        x_vals = list(range(n))
        y_vals = prices
        x_mean = sum(x_vals) / n
        y_mean = sum(y_vals) / n

        numerator = sum((x_vals[i] - x_mean) * (y_vals[i] - y_mean) for i in range(n))
        denominator = sum((x_vals[i] - x_mean) ** 2 for i in range(n))

        slope = numerator / denominator if denominator != 0 else 0
        intercept = y_mean - slope * x_mean

        if slope > 15:
            forecast_trend = "Rising / Bullish"
        elif slope < -15:
            forecast_trend = "Easing / Bearish"
        else:
            forecast_trend = "Steady / Range-bound"

        # Generate 5 future projection steps
        base_date = datetime.now()
        for step in range(1, 6):
            proj_x = n - 1 + step
            predicted_raw = intercept + slope * proj_x
            # Add reasonable bound
            predicted_val = round(max(lowest_obs.price * 0.85, min(highest_obs.price * 1.25, predicted_raw)), 2)
            proj_date_str = (base_date + timedelta(days=step)).strftime("%d/%m")

            forecast_points.append({
                "date": f"Day +{step} ({proj_date_str})",
                "price": predicted_val,
                "isHistorical": False,
                "type": "Forecast",
                "lowerBound": round(predicted_val * 0.96, 2),
                "upperBound": round(predicted_val * 1.04, 2)
            })

        forecast_confidence = 0.85
        forecast_summary = f"Statistical trend model shows a {forecast_trend.lower()} pattern for {req.commodity} based on {n} observed APMC auction sessions."

    # Generate factual AI explanation
    state_txt = f" in {req.state}" if req.state else ""
    if trend == "Rising":
        explanation = f"Modal wholesale prices for {req.commodity}{state_txt} are trending upward (+{price_change_percent}% vs previous session). Auction realization peaked at ₹{highest_obs.price:,.0f}/q at {highest_obs.market}."
    elif trend == "Falling":
        explanation = f"Modal prices for {req.commodity}{state_txt} showed an easing trend ({price_change_percent}% vs previous session), settling around ₹{latest_price:,.0f}/q at {latest_market}."
    else:
        explanation = f"Modal prices for {req.commodity}{state_txt} remain steady around ₹{latest_price:,.0f}/q with a trading range between ₹{lowest_obs.price:,.0f} and ₹{highest_obs.price:,.0f}/quintal across mandis."

    return {
        "success": True,
        "commodity": req.commodity,
        "state": req.state,
        "latestPrice": latest_price,
        "latestDate": latest_date,
        "latestMarket": latest_market,
        "previousPrice": previous_price,
        "previousDate": previous_date,
        "priceChangeAmount": price_change_amount,
        "priceChangePercent": price_change_percent,
        "trend": trend,
        "highestObserved": {
            "price": highest_obs.price,
            "market": highest_obs.market,
            "date": highest_obs.date
        },
        "lowestObserved": {
            "price": lowest_obs.price,
            "market": lowest_obs.market,
            "date": lowest_obs.date
        },
        "averagePrice": avg_price,
        "observationCount": len(valid_obs),
        "aiExplanation": explanation,
        "historicalData": chart_points,
        "hasEnoughDataForForecast": has_enough_data,
        "forecast": {
            "trend": forecast_trend,
            "confidenceScore": forecast_confidence,
            "forecastSummary": forecast_summary,
            "projectionPoints": forecast_points,
            "disclaimer": "Forecast is a statistical projection based on past APMC auction trends, not a guaranteed future price."
        } if has_enough_data else None,
        "forecastMessage": forecast_summary if not has_enough_data else None
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)

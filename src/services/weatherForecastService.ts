/**
 * WEATHER FORECAST SERVICE
 * Fetches 7-day forecast from backend OpenWeatherMap API
 */

import logger from '../utils/logger';

// HARDCODED FIX: Force Railway URL in production
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://web-production-2f56.up.railway.app'
  : 'http://127.0.0.1:8000';

export interface DailyForecast {
  date: string;
  day: string;
  temperature: number;
  temp_min: number;
  temp_max: number;
  feels_like: number;
  conditions: string;
  humidity: number;
  wind_speed: number;
  pressure: number;
  precipitation: number;
  uvi: number;
  risk_score: number;
}

export interface ForecastResponse {
  forecast: DailyForecast[];
  location: {
    latitude: number;
    longitude: number;
  };
  last_updated: string;
  source: string;
  is_real: boolean;
}

class WeatherForecastService {
  /**
   * Get 7-day weather forecast for coordinates
   */
  async getForecast(lat: number, lon: number, days: number = 7): Promise<ForecastResponse> {
    try {
      logger.log(`📅 Fetching ${days}-day forecast for ${lat}, ${lon}`);
      
      const response = await fetch(
        `${API_BASE_URL}/api/weather/forecast/${lat}/${lon}?days=${days}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Forecast API returned ${response.status}: ${response.statusText}`);
      }

      const data: ForecastResponse = await response.json();
      
      logger.log(`✅ ${days}-day forecast retrieved:`, {
        days: data.forecast.length,
        source: data.source,
        is_real: data.is_real,
      });

      return data;
    } catch (error) {
      logger.error('❌ Forecast fetch error:', error);
      throw error;
    }
  }

  /**
   * Convert backend forecast to component-friendly format
   */
  convertToForecastData(forecast: DailyForecast[]) {
    return forecast.map(day => ({
      day: day.day,
      riskScore: day.risk_score,
      precipitation: day.precipitation,
      temperature: day.temperature,
      windSpeed: day.wind_speed,
    }));
  }
}

const weatherForecastService = new WeatherForecastService();
export default weatherForecastService;

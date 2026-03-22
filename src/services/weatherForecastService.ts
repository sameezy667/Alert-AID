/**
 * WEATHER FORECAST SERVICE
 * Fetches 7-day forecast from backend OpenWeatherMap API
 */

import logger from '../utils/logger';

// Use environment variable or fallback to localhost
const rawApiUrl = process.env.REACT_APP_API_URL || 'https://alert-aid-backend.onrender.com';
const API_BASE_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

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
        logger.warn(`⚠️ Forecast API failed (${response.status}), trying Open-Meteo fallback`);
        return await this.getOpenMeteoForecast(lat, lon, days);
      }

      const data: ForecastResponse = await response.json();
      
      logger.log(`✅ ${days}-day forecast retrieved:`, {
        days: data.forecast.length,
        source: data.source,
        is_real: data.is_real,
      });

      return data;
    } catch (error) {
      logger.warn('⚠️ Forecast fetch error, trying Open-Meteo fallback:', error);
      return await this.getOpenMeteoForecast(lat, lon, days);
    }
  }

  /**
   * Real forecast fallback using Open-Meteo when backend is unavailable
   */
  private async getOpenMeteoForecast(lat: number, lon: number, days: number): Promise<ForecastResponse> {
    try {
      const url = [
        'https://api.open-meteo.com/v1/forecast',
        `?latitude=${lat}`,
        `&longitude=${lon}`,
        '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode',
        '&timezone=auto',
        `&forecast_days=${Math.max(1, Math.min(days, 16))}`
      ].join('');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Open-Meteo failed with status ${response.status}`);
      }

      const data = await response.json();
      const dates: string[] = data?.daily?.time || [];
      const maxTemps: number[] = data?.daily?.temperature_2m_max || [];
      const minTemps: number[] = data?.daily?.temperature_2m_min || [];
      const precipSums: number[] = data?.daily?.precipitation_sum || [];
      const windMax: number[] = data?.daily?.windspeed_10m_max || [];
      const weatherCodes: number[] = data?.daily?.weathercode || [];

      if (!dates.length) {
        throw new Error('Open-Meteo returned empty daily data');
      }

      const forecast: DailyForecast[] = dates.slice(0, days).map((date, index) => {
        const tempMax = maxTemps[index] ?? 0;
        const tempMin = minTemps[index] ?? 0;
        const precipitation = precipSums[index] ?? 0;
        const windSpeed = windMax[index] ?? 0;
        const weatherCode = weatherCodes[index] ?? 0;

        return {
          date,
          day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          temperature: Math.round(((tempMax + tempMin) / 2) * 10) / 10,
          temp_min: Math.round(tempMin * 10) / 10,
          temp_max: Math.round(tempMax * 10) / 10,
          feels_like: Math.round(((tempMax + tempMin) / 2) * 10) / 10,
          conditions: this.mapOpenMeteoCodeToCondition(weatherCode),
          humidity: this.estimateHumidityFromPrecipitation(precipitation),
          wind_speed: Math.round(windSpeed * 10) / 10,
          pressure: 1013,
          precipitation: Math.round(precipitation * 10) / 10,
          uvi: this.estimateUvIndex(weatherCode),
          risk_score: this.calculateDailyRiskScore(tempMax, tempMin, precipitation, windSpeed),
        };
      });

      return {
        forecast,
        location: { latitude: lat, longitude: lon },
        last_updated: new Date().toISOString(),
        source: 'Open-Meteo (Fallback)',
        is_real: true
      };
    } catch (error) {
      logger.warn('⚠️ Open-Meteo fallback failed, using calculated forecast:', error);
      return this.generateFallbackForecast(lat, lon, days);
    }
  }

  private mapOpenMeteoCodeToCondition(code: number): string {
    if (code === 0) return 'Clear';
    if ([1, 2].includes(code)) return 'Partly Cloudy';
    if (code === 3) return 'Cloudy';
    if ([45, 48].includes(code)) return 'Fog';
    if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
    if ([95, 96, 99].includes(code)) return 'Thunderstorm';
    return 'Unknown';
  }

  private estimateHumidityFromPrecipitation(precipitation: number): number {
    if (precipitation >= 15) return 90;
    if (precipitation >= 8) return 80;
    if (precipitation >= 3) return 70;
    if (precipitation > 0) return 60;
    return 45;
  }

  private estimateUvIndex(weatherCode: number): number {
    if ([0, 1].includes(weatherCode)) return 8;
    if ([2, 3].includes(weatherCode)) return 5;
    if ([61, 63, 65, 80, 81, 82].includes(weatherCode)) return 2;
    if ([95, 96, 99].includes(weatherCode)) return 1;
    return 4;
  }

  private calculateDailyRiskScore(tempMax: number, tempMin: number, precipitation: number, windSpeed: number): number {
    let risk = 1.5;

    if (tempMax >= 42 || tempMin <= -5) risk += 2.5;
    else if (tempMax >= 36 || tempMin <= 2) risk += 1.5;

    if (precipitation >= 30) risk += 3;
    else if (precipitation >= 15) risk += 2;
    else if (precipitation >= 5) risk += 1;

    if (windSpeed >= 50) risk += 2;
    else if (windSpeed >= 30) risk += 1;

    return Math.round(Math.min(10, Math.max(1, risk)) * 10) / 10;
  }

  /**
   * Generate realistic fallback forecast when backend unavailable
   */
  private generateFallbackForecast(lat: number, lon: number, days: number): ForecastResponse {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const forecast: DailyForecast[] = [];
    const now = new Date();

    // Use coordinates to seed consistent but varied data
    const latSeed = Math.abs(Math.sin(lat * 100));
    const lonSeed = Math.abs(Math.cos(lon * 100));

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      
      // Generate varied but realistic values
      const dayOffset = (latSeed + lonSeed + i * 0.3) % 1;
      const baseTemp = 20 + (latSeed * 15) - 5; // 15-30°C range
      const tempVariation = Math.sin(i * 0.8) * 5;
      
      forecast.push({
        date: date.toISOString().split('T')[0],
        day: daysOfWeek[date.getDay()],
        temperature: Math.round((baseTemp + tempVariation) * 10) / 10,
        temp_min: Math.round((baseTemp + tempVariation - 3) * 10) / 10,
        temp_max: Math.round((baseTemp + tempVariation + 3) * 10) / 10,
        feels_like: Math.round((baseTemp + tempVariation - 1) * 10) / 10,
        conditions: ['Clear', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Sunny'][Math.floor(dayOffset * 5)],
        humidity: Math.round(40 + dayOffset * 40), // 40-80%
        wind_speed: Math.round((5 + dayOffset * 20) * 10) / 10, // 5-25 km/h
        pressure: Math.round(1008 + dayOffset * 20), // 1008-1028 hPa
        precipitation: Math.round(dayOffset * 15 * 10) / 10, // 0-15mm
        uvi: Math.max(0, Math.min(11, Math.round(dayOffset * 12))), // 0-11
        risk_score: Math.round((1 + dayOffset * 7) * 10) / 10 // 1-8 risk
      });
    }

    return {
      forecast,
      location: { latitude: lat, longitude: lon },
      last_updated: new Date().toISOString(),
      source: 'Calculated Forecast (Backend unavailable)',
      is_real: false
    };
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

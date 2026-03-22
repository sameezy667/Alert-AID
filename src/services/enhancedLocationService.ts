import { LocationData } from '../components/Location/types';
import { DEFAULT_LOCATION, FORCE_DEFAULT_LOCATION, ENABLE_GPS_DETECTION } from '../config/locationConfig';

const OPENWEATHER_API_KEY = '1801423b3942e324ab80f5b47afe0859';

interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
}

export interface EnhancedLocationData extends LocationData {
  accuracy?: number;
  source: 'gps' | 'network' | 'manual' | 'cache';
  timestamp: number;
  isStale?: boolean;
}

class EnhancedLocationService {
  private static instance: EnhancedLocationService;

  static getInstance(): EnhancedLocationService {
    if (!EnhancedLocationService.instance) {
      EnhancedLocationService.instance = new EnhancedLocationService();
    }
    return EnhancedLocationService.instance;
  }

  async getCurrentLocation(forceRefresh = false): Promise<EnhancedLocationData> {
    // If force default location is enabled, always use Jaipur
    if (FORCE_DEFAULT_LOCATION) {
      console.log('🇮🇳 Using forced default location: Jaipur, India');
      const defaultLocation: EnhancedLocationData = {
        ...DEFAULT_LOCATION,
        timestamp: Date.now(),
        source: 'manual'
      };
      this.cacheLocation(defaultLocation);
      return defaultLocation;
    }

    // Manual override should always win, even when refresh is requested.
    const manualOverride = this.getStoredLocation('location-override');
    if (manualOverride) {
      console.log('📝 Using explicit manual location override:', manualOverride);
      return {
        ...manualOverride,
        source: 'manual',
        timestamp: manualOverride.timestamp || Date.now(),
        isStale: false
      };
    }

    const explicitLocation = this.getStoredLocation('alertaid-location');
    if (explicitLocation && (explicitLocation.source === 'manual' || explicitLocation.isManual)) {
      console.log('📝 Using explicit manual location from alertaid-location:', explicitLocation);
      return {
        ...explicitLocation,
        source: 'manual',
        timestamp: explicitLocation.timestamp || Date.now(),
        isStale: false
      };
    }

    // If forcing refresh, clear only non-manual cache immediately
    if (forceRefresh) {
      const cachedLocation = this.getCachedLocation();
      if (!cachedLocation || cachedLocation.source !== 'manual') {
        console.log('🔄 Force refresh requested - clearing non-manual cache');
        localStorage.removeItem('enhanced-location-cache');
      } else {
        console.log('🔄 Force refresh requested but manual cache is active; preserving it');
      }
    } else {
      // Check for cached location if not forcing refresh
      const cachedLocation = this.getCachedLocation();
      if (cachedLocation && !this.isLocationStale(cachedLocation)) {
        console.log('📦 Using cached location:', cachedLocation);
        return cachedLocation;
      }
    }

    // Try GPS if enabled
    if (ENABLE_GPS_DETECTION) {
      try {
        // Attempt GPS location first
        const gpsLocation = await this.getGPSLocation();
        if (gpsLocation) {
          console.log('🛰️ GPS location obtained:', gpsLocation);
          this.cacheLocation(gpsLocation);
          return gpsLocation;
        }
      } catch (error) {
        console.warn('GPS location failed:', error);
      }

      try {
        // Fallback to network-based location
        const networkLocation = await this.getNetworkLocation();
        if (networkLocation) {
          console.log('🌐 Network location obtained:', networkLocation);
          this.cacheLocation(networkLocation);
          return networkLocation;
        }
      } catch (error) {
        console.warn('Network location failed:', error);
      }
    } else {
      console.log('📍 GPS detection disabled, using default location');
    }

    // If force refresh, don't use cached data as fallback
    if (!forceRefresh) {
      const cachedLocation = this.getCachedLocation();
      if (cachedLocation) {
        console.log('📦 Using stale cached location as final fallback');
        return { ...cachedLocation, isStale: true };
      }
    }

    // Final fallback: Use Jaipur, India as default location
    console.log('🇮🇳 Using default location: Jaipur, India');
    return {
      latitude: 26.9124,
      longitude: 75.7873,
      city: 'Jaipur',
      state: 'Rajasthan',
      country: 'India',
      timestamp: Date.now(),
      source: 'manual',
      isStale: false
    };
  }

  private async getGPSLocation(): Promise<EnhancedLocationData | null> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds
        maximumAge: 0 // Force fresh location
      };

      navigator.geolocation.getCurrentPosition(
        async (position: GeolocationPosition) => {
          try {
            const locationData = await this.reverseGeocode(
              position.coords.latitude,
              position.coords.longitude
            );

            resolve({
              ...locationData,
              accuracy: position.coords.accuracy,
              source: 'gps',
              timestamp: Date.now()
            });
          } catch (error) {
            reject(error);
          }
        },
        (error) => {
          reject(new Error(`GPS location error: ${error.message}`));
        },
        options
      );
    });
  }

  private async getNetworkLocation(): Promise<EnhancedLocationData | null> {
    const rawApiUrl = process.env.REACT_APP_API_URL || 'https://alert-aid-backend.onrender.com';
    const API_BASE_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

    // List of free IP geolocation providers (HTTPS supported)
    const providers = [
      {
        name: 'backend',
        url: `${API_BASE_URL}/api/external/geolocation`,
        map: (json: any) => ({
          latitude: json.latitude,
          longitude: json.longitude,
          city: json.city || 'Unknown City',
          state: json.region || 'Unknown State',
          country: json.country || 'Unknown Country',
          timestamp: Date.now(),
          source: 'network' as const
        })
      },
      {
        name: 'ipwhois',
        url: 'https://ipwho.is/',
        map: (json: any) => ({
          latitude: json.latitude,
          longitude: json.longitude,
          city: json.city || 'Unknown City',
          state: json.region || 'Unknown State',
          country: json.country || 'Unknown Country',
          timestamp: Date.now(),
          source: 'network' as const
        })
      },
      {
        name: 'ipapi',
        url: 'https://ipapi.co/json/',
        map: (json: any) => ({
          latitude: json.latitude,
          longitude: json.longitude,
          city: json.city || 'Unknown City',
          state: json.region || 'Unknown State',
          country: json.country_name || 'Unknown Country',
          timestamp: Date.now(),
          source: 'network' as const
        })
      }
    ];

    for (const provider of providers) {
      try {
        console.log(`🌐 Attempting network location via ${provider.name}...`);
        const response = await fetch(provider.url, { timeout: 5000 } as any);

        if (!response.ok) {
          console.warn(`⚠️ ${provider.name} failed with status ${response.status}`);
          continue;
        }

        const data = await response.json();

        // Validation for ipwho.is (it returns success field)
        if (provider.name === 'ipwhois' && data.success === false) {
          console.warn(`⚠️ ipwhois returned success = false: ${data.message}`);
          continue;
        }

        const mappedData = provider.map(data);
        if (mappedData.latitude && mappedData.longitude) {
          return mappedData;
        }
      } catch (error) {
        console.error(`${provider.name} network error:`, error);
      }
    }

    console.warn('❌ All network location providers failed');
    return null;
  }

  private async reverseGeocode(lat: number, lon: number): Promise<LocationData> {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${OPENWEATHER_API_KEY}`
      );

      if (!response.ok) throw new Error('Reverse geocoding failed');

      const data = await response.json();

      if (data && data.length > 0) {
        const location = data[0];
        return {
          latitude: lat,
          longitude: lon,
          city: location.name || 'Unknown City',
          state: location.state || 'Unknown State',
          country: location.country || 'Unknown Country',
          timestamp: Date.now()
        };
      }

      // Fallback to coordinates if no city data
      return {
        latitude: lat,
        longitude: lon,
        city: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
        state: 'Coordinates',
        country: 'GPS Location',
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);

      // Return coordinates as fallback
      return {
        latitude: lat,
        longitude: lon,
        city: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
        state: 'Coordinates',
        country: 'GPS Location',
        timestamp: Date.now()
      };
    }
  }

  private cacheLocation(location: EnhancedLocationData): void {
    try {
      localStorage.setItem('enhanced-location-cache', JSON.stringify(location));
    } catch (error) {
      console.warn('Failed to cache location:', error);
    }
  }

  private getCachedLocation(): EnhancedLocationData | null {
    try {
      const cached = localStorage.getItem('enhanced-location-cache');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Failed to retrieve cached location:', error);
    }
    return null;
  }

  private getStoredLocation(key: string): EnhancedLocationData | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      console.warn(`Failed to retrieve location from ${key}:`, error);
      return null;
    }
  }

  private isLocationStale(location: EnhancedLocationData): boolean {
    const STALE_THRESHOLD = 30 * 60 * 1000; // 30 minutes
    return Date.now() - location.timestamp > STALE_THRESHOLD;
  }

  async getLocationString(location: EnhancedLocationData): Promise<string> {
    const parts = [];

    if (location.city && location.city !== 'Unknown City') {
      parts.push(location.city);
    }

    if (location.state && location.state !== 'Unknown State' && location.state !== 'Coordinates') {
      parts.push(location.state);
    }

    if (location.country && location.country !== 'Unknown Country' && location.country !== 'GPS Location') {
      parts.push(location.country);
    }

    if (parts.length === 0) {
      return `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`;
    }

    let locationStr = parts.join(', ');

    // Add source indicator
    switch (location.source) {
      case 'gps':
        locationStr += ' 📍';
        break;
      case 'network':
        locationStr += ' 🌐';
        break;
      case 'manual':
        locationStr += ' 📝';
        break;
      case 'cache':
        locationStr += location.isStale ? ' ⏰' : ' 💾';
        break;
    }

    return locationStr;
  }

  // Request fresh location - useful for the refresh button
  async refreshLocation(): Promise<EnhancedLocationData> {
    return this.getCurrentLocation(true);
  }
}

export const enhancedLocationService = EnhancedLocationService.getInstance();
export default enhancedLocationService;
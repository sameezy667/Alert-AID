/**
 * LOCATION ACCESS MANAGER
 * Manages first-visit location flow and "Change Location" functionality
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { LocationData } from '../components/Location/EnhancedLocationPermissionModal';

interface LocationContextType {
  currentLocation: LocationData | null;
  isLocationLoaded: boolean;
  showLocationModal: boolean;
  requestLocationChange: () => void;
  setLocation: (location: LocationData) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

interface LocationProviderProps {
  children: React.ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isLocationLoaded, setIsLocationLoaded] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Check for existing location on app startup - ALWAYS REQUEST LIVE GEOLOCATION
  useEffect(() => {
    const checkExistingLocation = async () => {
      try {
        const savedLocation = localStorage.getItem('alertaid-location');
        
        // Always request fresh browser geolocation on load
        if ('geolocation' in navigator) {
          console.log('📍 Requesting live browser geolocation...');
          
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const lat = position.coords.latitude;
              const lon = position.coords.longitude;
              
              console.log(`✅ Got live location: ${lat}, ${lon}`);
              
              // Reverse geocode to get city, state, country
              const locationData = await reverseGeocode(lat, lon);
              
              setCurrentLocation(locationData);
              setIsLocationLoaded(true);
              setShowLocationModal(false);
              
              // Save to localStorage
              localStorage.setItem('alertaid-location', JSON.stringify(locationData));
              
              // Trigger custom event
              window.dispatchEvent(new CustomEvent('location-changed', { detail: locationData }));
            },
            (error) => {
              console.warn('❌ Geolocation denied or failed:', error.message);
              
              // Fallback: use saved location if available
              if (savedLocation) {
                const locationData: LocationData = JSON.parse(savedLocation);
                setCurrentLocation(locationData);
                setIsLocationLoaded(true);
              } else {
                // Show location modal for manual input
                setShowLocationModal(true);
              }
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0 // Never use cached position
            }
          );
        } else {
          // Browser doesn't support geolocation
          console.warn('⚠️ Geolocation not supported');
          
          if (savedLocation) {
            const locationData: LocationData = JSON.parse(savedLocation);
            setCurrentLocation(locationData);
            setIsLocationLoaded(true);
          } else {
            setShowLocationModal(true);
          }
        }
      } catch (error) {
        console.error('Error in location initialization:', error);
        setShowLocationModal(true);
      }
    };

    // Reverse geocode using multiple API fallbacks for better accuracy
    const reverseGeocode = async (lat: number, lon: number): Promise<LocationData> => {
      // Try OpenWeatherMap first (primary)
      try {
        const API_KEY = '1801423b3942e324ab80f5b47afe0859';
        const response = await fetch(
          `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`
        );
        
        if (!response.ok) {
          throw new Error(`OpenWeatherMap geocoding failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
          const location = data[0];
          console.log('✅ OpenWeatherMap reverse geocode success:', location.name);
          return {
            latitude: lat,
            longitude: lon,
            city: location.name || 'Unknown City',
            state: location.state || '',
            country: location.country || 'Unknown Country',
            isManual: false,
            timestamp: Date.now()
          };
        } else {
          throw new Error('OpenWeatherMap returned no data');
        }
      } catch (owmError) {
        console.warn('⚠️ OpenWeatherMap geocoding failed, trying Nominatim...', owmError);
        
        // Fallback 1: Try Nominatim (OpenStreetMap)
        try {
          const nominatimResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
            {
              headers: {
                'User-Agent': 'AlertAid-DisasterApp/1.0'
              }
            }
          );
          
          if (!nominatimResponse.ok) {
            throw new Error(`Nominatim geocoding failed: ${nominatimResponse.status}`);
          }
          
          const nominatimData = await nominatimResponse.json();
          
          if (nominatimData && nominatimData.address) {
            const addr = nominatimData.address;
            console.log('✅ Nominatim reverse geocode success:', addr.city || addr.town || addr.village);
            return {
              latitude: lat,
              longitude: lon,
              city: addr.city || addr.town || addr.village || addr.county || 'Unknown City',
              state: addr.state || '',
              country: addr.country || 'Unknown Country',
              isManual: false,
              timestamp: Date.now()
            };
          } else {
            throw new Error('Nominatim returned no address data');
          }
        } catch (nominatimError) {
          console.warn('⚠️ Nominatim geocoding failed, trying BigDataCloud...', nominatimError);
          
          // Fallback 2: Try BigDataCloud (free, no API key required)
          try {
            const bdcResponse = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
            );
            
            if (!bdcResponse.ok) {
              throw new Error(`BigDataCloud geocoding failed: ${bdcResponse.status}`);
            }
            
            const bdcData = await bdcResponse.json();
            
            if (bdcData) {
              console.log('✅ BigDataCloud reverse geocode success:', bdcData.city);
              return {
                latitude: lat,
                longitude: lon,
                city: bdcData.city || bdcData.locality || 'Unknown City',
                state: bdcData.principalSubdivision || '',
                country: bdcData.countryName || 'Unknown Country',
                isManual: false,
                timestamp: Date.now()
              };
            } else {
              throw new Error('BigDataCloud returned no data');
            }
          } catch (bdcError) {
            console.error('❌ All reverse geocoding APIs failed:', bdcError);
            
            // Return basic location data with coordinates only
            return {
              latitude: lat,
              longitude: lon,
              city: `Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
              state: '',
              country: 'Unknown Country',
              isManual: false,
              timestamp: Date.now()
            };
          }
        }
      }
    };

    checkExistingLocation();
  }, []);

  const setLocation = (location: LocationData) => {
    setCurrentLocation(location);
    setIsLocationLoaded(true);
    setShowLocationModal(false);
    
    // Save to localStorage
    localStorage.setItem('alertaid-location', JSON.stringify(location));
    
    // Trigger custom event for other components
    window.dispatchEvent(new CustomEvent('location-changed', { detail: location }));
  };

  const requestLocationChange = () => {
    setShowLocationModal(true);
  };

  const contextValue: LocationContextType = {
    currentLocation,
    isLocationLoaded,
    showLocationModal,
    requestLocationChange,
    setLocation,
  };

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
};

export default LocationProvider;
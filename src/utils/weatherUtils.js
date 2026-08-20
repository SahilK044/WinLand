import { Sun, Moon, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, CloudSun } from 'lucide-react';

/**
 * Clean up ugly ISP station names to clean, polished city labels.
 */
export function formatCleanCityName(name = '') {
  if (!name) return 'Local Weather';
  const raw = name.trim();
  return raw.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

/**
 * Maps condition name or WMO description to a crisp static Lucide icon glyph.
 */
export function conditionIcon(condition = '', isNight = false) {
  const c = (condition || '').toLowerCase();
  if (c.includes('thunder') || c.includes('lightning') || (c.includes('storm') && !c.includes('dust') && !c.includes('sand'))) {
    return CloudLightning;
  }
  if (c.includes('snow') || c.includes('sleet') || c.includes('blizzard') || c.includes('flurr') || c.includes('ice')) {
    return CloudSnow;
  }
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) {
    return CloudRain;
  }
  if (c.includes('fog') || c.includes('mist') || c.includes('haze') || c.includes('smoke') || c.includes('dust') || c.includes('sand')) {
    return CloudFog;
  }
  if (c.includes('partly') || c.includes('few') || c.includes('scattered') || c.includes('patchy')) {
    return CloudSun;
  }
  if (c.includes('cloud') || c.includes('overcast')) {
    return Cloud;
  }
  if (isNight || c.includes('night') || c.includes('moon')) {
    return Moon;
  }
  return Sun;
}

/**
 * Apple iOS authentic weather palette for icons
 */
export function conditionColor(condition = '', isLight = false, isNight = false) {
  const c = (condition || '').toLowerCase();
  if (c.includes('thunder') || c.includes('lightning') || (c.includes('storm') && !c.includes('dust') && !c.includes('sand'))) {
    return isLight ? '#af52de' : '#bf5af2';
  }
  if (c.includes('snow') || c.includes('sleet') || c.includes('blizzard')) {
    return isLight ? '#0284c7' : '#70d7ff';
  }
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) {
    return isLight ? '#007aff' : '#0a84ff';
  }
  if (c.includes('fog') || c.includes('mist') || c.includes('haze') || c.includes('smoke') || c.includes('dust') || c.includes('sand')) {
    return isLight ? '#8e8e93' : '#aeaeb2';
  }
  if (c.includes('partly') || c.includes('few') || c.includes('scattered') || c.includes('patchy')) {
    return isLight ? '#ff9500' : '#ff9f0a';
  }
  if (c.includes('cloud') || c.includes('overcast')) {
    return isLight ? '#8e8e93' : '#aeaeb2';
  }
  if (isNight || c.includes('night') || c.includes('moon')) {
    return isLight ? '#64748b' : '#94a3b8';
  }
  return isLight ? '#ff9500' : '#ff9f0a'; // Clear / Sunny
}

/**
 * Maps Open-Meteo WMO weather code to standard descriptive strings
 */
export function wmoCodeToCondition(code, isDay = 1) {
  const c = Number(code);
  switch (c) {
    case 0:
      return isDay ? 'Sunny' : 'Clear';
    case 1:
      return isDay ? 'Mostly Sunny' : 'Clear';
    case 2:
      return 'Partly Cloudy';
    case 3:
      return 'Overcast';
    case 45:
    case 48:
      return 'Foggy';
    case 51:
    case 53:
    case 55:
      return 'Drizzle';
    case 56:
    case 57:
      return 'Freezing Drizzle';
    case 61:
    case 63:
    case 65:
      return 'Rain';
    case 66:
    case 67:
      return 'Freezing Rain';
    case 71:
    case 73:
    case 75:
    case 77:
      return 'Snow';
    case 80:
    case 81:
    case 82:
      return 'Rain Showers';
    case 85:
    case 86:
      return 'Snow Showers';
    case 95:
    case 96:
    case 99:
      return 'Thunderstorm';
    default:
      return isDay ? 'Sunny' : 'Clear';
  }
}

/**
 * Format temperature into string with unit
 */
export function weatherTempString(weatherConfig) {
  const unit = (weatherConfig?.weatherUnit === 'F' || weatherConfig?.weatherUnit === 'fahrenheit') ? 'F' : 'C';

  let rawC = weatherConfig?.temperatureC ?? weatherConfig?.temperature;
  if (rawC === undefined || rawC === null || isNaN(rawC)) {
    try {
      const saved = localStorage.getItem('winland_live_weather');
      if (saved) {
        const parsed = JSON.parse(saved);
        rawC = parsed.temperatureC ?? parsed.temperature;
      }
    } catch {}
  }

  if (rawC !== undefined && rawC !== null && !isNaN(rawC)) {
    const tempC = Number(rawC);
    const tempVal = unit === 'F' ? Math.round(tempC * 9 / 5 + 32) : Math.round(tempC);
    return `${tempVal}°${unit}`;
  }

  const raw = weatherConfig?.weatherTemp;
  if (raw && typeof raw === 'string') return raw;
  return `--°${unit}`;
}

let lastWeatherCache = null;
let lastWeatherFetchTime = 0;
const WEATHER_CACHE_TTL = 6 * 60 * 1000; // 6 minutes

/**
 * Real-time geocoding place search with Open-Meteo
 */
export async function searchPlaces(query) {
  if (!query || !query.trim()) return [];
  const cleanQ = query.trim();

  // 1. Direct search
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanQ)}&count=8&language=en&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data?.results && data.results.length > 0) {
        return data.results.map((p) => {
          const region = p.admin1 || p.admin2 || '';
          const country = p.country || '';
          const parts = [p.name];
          if (region && region !== p.name) parts.push(region);
          if (country) parts.push(country);
          return {
            id: p.id,
            name: p.name,
            region,
            country,
            latitude: p.latitude,
            longitude: p.longitude,
            label: parts.join(', '),
          };
        });
      }
    }
  } catch {}

  // 2. Compound search fallback
  const parts = cleanQ.split(/\s+/);
  if (parts.length > 1) {
    const mainWord = parts[parts.length - 1];
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(mainWord)}&count=6&language=en&format=json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        if (data?.results && data.results.length > 0) {
          return data.results.map((p) => ({
            id: p.id,
            name: cleanQ,
            region: p.admin1 || p.admin2 || '',
            country: p.country || '',
            latitude: p.latitude,
            longitude: p.longitude,
            label: `${cleanQ}${p.admin1 ? ', ' + p.admin1 : ''}${p.country ? ', ' + p.country : ''}`,
          }));
        }
      }
    } catch {}
  }

  return [];
}

/**
 * Fetches hyper-local physical surface station weather for exact geographic coordinates
 */
export async function fetchWeatherForCoordinates(lat, lon, cityName = 'Local', saveCustom = false) {
  // 1. Tier 1: Real surface meteorological station observation (wttr.in)
  try {
    const url = `https://wttr.in/${lat},${lon}?format=j1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      const curr = data?.current_condition?.[0];
      if (curr && curr.temp_C !== undefined) {
        const tempC = Number(curr.temp_C);
        const condition = curr.weatherDesc?.[0]?.value?.trim() || 'Clear';
        const isDay = (curr.isdaytime === 'yes' || curr.isdaytime === '1' || (new Date().getHours() >= 6 && new Date().getHours() < 19));
        const result = {
          city: formatCleanCityName(cityName),
          latitude: lat,
          longitude: lon,
          temperatureC: tempC,
          temperature: tempC,
          weatherCondition: condition,
          isDay,
          humidity: Number(curr.humidity || 50),
          apparentTemperatureC: Number(curr.FeelsLikeC || tempC),
        };

        lastWeatherCache = result;
        lastWeatherFetchTime = Date.now();

        try {
          if (saveCustom) {
            localStorage.setItem('winland_custom_city', result.city);
            localStorage.setItem('winland_custom_lat', String(lat));
            localStorage.setItem('winland_custom_lon', String(lon));
          }
          localStorage.setItem('winland_live_weather', JSON.stringify(result));
        } catch {}

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('winland-weather-updated', { detail: result }));
        }

        return result;
      }
    }
  } catch {}

  // 2. Tier 2: NOAA GFS Seamless Observation Model
  try {
    const gfsUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code&models=gfs_seamless&timezone=auto`;
    const res = await fetch(gfsUrl, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data?.current) {
        const curr = data.current;
        const weatherCondition = wmoCodeToCondition(curr.weather_code, curr.is_day);
        const result = {
          city: formatCleanCityName(cityName),
          latitude: lat,
          longitude: lon,
          temperatureC: curr.temperature_2m,
          temperature: curr.temperature_2m,
          weatherCondition,
          weatherCode: curr.weather_code,
          isDay: curr.is_day === 1,
          humidity: Number(curr.relative_humidity_2m || 50),
          apparentTemperatureC: Number(curr.apparent_temperature || curr.temperature_2m),
        };

        lastWeatherCache = result;
        lastWeatherFetchTime = Date.now();

        try {
          if (saveCustom) {
            localStorage.setItem('winland_custom_city', result.city);
            localStorage.setItem('winland_custom_lat', String(lat));
            localStorage.setItem('winland_custom_lon', String(lon));
          }
          localStorage.setItem('winland_live_weather', JSON.stringify(result));
        } catch {}

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('winland-weather-updated', { detail: result }));
        }

        return result;
      }
    }
  } catch {}

  return null;
}

/**
 * Fetches real-time live local weather via place search, coordinates, or station observation
 */
export async function fetchLiveWeather(force = false, customQuery = '') {
  // If a specific search query is given, resolve it via Geocoding first!
  if (customQuery && customQuery.trim()) {
    const q = customQuery.trim();
    const matches = await searchPlaces(q);
    if (matches.length > 0) {
      const match = matches[0];
      const result = await fetchWeatherForCoordinates(match.latitude, match.longitude, match.name, true);
      if (result) return result;
    }
    // Fallback: wttr query with place name
    try {
      const wttrRes = await fetch(`https://wttr.in/${encodeURIComponent(q)}?format=j1`, { signal: AbortSignal.timeout(4000) });
      if (wttrRes.ok) {
        const wd = await wttrRes.json();
        const curr = wd.current_condition?.[0];
        const area = wd.nearest_area?.[0];
        if (curr && curr.temp_C !== undefined) {
          const tempC = Number(curr.temp_C);
          const condition = curr.weatherDesc?.[0]?.value?.trim() || 'Clear';
          const city = formatCleanCityName(q || area?.areaName?.[0]?.value || 'Local Weather');
          const result = {
            city,
            country: area?.country?.[0]?.value || '',
            latitude: area?.latitude ? Number(area.latitude) : 0,
            longitude: area?.longitude ? Number(area.longitude) : 0,
            temperatureC: tempC,
            temperature: tempC,
            weatherCondition: condition,
            weatherCode: 0,
            isDay: true,
            humidity: Number(curr.humidity || 50),
            apparentTemperatureC: Number(curr.FeelsLikeC || tempC),
          };
          lastWeatherCache = result;
          lastWeatherFetchTime = Date.now();
          return result;
        }
      }
    } catch {}
  }

  // If no custom query, fetch current coordinates
  return fetchLocalWeather(force);
}

/**
 * Fetches default local coordinates
 */
export async function fetchLocalWeather(force = false) {
  let savedLat = null;
  let savedLon = null;
  let savedCity = '';
  try {
    savedLat = localStorage.getItem('winland_custom_lat');
    savedLon = localStorage.getItem('winland_custom_lon');
    savedCity = localStorage.getItem('winland_custom_city') || '';
  } catch {}

  if (savedLat && savedLon) {
    const lat = parseFloat(savedLat);
    const lon = parseFloat(savedLon);
    if (!isNaN(lat) && !isNaN(lon)) {
      const now = Date.now();
      if (!force && lastWeatherCache && now - lastWeatherFetchTime < WEATHER_CACHE_TTL) {
        return lastWeatherCache;
      }
      const res = await fetchWeatherForCoordinates(lat, lon, savedCity || 'Local Weather');
      if (res) return res;
    }
  }

  const activeCity = savedCity || 'Local Weather';
  const now = Date.now();
  if (!force && lastWeatherCache && now - lastWeatherFetchTime < WEATHER_CACHE_TTL) {
    return lastWeatherCache;
  }

  return fetchWeatherForCoordinates(40.7128, -74.0060, activeCity);
}

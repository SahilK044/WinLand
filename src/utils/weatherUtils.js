import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, CloudSun } from 'lucide-react';

// WinDock writes Open-Meteo condition strings ("Sunny", "Rainy", ...) into
// winland_theme.json; map them onto a glyph. Order matters — "partly cloudy"
// also contains "cloud", so the more specific phrases come first.
export function conditionIcon(condition = '') {
  const c = condition.toLowerCase();
  if (c.includes('thunder') || c.includes('storm')) return CloudLightning;
  if (c.includes('snow') || c.includes('sleet') || c.includes('blizzard')) return CloudSnow;
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return CloudRain;
  if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return CloudFog;
  if (c.includes('partly')) return CloudSun;
  if (c.includes('cloud') || c.includes('overcast')) return Cloud;
  return Sun;
}

// weatherTemp arrives pre-formatted by WinDock ("30°C", unit already applied).
export function weatherTempString(weatherConfig) {
  const raw = weatherConfig?.weatherTemp;
  if (raw && typeof raw === 'string') return raw;
  const unit = (weatherConfig?.weatherUnit === 'F' || weatherConfig?.weatherUnit === 'fahrenheit') ? 'F' : 'C';
  const rawC = weatherConfig?.temperatureC ?? weatherConfig?.temperature;
  const tempC = (rawC !== undefined && rawC !== null && !isNaN(rawC)) ? Number(rawC) : 22;
  const tempVal = unit === 'F' ? Math.round(tempC * 9 / 5 + 32) : Math.round(tempC);
  return `${tempVal}°${unit}`;
}

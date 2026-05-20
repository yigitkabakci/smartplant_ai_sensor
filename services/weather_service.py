import os
import time
import logging
import urllib.request
import json

logger = logging.getLogger(__name__)

_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
_CITY    = os.getenv("OPENWEATHER_CITY", "Konya")

# 30 dakika cache
_cache: dict = {"data": None, "ts": 0}
_CACHE_TTL = 1800


def get_weather() -> dict | None:
    """Güncel hava durumunu döner. 30 dk cache'lenir. Hata durumunda None."""
    if not _API_KEY:
        return None

    now = time.time()
    if _cache["data"] and (now - _cache["ts"]) < _CACHE_TTL:
        return _cache["data"]

    try:
        url = (
            f"https://api.openweathermap.org/data/2.5/weather"
            f"?q={_CITY}&appid={_API_KEY}&units=metric&lang=tr"
        )
        with urllib.request.urlopen(url, timeout=5) as resp:
            raw = json.loads(resp.read())

        result = {
            "city":        raw.get("name", _CITY),
            "temp":        raw["main"]["temp"],
            "feels_like":  raw["main"]["feels_like"],
            "humidity":    raw["main"]["humidity"],
            "description": raw["weather"][0]["description"],
            "icon":        raw["weather"][0]["icon"],
            "wind_speed":  raw.get("wind", {}).get("speed", 0),
            "rain_1h":     raw.get("rain", {}).get("1h", 0),
        }
        _cache["data"] = result
        _cache["ts"]   = now
        logger.info("Hava durumu güncellendi: %s %.1f°C", result["city"], result["temp"])
        return result

    except Exception as e:
        logger.warning("Hava durumu alınamadı: %s", e)
        return _cache["data"]  # eski veriyi döndür


def weather_warning(weather: dict | None, plant_data: dict | None) -> str:
    """Hava durumuna ve bitki türüne göre uyarı metni üretir."""
    if not weather:
        return _seasonal_fallback()

    temp  = weather["temp"]
    rain  = weather["rain_1h"]
    wind  = weather["wind_speed"]
    desc  = weather["description"]
    city  = weather["city"]

    parts = []

    # Sıcaklık uyarıları
    if temp >= 35:
        parts.append(f"Dışarısı çok sıcak ({temp:.0f}°C). Bitkiyi doğrudan güneşten koruyun, sulama sıklığını artırın.")
    elif temp >= 28:
        parts.append(f"Sıcak hava ({temp:.0f}°C). Yaprakları sislemeyi düşünebilirsiniz.")
    elif temp <= 5:
        parts.append(f"Dışarısı çok soğuk ({temp:.0f}°C). Bitkiyi pencere kenarından uzaklaştırın.")
    elif temp <= 12:
        parts.append(f"Serin hava ({temp:.0f}°C). Soğuk hava akımından koruyun.")

    # Yağmur
    if rain > 5:
        parts.append("Yoğun yağış var — toprak nemi yüksek olabilir, sulamayı atlayabilirsiniz.")
    elif rain > 0:
        parts.append("Hafif yağış mevcut — toprak nemini kontrol edin.")

    # Rüzgar
    if wind > 10:
        parts.append(f"Rüzgarlı hava ({wind:.0f} km/s). Açık alandaki bitkiler için rüzgar koruması önerilebilir.")

    if not parts:
        parts.append(f"{city}'da hava {desc} ({temp:.0f}°C). Bitki için özel uyarı yok.")

    return " ".join(parts)


def _seasonal_fallback() -> str:
    from datetime import datetime
    m = datetime.now().month
    if m in (12, 1, 2):
        return "Kış aylarında bitkiyi soğuk cam kenarından uzak tutun ve sulama sıklığını azaltın."
    if m in (3, 4, 5):
        return "İlkbahar büyüme dönemi — sulama sıklığını artırabilirsiniz. Zararlılara karşı yaprakları kontrol edin."
    if m in (6, 7, 8):
        return "Yaz sıcağında öğlen güneşinden koruyun. Sıcak günlerde hafif sisleme faydalı olur."
    return "Sonbaharda sulama sıklığını yavaşça azaltın ve bitkiyi kışa hazırlayın."

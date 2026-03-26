import json
import math
import os
import re
import time
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests
from dotenv import load_dotenv
from slugify import slugify

try:
    from google import genai as google_genai
    GENAI_AVAILABLE = True
except ImportError:
    google_genai = None
    GENAI_AVAILABLE = False


OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
]

WIKIDATA_URL = "https://query.wikidata.org/sparql"
WIKIDATA_ENTITY_SEARCH_URL = "https://www.wikidata.org/w/api.php"
WIKIPEDIA_URL = "https://en.wikipedia.org/w/api.php"
GOOGLE_PLACES_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"

HTTP_HEADERS = {
    "User-Agent": "WanderGraph/1.0 hacktues12",
    "Accept": "application/json",
}

HERITAGE_KEYWORDS = [
    "cultural monument",
    "protected",
    "heritage",
    "church",
    "monastery",
    "archaeological",
    "fortress",
]

EXPERIENCE_TYPES = {
    "craft",
    "hike",
    "homestay",
    "ceremony",
    "cooking",
    "volunteer",
    "folklore",
}

PRIORITY_COUNTRIES = [
    # Europe
    "Bulgaria",
    "Romania",
    "Albania",
    "Bosnia and Herzegovina",
    "North Macedonia",
    "Serbia",
    "Montenegro",
    "Moldova",
    "Ukraine",

    # Asia
    "Georgia",
    "Turkey",
    "Lebanon",
    "Jordan",
    "Nepal",
    "Bhutan",
    "Myanmar",
    "Laos",
    "Vietnam",

    # Africa
    "Morocco",
    "Tunisia",
    "Ethiopia",
    "Tanzania",
    "Senegal",
    "Mali",

    # South America
    "Peru",
    "Bolivia",
    "Ecuador",
    "Colombia",
    "Paraguay",

    # North America
    "Guatemala",
    "Mexico",
    "Canada",

    # Oceania
    "Fiji",
    "Papua New Guinea",
]

COUNTRY_CODES = {
    "Bulgaria": "BG", "Romania": "RO", "Albania": "AL",
    "Bosnia and Herzegovina": "BA", "North Macedonia": "MK",
    "Serbia": "RS", "Montenegro": "ME", "Moldova": "MD",
    "Ukraine": "UA", "Georgia": "GE", "Armenia": "AM",
    "Azerbaijan": "AZ", "Turkey": "TR", "Lebanon": "LB",
    "Jordan": "JO", "Morocco": "MA", "Tunisia": "TN",
    "Nepal": "NP", "Bhutan": "BT", "Myanmar": "MM",
    "Laos": "LA", "Cambodia": "KH", "Vietnam": "VN",
    "Ethiopia": "ET", "Tanzania": "TZ", "Uganda": "UG",
    "Rwanda": "RW", "Senegal": "SN", "Mali": "ML",
    "Peru": "PE", "Bolivia": "BO", "Ecuador": "EC",
    "Guatemala": "GT", "Colombia": "CO", "Paraguay": "PY",
    "Mexico": "MX", "Canada": "CA", "Fiji": "FJ",
    "Papua New Guinea": "PG",
}

# Some countries need their native name for Overpass area lookup
COUNTRY_NATIVE_NAMES = {
    "Bulgaria": "България",
    "Romania": "România",
    "Serbia": "Србија",
    "North Macedonia": "Македонија",
    "Bosnia and Herzegovina": "Bosna i Hercegovina",
    "Montenegro": "Crna Gora",
    "Moldova": "Moldova",
    "Ukraine": "Україна",
    "Georgia": "საქართველო",
    "Armenia": "Հայաստան",
    "Azerbaijan": "Azərbaycan",
    "Morocco": "المغرب",
    "Tunisia": "تونس",
    "Lebanon": "لبنان",
    "Jordan": "الأردن",
    "Nepal": "नेपाल",
    "Myanmar": "မြန်မာ",
    "Ethiopia": "ኢትዮጵያ",
}


def info(msg: str) -> None:
    print(f"[INFO] {msg}")


def warn(msg: str) -> None:
    print(f"[WARN] {msg}")


def get_country_code(country: str) -> str:
    if country in COUNTRY_CODES:
        return COUNTRY_CODES[country]
    letters = re.sub(r"[^A-Za-z]", "", country).upper()
    return (letters[:2] or "XX").ljust(2, "X")


def overpass_queries_for_country(country_name: str, max_villages: int) -> List[str]:
    # Prefer ISO-based area lookup (usually more reliable), then name/native-name fallbacks.
    cc = get_country_code(country_name)
    queries: List[str] = [
        f"""
[out:json][timeout:90];
area["ISO3166-1"="{cc}"]["admin_level"="2"]->.country;
(
    node["place"="village"](area.country);
    node["place"="hamlet"](area.country);
);
out body {max_villages};
""".strip()
    ]

    names_to_try = [country_name]
    native = COUNTRY_NATIVE_NAMES.get(country_name)
    if native and native not in names_to_try:
        names_to_try.append(native)

    for label in names_to_try:
        queries.append(
            f"""
[out:json][timeout:90];
area["name"="{label}"]["admin_level"="2"]->.country;
(
    node["place"="village"](area.country);
    node["place"="hamlet"](area.country);
);
out body {max_villages};
""".strip()
        )

    return queries


def normalize_name(name: str) -> str:
    return re.sub(r"\s+", " ", (name or "").strip().lower())


def safe_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    text = str(value).strip().replace(" ", "")
    if not text:
        return None
    m = re.search(r"-?\d+", text)
    if not m:
        return None
    try:
        return int(m.group(0))
    except ValueError:
        return None


def parse_wkt_point(raw: Optional[str]) -> Tuple[Optional[float], Optional[float]]:
    if not raw:
        return None, None
    m = re.search(r"Point\(([-\d\.]+)\s+([-\d\.]+)\)", raw)
    if not m:
        return None, None
    try:
        return float(m.group(2)), float(m.group(1))
    except ValueError:
        return None, None


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def assign_region(lat: float, lng: float, country: str) -> str:
    if country == "Bulgaria":
        if lat < 42.0:
            return "Rhodopes West" if lng < 24.5 else "Rhodopes East"
        elif lat < 43.0:
            if lng < 24.0:
                return "Vitosha & Sofia"
            elif lng < 25.5:
                return "Stara Planina Central"
            else:
                return "Stara Planina East"
        else:
            return "Vratsa & Northwest" if lng < 24.0 else "Danube Plain"

    if lat > 60: return "Northern Europe"
    if lat > 45:
        if lng < 15: return "Western Europe"
        if lng < 35: return "Eastern Europe"
        return "Central Asia"
    if lat > 30:
        if lng < 0: return "North Africa West"
        if lng < 40: return "Middle East & Levant"
        if lng < 70: return "Central & South Asia"
        return "East Asia"
    if lat > 0:
        if lng < 20: return "West Africa"
        if lng < 50: return "East Africa"
        if lng < 100: return "South Asia"
        return "Southeast Asia"
    if lng < -30: return "South America"
    if lng < 50: return "Southern Africa"
    return "Oceania"


def compute_cws(village: Dict[str, Any]) -> int:
    population = village.get("population")
    population_2011 = village.get("population_2011")
    heritage_sites_count = village.get("heritage_sites_count", 0) or 0
    traditions = village.get("traditions", []) or []
    altitude_m = village.get("altitude_m") or 0

    if population and population_2011:
        decline = 1 - (population / population_2011)
        pop_score = max(0, (1 - decline)) * 40
    elif population:
        pop_score = min(40, (population / 500) * 40)
    else:
        pop_score = 15

    heritage_score = min(30, heritage_sites_count * 3)
    tradition_score = min(20, len(traditions) * 5)
    altitude_score = min(10, (altitude_m / 2000) * 10)

    total = pop_score + heritage_score + tradition_score + altitude_score
    return round(min(100, max(5, total)))


def fetch_overpass_country(country_name: str, max_villages: int = 20) -> List[Dict[str, Any]]:
    queries = overpass_queries_for_country(country_name, max_villages)

    for endpoint in OVERPASS_ENDPOINTS:
        host = endpoint.split("/")[2]
        for q_idx, query in enumerate(queries, start=1):
            for attempt in range(3):
                try:
                    info(f"{country_name} -> {host} (query {q_idx}/{len(queries)}, attempt {attempt + 1}/3)")
                    r = requests.post(
                        endpoint,
                        data={"data": query},
                        headers=HTTP_HEADERS,
                        timeout=120,
                    )
                    r.raise_for_status()
                    elements = r.json().get("elements", [])
                    villages = [
                        e
                        for e in elements
                        if e.get("lat") and e.get("lon") and e.get("tags", {}).get("name")
                    ]

                    if villages:
                        info(f"{country_name}: {len(villages)} villages from {host}")
                        time.sleep(4)
                        return villages[:max_villages]

                    # 0 results is often query mismatch, so try next query variant immediately.
                    warn(f"{country_name}: 0 results from {host} on query variant {q_idx}")
                    break

                except requests.exceptions.HTTPError as e:
                    code = e.response.status_code if e.response is not None else 0
                    if code == 429:
                        wait = (attempt + 1) * 15
                        warn(f"{host} rate limited ({code}), waiting {wait}s...")
                        time.sleep(wait)
                        continue
                    if code in (500, 502, 503, 504):
                        warn(f"{host} server error ({code}), backing off...")
                        time.sleep((attempt + 1) * 6)
                        continue
                    # 403/400/etc: endpoint or query not allowed; switch variant/mirror.
                    warn(f"{host} HTTP {code}: {e}")
                    break

                except requests.exceptions.Timeout:
                    warn(f"{host} timeout, retrying with backoff...")
                    time.sleep((attempt + 1) * 6)
                    continue

                except Exception as e:
                    warn(f"{host} failed: {e}")
                    time.sleep(5)
                    break

            time.sleep(1)

    warn(f"{country_name} - all mirrors and query variants failed")
    return []


def resolve_country_qid(country: str) -> Optional[str]:
    try:
        params = {
            "action": "wbsearchentities",
            "search": country,
            "language": "en",
            "type": "item",
            "format": "json",
            "limit": 5,
        }
        r = requests.get(
            WIKIDATA_ENTITY_SEARCH_URL,
            params=params,
            headers=HTTP_HEADERS,
            timeout=30,
        )
        r.raise_for_status()
        rows = r.json().get("search", [])
        return rows[0].get("id") if rows else None
    except Exception as exc:
        warn(f"Wikidata country resolve failed for {country}: {exc}")
        return None


def fetch_wikidata_country(country: str) -> List[Dict[str, Any]]:
    qid = resolve_country_qid(country)
    if not qid:
        return []

    sparql = f"""
SELECT ?village ?villageLabel ?coord ?population ?altitude ?tradition ?traditionLabel ?description WHERE {{
  ?village wdt:P17 wd:{qid}.
  ?village wdt:P31/wdt:P279* wd:Q532.
  OPTIONAL {{ ?village wdt:P625 ?coord. }}
  OPTIONAL {{ ?village wdt:P1082 ?population. }}
  OPTIONAL {{ ?village wdt:P2044 ?altitude. }}
  OPTIONAL {{ ?village wdt:P2596 ?tradition. }}
  OPTIONAL {{
    ?village schema:description ?description.
    FILTER(LANG(?description) = "en")
  }}
  SERVICE wikibase:label {{
    bd:serviceParam wikibase:language "en".
    ?village rdfs:label ?villageLabel.
    ?tradition rdfs:label ?traditionLabel.
  }}
}}
LIMIT 2000
""".strip()

    try:
        r = requests.get(
            WIKIDATA_URL,
            params={"query": sparql, "format": "json"},
            headers=HTTP_HEADERS,
            timeout=120,
        )
        r.raise_for_status()
        rows = r.json().get("results", {}).get("bindings", [])
    except Exception as exc:
        warn(f"Wikidata query failed for {country}: {exc}")
        return []

    merged: Dict[str, Dict[str, Any]] = {}
    for row in rows:
        village_uri = row.get("village", {}).get("value")
        if not village_uri:
            continue
        wid = village_uri.rsplit("/", 1)[-1]
        label = row.get("villageLabel", {}).get("value")
        coord = row.get("coord", {}).get("value")
        population = row.get("population", {}).get("value")
        altitude = row.get("altitude", {}).get("value")
        tradition_label = row.get("traditionLabel", {}).get("value")
        description = row.get("description", {}).get("value")

        lat, lng = parse_wkt_point(coord)
        item = merged.setdefault(wid, {
            "wikidata_id": wid,
            "label": label,
            "lat": lat,
            "lng": lng,
            "population_2011": safe_int(population),
            "altitude_m": safe_int(altitude),
            "description": description,
            "traditions": set(),
            "country": country,
        })
        if tradition_label:
            item["traditions"].add(tradition_label)

    out = []
    for item in merged.values():
        item["traditions"] = sorted(item["traditions"])
        out.append(item)
    return out


def best_match_village(
    villages: List[Dict[str, Any]], wd_item: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    label = wd_item.get("label")
    wd_lat = wd_item.get("lat")
    wd_lng = wd_item.get("lng")

    best: Optional[Dict[str, Any]] = None
    best_ratio = 0.0

    if label:
        n_label = normalize_name(label)
        for v in villages:
            ratio = SequenceMatcher(
                None, n_label, normalize_name(v.get("name", ""))
            ).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best = v

    if best and best_ratio >= 0.90:
        return best

    if wd_lat is not None and wd_lng is not None:
        by_distance: List[Tuple[float, Dict[str, Any]]] = []
        for v in villages:
            dlat = abs(float(v["lat"]) - float(wd_lat))
            dlng = abs(float(v["lng"]) - float(wd_lng))
            if dlat <= 0.05 and dlng <= 0.05:
                by_distance.append((dlat + dlng, v))
        if by_distance:
            by_distance.sort(key=lambda x: x[0])
            return by_distance[0][1]

    if best_ratio >= 0.82:
        return best
    return None


def wikipedia_heritage_count(village_name: str, country: str) -> int:
    params = {
        "action": "query",
        "titles": f"{village_name}, {country}",
        "prop": "revisions",
        "rvprop": "content",
        "format": "json",
        "formatversion": 2,
    }
    try:
        r = requests.get(
            WIKIPEDIA_URL, params=params, headers=HTTP_HEADERS, timeout=25
        )
        r.raise_for_status()
        pages = r.json().get("query", {}).get("pages", [])
        text_chunks: List[str] = []
        for p in pages:
            for rev in p.get("revisions", []) or []:
                slots = rev.get("slots") or {}
                if "main" in slots and isinstance(slots["main"], dict):
                    content = slots["main"].get("content")
                    if content:
                        text_chunks.append(content)
                elif "*" in rev and rev.get("*"):
                    text_chunks.append(rev["*"])

        blob = "\n".join(text_chunks).lower()
        if not blob:
            return 0

        hits = sum(
            len(re.findall(re.escape(kw.lower()), blob))
            for kw in HERITAGE_KEYWORDS
        )
        return min(10, hits)
    except Exception:
        return 0


def normalize_weights(weights: Any) -> List[float]:
    default = [0.2, 0.2, 0.2, 0.2, 0.2]
    if not isinstance(weights, list) or len(weights) != 5:
        return default
    parsed: List[float] = []
    for w in weights:
        try:
            parsed.append(float(w))
        except Exception:
            parsed.append(0.0)
    total = sum(parsed)
    if total <= 0:
        return default
    return [round(w / total, 4) for w in parsed]


def sanitize_experience(raw: Dict[str, Any]) -> Dict[str, Any]:
    exp_type = str(raw.get("type") or "homestay").strip().lower()
    if exp_type not in EXPERIENCE_TYPES:
        exp_type = "homestay"

    try:
        host_rating = float(raw.get("host_rating", 4.6))
    except Exception:
        host_rating = 4.6
    host_rating = min(5.0, max(4.3, host_rating))

    try:
        price = float(raw.get("price_eur", 25))
    except Exception:
        price = 25.0
    price = min(80.0, max(1.0, price))

    try:
        rarity = int(raw.get("rarity_score", 5))
    except Exception:
        rarity = 5
    rarity = min(10, max(1, rarity))

    return {
        "name": str(raw.get("name") or "Village Experience")[:60],
        "type": exp_type,
        "description": str(
            raw.get("description") or "Authentic local activity with community hosts."
        ),
        "duration": str(raw.get("duration") or "2 days"),
        "price_eur": round(price, 2),
        "host_name": str(raw.get("host_name") or "Petar Ivanov"),
        "host_bio": str(
            raw.get("host_bio") or "Local organizer with regional expertise."
        ),
        "host_rating": round(host_rating, 2),
        "personality_weights": normalize_weights(raw.get("personality_weights")),
        "rarity_score": rarity,
    }


def fallback_experience(village: Dict[str, Any]) -> Dict[str, Any]:
    traditions_blob = " ".join((village.get("traditions") or [])).lower()
    altitude = village.get("altitude_m") or 0

    if "music" in traditions_blob or "craft" in traditions_blob:
        typ, nm = "craft", "Traditional Craft Workshop"
    elif altitude > 1000:
        typ, nm = "hike", "Highland Ridge Trek"
    elif "ceremony" in traditions_blob or "ritual" in traditions_blob:
        typ, nm = "ceremony", "Local Ritual Evening"
    else:
        typ, nm = "homestay", "Village Home Immersion"

    return {
        "name": nm,
        "type": typ,
        "description": "Join local hosts for authentic traditions and daily village life.",
        "duration": "2 days",
        "price_eur": 30,
        "host_name": "Mariya Ivanova",
        "host_bio": "Community host focused on local heritage.",
        "host_rating": 4.7,
        "personality_weights": [0.25, 0.2, 0.2, 0.15, 0.2],
        "rarity_score": 6,
    }


def parse_json_array(text: str) -> List[Dict[str, Any]]:
    cleaned = (text or "").strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z0-9]*\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        data = json.loads(cleaned)
        if isinstance(data, list):
            return [x for x in data if isinstance(x, dict)]
    except Exception:
        pass
    return []


def generate_experiences_gemini(
    village: Dict[str, Any], client: Any
) -> List[Dict[str, Any]]:
    desired = 3 if (village.get("cws") or 0) < 40 else 2

    prompt = f"""
Create {desired} travel experiences for this village community.
Return ONLY a valid JSON array, no other text, no markdown fences.

Village: {village.get('name')} ({village.get('country')})
Population: {village.get('population')}
Traditions: {village.get('traditions')}
CWS score: {village.get('cws')} (0-100, lower = more remote/undiscovered)

[
  {{
    "name": "max 5 words",
    "type": "craft|hike|homestay|ceremony|cooking|volunteer|folklore",
    "description": "2 sentences, specific and evocative",
    "duration": "e.g. 3 days",
    "price_eur": 0-80,
    "host_name": "realistic local name for this country",
    "host_bio": "1 sentence specific expertise",
    "host_rating": 4.3-5.0,
    "personality_weights": [explorer, connector, restorer, achiever, guardian],
    "rarity_score": 1-10
  }}
]

Rules:
- personality_weights must sum to exactly 1.0
- Low CWS = raw/adventurous experiences, higher rarity_score
- High CWS = craft/cultural experiences
- craft: explorer 0.3+, guardian 0.2
- hike: explorer 0.4+, achiever 0.3+
- homestay: restorer 0.4+, connector 0.3
- ceremony: connector 0.35+, restorer 0.2
- cooking: connector 0.4+, restorer 0.3
- volunteer: guardian 0.5+, connector 0.2
- folklore: connector 0.3, restorer 0.3
""".strip()

    items: List[Dict[str, Any]] = []

    if client is not None:
        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
            )
            text = getattr(response, "text", "") or ""
            items = parse_json_array(text)
        except Exception as exc:
            warn(f"Gemini failed for {village.get('name')}: {exc}")

    if not items:
        items = [fallback_experience(village)]

    out: List[Dict[str, Any]] = []
    for idx, raw in enumerate(items[:desired], start=1):
        exp = sanitize_experience(raw)
        exp["id"] = f"e_{village['id']}_{idx}"
        exp["villageId"] = village["id"]
        exp["hostId"] = f"h_{village['id']}_{idx}"
        exp["country"] = village.get("country")
        out.append(exp)
    return out


def maybe_apply_google_places_ratings(
    villages: List[Dict[str, Any]],
    experiences: List[Dict[str, Any]],
    api_key: Optional[str],
) -> None:
    if not api_key:
        return

    top = sorted(villages, key=lambda v: v.get("cws", 0), reverse=True)[:20]
    rating_map: Dict[str, float] = {}

    for v in top:
        params = {
            "query": f"guesthouse {v.get('name')} {v.get('country', '')}",
            "key": api_key,
        }
        try:
            r = requests.get(
                GOOGLE_PLACES_URL, params=params, headers=HTTP_HEADERS, timeout=20
            )
            r.raise_for_status()
            results = r.json().get("results", [])
            if results and "rating" in results[0]:
                rating_map[v["id"]] = float(results[0]["rating"])
        except Exception:
            pass
        time.sleep(0.2)

    for e in experiences:
        vid = e.get("villageId")
        if vid in rating_map:
            e["host_rating"] = round(min(5.0, max(4.3, rating_map[vid])), 2)


def enrich_with_wikidata(
    raw_villages: List[Dict[str, Any]], country: str
) -> List[Dict[str, Any]]:
    villages: List[Dict[str, Any]] = []
    seen_ids: set = set()

    for el in raw_villages:
        tags = el.get("tags", {})
        name = tags.get("name")
        if not name:
            continue

        vid = f"{slugify(country)}_{slugify(name)}"
        if vid in seen_ids:
            continue
        seen_ids.add(vid)

        village: Dict[str, Any] = {
            "id": vid,
            "name": name,
            "name_bg": tags.get("name:bg") or name,
            "country": country,
            "country_code": get_country_code(country),
            "lat": float(el["lat"]),
            "lng": float(el["lon"]),
            "population": safe_int(tags.get("population")),
            "osm_id": f"node/{el.get('id')}",
            "wikidata_id": None,
            "description": None,
            "altitude_m": None,
            "traditions": [],
            "population_2011": None,
            "heritage_sites_count": 0,
            "region": assign_region(float(el["lat"]), float(el["lon"]), country),
            "settlement_type": tags.get("place") or "village",
        }
        villages.append(village)

    wd_rows = fetch_wikidata_country(country)
    for row in wd_rows:
        matched = best_match_village(villages, row)
        if not matched:
            continue
        matched["wikidata_id"] = row.get("wikidata_id")
        if not matched.get("description"):
            matched["description"] = row.get("description")
        if matched.get("altitude_m") is None and row.get("altitude_m") is not None:
            matched["altitude_m"] = row["altitude_m"]
        if matched.get("population_2011") is None and row.get("population_2011") is not None:
            matched["population_2011"] = row["population_2011"]
        merged = set(matched.get("traditions") or [])
        merged.update(row.get("traditions") or [])
        matched["traditions"] = sorted(merged)

    return villages


def save_checkpoint(
    villages: List[Dict[str, Any]],
    experiences: List[Dict[str, Any]],
    step: int,
) -> None:
    root = Path(__file__).resolve().parents[1]
    for out_dir in [root / "data", root / "engine" / "data"]:
        out_dir.mkdir(parents=True, exist_ok=True)
        with (out_dir / f"checkpoint_{step}_villages.json").open("w", encoding="utf-8") as f:
            json.dump(villages, f, ensure_ascii=False, indent=2)
        with (out_dir / f"checkpoint_{step}_experiences.json").open("w", encoding="utf-8") as f:
            json.dump(experiences, f, ensure_ascii=False, indent=2)


def seed_all_countries(client: Any) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    all_villages: List[Dict[str, Any]] = []
    all_experiences: List[Dict[str, Any]] = []
    failed_countries: List[str] = []

    country_limit = int(os.environ.get("COUNTRY_LIMIT", str(len(PRIORITY_COUNTRIES))))
    max_villages_per_country = 20
    countries = PRIORITY_COUNTRIES[: max(1, country_limit)]

    for i, country in enumerate(countries):
        print(f"\n[{i + 1}/{len(countries)}] Processing {country}...")

        raw_villages = fetch_overpass_country(country, max_villages=max_villages_per_country)
        if not raw_villages:
            failed_countries.append(country)
            continue

        enriched = enrich_with_wikidata(raw_villages, country)

        for v in enriched:
            v["heritage_sites_count"] = wikipedia_heritage_count(
                v.get("name", ""), country
            )
            v["cws"] = compute_cws(v)
            v["region"] = assign_region(float(v["lat"]), float(v["lng"]), country)
            v["country"] = country
            time.sleep(0.3)  # be gentle to Wikipedia

        # Compute nearby
        for a, v in enumerate(enriched):
            distances: List[Tuple[float, Dict[str, Any]]] = []
            for b, other in enumerate(enriched):
                if a == b:
                    continue
                dist = haversine_km(v["lat"], v["lng"], other["lat"], other["lng"])
                if dist <= 50:
                    distances.append((dist, other))
            distances.sort(key=lambda x: x[0])
            v["nearby"] = [x[1]["id"] for x in distances[:3]]

        worthy = [
            v for v in enriched
            if v.get("traditions") or v.get("heritage_sites_count", 0) > 0
        ]

        country_exps = 0
        for village in worthy[:5]:
            exps = generate_experiences_gemini(village, client)
            all_experiences.extend(exps)
            country_exps += len(exps)
            time.sleep(2)

        all_villages.extend(enriched)

        info(f"{country}: {len(enriched)} villages, {country_exps} experiences")

        if (i + 1) % 5 == 0:
            save_checkpoint(all_villages, all_experiences, i + 1)
            info(f"Checkpoint saved after {i + 1} countries")

        time.sleep(5)  # between countries

    print(f"\n[DONE] Failed: {failed_countries}")
    return all_villages, all_experiences


def validate_villages(villages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    dedup: Dict[str, Dict[str, Any]] = {}
    for v in villages:
        vid = v.get("id")
        if not vid or v.get("lat") is None or v.get("lng") is None:
            continue
        if vid not in dedup:
            dedup[vid] = v
    return list(dedup.values())


def validate_experiences(
    experiences: List[Dict[str, Any]], village_ids: set
) -> List[Dict[str, Any]]:
    cleaned: List[Dict[str, Any]] = []
    for e in experiences:
        if e.get("villageId") not in village_ids:
            continue
        e["personality_weights"] = normalize_weights(e.get("personality_weights"))
        try:
            if float(e.get("price_eur", 0)) <= 0:
                e["price_eur"] = 15
        except Exception:
            e["price_eur"] = 15
        cleaned.append(e)
    return cleaned


def main() -> None:
    load_dotenv()

    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    google_places_api_key = os.environ.get("GOOGLE_PLACES_API_KEY")

    # Initialize new google-genai client
    client = None
    if gemini_api_key and GENAI_AVAILABLE:
        try:
            client = google_genai.Client(api_key=gemini_api_key)
            info("Gemini client initialized (google-genai)")
        except Exception as exc:
            warn(f"Gemini init failed: {exc}")
    else:
        warn("Gemini unavailable — fallback experience generation enabled")

    villages, experiences = seed_all_countries(client)
    maybe_apply_google_places_ratings(villages, experiences, google_places_api_key)

    villages = validate_villages(villages)
    village_ids = {v["id"] for v in villages}
    experiences = validate_experiences(experiences, village_ids)

    root = Path(__file__).resolve().parents[1]
    output_dirs = [root / "data", root / "engine" / "data"]

    villages_json = json.dumps(villages, ensure_ascii=False, indent=2)
    experiences_json = json.dumps(experiences, ensure_ascii=False, indent=2)

    for out_dir in output_dirs:
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / "villages.json").write_text(villages_json, encoding="utf-8")
        (out_dir / "experiences.json").write_text(experiences_json, encoding="utf-8")

    countries = sorted({v.get("country") for v in villages if v.get("country")})
    avg_cws = sum(v.get("cws", 0) for v in villages) / max(1, len(villages))

    print("\n════════════════════════════════")
    print("WanderGraph Seed Complete")
    print(f"Villages:    {len(villages)}")
    print(f"Experiences: {len(experiences)}")
    print(f"Countries:   {len(countries)}")
    print(f"Avg CWS:     {avg_cws:.1f}")
    print("════════════════════════════════")


if __name__ == "__main__":
    main()
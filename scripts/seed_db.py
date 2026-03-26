import json
import math
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests
from dotenv import load_dotenv
from slugify import slugify

try:
    import google.generativeai as genai
except Exception:
    genai = None


OVERPASS_URL = "https://overpass-api.de/api/interpreter"
WIKIDATA_URL = "https://query.wikidata.org/sparql"
WIKIPEDIA_URL = "https://en.wikipedia.org/w/api.php"
GOOGLE_PLACES_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
WIKIDATA_ENTITY_SEARCH_URL = "https://www.wikidata.org/w/api.php"
RESTCOUNTRIES_URL = "https://restcountries.com/v3.1/all"

DEFAULT_COUNTRIES = [
        "Bulgaria",
        "Romania",
        "Greece",
        "Turkey",
        "Serbia",
        "Italy",
        "Spain",
        "Portugal",
        "France",
        "Germany",
        "Poland",
        "Czechia",
        "Austria",
        "Switzerland",
        "Morocco",
        "India",
        "Japan",
        "Mexico",
        "Argentina",
        "Canada",
]

FAST_MODE = os.environ.get("FAST_MODE", "1").strip().lower() not in {"0", "false", "no"}

OVERPASS_QUERY_TEMPLATE = """
[out:json][timeout:60];
area[\"name\"=\"{country}\"][\"admin_level\"=\"2\"]->.target;
(
    node[\"place\"~\"village|hamlet|isolated_dwelling|town\"](area.target);
);
out body {limit};
""".strip()

WIKIDATA_SPARQL_TEMPLATE = """
SELECT ?village ?villageLabel ?coord ?population ?altitude ?tradition ?traditionLabel ?description WHERE {
    ?village wdt:P17 wd:{country_qid}.
  ?village wdt:P31/wdt:P279* wd:Q532.
  OPTIONAL { ?village wdt:P625 ?coord. }
  OPTIONAL { ?village wdt:P1082 ?population. }
  OPTIONAL { ?village wdt:P2044 ?altitude. }
  OPTIONAL { ?village wdt:P2596 ?tradition. }
  OPTIONAL {
    ?village schema:description ?description.
    FILTER(LANG(?description) IN (\"en\", \"bg\"))
  }
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language \"en,bg\".
    ?village rdfs:label ?villageLabel.
    ?tradition rdfs:label ?traditionLabel.
  }
}
LIMIT 2000
""".strip()

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


def warn(msg: str) -> None:
    print(f"[WARN] {msg}")


def info(msg: str) -> None:
    print(f"[INFO] {msg}")


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
    # Typical value: Point(25.123 42.456)
    m = re.search(r"Point\(([-\d\.]+)\s+([-\d\.]+)\)", raw)
    if not m:
        return None, None
    try:
        lng = float(m.group(1))
        lat = float(m.group(2))
        return lat, lng
    except ValueError:
        return None, None


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def assign_region(lat: float, lng: float, country: str) -> str:
    if normalize_name(country) != "bulgaria":
        # For worldwide data, keep region stable per country unless custom logic is added.
        return country
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
        if lng < 24.0:
            return "Vratsa & Northwest"
        elif lng < 26.0:
            return "Danube Plain"
        else:
            return "Dobrudja & Northeast"


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


def parse_countries(session: requests.Session) -> List[str]:
    raw = os.environ.get("COUNTRIES", "all").strip()
    max_countries = max(1, int(os.environ.get("MAX_COUNTRIES", "60")))

    if not raw:
        return DEFAULT_COUNTRIES[:max_countries]

    if raw.lower() == "all":
        try:
            resp = session.get(RESTCOUNTRIES_URL, params={"fields": "name"}, timeout=40)
            resp.raise_for_status()
            payload = resp.json()
            names: List[str] = []
            for item in payload:
                common = ((item or {}).get("name") or {}).get("common")
                if isinstance(common, str) and common.strip():
                    names.append(common.strip())
            dedup = sorted(set(names))
            return dedup[:max_countries]
        except Exception as exc:
            warn(f"Failed to load all countries list, using defaults: {exc}")
            return DEFAULT_COUNTRIES[:max_countries]

    out = [x.strip() for x in raw.split(",") if x.strip()]
    if not out:
        out = DEFAULT_COUNTRIES
    return out[:max_countries]


def fetch_overpass_for_country(
    session: requests.Session,
    country: str,
    per_country_limit: int,
) -> List[Dict[str, Any]]:
    info(f"Fetching villages from Overpass for {country}...")
    escaped_country = country.replace('"', '\\"')
    query = OVERPASS_QUERY_TEMPLATE.format(country=escaped_country, limit=per_country_limit)
    retries = 2
    for attempt in range(1, retries + 1):
        try:
            resp = session.post(OVERPASS_URL, data=query.encode("utf-8"), timeout=90)
            resp.raise_for_status()
            payload = resp.json()
            elements = payload.get("elements", [])
            villages: List[Dict[str, Any]] = []
            for el in elements:
                tags = el.get("tags", {})
                if "lat" not in el or "lon" not in el:
                    continue
                if not tags.get("name"):
                    continue

                name = tags.get("name:en") or tags.get("name")
                name_bg = tags.get("name:bg") or tags.get("name")
                vid = slugify(f"{name}-{country}")
                village = {
                    "id": vid,
                    "name": name,
                    "name_bg": name_bg,
                    "country": country,
                    "council": tags.get("is_in:municipality") or tags.get("addr:county") or tags.get("county"),
                    "settlement_type": tags.get("place"),
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
                }
                villages.append(village)
            info(f"Overpass returned {len(villages)} candidate villages for {country}")
            return villages
        except Exception as exc:
            warn(f"Overpass {country} attempt {attempt}/{retries} failed: {exc}")
            if attempt < retries:
                time.sleep(10)
    return []


def fetch_overpass(
    session: requests.Session,
    countries: List[str],
    max_total: int,
    per_country_limit: int,
) -> List[Dict[str, Any]]:
    info(f"Fetching villages worldwide from {len(countries)} countries...")
    all_villages: List[Dict[str, Any]] = []
    seen_osm: set[str] = set()

    workers = max(1, int(os.environ.get("OVERPASS_WORKERS", "10" if FAST_MODE else "6")))
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = {
            ex.submit(fetch_overpass_for_country, session, country, per_country_limit): country
            for country in countries
        }
        for fut in as_completed(futures):
            country_villages = fut.result() or []
            for village in country_villages:
                osm_id = str(village.get("osm_id"))
                if osm_id in seen_osm:
                    continue
                seen_osm.add(osm_id)
                all_villages.append(village)
                if len(all_villages) >= max_total:
                    return all_villages
    return all_villages


def resolve_country_qid(session: requests.Session, country: str) -> Optional[str]:
    try:
        params = {
            "action": "wbsearchentities",
            "search": country,
            "language": "en",
            "type": "item",
            "format": "json",
            "limit": 5,
        }
        resp = session.get(WIKIDATA_ENTITY_SEARCH_URL, params=params, timeout=30)
        resp.raise_for_status()
        payload = resp.json()
        search = payload.get("search", [])
        if not search:
            return None
        return search[0].get("id")
    except Exception as exc:
        warn(f"Wikidata country resolve failed for {country}: {exc}")
        return None


def fetch_wikidata_for_country(
    session: requests.Session,
    country: str,
    country_qid: str,
) -> List[Dict[str, Any]]:
    info(f"Fetching Wikidata metadata for {country} ({country_qid})...")
    try:
        headers = {
            "User-Agent": "WanderGraph/1.0",
            "Accept": "application/sparql-results+json",
        }
        query = WIKIDATA_SPARQL_TEMPLATE.format(country_qid=country_qid)
        params = {"query": query, "format": "json"}
        resp = session.get(WIKIDATA_URL, params=params, headers=headers, timeout=120)
        resp.raise_for_status()
        results = resp.json().get("results", {}).get("bindings", [])
    except Exception as exc:
        warn(f"Wikidata query failed for {country}: {exc}")
        return []

    merged: Dict[str, Dict[str, Any]] = {}
    for row in results:
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
        item = merged.setdefault(
            wid,
            {
                "wikidata_id": wid,
                "label": label,
                "lat": lat,
                "lng": lng,
                "population_2011": safe_int(population),
                "altitude_m": safe_int(altitude),
                "description": description,
                "traditions": set(),
                "country": country,
            },
        )

        if item.get("label") is None and label:
            item["label"] = label
        if item.get("lat") is None and lat is not None:
            item["lat"] = lat
            item["lng"] = lng
        if item.get("population_2011") is None:
            item["population_2011"] = safe_int(population)
        if item.get("altitude_m") is None:
            item["altitude_m"] = safe_int(altitude)
        if item.get("description") is None and description:
            item["description"] = description
        if tradition_label:
            item["traditions"].add(tradition_label)

    normalized: List[Dict[str, Any]] = []
    for item in merged.values():
        item["traditions"] = sorted(item["traditions"])
        normalized.append(item)

    info(f"Wikidata produced {len(normalized)} unique entities for {country}")
    return normalized


def fetch_wikidata(session: requests.Session, countries: List[str]) -> List[Dict[str, Any]]:
    if os.environ.get("ENABLE_WIKIDATA", "1").strip().lower() in {"0", "false", "no"}:
        info("ENABLE_WIKIDATA disabled; skipping Wikidata step")
        return []

    out: List[Dict[str, Any]] = []

    workers = max(1, int(os.environ.get("WIKIDATA_WORKERS", "8" if FAST_MODE else "4")))

    with ThreadPoolExecutor(max_workers=workers) as ex:
        qid_futures = {ex.submit(resolve_country_qid, session, country): country for country in countries}
        country_qids: List[Tuple[str, str]] = []
        for fut in as_completed(qid_futures):
            country = qid_futures[fut]
            qid = fut.result()
            if qid:
                country_qids.append((country, qid))

    with ThreadPoolExecutor(max_workers=workers) as ex:
        data_futures = {
            ex.submit(fetch_wikidata_for_country, session, country, qid): country
            for country, qid in country_qids
        }
        for fut in as_completed(data_futures):
            out.extend(fut.result() or [])

    return out


def best_match_village(
    villages: List[Dict[str, Any]],
    wd_item: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    label = wd_item.get("label")
    wd_lat = wd_item.get("lat")
    wd_lng = wd_item.get("lng")

    if not villages:
        return None

    country = wd_item.get("country")
    candidates = villages
    if country:
        scoped = [v for v in villages if normalize_name(str(v.get("country", ""))) == normalize_name(str(country))]
        if scoped:
            candidates = scoped

    best: Optional[Dict[str, Any]] = None
    best_ratio = 0.0
    if label:
        n_label = normalize_name(label)
        for v in candidates:
            ratio = SequenceMatcher(None, n_label, normalize_name(v.get("name", ""))).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best = v

    if best and best_ratio >= 0.90:
        return best

    if wd_lat is not None and wd_lng is not None:
        by_distance: List[Tuple[float, Dict[str, Any]]] = []
        for v in candidates:
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


def enrich_with_wikidata(villages: List[Dict[str, Any]], wikidata_rows: List[Dict[str, Any]]) -> None:
    info("Matching Wikidata entities to Overpass villages...")
    matched = 0
    for row in wikidata_rows:
        v = best_match_village(villages, row)
        if not v:
            continue

        v["wikidata_id"] = row.get("wikidata_id")
        if not v.get("description"):
            v["description"] = row.get("description")
        if v.get("altitude_m") is None and row.get("altitude_m") is not None:
            v["altitude_m"] = row.get("altitude_m")
        if v.get("population_2011") is None and row.get("population_2011") is not None:
            v["population_2011"] = row.get("population_2011")

        merged_traditions = set(v.get("traditions") or [])
        merged_traditions.update(row.get("traditions") or [])
        v["traditions"] = sorted(merged_traditions)
        matched += 1

    info(f"Matched {matched} Wikidata records to villages")


def wikipedia_heritage_count(session: requests.Session, village_name: str, country: str) -> int:
    params = {
        "action": "query",
        "titles": f"{village_name}, {country}",
        "prop": "revisions",
        "rvprop": "content",
        "format": "json",
        "formatversion": 2,
    }
    try:
        resp = session.get(WIKIPEDIA_URL, params=params, timeout=30)
        resp.raise_for_status()
        payload = resp.json()
        pages = payload.get("query", {}).get("pages", [])
        text_chunks: List[str] = []
        for p in pages:
            for rev in p.get("revisions", []) or []:
                slots = rev.get("slots") or {}
                if "main" in slots and isinstance(slots["main"], dict):
                    content = slots["main"].get("content")
                    if content:
                        text_chunks.append(content)
                elif "*" in rev and rev.get("*"):
                    text_chunks.append(rev.get("*"))
        blob = "\n".join(text_chunks).lower()
        if not blob:
            return 0
        hits = 0
        for kw in HERITAGE_KEYWORDS:
            hits += len(re.findall(re.escape(kw.lower()), blob))
        return min(10, hits)
    except Exception as exc:
        warn(f"Wikipedia lookup failed for '{village_name}': {exc}")
        return 0


def build_gemini_prompt(village: Dict[str, Any], count: int) -> str:
    country = village.get("country") or "Unknown Country"
    council = village.get("council") or village.get("region") or "local council"
    return f"""
Create {count} travel experiences for this village community.
Return ONLY a valid JSON array.

Village: {village.get('name')} ({country}), Council: {council}, Population: {village.get('population')},
Traditions: {village.get('traditions')}, CWS: {village.get('cws')}

[
  {{
    "name": "max 5 words",
    "type": "craft|hike|homestay|ceremony|cooking|volunteer|folklore",
    "description": "2 sentences, specific and authentic",
    "duration": "e.g. 3 days",
    "price_eur": 0-80,
    "host_name": "realistic Bulgarian name",
    "host_bio": "1 sentence specific expertise",
    "host_rating": 4.3-5.0,
    "personality_weights": [explorer, connector, restorer, achiever, guardian],
    "rarity_score": 1-10
  }}
]

personality_weights must sum to 1.0.
Low CWS village = more raw/adventurous experiences.
High CWS village = more craft/cultural experiences.
""".strip()


def strip_code_fences(text: str) -> str:
    if not text:
        return ""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z0-9]*\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


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


def fallback_experiences(village: Dict[str, Any], count: int) -> List[Dict[str, Any]]:
    traditions_blob = " ".join((village.get("traditions") or [])).lower()
    altitude = village.get("altitude_m") or 0

    if "music" in traditions_blob:
        exp_type = "craft"
        name = "Rhythm & Craft Days"
        desc = (
            "Join local artisans and musicians in village workshops. "
            "Learn rhythms, handcrafts, and evening community traditions."
        )
    elif altitude > 1000:
        exp_type = "hike"
        name = "Highland Ridge Trek"
        desc = (
            "Explore mountain trails with a local guide and learn seasonal practices. "
            "Spend evenings sharing stories and mountain food with hosts."
        )
    else:
        exp_type = "homestay"
        name = "Village Home Immersion"
        desc = (
            "Stay with a host family and take part in daily rural routines. "
            "Discover local food, oral history, and small community gatherings."
        )

    people = [
        ("Ivaylo Petrov", "Local facilitator of village heritage activities."),
        ("Mariya Stoyanova", "Community host focused on traditional food and crafts."),
        ("Nikolay Dimitrov", "Guide experienced in regional history and storytelling."),
    ]

    out: List[Dict[str, Any]] = []
    for i in range(count):
        host_name, host_bio = people[i % len(people)]
        out.append(
            {
                "name": name,
                "type": exp_type,
                "description": desc,
                "duration": f"{2 + i} days",
                "price_eur": 25 + i * 8,
                "host_name": host_name,
                "host_bio": host_bio,
                "host_rating": 4.6,
                "personality_weights": [0.3, 0.2, 0.2, 0.15, 0.15],
                "rarity_score": min(10, 6 + i),
            }
        )
    return out


def parse_experience_array(raw_text: str) -> List[Dict[str, Any]]:
    text = strip_code_fences(raw_text)
    try:
        data = json.loads(text)
    except Exception:
        return []
    if not isinstance(data, list):
        return []
    return [x for x in data if isinstance(x, dict)]


def generate_experiences_for_village(
    village: Dict[str, Any],
    model: Any,
) -> List[Dict[str, Any]]:
    desired = 3 if (village.get("cws") or 0) < 40 else 2

    if model is None:
        return fallback_experiences(village, desired)

    prompt = build_gemini_prompt(village, desired)
    try:
        response = model.generate_content(prompt)
        text = getattr(response, "text", "") or ""
        items = parse_experience_array(text)
        if not items:
            raise ValueError("Gemini did not return a JSON array")
        return items[:desired]
    except Exception as exc:
        warn(f"Gemini generation failed for {village.get('name')}: {exc}")
        return fallback_experiences(village, desired)


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
        price = 25
    if price <= 0:
        price = 15
    price = min(80, max(1, price))

    try:
        rarity = int(raw.get("rarity_score", 5))
    except Exception:
        rarity = 5
    rarity = min(10, max(1, rarity))

    return {
        "name": str(raw.get("name") or "Village Experience")[:60],
        "type": exp_type,
        "description": str(raw.get("description") or "Authentic local activity with community hosts."),
        "duration": str(raw.get("duration") or "2 days"),
        "price_eur": round(price, 2),
        "host_name": str(raw.get("host_name") or "Petar Ivanov"),
        "host_bio": str(raw.get("host_bio") or "Local organizer with regional expertise."),
        "host_rating": round(host_rating, 2),
        "personality_weights": normalize_weights(raw.get("personality_weights")),
        "rarity_score": rarity,
    }


def maybe_apply_google_places_ratings(
    session: requests.Session,
    villages: List[Dict[str, Any]],
    experiences: List[Dict[str, Any]],
    api_key: Optional[str],
) -> None:
    if not api_key:
        info("GOOGLE_PLACES_API_KEY not set; skipping Google Places step")
        return

    info("Applying Google Places ratings for top 20 villages by CWS...")
    top = sorted(villages, key=lambda v: v.get("cws", 0), reverse=True)[:20]
    rating_map: Dict[str, float] = {}

    for v in top:
        params = {
            "query": f"guesthouse {v.get('name')} {v.get('country', '')}",
            "key": api_key,
        }
        try:
            resp = session.get(GOOGLE_PLACES_URL, params=params, timeout=25)
            resp.raise_for_status()
            payload = resp.json()
            results = payload.get("results", [])
            if results and isinstance(results[0], dict) and "rating" in results[0]:
                rating_map[v["id"]] = float(results[0]["rating"])
        except Exception as exc:
            warn(f"Google Places lookup failed for {v.get('name')}: {exc}")
        time.sleep(0.2)

    if not rating_map:
        return

    for exp in experiences:
        village_id = exp.get("villageId")
        if village_id in rating_map:
            exp["host_rating"] = round(min(5.0, max(4.3, rating_map[village_id])), 2)


def validate_villages(villages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    dedup: Dict[str, Dict[str, Any]] = {}
    for v in villages:
        vid = v.get("id")
        if not vid or v.get("lat") is None or v.get("lng") is None:
            continue
        if vid not in dedup:
            dedup[vid] = v

    cleaned = list(dedup.values())
    if len(cleaned) < 30:
        raise RuntimeError(f"Validation failed: only {len(cleaned)} villages (minimum 30 required)")
    return cleaned


def validate_experiences(
    experiences: List[Dict[str, Any]],
    village_ids: set,
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

    if len(cleaned) < 40:
        raise RuntimeError(
            f"Validation failed: only {len(cleaned)} experiences (minimum 40 required)"
        )
    return cleaned


def main() -> None:
    load_dotenv()

    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    google_places_api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
    max_villages = max(60, int(os.environ.get("MAX_VILLAGES", "700" if FAST_MODE else "500")))
    per_country_limit = max(5, int(os.environ.get("PER_COUNTRY_LIMIT", "30" if FAST_MODE else "25")))

    model = None
    if gemini_api_key and genai is not None:
        try:
            genai.configure(api_key=gemini_api_key)
            model = genai.GenerativeModel("gemini-2.0-flash")
        except Exception as exc:
            warn(f"Gemini init failed, fallback mode enabled: {exc}")
    else:
        warn("GEMINI_API_KEY missing or google-generativeai unavailable; using fallback generator")

    session = requests.Session()
    countries = parse_countries(session)
    info(f"Target countries: {countries}")

    villages = fetch_overpass(
        session=session,
        countries=countries,
        max_total=max_villages,
        per_country_limit=per_country_limit,
    )
    if not villages:
        raise RuntimeError("No villages fetched from Overpass")

    wikidata_rows = fetch_wikidata(session, countries)
    enrich_with_wikidata(villages, wikidata_rows)

    info("Fetching heritage keyword counts from Wikipedia...")
    heritage_sample_size = max(0, int(os.environ.get("HERITAGE_SAMPLE_SIZE", "160" if FAST_MODE else str(len(villages)))))
    village_order = sorted(villages, key=lambda x: (x.get("population") or 0), reverse=True)
    target_for_heritage = village_order[: min(len(village_order), heritage_sample_size)]
    target_ids = {v["id"] for v in target_for_heritage}

    for v in villages:
        if v["id"] not in target_ids:
            v["heritage_sites_count"] = 0

    workers = max(1, int(os.environ.get("WIKIPEDIA_WORKERS", "12" if FAST_MODE else "4")))
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = {
            ex.submit(
                wikipedia_heritage_count,
                session,
                v.get("name", ""),
                v.get("country", "Bulgaria"),
            ): v
            for v in target_for_heritage
        }
        for fut in as_completed(futures):
            v = futures[fut]
            try:
                v["heritage_sites_count"] = fut.result()
            except Exception:
                v["heritage_sites_count"] = 0

    info("Computing CWS, regions, and nearby villages...")
    for v in villages:
        v["cws"] = compute_cws(v)
        v["region"] = assign_region(float(v["lat"]), float(v["lng"]), str(v.get("country", "")))

    for i, v in enumerate(villages):
        distances: List[Tuple[float, Dict[str, Any]]] = []
        for j, other in enumerate(villages):
            if i == j:
                continue
            if normalize_name(str(other.get("country", ""))) != normalize_name(str(v.get("country", ""))):
                continue
            dist = haversine_km(v["lat"], v["lng"], other["lat"], other["lng"])
            if dist <= 50:
                distances.append((dist, other))
        distances.sort(key=lambda x: x[0])
        v["nearby"] = [x[1]["id"] for x in distances[:3]]

    experiences: List[Dict[str, Any]] = []
    info("Generating village experiences with Gemini/fallback...")
    eligible = [
        v for v in villages if v.get("traditions") or (v.get("heritage_sites_count", 0) > 0)
    ]
    max_exp_villages = max(20, int(os.environ.get("MAX_EXPERIENCE_VILLAGES", "120" if FAST_MODE else str(len(eligible)))))
    eligible = sorted(eligible, key=lambda x: (x.get("cws", 0), x.get("heritage_sites_count", 0)), reverse=True)[:max_exp_villages]

    for v in eligible:

        generated = generate_experiences_for_village(v, model)
        for idx, item in enumerate(generated, start=1):
            exp = sanitize_experience(item)
            exp["id"] = f"e_{v['id']}_{idx}"
            exp["villageId"] = v["id"]
            exp["hostId"] = f"h_{v['id']}_{idx}"
            experiences.append(exp)

        time.sleep(0.2 if FAST_MODE else 1.5)

    maybe_apply_google_places_ratings(
        session=session,
        villages=villages,
        experiences=experiences,
        api_key=google_places_api_key,
    )

    villages = validate_villages(villages)
    village_ids = {v["id"] for v in villages}
    experiences = validate_experiences(experiences, village_ids)

    output_dir = Path(__file__).resolve().parents[1] / "data"
    output_dir.mkdir(parents=True, exist_ok=True)

    villages_path = output_dir / "villages.json"
    experiences_path = output_dir / "experiences.json"

    villages_path.write_text(json.dumps(villages, ensure_ascii=False, indent=2), encoding="utf-8")
    experiences_path.write_text(
        json.dumps(experiences, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    regions = sorted({v.get("region") for v in villages if v.get("region")})
    avg_cws = sum(v.get("cws", 0) for v in villages) / max(1, len(villages))

    print(f"Villages: {len(villages)}")
    print(f"Experiences: {len(experiences)}")
    print(f"Countries: {sorted({v.get('country') for v in villages if v.get('country')})}")
    print(f"Regions: {regions}")
    print(f"Avg CWS: {avg_cws:.2f}")


if __name__ == "__main__":
    main()

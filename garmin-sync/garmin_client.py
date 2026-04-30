import logging
import os
import threading
import time
from datetime import date, timedelta
from garminconnect import Garmin

logger = logging.getLogger(__name__)
TOKEN_DIR = '/tokens'

SPORT_MAP = {
    'running': 'Course',
    'trail_running': 'Trail',
    'treadmill_running': 'Course',
    'cycling': 'Cyclisme',
    'road_biking': 'Cyclisme',
    'mountain_biking': 'Cyclisme',
    'virtual_ride': 'Cyclisme',
    'indoor_cycling': 'Cyclisme',
    'pool_swimming': 'Natation',
    'open_water_swimming': 'Natation',
    'strength_training': 'Musculation',
    'fitness_equipment': 'Musculation',
    'crossfit': 'CrossFit',
    'hiit': 'CrossFit',
    'triathlon': 'Triathlon',
    'walking': 'Course',
    'other': 'Course',
}

def token_dir(user_id: str) -> str:
    d = os.path.join(TOKEN_DIR, user_id)
    os.makedirs(d, exist_ok=True)
    return d

# ── MFA login sessions ────────────────────────────────────────────────────────

_sessions: dict = {}

class _Session:
    def __init__(self):
        self.mfa_needed  = threading.Event()
        self.mfa_ready   = threading.Event()
        self.done        = threading.Event()
        self.code        = None
        self.success     = False
        self.error       = None

def start_login(user_id: str, email: str, password: str) -> str:
    """Returns 'mfa_required' | 'success'. Raises on error."""
    sess = _Session()
    _sessions[user_id] = sess

    def run():
        def get_mfa():
            sess.mfa_needed.set()
            sess.mfa_ready.wait(timeout=300)
            return sess.code

        try:
            client = Garmin(email, password, prompt_mfa=get_mfa)
            client.login(token_dir(user_id))
            sess.success = True
        except Exception as e:
            sess.error = str(e)
            logger.exception("Garmin login error user=%s", user_id)
        finally:
            sess.done.set()

    threading.Thread(target=run, daemon=True).start()

    deadline = time.time() + 10
    while time.time() < deadline:
        if sess.mfa_needed.is_set():
            return 'mfa_required'
        if sess.done.is_set():
            break
        time.sleep(0.1)

    if sess.done.is_set():
        _sessions.pop(user_id, None)
        if sess.success:
            return 'success'
        raise Exception(sess.error or 'Login échoué')

    return 'mfa_required'

def complete_mfa(user_id: str, code: str) -> None:
    sess = _sessions.get(user_id)
    if not sess:
        raise Exception("Aucune session de connexion en attente")
    sess.code = code
    sess.mfa_ready.set()
    sess.done.wait(timeout=30)
    _sessions.pop(user_id, None)
    if not sess.success:
        raise Exception(sess.error or 'Authentification MFA échouée')

# ── Data sync ─────────────────────────────────────────────────────────────────

def get_client(user_id: str, email: str) -> Garmin:
    client = Garmin(email, "")
    client.login(token_dir(user_id))
    return client

def fetch_wellness(client: Garmin, date_str: str) -> dict:
    data = {}

    try:
        hrv = client.get_hrv_data(date_str)
        val = (hrv or {}).get('hrvSummary', {}).get('lastNight5MinHigh')
        if val is not None:
            data['hrv_ms'] = float(val)
    except Exception:
        pass

    try:
        bb = client.get_body_battery(date_str, date_str) or []
        vals = [e.get('charged') for e in bb if e.get('date') == date_str and e.get('charged')]
        if vals:
            data['body_battery_max'] = max(vals)
            data['body_battery_min'] = min(vals)
    except Exception:
        pass

    try:
        sl = (client.get_sleep_data(date_str) or {}).get('dailySleepDTO', {})
        score = (sl.get('sleepScores') or {}).get('overall', {}).get('value')
        if score is not None:
            data['sleep_score'] = int(score)
        for field, key in [
            ('sleep_duration_min', 'sleepTimeSeconds'),
            ('sleep_deep_min',     'deepSleepSeconds'),
            ('sleep_rem_min',      'remSleepSeconds'),
            ('sleep_light_min',    'lightSleepSeconds'),
            ('sleep_awake_min',    'awakeSleepSeconds'),
        ]:
            secs = sl.get(key)
            if secs:
                data[field] = int(secs) // 60
    except Exception:
        pass

    try:
        stats = client.get_stats(date_str) or {}
        if stats.get('restingHeartRate'):
            data['resting_hr'] = int(stats['restingHeartRate'])
        if stats.get('averageStressLevel') and stats['averageStressLevel'] > 0:
            data['stress_avg'] = int(stats['averageStressLevel'])
    except Exception:
        pass

    try:
        tr = (client.get_training_status(date_str) or {}).get('mostRecentTrainingLoadBalance', {})
        if tr.get('acuteLoad'):
            data['acute_load'] = float(tr['acuteLoad'])
        if tr.get('chronicLoad'):
            data['chronic_load'] = float(tr['chronicLoad'])
        if tr.get('recoveryAdvice'):
            data['recovery_time_hours'] = int(tr['recoveryAdvice'])
    except Exception:
        pass

    return data

def fetch_activities(client: Garmin, start_date: str, end_date: str) -> list:
    """Récupère les activités sportives et les normalise."""
    try:
        raw = client.get_activities_by_date(start_date, end_date) or []
    except Exception:
        logger.exception("Erreur fetch_activities %s→%s", start_date, end_date)
        return []

    activities = []
    for a in raw:
        activity_id = a.get('activityId')
        if not activity_id:
            continue

        type_key = (a.get('activityType') or {}).get('typeKey', 'other')
        sport = SPORT_MAP.get(type_key, 'Course')

        start_time = a.get('startTimeLocal') or a.get('startTimeGMT', '')
        activity_date = start_time[:10] if len(start_time) >= 10 else None
        if not activity_date:
            continue

        duration_sec = a.get('duration') or 0
        distance_m = a.get('distance')
        avg_hr = a.get('averageHR')
        avg_power = a.get('averagePower')
        avg_speed = a.get('averageSpeed')  # m/s
        tss = a.get('trainingStressScore')

        # Calcul allure pour course / trail
        pace = None
        if sport in ('Course', 'Trail') and avg_speed and avg_speed > 0:
            pace_sec = 1000 / avg_speed
            pace = f"{int(pace_sec // 60)}:{int(pace_sec % 60):02d}"

        activities.append({
            'garmin_activity_id': int(activity_id),
            'date': activity_date,
            'sport': sport,
            'title': a.get('activityName') or f'{sport}',
            'duration_min': int(duration_sec // 60) if duration_sec else None,
            'distance_meters': float(distance_m) if distance_m else None,
            'hr_avg': int(avg_hr) if avg_hr else None,
            'power_avg_watts': int(avg_power) if avg_power else None,
            'pace_per_km': pace,
            'tss': float(tss) if tss else None,
        })

    logger.info("fetch_activities: %d activités récupérées", len(activities))
    return activities

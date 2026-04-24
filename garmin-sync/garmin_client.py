import logging
import os
import threading
import time
from garminconnect import Garmin

logger = logging.getLogger(__name__)
TOKEN_DIR = '/tokens'

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

    # Thread still running → waiting for MFA
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

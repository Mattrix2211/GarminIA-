import os
import psycopg2
from contextlib import contextmanager

def _conn():
    return psycopg2.connect(
        host=os.getenv('POSTGRES_HOST', 'postgres'),
        port=int(os.getenv('POSTGRES_PORT', 5432)),
        database=os.getenv('POSTGRES_DB', 'garminia'),
        user=os.getenv('POSTGRES_USER', 'garminia'),
        password=os.getenv('POSTGRES_PASSWORD'),
    )

@contextmanager
def cur():
    conn = _conn()
    try:
        c = conn.cursor()
        yield c
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def save_garmin_device(user_id: str, email: str):
    with cur() as c:
        c.execute("""
            INSERT INTO user_devices (user_id, provider, access_token, connected, connected_at, updated_at)
            VALUES (%s, 'garmin', %s, TRUE, NOW(), NOW())
            ON CONFLICT (user_id, provider) DO UPDATE SET
                access_token = EXCLUDED.access_token,
                connected = TRUE,
                connected_at = NOW(),
                updated_at = NOW()
        """, (user_id, email))

def get_garmin_device(user_id: str):
    with cur() as c:
        c.execute(
            "SELECT access_token FROM user_devices WHERE user_id = %s AND provider = 'garmin' AND connected = TRUE",
            (user_id,)
        )
        row = c.fetchone()
        return {'email': row[0]} if row else None

def get_all_garmin_users():
    with cur() as c:
        c.execute(
            "SELECT user_id::text, access_token FROM user_devices WHERE provider = 'garmin' AND connected = TRUE"
        )
        return [{'user_id': r[0], 'email': r[1]} for r in c.fetchall()]

def set_sync_time(user_id: str):
    with cur() as c:
        c.execute(
            "UPDATE user_devices SET last_sync_at = NOW() WHERE user_id = %s AND provider = 'garmin'",
            (user_id,)
        )

def upsert_daily(user_id: str, date_str: str, d: dict):
    with cur() as c:
        c.execute("""
            INSERT INTO garmin_data_daily
                (user_id, date, hrv_ms, body_battery_max, body_battery_min,
                 sleep_score, sleep_duration_min, sleep_deep_min, sleep_rem_min,
                 sleep_light_min, sleep_awake_min, resting_hr, stress_avg,
                 acute_load, chronic_load, recovery_time_hours)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (user_id, date) DO UPDATE SET
                hrv_ms              = COALESCE(EXCLUDED.hrv_ms, garmin_data_daily.hrv_ms),
                body_battery_max    = COALESCE(EXCLUDED.body_battery_max, garmin_data_daily.body_battery_max),
                body_battery_min    = COALESCE(EXCLUDED.body_battery_min, garmin_data_daily.body_battery_min),
                sleep_score         = COALESCE(EXCLUDED.sleep_score, garmin_data_daily.sleep_score),
                sleep_duration_min  = COALESCE(EXCLUDED.sleep_duration_min, garmin_data_daily.sleep_duration_min),
                sleep_deep_min      = COALESCE(EXCLUDED.sleep_deep_min, garmin_data_daily.sleep_deep_min),
                sleep_rem_min       = COALESCE(EXCLUDED.sleep_rem_min, garmin_data_daily.sleep_rem_min),
                sleep_light_min     = COALESCE(EXCLUDED.sleep_light_min, garmin_data_daily.sleep_light_min),
                sleep_awake_min     = COALESCE(EXCLUDED.sleep_awake_min, garmin_data_daily.sleep_awake_min),
                resting_hr          = COALESCE(EXCLUDED.resting_hr, garmin_data_daily.resting_hr),
                stress_avg          = COALESCE(EXCLUDED.stress_avg, garmin_data_daily.stress_avg),
                acute_load          = COALESCE(EXCLUDED.acute_load, garmin_data_daily.acute_load),
                chronic_load        = COALESCE(EXCLUDED.chronic_load, garmin_data_daily.chronic_load),
                recovery_time_hours = COALESCE(EXCLUDED.recovery_time_hours, garmin_data_daily.recovery_time_hours)
        """, (
            user_id, date_str,
            d.get('hrv_ms'), d.get('body_battery_max'), d.get('body_battery_min'),
            d.get('sleep_score'), d.get('sleep_duration_min'), d.get('sleep_deep_min'),
            d.get('sleep_rem_min'), d.get('sleep_light_min'), d.get('sleep_awake_min'),
            d.get('resting_hr'), d.get('stress_avg'),
            d.get('acute_load'), d.get('chronic_load'), d.get('recovery_time_hours'),
        ))

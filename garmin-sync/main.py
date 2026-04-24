import logging
import os
from datetime import date, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from flask import Flask, jsonify, request

import db
import garmin_client as gc

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
os.makedirs('/tokens', exist_ok=True)

# ── Healthcheck ───────────────────────────────────────────────────────────────

@app.get('/health')
def health():
    return jsonify({'ok': True})

# ── Login flow ────────────────────────────────────────────────────────────────

@app.post('/login/start')
def login_start():
    body = request.json or {}
    user_id  = body.get('userId')
    email    = body.get('email')
    password = body.get('password')
    if not all([user_id, email, password]):
        return jsonify({'error': 'userId, email et password requis'}), 400
    try:
        status = gc.start_login(user_id, email, password)
        if status == 'success':
            db.save_garmin_device(user_id, email)
        return jsonify({'status': status, 'email': email})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.post('/login/mfa')
def login_mfa():
    body = request.json or {}
    user_id = body.get('userId')
    email   = body.get('email', '')
    code    = body.get('code')
    if not all([user_id, code]):
        return jsonify({'error': 'userId et code requis'}), 400
    try:
        gc.complete_mfa(user_id, code)
        db.save_garmin_device(user_id, email)
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── Sync ──────────────────────────────────────────────────────────────────────

@app.post('/sync/<user_id>')
def sync_user(user_id):
    device = db.get_garmin_device(user_id)
    if not device:
        return jsonify({'error': 'Compte Garmin non connecté'}), 404
    try:
        client = gc.get_client(user_id, device['email'])
        for i in range(7):
            d = (date.today() - timedelta(days=i)).isoformat()
            wellness = gc.fetch_wellness(client, d)
            if wellness:
                db.upsert_daily(user_id, d, wellness)
        db.set_sync_time(user_id)
        logger.info("Sync OK user=%s", user_id)
        return jsonify({'ok': True})
    except Exception as e:
        logger.exception("Sync error user=%s", user_id)
        return jsonify({'error': str(e)}), 500

@app.get('/status/<user_id>')
def status(user_id):
    device = db.get_garmin_device(user_id)
    return jsonify({'connected': device is not None})

# ── Scheduler ─────────────────────────────────────────────────────────────────

def sync_all():
    logger.info("Sync quotidienne démarrée")
    for u in db.get_all_garmin_users():
        try:
            client = gc.get_client(u['user_id'], u['email'])
            for i in range(7):
                d = (date.today() - timedelta(days=i)).isoformat()
                wellness = gc.fetch_wellness(client, d)
                if wellness:
                    db.upsert_daily(u['user_id'], d, wellness)
            db.set_sync_time(u['user_id'])
            logger.info("Sync OK user=%s", u['user_id'])
        except Exception:
            logger.exception("Sync failed user=%s", u['user_id'])

if __name__ == '__main__':
    scheduler = BackgroundScheduler()
    scheduler.add_job(sync_all, 'cron', hour=6, minute=0)
    scheduler.start()
    port = int(os.getenv('GARMIN_SYNC_PORT', 5001))
    logger.info("garmin-sync démarré sur le port %d", port)
    app.run(host='0.0.0.0', port=port)

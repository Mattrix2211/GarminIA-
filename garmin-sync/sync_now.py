#!/usr/bin/env python3
"""
Sync manuelle immédiate — à lancer depuis le container.
Usage : docker compose exec garmin-sync python sync_now.py
"""
import sys
from main import sync_all

print("Démarrage de la synchronisation…")
sync_all()
print("Sync terminée.")

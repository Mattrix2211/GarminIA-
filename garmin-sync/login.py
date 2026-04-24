#!/usr/bin/env python3
"""
Script de connexion initiale Garmin — à lancer une seule fois.
Usage : docker compose exec garmin-sync python login.py
"""
import os
import sys
import psycopg2
from garminconnect import Garmin

def get_conn():
    return psycopg2.connect(
        host=os.getenv('POSTGRES_HOST', 'postgres'),
        port=int(os.getenv('POSTGRES_PORT', 5432)),
        database=os.getenv('POSTGRES_DB', 'garminia'),
        user=os.getenv('POSTGRES_USER', 'garminia'),
        password=os.getenv('POSTGRES_PASSWORD'),
    )

def main():
    print("=== Connexion Garmin Connect ===\n")

    # Récupérer l'email du compte GarminIA (pour trouver le user_id)
    app_email = input("Ton email de connexion à GarminIA : ").strip()
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("SELECT id::text FROM users WHERE email = %s", (app_email,))
        row = c.fetchone()
    conn.close()

    if not row:
        print(f"\n✗ Aucun compte GarminIA trouvé avec '{app_email}'.")
        print("  Crée d'abord un compte dans l'appli, puis relance ce script.")
        sys.exit(1)

    user_id = row[0]
    print(f"✓ Compte trouvé (id: {user_id[:8]}…)\n")

    # Credentials Garmin Connect
    garmin_email    = input("Email Garmin Connect : ").strip()
    garmin_password = input("Mot de passe Garmin : ").strip()

    token_dir = f'/tokens/{user_id}'
    os.makedirs(token_dir, exist_ok=True)

    print("\nConnexion à Garmin…")

    def prompt_mfa():
        return input("Code MFA (depuis l'app Garmin Connect) : ").strip()

    try:
        client = Garmin(garmin_email, garmin_password, prompt_mfa=prompt_mfa)
        client.login(token_dir)
    except Exception as e:
        print(f"\n✗ Échec de connexion : {e}")
        sys.exit(1)

    print("✓ Connecté ! Tokens sauvegardés.\n")

    # Enregistrer dans la base de données
    conn = get_conn()
    with conn:
        with conn.cursor() as c:
            c.execute("""
                INSERT INTO user_devices
                    (user_id, provider, access_token, connected, connected_at, updated_at)
                VALUES (%s, 'garmin', %s, TRUE, NOW(), NOW())
                ON CONFLICT (user_id, provider) DO UPDATE SET
                    access_token = EXCLUDED.access_token,
                    connected    = TRUE,
                    connected_at = NOW(),
                    updated_at   = NOW()
            """, (user_id, garmin_email))
    conn.close()

    print("✓ Compte Garmin enregistré.")
    print("  La synchronisation automatique se fera chaque matin à 6h.")
    print("  Pour une sync immédiate : docker compose exec garmin-sync python sync_now.py")

if __name__ == '__main__':
    main()

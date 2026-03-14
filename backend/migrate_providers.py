"""
One-time migration script: extract providers from existing agents.

Usage:
    cd backend
    uv run python migrate_providers.py
"""

import sqlite3
import hashlib
import base64
from cryptography.fernet import Fernet

DB_PATH = "chattable.db"
ENCRYPTION_KEY = "chattable-secret"


def get_cipher():
    derived_key = hashlib.sha256(ENCRYPTION_KEY.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(derived_key))


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # 1. Create providers table if not exists
    cur.execute("""
        CREATE TABLE IF NOT EXISTS providers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            api_key TEXT NOT NULL,
            api_base TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 2. Create app_settings table if not exists
    cur.execute("""
        CREATE TABLE IF NOT EXISTS app_settings (
            id INTEGER PRIMARY KEY DEFAULT 1,
            optimizer_provider_id INTEGER,
            optimizer_model TEXT DEFAULT 'qwen-plus'
        )
    """)

    # 3. Check if agents table has api_key column
    cur.execute("PRAGMA table_info(agents)")
    columns = [col["name"] for col in cur.fetchall()]
    if "api_key" not in columns:
        print("agents table already migrated (no api_key column). Nothing to do.")
        conn.close()
        return

    # 4. Add provider_id column if not exists
    if "provider_id" not in columns:
        cur.execute("ALTER TABLE agents ADD COLUMN provider_id INTEGER")
        print("Added provider_id column to agents table.")

    # 5. Read existing agents with api_key/api_base
    cur.execute("SELECT id, api_key, api_base FROM agents WHERE api_key IS NOT NULL AND api_key != ''")
    agents = cur.fetchall()

    if not agents:
        print("No agents with API keys found. Skipping provider extraction.")
    else:
        # Group by api_base to create unique providers
        provider_map = {}  # api_base -> provider_id
        cipher = get_cipher()

        for agent in agents:
            api_base = agent["api_base"] or "https://api.openai.com/v1"
            if api_base not in provider_map:
                # Determine provider name from URL
                name = "Custom"
                if "dashscope" in api_base:
                    name = "DashScope"
                elif "deepseek" in api_base:
                    name = "DeepSeek"
                elif "openai" in api_base:
                    name = "OpenAI"
                elif "anthropic" in api_base:
                    name = "Anthropic"
                elif "bigmodel" in api_base or "zhipu" in api_base:
                    name = "智谱 (GLM)"
                elif "minimax" in api_base:
                    name = "MiniMax"
                elif "moonshot" in api_base:
                    name = "Moonshot"

                cur.execute(
                    "INSERT INTO providers (name, api_key, api_base, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))",
                    (name, agent["api_key"], api_base),
                )
                provider_map[api_base] = cur.lastrowid
                print(f"Created provider: {name} ({api_base}) -> id={provider_map[api_base]}")

            # Update agent with provider_id
            provider_id = provider_map[api_base]
            cur.execute("UPDATE agents SET provider_id = ? WHERE id = ?", (provider_id, agent["id"]))
            print(f"  Agent {agent['id']} -> provider_id={provider_id}")

    # 6. Recreate agents table without api_key/api_base
    # SQLite doesn't support DROP COLUMN before 3.35, so recreate
    cur.execute("""
        CREATE TABLE agents_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            avatar TEXT,
            description TEXT,
            model TEXT NOT NULL DEFAULT 'gpt-4o',
            provider_id INTEGER,
            system_prompt TEXT NOT NULL DEFAULT 'You are a helpful AI assistant.',
            response_speed REAL NOT NULL DEFAULT 1.0,
            reply_probability REAL NOT NULL DEFAULT 0.8,
            default_length INTEGER NOT NULL DEFAULT 3,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            is_public BOOLEAN NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cur.execute("""
        INSERT INTO agents_new (id, name, avatar, description, model, provider_id,
            system_prompt, response_speed, reply_probability, default_length,
            is_active, is_public, created_at, updated_at)
        SELECT id, name, avatar, description, model, provider_id,
            system_prompt, response_speed, reply_probability, default_length,
            is_active, is_public, created_at, updated_at
        FROM agents
    """)

    cur.execute("DROP TABLE agents")
    cur.execute("ALTER TABLE agents_new RENAME TO agents")
    print("Recreated agents table without api_key/api_base columns.")

    conn.commit()
    conn.close()
    print("Migration complete!")


if __name__ == "__main__":
    main()

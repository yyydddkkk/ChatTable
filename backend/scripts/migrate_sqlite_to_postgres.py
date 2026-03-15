from pathlib import Path

from sqlalchemy import text
from sqlmodel import SQLModel, create_engine

from app.core.config import settings
from app.models.agent import Agent  # noqa: F401
from app.models.app_settings import AppSettings  # noqa: F401
from app.models.conversation import Conversation  # noqa: F401
from app.models.memory import ConversationMemory  # noqa: F401
from app.models.message import Message  # noqa: F401
from app.models.provider import Provider  # noqa: F401


def ensure_postgres_url() -> str:
    db_url = settings.database_url
    if not db_url.startswith("postgresql"):
        raise RuntimeError(
            f"DATABASE_URL must be PostgreSQL, got: {db_url}"
        )
    return db_url


def main() -> None:
    postgres_url = ensure_postgres_url()
    sqlite_path = Path(__file__).resolve().parents[1] / "chattable.db"
    sqlite_url = f"sqlite:///{sqlite_path.as_posix()}"

    sqlite_engine = create_engine(sqlite_url)
    pg_engine = create_engine(postgres_url)

    SQLModel.metadata.create_all(pg_engine)

    with sqlite_engine.connect() as sqlite_conn, pg_engine.begin() as pg_conn:
        source_rows: dict[str, list[dict]] = {}
        for table in SQLModel.metadata.sorted_tables:
            source_rows[table.name] = [
                dict(r) for r in sqlite_conn.execute(table.select()).mappings().all()
            ]

        source_conversation_ids = {
            row["id"] for row in source_rows.get("conversations", []) if row.get("id") is not None
        }
        source_agent_ids = {
            row["id"] for row in source_rows.get("agents", []) if row.get("id") is not None
        }

        skipped_counts: dict[str, int] = {}

        for table in SQLModel.metadata.sorted_tables:
            sqlite_rows = source_rows.get(table.name, [])

            if table.name == "conversation_memories":
                filtered_rows = [
                    row
                    for row in sqlite_rows
                    if row.get("conversation_id") in source_conversation_ids
                    and row.get("agent_id") in source_agent_ids
                ]
                skipped_counts[table.name] = len(sqlite_rows) - len(filtered_rows)
                sqlite_rows = filtered_rows
            elif table.name == "messages":
                filtered_rows = [
                    row
                    for row in sqlite_rows
                    if row.get("conversation_id") in source_conversation_ids
                    and (
                        row.get("sender_id") is None
                        or row.get("sender_id") in source_agent_ids
                    )
                ]
                skipped_counts[table.name] = len(sqlite_rows) - len(filtered_rows)
                sqlite_rows = filtered_rows

            pg_count = pg_conn.execute(
                text(f'SELECT COUNT(*) FROM "{table.name}"')
            ).scalar_one()
            if pg_count and sqlite_rows:
                raise RuntimeError(
                    f"Target table '{table.name}' already has {pg_count} rows; aborting to avoid overwrite."
                )
            if sqlite_rows:
                pg_conn.execute(table.insert(), [dict(r) for r in sqlite_rows])

        # Ensure sequence values are aligned after explicit id inserts.
        for table in SQLModel.metadata.sorted_tables:
            if "id" not in table.c:
                continue
            pg_conn.execute(
                text(
                    f"""
                    SELECT setval(
                        pg_get_serial_sequence('"{table.name}"', 'id'),
                        COALESCE((SELECT MAX(id) FROM "{table.name}"), 1),
                        (SELECT COUNT(*) > 0 FROM "{table.name}")
                    )
                    """
                )
            )

    print(f"Migration completed from {sqlite_path} -> {postgres_url}")
    for table_name, skipped in skipped_counts.items():
        if skipped:
            print(f"Skipped {skipped} invalid rows in table '{table_name}'")


if __name__ == "__main__":
    main()

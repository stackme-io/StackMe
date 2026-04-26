import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./stackme.db"
)

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
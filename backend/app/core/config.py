from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./careerpal.db"
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60

    model_config = SettingsConfigDict(env_prefix="CAREERPAL_", env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()

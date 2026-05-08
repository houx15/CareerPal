from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_DEVELOPMENT_SECRET = "change-me-in-production"


class Settings(BaseSettings):
    database_url: str = "sqlite:///./careerpal.db"
    secret_key: str = DEFAULT_DEVELOPMENT_SECRET
    access_token_expire_minutes: int = 60
    environment: str = "local"
    llm_provider: str = "fake"
    llm_base_url: str | None = None
    llm_model_name: str | None = "careerpal-fake"
    llm_api_key: str | None = None
    resume_storage_dir: str = "./storage/resumes"
    resume_max_upload_bytes: int = 5 * 1024 * 1024
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

    model_config = SettingsConfigDict(env_prefix="CAREERPAL_", env_file=".env", extra="ignore")

    @model_validator(mode="after")
    def require_non_default_secret_outside_local(self) -> "Settings":
        if self.environment not in {"local", "test"} and self.secret_key == DEFAULT_DEVELOPMENT_SECRET:
            raise ValueError("secret_key must be configured outside local and test environments")
        allowed_providers = {"fake", "openai", "anthropic"}
        if self.llm_provider not in allowed_providers:
            raise ValueError("llm_provider must be one of: anthropic, fake, openai")
        if self.llm_provider != "fake":
            missing = []
            if not self.llm_base_url:
                missing.append("llm_base_url must be configured")
            if not self.llm_api_key:
                missing.append("llm_api_key must be configured")
            if not self.llm_model_name or self.llm_model_name == "careerpal-fake":
                missing.append("llm_model_name must be configured")
            if missing:
                raise ValueError("; ".join(missing))
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()

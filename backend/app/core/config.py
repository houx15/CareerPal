from functools import lru_cache

from pydantic import field_validator, model_validator
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
    resume_storage_provider: str = "local"
    resume_storage_dir: str = "./storage/resumes"
    resume_max_upload_bytes: int = 5 * 1024 * 1024
    oss_endpoint: str | None = None
    oss_bucket: str | None = None
    oss_access_key_id: str | None = None
    oss_access_key_secret: str | None = None
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

    model_config = SettingsConfigDict(env_prefix="CAREERPAL_", env_file=".env", extra="ignore")

    @field_validator(
        "llm_base_url",
        "llm_model_name",
        "llm_api_key",
        "oss_endpoint",
        "oss_bucket",
        "oss_access_key_id",
        "oss_access_key_secret",
        mode="before",
    )
    @classmethod
    def empty_optional_setting_to_none(cls, value):
        if isinstance(value, str) and not value.strip():
            return None
        return value

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
        allowed_storage_providers = {"local", "oss"}
        if self.resume_storage_provider not in allowed_storage_providers:
            raise ValueError("resume_storage_provider must be one of: local, oss")
        if self.environment not in {"local", "test"} and self.resume_storage_provider != "oss":
            raise ValueError("resume_storage_provider must be oss outside local and test environments")
        if self.resume_storage_provider == "oss":
            missing = []
            if not self.oss_endpoint:
                missing.append("oss_endpoint must be configured")
            if not self.oss_bucket:
                missing.append("oss_bucket must be configured")
            if not self.oss_access_key_id:
                missing.append("oss_access_key_id must be configured")
            if not self.oss_access_key_secret:
                missing.append("oss_access_key_secret must be configured")
            if missing and self.environment not in {"local", "test"}:
                raise ValueError("; ".join(missing))
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()

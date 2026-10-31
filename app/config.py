import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")


@dataclass
class Settings:
    model_id: str = field(default_factory=lambda: os.getenv("KRONOS_MODEL", "NeoQuasar/Kronos-small"))
    tokenizer_id: str | None = field(default_factory=lambda: os.getenv("KRONOS_TOKENIZER"))
    device: str = field(default_factory=lambda: os.getenv("KRONOS_DEVICE", "auto"))
    cache_dir: Path = field(default_factory=lambda: Path(os.getenv("KRONOS_CACHE_DIR", str(ROOT / ".cache"))))
    api_token: str = field(default_factory=lambda: os.getenv("KRONOS_API_TOKEN", ""))
    max_jobs: int = 3
    job_ttl: float = 1800
    max_retained_jobs: int = 100
    cpu_threads: int = field(default_factory=lambda: max(1, int(os.getenv("KRONOS_CPU_THREADS", "4"))))

    def __post_init__(self):
        if self.tokenizer_id is None:
            self.tokenizer_id = "NeoQuasar/Kronos-Tokenizer-2k" if self.model_id == "NeoQuasar/Kronos-mini" else "NeoQuasar/Kronos-Tokenizer-base"

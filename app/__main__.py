"""Preview the built static application; inference runs in the visitor's browser."""
import runpy
from pathlib import Path


def main():
    runpy.run_path(str(Path(__file__).resolve().parents[1] / "scripts/serve_browser.py"), run_name="__main__")


if __name__ == "__main__":
    main()

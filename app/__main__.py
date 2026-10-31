import argparse
import json
import os

from .config import Settings


def main():
    parser = argparse.ArgumentParser(description="Start Stock Predictor")
    parser.add_argument("--host", default=os.getenv("KRONOS_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.getenv("KRONOS_PORT", "8000")))
    parser.add_argument("--check", action="store_true", help="Check dependencies without starting a server")
    arguments = parser.parse_args()
    if arguments.check:
        import torch
        import fastapi
        import yfinance
        import exchange_calendars
        print(json.dumps({"python_dependencies": "ok", "torch": torch.__version__, "cuda_available": torch.cuda.is_available(), "model": Settings().model_id}))
        return
    import uvicorn
    uvicorn.run("app.main:app", host=arguments.host, port=arguments.port, workers=1)


if __name__ == "__main__":
    main()

import sys
from urllib.error import URLError
from urllib.request import urlopen


def main():
    for port in (8000, 8001, 8002):
        try:
            with urlopen(f"http://127.0.0.1:{port}/", timeout=2) as response:
                if response.status != 200:
                    print(f"Backend port {port} returned HTTP {response.status}", file=sys.stderr)
                    return 1
        except (URLError, TimeoutError, OSError) as error:
            print(f"Backend port {port} is unavailable: {type(error).__name__}", file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

import httpx


async def fetch_camera_catalog(base_url: str):
    url = f"{base_url.rstrip('/')}/api/ingest"

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.json()

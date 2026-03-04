import httpx


class JiraClient:
    def __init__(self, base_url: str, email: str, api_token: str):
        self.base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient(
            base_url=f"{self.base_url}/rest/api/3",
            auth=(email, api_token),
            headers={"Accept": "application/json"},
            timeout=30.0,
        )

    async def test_connection(self) -> bool:
        resp = await self._client.get("/myself")
        return resp.status_code == 200

    async def search_issues(
        self,
        jql: str,
        fields: list[str] | None = None,
        start_at: int = 0,
        max_results: int = 100,
    ) -> dict:
        params: dict = {
            "jql": jql,
            "startAt": start_at,
            "maxResults": max_results,
        }
        if fields:
            params["fields"] = ",".join(fields)
        resp = await self._client.get("/search", params=params)
        resp.raise_for_status()
        return resp.json()

    async def search_all_issues(
        self,
        jql: str,
        fields: list[str] | None = None,
    ) -> list[dict]:
        """Fetch all pages of results for a JQL query."""
        all_issues: list[dict] = []
        start_at = 0
        while True:
            data = await self.search_issues(jql, fields, start_at=start_at)
            issues = data.get("issues", [])
            all_issues.extend(issues)
            if start_at + len(issues) >= data.get("total", 0):
                break
            start_at += len(issues)
        return all_issues

    async def close(self) -> None:
        await self._client.aclose()

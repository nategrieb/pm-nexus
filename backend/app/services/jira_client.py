import httpx
from app.config import settings  #

class JiraClient:
    def __init__(self, base_url: str, email: str, api_token: str):
        self.base_url = base_url.rstrip("/")
        auth = (email, api_token)
        headers = {"Accept": "application/json"}
        
        #
        # Using settings.verify_ssl allows you to toggle this via your .env file
        self._client = httpx.AsyncClient(
            base_url=f"{self.base_url}/rest/api/3",
            auth=auth,
            headers=headers,
            timeout=30.0,
            verify=settings.verify_ssl  #
        )
        self._agile_client = httpx.AsyncClient(
            base_url=f"{self.base_url}/rest/agile/1.0",
            auth=auth,
            headers=headers,
            timeout=30.0,
            verify=settings.verify_ssl  #
        )

    async def test_connection(self) -> bool:
        resp = await self._client.get("/myself")
        return resp.status_code == 200

    async def search_issues(
        self,
        jql: str,
        fields: list[str] | None = None,
        max_results: int = 100,
        next_page_token: str | None = None,
    ) -> dict:
        params: dict = {
            "jql": jql,
            "maxResults": max_results,
        }
        if fields:
            params["fields"] = ",".join(fields)
        if next_page_token:
            params["nextPageToken"] = next_page_token
        resp = await self._client.get("/search/jql", params=params)
        resp.raise_for_status()
        return resp.json()

    async def search_all_issues(
        self,
        jql: str,
        fields: list[str] | None = None,
    ) -> list[dict]:
        """Fetch all pages of results for a JQL query."""
        all_issues: list[dict] = []
        next_page_token = None
        while True:
            data = await self.search_issues(
                jql, fields, next_page_token=next_page_token
            )
            issues = data.get("issues", [])
            all_issues.extend(issues)
            if data.get("isLast", True):
                break
            next_page_token = data.get("nextPageToken")
            if not next_page_token:
                break
        return all_issues

    async def get_boards(self, name: str | None = None) -> list[dict]:
        """Fetch Jira boards, optionally filtered by name."""
        params: dict = {"maxResults": 50}
        if name:
            params["name"] = name
        resp = await self._agile_client.get("/board", params=params)
        resp.raise_for_status()
        return resp.json().get("values", [])

    async def get_board_sprints(
        self, board_id: int, state: str = "active,future"
    ) -> list[dict]:
        """Fetch sprints for a board. state: active, future, closed."""
        all_sprints: list[dict] = []
        start_at = 0
        while True:
            resp = await self._agile_client.get(
                f"/board/{board_id}/sprint",
                params={"state": state, "startAt": start_at, "maxResults": 50},
            )
            resp.raise_for_status()
            data = resp.json()
            all_sprints.extend(data.get("values", []))
            if data.get("isLast", True):
                break
            start_at += len(data.get("values", []))
        return all_sprints

    async def get_sprint(self, sprint_id: int) -> dict:
        """Fetch a single sprint's metadata."""
        resp = await self._agile_client.get(f"/sprint/{sprint_id}")
        resp.raise_for_status()
        return resp.json()

    async def close(self) -> None:
        await self._client.aclose()
        await self._agile_client.aclose()
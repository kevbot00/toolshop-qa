"""Client and test-data builders shared by the test modules."""

import os
import uuid

import requests

API_URL = os.environ.get("API_URL", "http://localhost:8091")
VALID_PASSWORD = "Sup3r$ecret!"


class ToolshopClient:
    """Small wrapper so tests read as intent ("add to cart") rather than URL plumbing."""

    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({"accept": "application/json"})

    def request(self, method: str, path: str, token: str | None = None, **kwargs) -> requests.Response:
        headers = {"authorization": f"Bearer {token}"} if token else {}
        return self.session.request(method, f"{self.base_url}{path}", headers=headers, timeout=10, **kwargs)

    def get(self, path, **kwargs):
        return self.request("GET", path, **kwargs)

    def post(self, path, **kwargs):
        return self.request("POST", path, **kwargs)

    def login(self, email: str, password: str) -> requests.Response:
        return self.post("/users/login", json={"email": email, "password": password})

    def create_cart(self) -> str:
        response = self.post("/carts")
        assert response.status_code == 201, response.text
        return response.json()["id"]

    def find_product(self, query: str) -> dict:
        products = self.get("/products/search", params={"q": query}).json()["data"]
        assert products, f"no product matches {query!r}"
        return products[0]


def unique_email(prefix: str = "pytest") -> str:
    return f"{prefix}+{uuid.uuid4().hex[:8]}@example.com"


def build_user(**overrides) -> dict:
    user = {
        "first_name": "Py",
        "last_name": "Tester",
        "email": unique_email(),
        "password": VALID_PASSWORD,
        "dob": "1990-05-15",
    }
    user.update(overrides)
    return user

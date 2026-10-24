import pytest

from support import API_URL, ToolshopClient, build_user


@pytest.fixture(scope="session")
def api() -> ToolshopClient:
    client = ToolshopClient(API_URL)
    status = client.get("/status")
    if status.status_code != 200:
        pytest.exit(f"Toolshop API is not reachable at {API_URL}. Run ./scripts/start-app.sh first.")
    return client


@pytest.fixture
def new_user(api: ToolshopClient) -> dict:
    """A freshly registered user, so tests that change account state never share data."""
    user = build_user()
    response = api.post("/users/register", json=user)
    assert response.status_code == 201, response.text
    return user


@pytest.fixture
def token(api: ToolshopClient, new_user: dict) -> str:
    response = api.login(new_user["email"], new_user["password"])
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture
def cart_id(api: ToolshopClient) -> str:
    return api.create_cart()

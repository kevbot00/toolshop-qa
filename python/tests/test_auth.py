import pytest

from support import build_user, unique_email

SEEDED_CUSTOMER = ("customer@practicesoftwaretesting.com", "welcome01")


@pytest.mark.smoke
def test_login_with_valid_credentials_returns_bearer_token(api):
    response = api.login(*SEEDED_CUSTOMER)

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["expires_in"] > 0


@pytest.mark.parametrize(
    "email, password",
    [
        (SEEDED_CUSTOMER[0], "wrong-password"),
        ("nobody@example.com", "welcome01"),
        ("", ""),
    ],
    ids=["wrong-password", "unknown-email", "empty-credentials"],
)
def test_login_with_bad_credentials_is_rejected(api, email, password):
    response = api.login(email, password)

    assert response.status_code == 401
    assert "access_token" not in response.json()


def test_registered_user_can_fetch_their_profile(api, new_user, token):
    response = api.get("/users/me", token=token)

    assert response.status_code == 200
    assert response.json()["email"] == new_user["email"]
    assert "password" not in response.json()


def test_duplicate_registration_returns_409(api, new_user):
    response = api.post("/users/register", json=build_user(email=new_user["email"]))

    assert response.status_code == 409


@pytest.mark.parametrize(
    "password, broken_rule",
    [
        ("Sh0rt!", "at least 8 characters"),
        ("alllowercase1!", "uppercase and one lowercase"),
        ("NoSymbols123", "symbol"),
        ("NoNumbers!!Aa", "number"),
    ],
)
def test_password_policy_is_enforced(api, password, broken_rule):
    response = api.post("/users/register", json=build_user(password=password))

    assert response.status_code == 422
    assert any(broken_rule in message for message in response.json()["password"])


@pytest.mark.xfail(reason="BUG: the API registers a malformed email and returns 201. See README > Findings.")
def test_malformed_email_is_rejected(api):
    malformed = unique_email().replace("@", "-at-")

    response = api.post("/users/register", json=build_user(email=malformed))

    assert response.status_code == 422


def test_logout_invalidates_the_token(api, token):
    assert api.get("/users/logout", token=token).status_code == 200

    assert api.get("/users/me", token=token).status_code == 401

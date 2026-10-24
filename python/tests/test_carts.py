import pytest


@pytest.fixture
def product(api):
    return api.find_product("Combination Pliers")


@pytest.mark.smoke
def test_added_item_is_stored_in_the_cart(api, cart_id, product):
    response = api.post(f"/carts/{cart_id}", json={"product_id": product["id"], "quantity": 2})

    assert response.status_code == 200
    items = api.get(f"/carts/{cart_id}").json()["cart_items"]
    assert [(i["product_id"], i["quantity"]) for i in items] == [(product["id"], 2)]


@pytest.mark.parametrize(
    "quantity, expected_status",
    [(0, 422), (1, 200), (99, 200), (100, 422)],
    ids=["below-min", "min", "max", "above-max"],
)
def test_quantity_boundaries(api, cart_id, product, quantity, expected_status):
    response = api.post(f"/carts/{cart_id}", json={"product_id": product["id"], "quantity": quantity})

    assert response.status_code == expected_status


def test_checkout_creates_an_invoice_for_the_cart_total(api, token, cart_id, product):
    api.post(f"/carts/{cart_id}", json={"product_id": product["id"], "quantity": 3})
    # Billing city/state must match what the postcode service returns, as the UI's autofill does.
    address = api.get("/postcode-lookup", params={"country": "US", "postcode": "92501", "house_number": "1"}).json()

    response = api.post(
        "/invoices",
        token=token,
        json={
            "billing_street": address["street"],
            "billing_city": address["city"],
            "billing_state": address["state"],
            "billing_country": "US",
            "billing_postal_code": "92501",
            "payment_method": "cash-on-delivery",
            "payment_details": {},
            "cart_id": cart_id,
        },
    )

    assert response.status_code == 201, response.text
    invoice = response.json()
    assert invoice["invoice_number"].startswith("INV-")
    assert invoice["total"] == pytest.approx(product["price"] * 3)

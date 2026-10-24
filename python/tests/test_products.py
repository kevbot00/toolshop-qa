import pytest

REQUIRED_FIELDS = {"id": str, "name": str, "price": float, "in_stock": bool, "category": dict, "brand": dict}


@pytest.mark.smoke
def test_products_are_paginated_with_required_fields(api):
    response = api.get("/products")

    assert response.status_code == 200
    page = response.json()
    assert page["current_page"] == 1
    assert len(page["data"]) == page["per_page"]
    for product in page["data"]:
        for field, kind in REQUIRED_FIELDS.items():
            assert isinstance(product[field], (int, float) if kind is float else kind), (field, product[field])
        assert product["price"] > 0


@pytest.mark.parametrize("term", ["pliers", "hammer", "drill", "saw"])
def test_search_only_returns_products_that_mention_the_term(api, term):
    products = api.get("/products/search", params={"q": term}).json()["data"]

    assert products, f"expected at least one match for {term!r}"
    for product in products:
        assert term in f"{product['name']} {product['description']}".lower()


@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_products_sort_by_price(api, direction):
    prices = [p["price"] for p in api.get("/products", params={"sort": f"price,{direction}"}).json()["data"]]

    assert prices == sorted(prices, reverse=(direction == "desc"))


def test_unknown_product_returns_404(api):
    response = api.get("/products/01HZZZZZZZZZZZZZZZZZZZZZZZ")

    assert response.status_code == 404
    assert response.json() == {"message": "Requested item not found"}

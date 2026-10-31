def test_create_ingredient_returns_derived_stock_and_country(client):
    response = client.post(
        "/inventory/products",
        json={"name": "Yuca", "sku": "PROD-1", "unit": "kg", "category": "produce", "country": "CO"},
    )
    assert response.status_code == 201
    assert response.json()["country"] == "CO"
    assert response.json()["current_stock"] == 0


def test_inbound_and_outbound_change_derived_stock(client):
    incoming = client.post(
        "/inventory/orders/inbound",
        json={"ingredient_id": 1, "quantity": 10, "supplier_name": "Carnes del Valle S.A.", "location_id": 1},
    )
    assert incoming.status_code == 201
    assert incoming.json()["user_uuid"] == "fixture-user-uuid"

    outgoing = client.post(
        "/inventory/orders/outbound",
        json={"ingredient_id": 1, "quantity": 3, "reason": "consumption", "location_id": 1},
    )
    assert outgoing.status_code == 201

    product = client.get("/inventory/products/1")
    assert product.status_code == 200
    assert product.json()["current_stock"] == 7

    orders = client.get("/inventory/orders")
    assert len(orders.json()) == 2
    assert {order["type"] for order in orders.json()} == {"inbound", "outbound"}


def test_outbound_rejects_negative_stock_with_required_message(client):
    response = client.post(
        "/inventory/orders/outbound",
        json={"ingredient_id": 1, "quantity": 2, "reason": "waste", "location_id": 1},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == (
        "Insufficient stock for ingredient 'Falda'. Available: 0.0, requested: 2.0."
    )


def test_invalid_reason_and_location_are_rejected(client):
    reason = client.post(
        "/inventory/orders/outbound",
        json={"ingredient_id": 1, "quantity": 1, "reason": "spoilage", "location_id": 1},
    )
    location = client.post(
        "/inventory/orders/inbound",
        json={"ingredient_id": 1, "quantity": 1, "supplier_name": "Proveedor", "location_id": 15},
    )
    assert reason.status_code == 422
    assert location.status_code == 422


def test_response_schemas_do_not_store_stock_field(client):
    response = client.get("/inventory/products")
    assert response.status_code == 200
    assert "current_stock" in response.json()[0]

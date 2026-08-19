import unittest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestTendersEndpoints(unittest.TestCase):
    def setUp(self):
        # Входим как организатор (info@asiapartners.kz)
        res = client.post(
            "/api/v1/auth/login",
            data={"username": "info@asiapartners.kz", "password": "admin123"}
        )
        self.token = res.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_get_public_tenders_list(self):
        res = client.get("/api/v1/tenders")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)
        self.assertIn("total", data)

    def test_create_tender_with_lots(self):
        deadline = (datetime.utcnow() + timedelta(days=7)).isoformat()
        payload = {
            "title": "Автотест: Поставка силового кабеля ВВГнг",
            "description": "Техническое задание согласно ГОСТ",
            "subject_type": "goods",
            "method": "zcp",
            "start_price": 5000000.0,
            "deadline_at": deadline,
            "delivery_place": "г. Семей, промзона 4",
            "lots": [
                {
                    "lot_number": 1,
                    "title": "Кабель силовой ВВГнг-LS 3x2.5",
                    "quantity": 1000.0,
                    "unit": "м",
                    "unit_price": 5000.0,
                    "start_price": 5000000.0,
                    "vat_mode": "include_vat",
                    "vat_rate": 16.0,
                    "incoterms": "DDP",
                    "advance_payment_pct": 30.0,
                    "delivery_days_count": 15
                }
            ],
            "qual_requirements": [
                {
                    "code": "experience",
                    "title": "Опыт поставок кабельно-проводниковой продукции не менее 2 лет",
                    "description": "Предоставить сканы исполненных контрактов",
                    "is_mandatory": True
                }
            ]
        }

        res = client.post("/api/v1/tenders", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["title"], payload["title"])
        self.assertIn("number", data)
        self.assertEqual(len(data["lots"]), 1)
        self.assertEqual(data["lots"][0]["incoterms"], "DDP")

        tender_id = data["id"]

        # 1. Проверяем доступ БЕЗ авторизации создателя -> должно вернуть 403 Forbidden
        unauth_res = client.get(f"/api/v1/tenders/{tender_id}")
        self.assertEqual(unauth_res.status_code, 403)

        # 2. Проверяем доступ СО штампом авторизации создателя -> должно вернуть 200 OK
        card_res = client.get(f"/api/v1/tenders/{tender_id}", headers=self.headers)
        self.assertEqual(card_res.status_code, 200)
        self.assertEqual(card_res.json()["id"], tender_id)


if __name__ == "__main__":
    unittest.main()

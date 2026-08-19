import unittest
import base64
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestBidsEndpoints(unittest.TestCase):
    def setUp(self):
        # 1. Организатор создает и публикует тендер
        org_res = client.post(
            "/api/v1/auth/login",
            data={"username": "info@asiapartners.kz", "password": "admin123"}
        )
        org_headers = {"Authorization": f"Bearer {org_res.json()['access_token']}"}

        deadline = (datetime.utcnow() + timedelta(days=5)).isoformat()
        t_res = client.post("/api/v1/tenders", json={
            "title": "Автотест Заявки: Поставка трансформаторов",
            "subject_type": "goods",
            "method": "zcp",
            "start_price": 10000000.0,
            "deadline_at": deadline,
            "delivery_place": "г. Усть-Каменогорск"
        }, headers=org_headers)
        self.tender_id = t_res.json()["id"]

        # Переводим статус в ACCEPTING для возможности подачи заявок
        client.post(f"/api/v1/tenders/{self.tender_id}/publish?eds_hash=demo_pub_hash", headers=org_headers)

        # 2. Поставщик входит в систему
        dummy_cms = base64.b64encode("IIN950101300999 BIN230140011223 ТОО ЭнергоПоставка".encode("utf-8")).decode("utf-8")
        sup_res = client.post("/api/v1/auth/login/eds", json={
            "cms_base64": dummy_cms,
            "company_address": "г. Алматы, ул. Толе би 200",
            "phone": "+7 (727) 444-55-66",
            "email": "bid_supplier_test@asia.kz",
            "director_name": "Искаков Руслан Даниярович"
        })
        self.supplier_headers = {"Authorization": f"Bearer {sup_res.json()['access_token']}"}

    def test_bid_submission_success(self):
        payload = {
            "tender_id": self.tender_id,
            "price": 9500000.0,
            "eds_hash": "demo_supplier_signature_hash_123"
        }
        res = client.post("/api/v1/bids", json=payload, headers=self.supplier_headers)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["tender_id"], self.tender_id)
        self.assertEqual(data["price"], 9500000.0)

    def test_bid_price_validation(self):
        # Попытка подать цену ВЫШЕ стартовой (10,000,000)
        payload = {
            "tender_id": self.tender_id,
            "price": 12000000.0,
            "eds_hash": "demo_invalid_price"
        }
        res = client.post("/api/v1/bids", json=payload, headers=self.supplier_headers)
        self.assertEqual(res.status_code, 400)


if __name__ == "__main__":
    unittest.main()

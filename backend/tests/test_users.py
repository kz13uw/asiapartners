import unittest
import base64
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestUsersEndpoints(unittest.TestCase):
    def setUp(self):
        # Решистрируем/входим как supplier для тестов компании
        dummy_cms = base64.b64encode("IIN900505300123 BIN220340099888".encode("utf-8")).decode("utf-8")
        payload = {
            "cms_base64": dummy_cms,
            "company_address": "г. Алматы, ул. Абая 50",
            "phone": "+7 (727) 333-22-11",
            "email": "supplier_user_test@asia.kz",
            "director_name": "Касымов Асхат Нариманович",
            "company_name": "ТОО Алматы Снаб"
        }
        res = client.post("/api/v1/auth/login/eds", json=payload)
        self.token = res.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_get_current_user_profile(self):
        res = client.get("/api/v1/users/me", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["email"], "supplier_user_test@asia.kz")
        self.assertIn("account_code", data)

    def test_password_policy_validation(self):
        # Слишком короткий пароль (< 8 символов)
        res_short = client.post(
            "/api/v1/users/me/change-password",
            json={"old_password": "admin", "new_password": "Short1!"},
            headers=self.headers
        )
        self.assertEqual(res_short.status_code, 400)

        # Без спецсимвола
        res_no_spec = client.post(
            "/api/v1/users/me/change-password",
            json={"old_password": "admin", "new_password": "Password123"},
            headers=self.headers
        )
        self.assertEqual(res_no_spec.status_code, 400)

    def test_company_profile_get_and_update(self):
        comp_res = client.get("/api/v1/users/me/company", headers=self.headers)
        self.assertIn(comp_res.status_code, [200, 404])

        update_payload = {
            "bin": "220340099888",
            "full_name": "ТОО Алматы Снаб Обновлено",
            "legal_form": "ТОО",
            "address": "г. Алматы, ул. Аль-Фараби 100",
            "phone": "+7 (727) 999-00-11",
            "email": "info@almatysnab.kz",
            "iban": "KZ987654321098765432",
            "director_name": "Касымов Асхат Нариманович"
        }
        
        if comp_res.status_code == 404:
            res = client.post("/api/v1/users/me/company", json=update_payload, headers=self.headers)
            self.assertEqual(res.status_code, 201)
        else:
            res = client.put("/api/v1/users/me/company", json=update_payload, headers=self.headers)
            self.assertEqual(res.status_code, 200)

        updated_data = res.json()
        self.assertEqual(updated_data["address"], "г. Алматы, ул. Аль-Фараби 100")
        self.assertEqual(updated_data["iban"], "KZ987654321098765432")


if __name__ == "__main__":
    unittest.main()

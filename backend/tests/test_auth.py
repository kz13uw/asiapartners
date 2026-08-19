import unittest
import base64
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestAuthEndpoints(unittest.TestCase):
    def test_health_check(self):
        response = client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_admin_login_success(self):
        response = client.post(
            "/api/v1/auth/login",
            data={"username": "admin", "password": "admin123"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertIn("refresh_token", data)
        self.assertEqual(data["role"], "admin")

    def test_invalid_login_credentials(self):
        response = client.post(
            "/api/v1/auth/login",
            data={"username": "admin", "password": "wrongpassword999"}
        )
        self.assertEqual(response.status_code, 401)

    def test_eds_registration_and_login(self):
        dummy_cms = base64.b64encode("IIN850101400823 BIN210440012345 ТОО ТестПоставщик".encode("utf-8")).decode("utf-8")
        payload = {
            "cms_base64": dummy_cms,
            "company_address": "г. Астана, пр. Кабанбай Батыра 15",
            "phone": "+7 (7172) 99-88-77",
            "email": "test_supplier_eds@asia.kz",
            "director_name": "Серіков Ерлан Болатович",
            "company_name": "ТОО ТестПоставщик"
        }
        response = client.post("/api/v1/auth/login/eds", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["role"], "supplier")

    def test_logout_token_blacklisting(self):
        # 1. Логинимся
        login_res = client.post(
            "/api/v1/auth/login",
            data={"username": "admin", "password": "admin123"}
        )
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Делаем успешый запрос до логаута
        me_res = client.get("/api/v1/users/me", headers=headers)
        self.assertEqual(me_res.status_code, 200)

        # 3. Вызываем logout
        logout_res = client.post("/api/v1/auth/logout", headers=headers)
        self.assertEqual(logout_res.status_code, 200)

        # 4. Проверяем, что тот же токен теперь заблокирован (401)
        blocked_res = client.get("/api/v1/users/me", headers=headers)
        self.assertEqual(blocked_res.status_code, 401)


if __name__ == "__main__":
    unittest.main()

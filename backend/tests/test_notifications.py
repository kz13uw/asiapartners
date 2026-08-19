import unittest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestNotificationsEndpoints(unittest.TestCase):
    def setUp(self):
        res = client.post(
            "/api/v1/auth/login",
            data={"username": "admin", "password": "admin123"}
        )
        self.headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    def test_notifications_lifecycle(self):
        # 1. Получаем список уведомлений
        res = client.get("/api/v1/notifications", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

        # 2. Массовая отметка как прочитанных
        read_all_res = client.post("/api/v1/notifications/read-all", headers=self.headers)
        self.assertEqual(read_all_res.status_code, 200)
        self.assertEqual(read_all_res.json()["message"], "Все уведомления отмечены как прочитанные")


if __name__ == "__main__":
    unittest.main()

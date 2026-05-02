import requests

BACKEND_URL = "http://localhost:3000/api"

class ContextBuilder:
    """Lấy dữ liệu từ NestJS backend để làm context"""
    
    @staticmethod
    def get_relevant_products(query: str) -> list:
        """Tìm sản phẩm liên quan đến câu hỏi"""
        try:
            response = requests.get(
                f"{BACKEND_URL}/products",
                params={"search": query, "limit": 5},
                timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                # Nếu response là array trực tiếp
                if isinstance(data, list):
                    return data
                # Nếu response có structure {data: [...]}
                return data.get('data', [])
        except Exception as e:
            print(f"⚠️ Cannot fetch products: {str(e)}")
        return []
    
    @staticmethod
    def get_user_orders(user_id: int) -> list:
        """Lấy đơn hàng của user"""
        try:
            response = requests.get(
                f"{BACKEND_URL}/orders",
                headers={"user-id": str(user_id)},
                timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    return data
                return data.get('data', [])
        except Exception as e:
            print(f"⚠️ Cannot fetch orders: {str(e)}")
        return []


# ✅ THÊM: Export functions để import dễ dàng
def get_products_context(query: str = "") -> list:
    """Wrapper function để dễ import"""
    return ContextBuilder.get_relevant_products(query)


def get_orders_context(user_id: int) -> list:
    """Wrapper function để dễ import"""
    return ContextBuilder.get_user_orders(user_id)
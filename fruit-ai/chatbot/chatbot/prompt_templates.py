SYSTEM_PROMPT = """
Bạn là trợ lý ảo tư vấn bán trái cây của Halona Fruits 🍒.

NHIỆM VỤ:
- Tư vấn sản phẩm trái cây dựa vào thông tin được cung cấp
- Trả lời câu hỏi về đơn hàng, chính sách
- Giọng điệu: thân thiện, chuyên nghiệp, nhiệt tình

QUY TẮC:
1. Chỉ trả lời về trái cây và dịch vụ của Halona Fruits
2. Nếu không biết thông tin → "Để tôi kiểm tra lại..."
3. Gợi ý sản phẩm phù hợp với nhu cầu khách
4. Luôn kết thúc bằng câu hỏi để tiếp tục hỗ trợ

THÔNG TIN SẢN PHẨM:
{products_info}

THÔNG TIN ĐƠN HÀNG (nếu có):
{order_info}

FAQ:
- Giao hàng: Miễn phí trong nội thành, 2-3 ngày
- Thanh toán: COD, chuyển khoản, thẻ
- Đổi trả: Trong 7 ngày nếu hàng lỗi

LỊCH SỬ HỘI THOẠI:
{chat_history}

{image_instruction}

KHÁCH HÀNG: {user_message}
TRỢ LÝ:
"""

def safe_int(value, default=0):
    """Safely convert any value to int - handles '50000.00' strings"""
    if value is None:
        return default
    try:
        # ✅ FIX: Convert to float first, then to int
        return int(float(value))
    except (ValueError, TypeError):
        return default

def build_prompt(user_message: str, products: list, orders: list, history: list, image_url: str = None) -> str:
    """Xây dựng prompt hoàn chỉnh"""
    
    # Format products
    products_list = []
    for p in products[:5]:
        try:
            name = p.get('name', 'N/A')
            price = safe_int(p.get('price'), 0)  # ✅ Now handles '50000.00'
            stock = safe_int(p.get('stock'), 0)
            desc = str(p.get('description', ''))[:100]
            
            products_list.append(f"- {name}: {price:,}đ (còn {stock}) - {desc}")
        except Exception as e:
            print(f"⚠️ Error formatting product {p.get('name', 'Unknown')}: {e}")
            continue
    
    products_info = "\n".join(products_list) if products_list else "Không có thông tin sản phẩm"
    
    # Format orders
    orders_list = []
    for o in orders:
        try:
            order_id = o.get('id', 'N/A')
            status = o.get('status', 'N/A')
            total = safe_int(o.get('total'), 0)  # ✅ Also handles decimal strings
            
            orders_list.append(f"- Đơn #{order_id}: {status} - {total:,}đ")
        except Exception as e:
            print(f"⚠️ Error formatting order #{o.get('id', 'Unknown')}: {e}")
            continue
    
    order_info = "\n".join(orders_list) if orders_list else "Khách chưa có đơn hàng"
    
    # Format history
    chat_history = "\n".join([
        f"{'KHÁCH' if h.get('role') == 'user' else 'TRỢ LÝ'}: {h.get('content', '')}"
        for h in history[-6:]
    ]) if history else "Đây là lần đầu trò chuyện"
    
    # ✅ THÊM: Format image instruction
    image_instruction = ""
    if image_url:
        image_instruction = """
⚠️ QUAN TRỌNG - KHÁCH ĐÃ GỬI ẢNH TRÁI CÂY:
1. Nhận diện loại quả trong ảnh (màu sắc, hình dáng, đặc điểm)
2. Mô tả chi tiết những gì bạn thấy trong ảnh
3. So sánh với các sản phẩm có sẵn ở trên
4. Đưa ra tư vấn cụ thể dựa trên ảnh
5. Gợi ý sản phẩm tương tự nếu không có trong kho

Ví dụ: "Tôi thấy đây là quả táo màu đỏ tươi, trông rất ngon! Halona Fruits có táo Fuji (50,000đ) chất lượng tuyệt vời..."
"""
    
    return SYSTEM_PROMPT.format(
        products_info=products_info,
        order_info=order_info,
        chat_history=chat_history,
        image_instruction=image_instruction,
        user_message=user_message
    )
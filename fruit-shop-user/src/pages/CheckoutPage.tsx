import { useState } from 'react';
import {
  Form,
  Input,
  Radio,
  Button,
  Card,
  Typography,
  Divider,
  List,
  Image,
  message,
  Result,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useCart } from '../contexts/useCart';
import { useAuth } from '../contexts/useAuth';
import type { CartItem } from '../contexts/CartContext';


const { Title, Text } = Typography;

const API_URL = 'http://localhost:3000';

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const { items: cartItems, removeFromCart } = useCart();

  // Lấy sản phẩm đã chọn từ localStorage
  const checkoutData = localStorage.getItem('checkoutItems');
  const items: CartItem[] = checkoutData ? JSON.parse(checkoutData) : cartItems;
  const totalAmount = items.reduce(
    (sum: number, item: CartItem) => sum + item.price * item.quantity,
    0,
  );
  const { user } = useAuth();
  const navigate = useNavigate();

  if (items.length === 0 && !orderSuccess) {
    navigate('/cart');
    return null;
  }

  if (orderSuccess) {
    return (
      <Result
        status="success"
        title="Đặt hàng thành công!"
        subTitle={`Mã đơn hàng: #${orderId}. Chúng tôi sẽ liên hệ xác nhận sớm nhất.`}
        extra={[
          <Button
            type="primary"
            key="orders"
            onClick={() => navigate('/orders')}
          >
            Xem đơn hàng
          </Button>,
          <Button key="home" onClick={() => navigate('/')}>
            Về trang chủ
          </Button>,
        ]}
      />
    );
  }

  const handleSubmit = async (values: {
    receiverName: string;
    shippingPhone: string;
    shippingAddress: string;
    paymentMethod: string;
    note?: string;
  }) => {
    setLoading(true);
    try {
      const orderData = {
        receiverName: values.receiverName,
        shippingPhone: values.shippingPhone,
        shippingAddress: values.shippingAddress,
        paymentMethod: values.paymentMethod,
        note: values.note || '',
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      const response = await axiosClient.post('/orders', orderData);
      setOrderId(response.data.id);
      setOrderSuccess(true);
      // Xóa sản phẩm đã đặt khỏi giỏ hàng
      items.forEach((item) => removeFromCart(item.productId));
      localStorage.removeItem('checkoutItems');
      message.success('Đặt hàng thành công!');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || 'Đặt hàng thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={3}>📦 Đặt hàng</Title>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 400 }}>
          <Card title="Thông tin giao hàng">
            <Form
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{
                receiverName: user?.name || '',
                paymentMethod: 'cod',
              }}
            >
              <Form.Item
                name="receiverName"
                label="Tên người nhận"
                rules={[
                  { required: true, message: 'Vui lòng nhập tên người nhận!' },
                ]}
              >
                <Input placeholder="Nguyễn Văn A" size="large" />
              </Form.Item>

              <Form.Item
                name="shippingPhone"
                label="Số điện thoại"
                rules={[
                  { required: true, message: 'Vui lòng nhập số điện thoại!' },
                ]}
              >
                <Input placeholder="0901234567" size="large" />
              </Form.Item>

              <Form.Item
                name="shippingAddress"
                label="Địa chỉ giao hàng"
                rules={[
                  { required: true, message: 'Vui lòng nhập địa chỉ!' },
                ]}
              >
                <Input.TextArea
                  rows={2}
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                />
              </Form.Item>

              <Form.Item
                name="paymentMethod"
                label="Phương thức thanh toán"
                rules={[{ required: true }]}
              >
                <Radio.Group>
                  <Radio value="cod" style={{ display: 'block', marginBottom: 8 }}>
                    💵 Thanh toán khi nhận hàng (COD)
                  </Radio>
                  <Radio value="banking" style={{ display: 'block' }}>
                    🏦 Chuyển khoản ngân hàng
                  </Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item name="note" label="Ghi chú">
                <Input.TextArea
                  rows={2}
                  placeholder="Ghi chú cho đơn hàng (không bắt buộc)"
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
                style={{ background: '#f5222d', borderColor: '#f5222d' }}
              >
                Xác nhận đặt hàng
              </Button>
            </Form>
          </Card>
        </div>

        <Card
          title="Đơn hàng của bạn"
          style={{ width: 380, height: 'fit-content' }}
        >
          <List
            dataSource={items}
            renderItem={(item: CartItem) => (
              <List.Item>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                  }}
                >
                  {item.thumbnail ? (
                    <Image
                      src={`${API_URL}${item.thumbnail}`}
                      width={50}
                      height={50}
                      style={{ objectFit: 'cover', borderRadius: 8 }}
                      preview={false}
                    />
                  ) : (
                    <div
                      style={{
                        width: 50,
                        height: 50,
                        background: '#f6ffed',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      🍊
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <Text strong>{item.name}</Text>
                    <div style={{ color: '#888', fontSize: 13 }}>
                      {Number(item.price).toLocaleString('vi-VN')}đ x{' '}
                      {item.quantity}
                    </div>
                  </div>
                  <Text strong style={{ color: '#f5222d' }}>
                    {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                  </Text>
                </div>
              </List.Item>
            )}
          />

          <Divider />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <Text>Tạm tính:</Text>
            <Text>{totalAmount.toLocaleString('vi-VN')}đ</Text>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <Text>Phí giao hàng:</Text>
            <Text style={{ color: '#52c41a' }}>Miễn phí</Text>
          </div>

          <Divider />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <Text strong style={{ fontSize: 16 }}>
              Tổng cộng:
            </Text>
            <Text strong style={{ fontSize: 20, color: '#f5222d' }}>
              {totalAmount.toLocaleString('vi-VN')}đ
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
}
import axios from 'axios';
import { config } from '../utils/config';

// Bạn cần thêm ZALO_OA_ACCESS_TOKEN vào file .env
// Lấy tại: https://developers.zalo.me/
const getZaloToken = () => process.env.ZALO_OA_ACCESS_TOKEN || '';

/**
 * Gửi tin nhắn thông thường qua Zalo OA
 * YÊU CẦU: Khách hàng phải bấm "Quan tâm" OA của bạn trước, 
 * hoặc đã có tương tác với OA trong vòng 7 ngày.
 */
export const sendZaloOAMessage = async (phone: string, message: string) => {
  const token = getZaloToken();
  if (!token) {
    console.warn('[Zalo] ZALO_OA_ACCESS_TOKEN is not configured. Skipping message.');
    return false;
  }

  try {
    // Format số điện thoại về chuẩn 84xxx
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '84' + formattedPhone.slice(1);
    }

    const response = await axios.post(
      'https://openapi.zalo.me/v3.0/oa/message/cs',
      {
        recipient: { user_id: formattedPhone }, // Nếu gửi bằng phone, cần dùng endpoint khác hoặc xin quyền
        message: { text: message }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'access_token': token
        }
      }
    );

    if (response.data.error) {
      console.error('[Zalo OA] Error:', response.data.message);
      return false;
    }

    console.log(`[Zalo OA] Sent message to ${formattedPhone}`);
    return true;
  } catch (error) {
    console.error('[Zalo OA] Request failed:', error);
    return false;
  }
};

/**
 * Gửi tin nhắn ZNS (Zalo Notification Service)
 * YÊU CẦU: Template phải được Zalo duyệt trước. Tốn phí (~200đ/tin).
 * Không cần khách hàng phải "Quan tâm" OA.
 */
export const sendZNSMessage = async (phone: string, templateId: string, templateData: Record<string, string>) => {
  const token = getZaloToken();
  if (!token) {
    console.warn('[Zalo] ZALO_OA_ACCESS_TOKEN is not configured. Skipping ZNS.');
    return false;
  }

  try {
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '84' + formattedPhone.slice(1);
    }

    const response = await axios.post(
      'https://business.openapi.zalo.me/message/template',
      {
        phone: formattedPhone,
        template_id: templateId,
        template_data: templateData
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'access_token': token
        }
      }
    );

    if (response.data.error) {
      console.error('[Zalo ZNS] Error:', response.data.message);
      return false;
    }

    console.log(`[Zalo ZNS] Sent template to ${formattedPhone}`);
    return true;
  } catch (error) {
    console.error('[Zalo ZNS] Request failed:', error);
    return false;
  }
};

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

class WhatsAppService {
  constructor() {
    this.apiKey = process.env.FONNTE_API_KEY || '';
    this.baseUrl = 'https://api.fonnte.com';
    this.enabled = process.env.WHATSAPP_ENABLED === 'true';
  }

  /**
   * Format Indonesian phone number to WhatsApp format
   * 081xxx → 6281xxx, +6281xxx → 6281xxx, 6281xxx → 6281xxx
   */
  static formatPhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Remove leading + if present (already handled by \D removal)
    // Convert 08xx to 628xx
    if (cleaned.startsWith('08')) {
      cleaned = '62' + cleaned.substring(1);
    }
    // Convert 8xx (without country code) to 628xx
    else if (cleaned.startsWith('8') && cleaned.length >= 9 && cleaned.length <= 13) {
      cleaned = '62' + cleaned;
    }
    // Already starts with 62
    else if (!cleaned.startsWith('62')) {
      // Unknown format, try prepending 62
      cleaned = '62' + cleaned;
    }

    return cleaned;
  }

  /**
   * Check if WhatsApp integration is enabled and configured
   */
  isConfigured() {
    return this.enabled && this.apiKey.length > 0;
  }

  /**
   * Send a text message via WhatsApp
   */
  async sendMessage(phoneNumber, message) {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp belum dikonfigurasi. Tambahkan FONNTE_API_KEY di .env');
    }

    const formattedPhone = WhatsAppService.formatPhoneNumber(phoneNumber);
    if (!formattedPhone) {
      throw new Error('Nomor telepon tidak valid');
    }

    const formData = new URLSearchParams();
    formData.append('target', formattedPhone);
    formData.append('message', message);
    formData.append('countryCode', '62');

    const response = await fetch(`${this.baseUrl}/send`, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey
      },
      body: formData
    });

    const result = await response.json();

    if (!result.status) {
      throw new Error(result.reason || result.message || 'Gagal mengirim pesan WhatsApp');
    }

    return {
      success: true,
      messageId: Array.isArray(result.id) ? result.id.join(',') : (result.id ? String(result.id) : null),
      detail: result
    };
  }

  /**
   * Send a document/file (e.g., PDF) via WhatsApp
   * fileBuffer: Buffer of the file
   * filename: name of the file
   * caption: optional caption text
   */
  async sendDocument(phoneNumber, fileBuffer, filename, caption = '') {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp belum dikonfigurasi. Tambahkan FONNTE_API_KEY di .env');
    }

    const formattedPhone = WhatsAppService.formatPhoneNumber(phoneNumber);
    if (!formattedPhone) {
      throw new Error('Nomor telepon tidak valid');
    }

    // Fonnte accepts base64 encoded files via the 'file' parameter
    const base64File = fileBuffer.toString('base64');

    const formData = new URLSearchParams();
    formData.append('target', formattedPhone);
    formData.append('message', caption);
    formData.append('file', base64File);
    formData.append('filename', filename);
    formData.append('countryCode', '62');

    const response = await fetch(`${this.baseUrl}/send`, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey
      },
      body: formData
    });

    const result = await response.json();

    if (!result.status) {
      throw new Error(result.reason || result.message || 'Gagal mengirim dokumen WhatsApp');
    }

    return {
      success: true,
      messageId: Array.isArray(result.id) ? result.id.join(',') : (result.id ? String(result.id) : null),
      detail: result
    };
  }

  /**
   * Test the WhatsApp connection by checking device status
   */
  async testConnection() {
    if (!this.apiKey) {
      return { connected: false, message: 'API Key belum dikonfigurasi' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/device`, {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey
        }
      });

      const result = await response.json();
      return {
        connected: result.status === true,
        message: result.status ? 'WhatsApp terhubung' : (result.reason || 'Tidak terhubung'),
        device: result.device || null
      };
    } catch (error) {
      return { connected: false, message: `Gagal koneksi: ${error.message}` };
    }
  }
}

module.exports = WhatsAppService;

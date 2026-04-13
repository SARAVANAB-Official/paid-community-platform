// Payment controller - mimics backend paymentController.js
import QRCode from 'qrcode';
import { Payment } from '../db';

const AMOUNT = Number(import.meta.env.VITE_PAYMENT_AMOUNT) || 120;
const UPI_VPA = import.meta.env.VITE_UPI_VPA || 'jayarajj126-3@okicici';
const UPI_PAYEE_NAME = import.meta.env.VITE_UPI_PAYEE_NAME || 'Community';
const UPI_REF_REGEX = /^[0-9]{10,20}$/;

function buildUpiUri() {
  const pa = encodeURIComponent(UPI_VPA);
  const pn = encodeURIComponent(UPI_PAYEE_NAME);
  const am = AMOUNT.toFixed(2);
  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR`;
}

export async function getPaymentConfig() {
  const upiUri = buildUpiUri();
  const qrDataUrl = await QRCode.toDataURL(upiUri, { width: 280, margin: 2 });
  
  return {
    status: 200,
    data: {
      amount: AMOUNT,
      currency: 'INR',
      paymentMethod: 'UPI',
      upiVpa: UPI_VPA,
      payeeName: UPI_PAYEE_NAME,
      upiUri,
      qrDataUrl,
    },
  };
}

export async function submitPayment(req) {
  const { fullName, email, phoneNumber, utr } = req.body;

  if (!req.file) {
    throw { status: 400, message: 'Payment screenshot is required (JPG/PNG, max 2MB)' };
  }

  if (!fullName || !email || !phoneNumber || !utr) {
    throw { status: 400, message: 'All fields are required: fullName, email, phoneNumber, UPI Reference Number' };
  }

  const rawPaymentId = String(utr).trim();
  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedPhone = String(phoneNumber).trim();

  // Validate UPI Reference Number format
  if (!UPI_REF_REGEX.test(rawPaymentId)) {
    throw { status: 400, message: 'Enter a valid UPI Reference Number (10-20 digits)' };
  }

  // Check for duplicate
  const existing = await Payment.findOne({ paymentId: rawPaymentId });
  if (existing) {
    throw {
      status: 409,
      message: 'This UPI Reference Number was already submitted',
      existingStatus: existing.status,
    };
  }

  // Fraud heuristic: multiple payment submissions for same email => suspicious
  const priorCount = await Payment.countDocuments({ email: normalizedEmail });
  const initialStatus = priorCount > 0 ? 'suspicious' : 'pending';

  // Convert file to base64 data URL for storage
  const screenshotDataUrl = await fileToDataUrl(req.file);

  const payment = await Payment.create({
    name: String(fullName || '').trim(),
    email: normalizedEmail,
    phoneNumber: normalizedPhone,
    paymentId: rawPaymentId,
    screenshot: screenshotDataUrl,
    status: initialStatus,
    amount: AMOUNT,
  });

  const message = payment.status === 'suspicious'
    ? 'Payment submitted, but flagged as suspicious for manual review'
    : 'Payment submitted for verification';

  return {
    status: 201,
    data: {
      message,
      payment: {
        id: payment._id,
        name: payment.name,
        email: payment.email,
        phoneNumber: payment.phoneNumber,
        paymentId: payment.paymentId,
        screenshot: payment.screenshot,
        status: payment.status,
        amount: payment.amount,
        createdAt: payment.createdAt,
      },
    },
  };
}

export async function checkPaymentStatus(req) {
  const paymentId = String(req.query?.utr || '').trim();
  
  const payment = await Payment.findOne({ paymentId });
  if (!payment) {
    throw { status: 404, message: 'Payment not found' };
  }
  
  return {
    status: 200,
    data: {
      payment: {
        name: payment.name,
        email: payment.email,
        phoneNumber: payment.phoneNumber,
        paymentId: payment.paymentId,
        status: payment.status,
        amount: payment.amount,
        screenshot: payment.screenshot,
        createdAt: payment.createdAt,
      },
    },
  };
}

// Helper to convert File to compressed base64 data URL (fast upload)
async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Compress: max 800px width, JPEG quality 0.7
        const MAX_W = 800;
        let w = img.width;
        let h = img.height;
        if (w > MAX_W) {
          h = Math.round((h * MAX_W) / w);
          w = MAX_W;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        // Compress to JPEG at 70% quality (~50-100KB from 2MB)
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

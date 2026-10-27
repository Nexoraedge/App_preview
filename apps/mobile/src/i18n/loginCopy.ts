// src/i18n/loginCopy.ts
// Login screen text in English and Hindi with WhatsApp & SMS options.

export interface LoginCopy {
  title: string;
  subtitle: string;
  fullNameLabel: string;
  fullNamePlaceholder: string;
  nameRequired: string;
  phoneLabel: string;
  phonePlaceholder: string;
  sendOtp: string;
  sendViaWhatsApp: string;
  sendViaSms: string;
  otpTitle: string;
  otpSent: (phone: string, channel?: 'whatsapp' | 'sms') => string;
  verify: string;
  resendIn: (s: number) => string;
  resend: string;
  resendViaSms: string;
  resendViaWhatsApp: string;
  change: string;
  invalidPhone: string;
  wrongOtp: string;
  tooMany: string;
  failed: string;
  consentPre: string;
  terms: string;
  and: string;
  privacy: string;
  demoNote: (otp: string) => string;
  secure: string;
  reviewerFill: string;
}

const en: LoginCopy = {
  title: 'Welcome',
  subtitle: 'Enter your name and mobile number to continue.',
  fullNameLabel: 'Full Name',
  fullNamePlaceholder: 'e.g. Abhishek Jain',
  nameRequired: 'Please enter your full name (minimum 2 letters).',
  phoneLabel: 'Mobile Number',
  phonePlaceholder: '10-digit mobile number',
  sendOtp: 'Send OTP',
  sendViaWhatsApp: 'Get OTP on WhatsApp',
  sendViaSms: 'Get OTP via SMS',
  otpTitle: 'Enter 6-Digit OTP',
  otpSent: (p, channel) =>
    channel === 'whatsapp'
      ? `We sent a 6-digit verification code to +91 ${p} on WhatsApp`
      : `We sent a 6-digit verification code to +91 ${p} via SMS`,
  verify: 'Verify & Enter',
  resendIn: (s) => `Resend OTP in ${s}s`,
  resend: 'Resend OTP',
  resendViaSms: 'Send via SMS instead',
  resendViaWhatsApp: 'Send via WhatsApp instead',
  change: 'Change Number',
  invalidPhone: 'Enter a valid 10-digit Indian mobile number.',
  wrongOtp: 'Incorrect verification code. Please try again.',
  tooMany: 'Too many attempts. Please wait 30 seconds and try again.',
  failed: 'Authentication failed. Please check your network and retry.',
  consentPre: 'By continuing, you agree to our ',
  terms: 'Terms of Service',
  and: ' and ',
  privacy: 'Privacy Policy',
  demoNote: (o) => `Test / Reviewer OTP: ${o}`,
  secure: '100% Secure & Encrypted · ABDM Health Locker Compliant',
  reviewerFill: 'Reviewer / Demo Fill',
};

const hi: LoginCopy = {
  title: 'नमस्ते व स्वागत है',
  subtitle: 'आगे बढ़ने के लिए अपना नाम और मोबाइल नंबर दर्ज करें।',
  fullNameLabel: 'पूरा नाम',
  fullNamePlaceholder: 'उदा. अभिषेक जैन',
  nameRequired: 'कृपया अपना पूरा नाम दर्ज करें (न्यूनतम 2 अक्षर)।',
  phoneLabel: 'मोबाइल नंबर',
  phonePlaceholder: '10 अंकों का मोबाइल नंबर',
  sendOtp: 'ओटीपी प्राप्त करें',
  sendViaWhatsApp: 'व्हाट्सएप पर OTP पाएं',
  sendViaSms: 'SMS द्वारा OTP पाएं',
  otpTitle: '6-अंकीय ओटीपी दर्ज करें',
  otpSent: (p, channel) =>
    channel === 'whatsapp'
      ? `हमने +91 ${p} पर आपके व्हाट्सएप पर 6 अंकों का कोड भेजा है`
      : `हमने +91 ${p} पर SMS द्वारा 6 अंकों का कोड भेजा है`,
  verify: 'सत्यापित करें और प्रवेश करें',
  resendIn: (s) => `${s} सेकंड में OTP दोबारा भेजें`,
  resend: 'OTP दोबारा भेजें',
  resendViaSms: 'SMS द्वारा मंगाएं',
  resendViaWhatsApp: 'व्हाट्सएप द्वारा मंगाएं',
  change: 'नंबर बदलें',
  invalidPhone: 'कृपया 10 अंकों का मान्य भारतीय मोबाइल नंबर दर्ज करें।',
  wrongOtp: 'दर्ज किया गया कोड सही नहीं है। कृपया पुनः प्रयास करें।',
  tooMany: 'बहुत अधिक प्रयास। कृपया 30 सेकंड बाद पुनः प्रयास करें।',
  failed: 'प्रमाणीकरण विफल हुआ। कृपया इंटरनेट कनेक्शन जांचें।',
  consentPre: 'आगे बढ़कर आप हमारी ',
  terms: 'सेवा की शर्तों',
  and: ' और ',
  privacy: 'गोपनीयता नीति',
  demoNote: (o) => `परीक्षण / रिव्यूअर OTP: ${o}`,
  secure: '100% सुरक्षित एवं एनक्रिप्टेड · ABDM हेल्थ लॉकर प्रमाणित',
  reviewerFill: 'रिव्यूअर / डेमो भरें',
};

export const pickLoginCopy = (language?: string): LoginCopy =>
  language === 'hi' ? hi : en;

// src/i18n/loginCopy.ts
// Login screen text in English and Hindi.

export interface LoginCopy {
  title: string;
  subtitle: string;
  phoneLabel: string;
  phonePlaceholder: string;
  sendOtp: string;
  otpTitle: string;
  otpSent: (phone: string) => string;
  verify: string;
  resendIn: (s: number) => string;
  resend: string;
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
}

const en: LoginCopy = {
  title: 'Welcome',
  subtitle: 'Enter your mobile number to continue.',
  phoneLabel: 'Mobile number',
  phonePlaceholder: '10-digit number',
  sendOtp: 'Send OTP',
  otpTitle: 'Enter the OTP',
  otpSent: (p) => `We sent a 6-digit code to +91 ${p}`,
  verify: 'Verify and continue',
  resendIn: (s) => `Resend OTP in ${s}s`,
  resend: 'Resend OTP',
  change: 'Change number',
  invalidPhone: 'Enter a valid 10-digit mobile number.',
  wrongOtp: 'That code is not correct. Please try again.',
  tooMany: 'Too many attempts. Please wait a little and try again.',
  failed: 'Something went wrong. Please try again.',
  consentPre: 'By continuing, you agree to our ',
  terms: 'Terms',
  and: ' and ',
  privacy: 'Privacy Policy',
  demoNote: (o) => `Demo mode: use OTP ${o}`,
  secure: 'We never share your number without your permission.',
};

const hi: LoginCopy = {
  title: 'स्वागत है',
  subtitle: 'आगे बढ़ने के लिए अपना मोबाइल नंबर दर्ज करें।',
  phoneLabel: 'मोबाइल नंबर',
  phonePlaceholder: '10 अंकों का नंबर',
  sendOtp: 'OTP भेजें',
  otpTitle: 'OTP दर्ज करें',
  otpSent: (p) => `हमने +91 ${p} पर 6 अंकों का कोड भेजा है`,
  verify: 'सत्यापित करें और आगे बढ़ें',
  resendIn: (s) => `${s} सेकंड में OTP दोबारा भेजें`,
  resend: 'OTP दोबारा भेजें',
  change: 'नंबर बदलें',
  invalidPhone: 'कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें।',
  wrongOtp: 'यह कोड सही नहीं है। कृपया फिर कोशिश करें।',
  tooMany: 'बहुत ज़्यादा कोशिशें हो गईं। कृपया थोड़ी देर बाद फिर कोशिश करें।',
  failed: 'कुछ गड़बड़ हो गई। कृपया फिर कोशिश करें।',
  consentPre: 'आगे बढ़कर आप हमारी ',
  terms: 'शर्तों',
  and: ' और ',
  privacy: 'गोपनीयता नीति',
  demoNote: (o) => `डेमो मोड: OTP ${o} का उपयोग करें`,
  secure: 'आपकी अनुमति के बिना हम आपका नंबर किसी के साथ साझा नहीं करते।',
};

export const pickLoginCopy = (language?: string): LoginCopy => (language === 'hi' ? hi : en);

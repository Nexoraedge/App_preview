// apps/mobile/src/i18n/pharmacyCopy.ts
// Centralized bilingual dictionary for Pharmacy prescription ordering and billing

export const pharmacyCopy = {
  en: {
    headerTitle: 'Pharmacy & Medicines',
    headerSubtitle: 'Upload prescription, compare local chemist bills & get delivered',
    searchPlaceholder: "Search pharmacy by name or location (e.g. 'Saket')...",

    // Step 1: Upload Prescription
    uploadTitle: 'Upload Doctor Prescription',
    uploadSubtitle: 'Take a clear photo of your prescription or select from gallery',
    btnCamera: 'Take Photo',
    btnGallery: 'Open Gallery',
    maxPagesWarn: 'Maximum 5 pages allowed per order',
    pagesAttached: 'pages attached',

    // Delivery vs Pickup
    fulfillmentTitle: 'Fulfillment Preference',
    deliveryLabel: 'Home Delivery',
    deliverySub: 'Delivered by chemist boy',
    pickupLabel: 'Store Pickup',
    pickupSub: 'Pick from pharmacy counter',

    // Patient
    patientTitle: 'Ordering Medicines For',
    changePatient: 'Change',

    // Select Shop CTA
    selectShopCta: 'Choose Partner Pharmacy ›',
    noPrescriptionWarn: 'Please attach at least 1 page of your prescription',

    // Step 2: Choose Pharmacy
    shopsHeaderTitle: 'Select Partner Pharmacy',
    shopsHeaderSubtitle: 'Nearby empanelled pharmacies with in-app discount guarantee',
    sortByLabel: 'Sort by:',
    sortNearest: 'Nearest',
    sortDiscount: 'Highest Savings',
    discountPill: 'off with in-app pay',
    deliveryAvailable: 'Delivery available',
    pickupAvailable: 'Pickup available',
    sendOrderCta: 'Send Prescription to Pharmacy ›',
    backToPrescription: '‹ Back to Prescription',

    // Step 3: Track & Bill
    trackTitle: 'Order Tracking',
    orderRefLabel: 'Order Ref:',
    pickupCodeLabel: 'Pickup Verification Code:',
    chemistPhone: 'Call Chemist',
    billTitle: 'Itemized Pharmacy Bill',
    billSub: 'Verified by registered pharmacist',
    qtyLabel: 'Qty:',
    subtotalLabel: 'MRP Subtotal:',
    savingsLabel: 'Adityam In-App Discount:',
    deliveryFree: 'Delivery Fee:',
    freeText: 'FREE',
    finalTotalLabel: 'Total Payable:',
    payInAppBtn: 'Pay in App with Discount ›',
    payAtStoreBtn: 'Pay at Counter / COD',
    paidInAppSuccess: '✓ Paid via App • Discount Secured',
    paidAtStoreNote: 'Payment to be made directly at pharmacy reception/delivery',
    doneBtn: 'Back to Pharmacy Home',

    // Order History
    historyTitle: 'Recent Orders & Re-Orders',
    historyEmpty: 'No previous pharmacy orders found',
    downloadInvoice: 'Tax Invoice',
    reorderBtn: 'Reorder',
    statusDelivered: 'Delivered',
    statusReady: 'Ready for Pickup',
    statusOutForDelivery: 'Out for Delivery',
    statusPickedUp: 'Picked Up',
  },
  hi: {
    headerTitle: 'दवाएं एवं फार्मेसी',
    headerSubtitle: 'पर्चा अपलोड करें, स्थानीय केमिस्ट बिल तुलना करें और घर मंगाएं',
    searchPlaceholder: "फार्मेसी नाम या स्थान खोजें (उदा. 'साकेत')...",

    // Step 1: Upload Prescription
    uploadTitle: 'डॉक्टर का पर्चा अपलोड करें',
    uploadSubtitle: 'पर्चे की स्पष्ट फोटो लें या गैलरी से फाइल चुनें',
    btnCamera: 'फोटो खींचें',
    btnGallery: 'गैलरी से चुनें',
    maxPagesWarn: 'प्रति ऑर्डर अधिकतम 5 पेज की अनुमति है',
    pagesAttached: 'पेज संलग्न किए गए',

    // Delivery vs Pickup
    fulfillmentTitle: 'दवा प्राप्ति का तरीका',
    deliveryLabel: 'होम डिलीवरी',
    deliverySub: 'फार्मेसी डिलीवरी बॉय द्वारा',
    pickupLabel: 'दुकान से पिकअप',
    pickupSub: 'काउंटर से स्वयं प्राप्त करें',

    // Patient
    patientTitle: 'दवाएं किसके लिए हैं',
    changePatient: 'बदलें',

    // Select Shop CTA
    selectShopCta: 'पार्टनर फार्मेसी चुनें ›',
    noPrescriptionWarn: 'कृपया कम से कम 1 पर्चे की फोटो संलग्न करें',

    // Step 2: Choose Pharmacy
    shopsHeaderTitle: 'पार्टनर फार्मेसी का चयन करें',
    shopsHeaderSubtitle: 'इन-ऐप छूट गारंटी के साथ आपके नजदीकी अधिकृत मेडिकल स्टोर्स',
    sortByLabel: 'क्रमबद्ध करें:',
    sortNearest: 'निकटतम',
    sortDiscount: 'अधिकतम बचत',
    discountPill: 'छूट इन-ऐप भुगतान पर',
    deliveryAvailable: 'होम डिलीवरी उपलब्ध',
    pickupAvailable: 'काउंटर पिकअप उपलब्ध',
    sendOrderCta: 'फार्मेसी को पर्चा भेजें ›',
    backToPrescription: '‹ पर्चे पर वापस जाएं',

    // Step 3: Track & Bill
    trackTitle: 'ऑर्डर ट्रैकिंग',
    orderRefLabel: 'ऑर्डर संदर्भ:',
    pickupCodeLabel: 'पिकअप सत्यापन कोड:',
    chemistPhone: 'केमिस्ट से बात करें',
    billTitle: 'फार्मेसी द्वारा जारी विस्तृत बिल',
    billSub: 'प्रमाणित फार्मासिस्ट द्वारा जांचा गया',
    qtyLabel: 'मात्रा:',
    subtotalLabel: 'एमआरपी कुल योग:',
    savingsLabel: 'आदित्यम् इन-ऐप छूट:',
    deliveryFree: 'डिलीवरी शुल्क:',
    freeText: 'निःशुल्क (FREE)',
    finalTotalLabel: 'कुल देय राशि:',
    payInAppBtn: 'छूट के साथ ऐप में भुगतान करें ›',
    payAtStoreBtn: 'काउंटर पर नकद भुगतान करें',
    paidInAppSuccess: '✓ ऐप में भुगतान संपन्न • छूट लागू',
    paidAtStoreNote: 'दवा प्राप्त करते समय काउंटर पर भुगतान करें',
    doneBtn: 'फार्मेसी होम पर वापस जाएं',

    // Order History
    historyTitle: 'हाल के ऑर्डर एवं पुनः आर्डर',
    historyEmpty: 'कोई पुराना फार्मेसी ऑर्डर नहीं मिला',
    downloadInvoice: 'टैक्स इनवॉइस',
    reorderBtn: 'पुनः आर्डर करें',
    statusDelivered: 'डिलीवर हो गया',
    statusReady: 'पिकअप के लिए तैयार',
    statusOutForDelivery: 'डिलीवरी के लिए निकल चुका है',
    statusPickedUp: 'पिकअप कर लिया गया',
  },
};

import { createContext, useContext, useState, ReactNode } from "react";

export type Language = "en" | "sw";

const translations = {
  en: {
    // Home
    welcomeBack: "Welcome back 👋",
    findMechanic: "Find a Mechanic",
    whatsWrong: "What's wrong with your car?",
    helperText: "Not sure what's wrong? Choose the closest problem — our mechanics will diagnose it for you.",
    imMechanic: "I'm a Mechanic",

    // Categories
    "cat.engine": "Engine Problem",
    "cat.engine.desc": "Car shakes, loses power, or makes rough sounds",
    "cat.battery": "Battery Issue",
    "cat.battery.desc": "Car won't start or battery light is on",
    "cat.flat-tire": "Flat Tire",
    "cat.flat-tire.desc": "Tire is flat, leaking air, or damaged",
    "cat.not-starting": "Car Not Starting",
    "cat.not-starting.desc": "Key turns but nothing happens",
    "cat.brakes": "Brake Problem",
    "cat.brakes.desc": "Squeaking, grinding, or brakes feel soft",
    "cat.oil-change": "Oil Change",
    "cat.oil-change.desc": "Routine oil change or oil light is on",
    "cat.overheating": "Overheating",
    "cat.overheating.desc": "Temperature gauge is high or steam from hood",
    "cat.strange-noise": "Strange Noise",
    "cat.strange-noise.desc": "Unusual sounds from engine, wheels, or exhaust",
    "cat.lights": "Lights Problem",
    "cat.lights.desc": "Headlights, tail lights, or dashboard warning lights",
    "cat.other": "Other Problem",
    "cat.other.desc": "Something else not listed above",

    // History
    history: "History",
    pastRequests: "Your past service requests",
    completed: "Completed",
    cancelled: "Cancelled",
    pending: "Pending",

    // Settings
    settings: "Settings",
    manageAccount: "Manage your account",
    language: "Language",
    notifications: "Notifications",
    pushEmail: "Push & email alerts",
    logOut: "Log Out",

    // Bottom Nav
    home: "Home",

    // Map
    yourLocation: "Your location",
    nearbyMechanics: "Nearby Mechanics",
    request: "Request",
    away: "away",
    reviews: "reviews",

    // Request Form
    describeIssue: "Describe the Issue",
    whatsHappening: "What's happening?",
    descPlaceholder: "e.g. Strange noise when braking, engine overheating...",
    carModel: "Car Model",
    carModelPlaceholder: "e.g. Toyota Camry, Honda Civic",
    carYear: "Car Year",
    optional: "optional",
    vehicleSize: "Vehicle Size",
    "size.small": "Small",
    "size.medium": "Medium",
    "size.large": "Large",
    estimatedPrice: "Estimated Price",
    diagnosisFee: "Diagnosis Fee",
    estimatedRepair: "Estimated Repair",
    total: "Total",
    priceNote: "Final price will be confirmed by mechanic after inspection.",
    findNearbyMechanics: "Find Nearby Mechanics",

    // Nearby / Matching
    searchingMechanics: "Searching for mechanics...",
    matchingSkills: "Searching for the best mechanic near you",
    waitingAcceptance: "Waiting for a mechanic...",
    requestSent: "Your request has been sent to the nearest qualified mechanic",
    cancel: "Cancel",
    mechanicAssigned: "Mechanic Assigned",
    mechanicAccepted: "A mechanic has accepted your request!",
    yrsExp: "yrs exp",
    trackMechanic: "Track Mechanic",

    // Order Status
    jobStatus: "Order Status",
    jobCompleted: "Order Completed!",
    thankYou: "Thank you for using MechaBot",
    invoiceTotal: "Order Total",
    backToHome: "Back to Home",
    inProgress: "In progress...",
    eta: "ETA",
    arrived: "Arrived",
    callMechanic: "Call",
    chatMechanic: "Chat",
    "status.pending": "Pending",
    "status.accepted": "Accepted",
    "status.on_the_way": "On the Way",
    "status.arrived": "Arrived",
    "status.diagnosis": "Diagnosis",
    "status.repair": "Repair",
    "status.completed": "Completed",
    "status.cancelled": "Cancelled",

    // Chat
    chatAutoGreeting: "Hi! I'm on my way to help you. What else can you tell me about the issue?",
    chatAutoReply: "Got it, thanks for the details. I'll be there soon!",
    online: "Online",
    typeMessage: "Type a message...",
    
    // Theme
    theme: "Theme",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    themeDesc: "Switch appearance",

    // Verification
    verifyEmail: "Verify Your Email",
    verifyDesc: "Enter the 6-digit code sent to your email",
    verify: "Verify",
    resendCode: "Resend Code",
    codeSent: "Code sent!",
    invalidCode: "Invalid code. Please try again.",
    codeExpired: "Code expired. Request a new code.",
    checkEmail: "Please check your email to verify your account.",

    // Auth
    whoAreYou: "Who are you?",
    selectRole: "Select how you want to use MechaBot",
    iAmClient: "I'm a Client",
    clientDesc: "I need a mechanic for my vehicle",
    iAmMechanic: "I'm a Mechanic",
    mechanicDesc: "I want to offer my repair services",
    alreadyHaveAccount: "Already have an account?",
    dontHaveAccount: "Don't have an account?",
    signIn: "Sign In",
    signUp: "Sign Up",
    createAccount: "Create Account",
    mechanicSignUp: "Mechanic Sign Up",
    joinMechaBot: "Join MechaBot today",
    signInContinue: "Sign in to continue",
    fullName: "Full name",
    emailAddress: "Email address",
    phoneNumber: "Phone number",
    password: "Password",
    confirmPassword: "Confirm password",
    selectSpecialities: "Select your specialities",
    garageLocation: "Garage / service area location",
    uploadPhoto: "Upload profile photo (optional)",
    uploadDocs: "Upload certifications (optional)",
    mechanicApprovalNote: "Your account will be reviewed before activation. You'll be notified once approved.",
    fieldRequired: "This field is required",
    passwordMin: "Password must be at least 6 characters",
    passwordMismatch: "Passwords do not match",
    selectOneSkill: "Select at least one speciality",
    validEmail: "Enter a valid email address",

    // Forgot Password
    forgotPassword: "Forgot Password?",
    resetPassword: "Reset Password",
    sendResetCode: "Send Reset Code",
    enterResetCode: "Enter Reset Code",
    newPassword: "New password",
    confirmNewPassword: "Confirm new password",
    resetCodeSent: "Password reset code sent to your email.",
    passwordChangedSuccess: "Password changed successfully. You can now log in.",
    invalidResetCode: "Invalid code. Please try again.",
    resetCodeExpired: "Code expired. Request a new code.",
    tooManyAttempts: "Too many attempts. Please try again later.",
    enterEmailForReset: "Enter the email address linked to your account",
    resendIn: "Resend in",

    // Mechanic Dashboard
    mechanicDashboard: "Mechanic Dashboard",
    offline: "Offline",
    incomingJobs: "Incoming Orders",
    jobHistory: "Order History",
    jobs: "Orders",
    earnings: "Earnings",
    accept: "Accept",
    decline: "Decline",
    tier: "Tier",
    diamond: "Diamond",
    gold: "Gold",
    silver: "Silver",
    serviceArea: "Service Area",

    // Select Problem
    selectProblem: "What's the problem?",
    selectProblemDesc: "Select the issue that best describes your car problem.",

    // Voice Diagnosis
    voiceNote: "Voice Note",
    recordVoice: "Record Voice",
    tapToRecord: "Tap to record",
    uploadAudio: "Upload Audio",
    mp3WavM4a: "MP3, WAV, M4A",
    recording: "Recording",
    stop: "Stop",
    voiceReady: "Voice note ready",
    analyzingVoice: "Analyzing...",
    diagnoseWithAI: "Diagnose with AI",
    diagnosisFailed: "Diagnosis failed",
    micPermissionDenied: "Microphone access denied",
    invalidAudioFile: "Please select an audio file",
    fileTooLarge: "File must be under 10 MB",
    aiDiagnosis: "AI Diagnosis",
    yourMessage: "Your Message",
    detectedProblem: "Detected Problem",
    urgency: "urgency",
    recommendedSpecialty: "Recommended Mechanic Specialty",
    viewOnMap: "View Mechanics on Map",
    orDescribeByVoice: "Or describe by voice",

    // Report Problem
    reportTitle: "Report Your Car Problem",
    reportDescLabel: "Describe your car problem",
    reportDescPlaceholder: "Example: My car does not start and I hear clicking sounds",
    reportImageLabel: "Upload a photo of the car issue (optional)",
    reportUploadPhoto: "Upload Photo",
    reportInvalidImage: "Please select an image file",
    reportNoInput: "Please describe the problem or record a voice note",
    reportAnalyzeBtn: "Analyze Problem with AI",
    reportProblemSummary: "Problem Summary",
    reportRecommendedMechanic: "Recommended Mechanic",
    reportRequestMechanic: "Request Mechanic",
    reportNoMechanicFound: "No matching mechanic is currently online. Submit a request and we'll notify one.",
    reportMapTitle: "Mechanic Location Map",
    reportMapPlaceholder: "Map will appear here when Google Maps API is connected.",

    // Service Prices
    servicePrices: "Service Prices",
    viewPrices: "View Service Prices",

    // Mechanic Orders
    viewOrders: "View Orders",
    orderAccepted: "Order Accepted",
    orderAcceptedDesc: "You have accepted the service request.",
    navigationStarted: "Navigation Started",
    navigationStartedDesc: "Google Maps opened with directions.",
    noRequests: "No service requests yet",
    noRequestsDesc: "New requests will appear here in real-time",
    navigate: "Navigate",

    // Voice notifications
    voiceNotifications: "Voice Notifications",
    voiceNotificationsDesc: "Read alerts aloud in your language",
  },
  sw: {
    // Home
    welcomeBack: "Karibu tena 👋",
    findMechanic: "Tafuta Fundi",
    whatsWrong: "Tatizo la gari lako ni nini?",
    helperText: "Hujui tatizo? Chagua tatizo lililo karibu — fundi wetu atakagundua.",
    imMechanic: "Mimi ni Fundi",

    // Categories
    "cat.engine": "Tatizo la Injini",
    "cat.engine.desc": "Gari linatetemeka, linapoteza nguvu, au linatoa sauti",
    "cat.battery": "Tatizo la Betri",
    "cat.battery.desc": "Gari halianzishi au taa ya betri imewaka",
    "cat.flat-tire": "Tairi Bapa",
    "cat.flat-tire.desc": "Tairi imebapa, inavuja hewa, au imeharibika",
    "cat.not-starting": "Gari Halianzishi",
    "cat.not-starting.desc": "Ufunguo unazunguka lakini hakuna kinachotokea",
    "cat.brakes": "Tatizo la Breki",
    "cat.brakes.desc": "Inapiga kelele, inasaga, au breki ni laini",
    "cat.oil-change": "Kubadilisha Mafuta",
    "cat.oil-change.desc": "Kubadilisha mafuta ya kawaida au taa ya mafuta imewaka",
    "cat.overheating": "Kupasha Joto Kupita Kiasi",
    "cat.overheating.desc": "Kipimo cha joto kiko juu au mvuke kutoka kwenye boneti",
    "cat.strange-noise": "Sauti ya Ajabu",
    "cat.strange-noise.desc": "Sauti zisizo za kawaida kutoka injini, magurudumu, au ekzosi",
    "cat.lights": "Tatizo la Taa",
    "cat.lights.desc": "Taa za mbele, taa za nyuma, au taa za onyo za dashibodi",
    "cat.other": "Tatizo Lingine",
    "cat.other.desc": "Kitu kingine ambacho hakijaorodheshwa hapo juu",

    // History
    history: "Historia",
    pastRequests: "Maombi yako ya zamani ya huduma",
    completed: "Imekamilika",
    cancelled: "Imeghairiwa",
    pending: "Inasubiri",

    // Settings
    settings: "Mipangilio",
    manageAccount: "Simamia akaunti yako",
    language: "Lugha",
    notifications: "Arifa",
    pushEmail: "Arifa za push na barua pepe",
    logOut: "Ondoka",

    // Bottom Nav
    home: "Nyumbani",

    // Map
    yourLocation: "Mahali pako",
    nearbyMechanics: "Mafundi wa Karibu",
    request: "Omba",
    away: "mbali",
    reviews: "maoni",

    // Request Form
    describeIssue: "Elezea Tatizo",
    whatsHappening: "Kinachotokea ni nini?",
    descPlaceholder: "mfano: Sauti ya ajabu wakati wa breki, injini inapasha joto...",
    carModel: "Aina ya Gari",
    carModelPlaceholder: "mfano: Toyota Camry, Honda Civic",
    carYear: "Mwaka wa Gari",
    optional: "si lazima",
    vehicleSize: "Ukubwa wa Gari",
    "size.small": "Ndogo",
    "size.medium": "Wastani",
    "size.large": "Kubwa",
    estimatedPrice: "Makadirio ya Gharama",
    diagnosisFee: "Ada ya Uchunguzi",
    estimatedRepair: "Makadirio ya Ukarabati",
    total: "Jumla",
    priceNote: "Bei halisi itathibitishwa na fundi baada ya ukaguzi.",
    findNearbyMechanics: "Tafuta Mafundi wa Karibu",

    // Nearby / Matching
    searchingMechanics: "Inatafuta mafundi...",
    matchingSkills: "Inatafuta fundi bora aliye karibu nawe",
    waitingAcceptance: "Inasubiri fundi...",
    requestSent: "Ombi lako limetumwa kwa fundi aliye karibu na anayefaa",
    cancel: "Ghairi",
    mechanicAssigned: "Fundi Amepewa",
    mechanicAccepted: "Fundi amekubali ombi lako!",
    yrsExp: "miaka uzoefu",
    trackMechanic: "Fuatilia Fundi",

    // Order Status
    jobStatus: "Hali ya Oda",
    jobCompleted: "Oda Imekamilika!",
    thankYou: "Asante kwa kutumia MechaBot",
    invoiceTotal: "Jumla ya Oda",
    backToHome: "Rudi Nyumbani",
    inProgress: "Inaendelea...",
    eta: "Muda",
    arrived: "Amefika",
    callMechanic: "Piga simu",
    chatMechanic: "Tuma ujumbe",
    "status.pending": "Inasubiri",
    "status.accepted": "Imekubaliwa",
    "status.on_the_way": "Anakuja",
    "status.arrived": "Amefika",
    "status.diagnosis": "Uchunguzi",
    "status.repair": "Ukarabati",
    "status.completed": "Imekamilika",
    "status.cancelled": "Imeghairiwa",

    // Chat
    chatAutoGreeting: "Habari! Niko njiani kukusaidia. Je, unaweza kunieleza zaidi kuhusu tatizo?",
    chatAutoReply: "Nimeelewa, asante kwa maelezo. Nitafika hivi karibuni!",
    online: "Mtandaoni",
    typeMessage: "Andika ujumbe...",
    
    // Theme
    theme: "Mandhari",
    darkMode: "Hali ya Giza",
    lightMode: "Hali ya Mwanga",
    themeDesc: "Badilisha muonekano",

    // Verification
    verifyEmail: "Thibitisha Barua Pepe Yako",
    verifyDesc: "Weka msimbo wa tarakimu 6 uliotumwa kwa barua pepe yako",
    verify: "Thibitisha",
    resendCode: "Tuma Tena Msimbo",
    codeSent: "Msimbo umetumwa!",
    invalidCode: "Msimbo si sahihi. Tafadhali jaribu tena.",
    codeExpired: "Msimbo umekwisha muda. Omba msimbo mpya.",
    checkEmail: "Tafadhali angalia barua pepe yako kuthibitisha akaunti yako.",

    // Auth
    whoAreYou: "Wewe ni nani?",
    selectRole: "Chagua jinsi unavyotaka kutumia MechaBot",
    iAmClient: "Mimi ni Mteja",
    clientDesc: "Ninahitaji fundi kwa gari langu",
    iAmMechanic: "Mimi ni Fundi",
    mechanicDesc: "Nataka kutoa huduma za ukarabati",
    alreadyHaveAccount: "Tayari una akaunti?",
    dontHaveAccount: "Huna akaunti?",
    signIn: "Ingia",
    signUp: "Jisajili",
    createAccount: "Fungua Akaunti",
    mechanicSignUp: "Usajili wa Fundi",
    joinMechaBot: "Jiunge na MechaBot leo",
    signInContinue: "Ingia kuendelea",
    fullName: "Jina kamili",
    emailAddress: "Anwani ya barua pepe",
    phoneNumber: "Nambari ya simu",
    password: "Nywila",
    confirmPassword: "Thibitisha nywila",
    selectSpecialities: "Chagua utaalamu wako",
    garageLocation: "Eneo la karakana / huduma",
    uploadPhoto: "Pakia picha ya wasifu (si lazima)",
    uploadDocs: "Pakia vyeti (si lazima)",
    mechanicApprovalNote: "Akaunti yako itakaguliwa kabla ya kuamilishwa. Utaarifiwa ikishaidhinishwa.",
    fieldRequired: "Sehemu hii inahitajika",
    passwordMin: "Nywila lazima iwe na herufi 6 au zaidi",
    passwordMismatch: "Nywila hazifanani",
    selectOneSkill: "Chagua angalau utaalamu mmoja",
    validEmail: "Weka anwani sahihi ya barua pepe",

    // Forgot Password
    forgotPassword: "Umesahau Nywila?",
    resetPassword: "Weka Upya Nenosiri",
    sendResetCode: "Tuma Namba ya Uthibitisho",
    enterResetCode: "Weka Namba ya Uthibitisho",
    newPassword: "Nywila mpya",
    confirmNewPassword: "Thibitisha nywila mpya",
    resetCodeSent: "Namba ya kubadilisha nywila imetumwa kwa barua pepe yako.",
    passwordChangedSuccess: "Nenosiri limebadilishwa kikamilifu. Sasa unaweza kuingia.",
    invalidResetCode: "Namba si sahihi. Tafadhali jaribu tena.",
    resetCodeExpired: "Namba imekwisha muda. Omba namba mpya.",
    tooManyAttempts: "Majaribio mengi sana. Tafadhali jaribu tena baadaye.",
    enterEmailForReset: "Weka anwani ya barua pepe iliyounganishwa na akaunti yako",
    resendIn: "Tuma tena baada ya",

    // Mechanic Dashboard
    mechanicDashboard: "Dashibodi ya Fundi",
    offline: "Nje ya Mtandao",
    incomingJobs: "Oda Zinazoingia",
    jobHistory: "Historia ya Oda",
    jobs: "Oda",
    earnings: "Mapato",
    accept: "Kubali",
    decline: "Kataa",
    tier: "Daraja",
    diamond: "Almasi",
    gold: "Dhahabu",
    silver: "Fedha",
    serviceArea: "Eneo la Huduma",

    // Select Problem
    selectProblem: "Tatizo ni nini?",
    selectProblemDesc: "Chagua tatizo linaloelezea vizuri tatizo la gari lako.",

    // Voice Diagnosis
    voiceNote: "Ujumbe wa Sauti",
    recordVoice: "Rekodi Sauti",
    tapToRecord: "Gusa kurekodi",
    uploadAudio: "Pakia Sauti",
    mp3WavM4a: "MP3, WAV, M4A",
    recording: "Inarekodi",
    stop: "Simama",
    voiceReady: "Ujumbe wa sauti tayari",
    analyzingVoice: "Inachambua...",
    diagnoseWithAI: "Chunguza na AI",
    diagnosisFailed: "Uchunguzi umeshindwa",
    micPermissionDenied: "Ruhusa ya maikrofoni imekataliwa",
    invalidAudioFile: "Tafadhali chagua faili ya sauti",
    fileTooLarge: "Faili lazima iwe chini ya MB 10",
    aiDiagnosis: "Uchunguzi wa AI",
    yourMessage: "Ujumbe Wako",
    detectedProblem: "Tatizo Lililogunduliwa",
    urgency: "dharura",
    recommendedSpecialty: "Utaalamu wa Fundi Unaopendekezwa",
    viewOnMap: "Angalia Mafundi kwenye Ramani",
    orDescribeByVoice: "Au elezea kwa sauti",

    // Report Problem
    reportTitle: "Ripoti Tatizo la Gari Lako",
    reportDescLabel: "Elezea tatizo la gari lako",
    reportDescPlaceholder: "Mfano: Gari langu halianzishi na nasikia sauti za kubonyeza",
    reportImageLabel: "Pakia picha ya tatizo la gari (si lazima)",
    reportUploadPhoto: "Pakia Picha",
    reportInvalidImage: "Tafadhali chagua faili ya picha",
    reportNoInput: "Tafadhali elezea tatizo au rekodi ujumbe wa sauti",
    reportAnalyzeBtn: "Changanua Tatizo na AI",
    reportProblemSummary: "Muhtasari wa Tatizo",
    reportRecommendedMechanic: "Fundi Anayependekezwa",
    reportRequestMechanic: "Omba Fundi",
    reportNoMechanicFound: "Hakuna fundi anayepatikana sasa. Tuma ombi na tutamjulisha.",
    reportMapTitle: "Ramani ya Eneo la Fundi",
    reportMapPlaceholder: "Ramani itaonekana hapa wakati Google Maps API itakapounganishwa.",

    // Service Prices
    servicePrices: "Bei za Huduma",
    viewPrices: "Angalia Bei za Huduma",

    // Mechanic Orders
    viewOrders: "Angalia Maagizo",
    orderAccepted: "Agizo Limekubaliwa",
    orderAcceptedDesc: "Umekubali ombi la huduma.",
    navigationStarted: "Urambazaji Umeanza",
    navigationStartedDesc: "Google Maps imefunguliwa na maelekezo.",
    noRequests: "Hakuna maombi ya huduma bado",
    noRequestsDesc: "Maombi mapya yataonekana hapa kwa wakati halisi",
    navigate: "Rambaza",

    // Voice notifications
    voiceNotifications: "Arifa za Sauti",
    voiceNotificationsDesc: "Soma arifa kwa sauti kwa lugha yako",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("mechabot-lang") : null;
    return (saved === "en" || saved === "sw") ? saved : "en";
  });

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};

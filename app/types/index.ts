export type PhoneType = "smartphone" | "featurephone"

export interface SessionData {
  phoneNumber: string
  sessionId: string
  currentMenu: string
  menuStack: string[]
}

export interface USSDResponse {
  message: string
  continueSession: boolean
  sessionId: string
  ussdCode?: string
  menuOptions?: string[]
  inputRequired?: boolean
  inputType?: "numeric" | "text"
  offers?: Offer[]
}

export interface Offer {
  id: string
  title: string
  description: string
  price: number
  dataAmount?: string
  voiceMinutes?: string
  validity: string
  recommended?: boolean
}

export interface USSDRequest {
  phoneNumber: string
  sessionId: string
  ussdCode: string
  imei: string
  input?: string
  menuPath?: string[]
}

export interface CustomerProfile {
  phoneNumber: string
  accountBalance: number
  dataUsage: number
  voiceUsage: number
  preferredOffers: string[]
  lastTopUp: string
  segment: "premium" | "regular" | "low-usage"
}

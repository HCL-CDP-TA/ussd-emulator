"use client"

import { useState, useEffect } from "react"
import PhoneSelector from "./components/PhoneSelector"
import SmartPhone from "./components/SmartPhone"
import FeaturePhone from "./components/FeaturePhone"
import { PhoneType, SessionData, USSDRequest, USSDResponse } from "./types"
import { generateIMEI } from "./utils/imei"

interface SavedPhone {
  phoneNumber: string
  imei: string
}

export default function Home() {
  const [phoneType, setPhoneType] = useState<PhoneType>("smartphone")
  const [currentNumber, setCurrentNumber] = useState<string>("")
  const [sessionData, setSessionData] = useState<SessionData>({
    phoneNumber: "",
    sessionId: "",
    currentMenu: "",
    menuStack: [],
  })

  const [savedPhones, setSavedPhones] = useState<SavedPhone[]>([])
  const [debugData, setDebugData] = useState<{
    lastRequest?: USSDRequest
    lastResponse?: USSDResponse
    timestamp?: string
  }>({})
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    // Load saved phones from localStorage
    const saved = localStorage.getItem("ussd-saved-phones")
    if (saved) {
      setSavedPhones(JSON.parse(saved))
    } else {
      // Migrate from old storage format if it exists
      const oldNumbers = localStorage.getItem("ussd-saved-numbers")
      const oldIMEIs = localStorage.getItem("ussd-phone-imei-map")

      if (oldNumbers) {
        const numbers: string[] = JSON.parse(oldNumbers)
        const imeiMap: Record<string, string> = oldIMEIs ? JSON.parse(oldIMEIs) : {}

        const migratedPhones: SavedPhone[] = numbers.map(phoneNumber => ({
          phoneNumber,
          imei: imeiMap[phoneNumber] || generateIMEI(),
        }))

        setSavedPhones(migratedPhones)
        localStorage.setItem("ussd-saved-phones", JSON.stringify(migratedPhones))

        // Clean up old storage
        localStorage.removeItem("ussd-saved-numbers")
        localStorage.removeItem("ussd-phone-imei-map")
      }
    }
  }, [])

  const savePhoneNumber = (phoneNumber: string) => {
    const existingPhone = savedPhones.find(phone => phone.phoneNumber === phoneNumber)
    if (!existingPhone) {
      const newPhone: SavedPhone = {
        phoneNumber,
        imei: generateIMEI(),
      }
      const updated = [...savedPhones, newPhone]
      setSavedPhones(updated)
      localStorage.setItem("ussd-saved-phones", JSON.stringify(updated))
    }
  }

  const selectNumber = (phoneNumber: string) => {
    setCurrentNumber(phoneNumber)
    // Clear any existing session when switching numbers
    setSessionData({
      phoneNumber: "",
      sessionId: "",
      currentMenu: "",
      menuStack: [],
    })
    savePhoneNumber(phoneNumber)
  }

  const removeNumber = (phoneNumber: string) => {
    const updated = savedPhones.filter(phone => phone.phoneNumber !== phoneNumber)
    setSavedPhones(updated)
    localStorage.setItem("ussd-saved-phones", JSON.stringify(updated))

    // If we're removing the currently selected number, clear it
    if (currentNumber === phoneNumber) {
      setCurrentNumber("")
      setSessionData({
        phoneNumber: "",
        sessionId: "",
        currentMenu: "",
        menuStack: [],
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-grey-800 mb-2">USSD Emulator</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <PhoneSelector
              phoneType={phoneType}
              onPhoneTypeChange={setPhoneType}
              savedNumbers={savedPhones.map(phone => phone.phoneNumber)}
              onSelectNumber={selectNumber}
              onRemoveNumber={removeNumber}
              currentNumber={currentNumber}
              sessionData={sessionData}
              onExecuteCode={code => {
                // Execute code on the active phone
                if (phoneType === "smartphone") {
                  window.dispatchEvent(new CustomEvent("executeUSSD", { detail: code }))
                } else {
                  window.dispatchEvent(new CustomEvent("executeUSSD", { detail: code }))
                }
              }}
            />

            {/* Debug Toggle */}
            <div className="mt-4">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                {showDebug ? "Hide" : "Show"} Debug Info
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 flex justify-center">
            {phoneType === "smartphone" ? (
              <SmartPhone
                currentNumber={currentNumber}
                phoneIMEIMap={Object.fromEntries(savedPhones.map(phone => [phone.phoneNumber, phone.imei]))}
                sessionData={sessionData}
                onSessionUpdate={setSessionData}
                onDebugUpdate={setDebugData}
              />
            ) : (
              <FeaturePhone
                currentNumber={currentNumber}
                phoneIMEIMap={Object.fromEntries(savedPhones.map(phone => [phone.phoneNumber, phone.imei]))}
                sessionData={sessionData}
                onSessionUpdate={setSessionData}
                onDebugUpdate={setDebugData}
              />
            )}
          </div>
        </div>

        {/* Debug Screen */}
        {showDebug && (
          <div className="mt-8">
            <div className="bg-gray-900 text-green-400 rounded-lg p-6 font-mono text-sm">
              <h3 className="text-xl font-bold mb-6 text-white">Debug Console</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {debugData.timestamp && (
                  <div>
                    <div className="text-yellow-400 mb-2">Last Request ({debugData.timestamp}):</div>
                    <pre className="bg-gray-800 p-4 rounded overflow-auto text-xs">
                      {JSON.stringify(debugData.lastRequest, null, 2)}
                    </pre>
                  </div>
                )}

                {debugData.lastResponse && (
                  <div>
                    <div className="text-blue-400 mb-2">Last Response:</div>
                    <pre className="bg-gray-800 p-4 rounded overflow-auto text-xs">
                      {JSON.stringify(debugData.lastResponse, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {!debugData.timestamp && <div className="text-gray-500 text-center py-8">No API calls yet...</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

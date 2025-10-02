"use client"

import { useState, useEffect, useCallback } from "react"
import { Signal, Battery, Phone, Delete, Voicemail } from "lucide-react"
import { SessionData, USSDResponse, USSDRequest } from "../types"
import { generateGuid } from "../utils/guid"

interface SmartPhoneProps {
  currentNumber: string
  phoneIMEIMap: Record<string, string>
  sessionData: SessionData
  onSessionUpdate: (data: SessionData) => void
  onDebugUpdate: (data: { lastRequest?: USSDRequest; lastResponse?: USSDResponse; timestamp?: string }) => void
}

export default function SmartPhone({
  currentNumber,
  phoneIMEIMap,
  sessionData,
  onSessionUpdate,
  onDebugUpdate,
}: SmartPhoneProps) {
  const [currentInput, setCurrentInput] = useState("")
  const [ussdInput, setUssdInput] = useState("")
  const [ussdResponse, setUssdResponse] = useState<USSDResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [pressedButton, setPressedButton] = useState<string | null>(null)

  // Keyboard event listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't interfere with input fields
      const target = event.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.contentEditable === "true") {
        return
      }

      // When USSD popup is open, only allow keypad input if not focused on popup input
      if (ussdResponse && target.closest(".ussd-popup")) {
        return
      }

      const key = event.key

      // Handle number keys, * and #
      if (/^[0-9*#]$/.test(key)) {
        event.preventDefault()
        setPressedButton(key)
        setCurrentInput(prev => prev + key)
        // Clear pressed state after animation
        setTimeout(() => setPressedButton(null), 150)
      }

      // Handle backspace
      if (key === "Backspace") {
        event.preventDefault()
        setPressedButton("backspace")
        setCurrentInput(prev => prev.slice(0, -1))
        setTimeout(() => setPressedButton(null), 150)
      }

      // Handle enter key to send
      if (key === "Enter" && currentInput.trim()) {
        event.preventDefault()
        handleSendInput()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [ussdResponse, currentInput]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendUSSDRequest = useCallback(
    async (code: string, input?: string) => {
      // Validate that a phone number is selected
      if (!currentNumber) {
        alert("Please select a phone number first")
        return
      }

      // Auto-create session if needed when sending USSD code
      let currentSessionId = sessionData.sessionId
      let currentPhoneNumber = currentNumber

      if (!currentSessionId && code.startsWith("*")) {
        currentSessionId = generateGuid()
        // Use the current number from props
        if (!currentPhoneNumber) {
          currentPhoneNumber = "+254712345678" // Default fallback
        }

        onSessionUpdate({
          phoneNumber: currentPhoneNumber,
          sessionId: currentSessionId,
          currentMenu: "",
          menuStack: [],
        })
      }

      if (!currentPhoneNumber) return

      setLoading(true)
      try {
        const requestData = {
          phoneNumber: currentPhoneNumber,
          sessionId: currentSessionId,
          ussdCode: code,
          imei: phoneIMEIMap[currentPhoneNumber] || "",
          input,
          menuPath: sessionData.menuStack,
        }

        const response = await fetch("/api/ussd", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData),
        })

        const data: USSDResponse = await response.json()
        setUssdResponse(data)
        setUssdInput("") // Clear USSD input for user response

        // Update debug info
        onDebugUpdate({
          lastRequest: requestData,
          lastResponse: data,
          timestamp: new Date().toLocaleTimeString(),
        })

        if (data.continueSession) {
          // Build menuStack based on whether this is a new USSD code or menu navigation
          let updatedMenuStack = sessionData.menuStack

          if (input) {
            // User provided input (menu selection), add to stack
            updatedMenuStack = [...sessionData.menuStack, input]
          } else if (code.startsWith("*") && code.endsWith("#")) {
            // New USSD code, reset stack
            updatedMenuStack = []
          }

          onSessionUpdate({
            phoneNumber: currentPhoneNumber,
            sessionId: data.sessionId,
            currentMenu: code,
            menuStack: updatedMenuStack,
          })
        }
      } catch (error) {
        console.error("USSD request failed:", error)
      } finally {
        setLoading(false)
      }
    },
    [currentNumber, phoneIMEIMap, sessionData, onSessionUpdate, onDebugUpdate],
  )

  // Listen for execute events from PhoneSelector
  useEffect(() => {
    const handleExecuteUSSD = (event: CustomEvent) => {
      setCurrentInput(event.detail)
      sendUSSDRequest(event.detail)
    }

    window.addEventListener("executeUSSD", handleExecuteUSSD as EventListener)
    return () => window.removeEventListener("executeUSSD", handleExecuteUSSD as EventListener)
  }, [currentNumber, sendUSSDRequest])

  const handleSendInput = () => {
    if (ussdResponse) {
      // Sending USSD response - keep original USSD code, pass input as parameter
      if (ussdInput.trim()) {
        sendUSSDRequest(sessionData.currentMenu || "*131#", ussdInput)
        setUssdInput("")
      }
    } else {
      // Sending initial USSD code
      if (currentInput.trim()) {
        sendUSSDRequest(currentInput)
        setCurrentInput("")
      }
    }
  }

  const handleBackspace = () => {
    setPressedButton("backspace")
    setCurrentInput(prev => prev.slice(0, -1))
    setTimeout(() => setPressedButton(null), 150)
  }

  const handleKeypadPress = (key: string) => {
    setPressedButton(key)
    setCurrentInput(prev => prev + key)
    setTimeout(() => setPressedButton(null), 150)
  }

  const keypadButtons = [
    [
      { key: "1", sub: "📧", hasVoicemail: true },
      { key: "2", sub: "ABC" },
      { key: "3", sub: "DEF" },
    ],
    [
      { key: "4", sub: "GHI" },
      { key: "5", sub: "JKL" },
      { key: "6", sub: "MNO" },
    ],
    [
      { key: "7", sub: "PQRS" },
      { key: "8", sub: "TUV" },
      { key: "9", sub: "WXYZ" },
    ],
    [
      { key: "*", sub: "" },
      { key: "0", sub: "" },
      { key: "#", sub: "" },
    ],
  ]

  return (
    <div className="relative">
      {/* Phone Frame */}
      <div className="bg-black p-4 rounded-3xl shadow-2xl w-[380px]">
        {/* Screen */}
        <div className="bg-white rounded-2xl p-4 h-[720px] flex flex-col">
          {/* Status Bar */}
          <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
            <span>Unitel</span>
            <div className="flex items-center space-x-2">
              <Signal className="w-3 h-3" />
              <Battery className="w-3 h-3" />
              <span>95%</span>
            </div>
          </div>

          {/* Normal Dialer Interface - Always visible */}
          <div className="flex-1 flex flex-col">
            {/* Dialer Header */}

            {/* Number Display */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4 text-center">
              <div className="text-2xl font-mono text-gray-800 min-h-[32px] flex items-center justify-center">
                {currentInput}
              </div>
            </div>

            {/* Main Keypad */}
            <div className="flex-1 flex flex-col justify-end">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {keypadButtons.flat().map(button => (
                  <button
                    key={button.key}
                    onClick={() => handleKeypadPress(button.key)}
                    className={`h-14 rounded-full text-xl font-semibold text-gray-800 transition-all duration-150 border border-gray-300 transform ${
                      pressedButton === button.key
                        ? "bg-gradient-to-b from-gray-300 to-gray-400 shadow-sm translate-y-1 scale-95"
                        : "bg-gradient-to-b from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 shadow-md hover:shadow-lg"
                    }`}>
                    <div className="flex flex-col items-center">
                      <div className="text-xl font-semibold">{button.key}</div>
                      {button.hasVoicemail ? (
                        <Voicemail className="w-3 h-3 text-gray-500" />
                      ) : (
                        button.sub && <div className="text-xs text-gray-500 font-normal leading-none">{button.sub}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center items-center relative">
                <button
                  onClick={handleSendInput}
                  disabled={!currentInput.trim() || loading}
                  className="px-6 py-3 bg-gradient-to-b from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-full transition-all shadow-md active:shadow-sm active:translate-y-px text-sm font-semibold">
                  {loading ? (
                    "Calling..."
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4" />
                      <span>Call</span>
                    </div>
                  )}
                </button>
                <button
                  onClick={handleBackspace}
                  disabled={!currentInput}
                  className={`absolute right-0 p-3 transition-all duration-150 rounded-full ${
                    pressedButton === "backspace"
                      ? "text-gray-700 bg-gray-200 scale-90"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  } disabled:text-gray-300 disabled:hover:bg-transparent`}>
                  <Delete className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* USSD Response Popup - Centered in available space above keypad */}
      {ussdResponse && (
        <div className="absolute top-16 left-6 right-6 bottom-80 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white border-2 border-gray-400 rounded-lg p-4 max-w-sm w-full shadow-xl pointer-events-auto ussd-popup">
            {/* USSD Message */}
            <div className="mb-4">
              <div className="text-sm">{ussdResponse.message}</div>
            </div>

            {/* Menu Options */}
            {ussdResponse.menuOptions && (
              <div className="mb-4">
                {ussdResponse.menuOptions.map((option, index) => (
                  <div key={index} className="text-sm">
                    {index + 1}. {option}
                  </div>
                ))}
              </div>
            )}

            {/* USSD Input Section - Separate smaller input */}
            {(ussdResponse.inputRequired || ussdResponse.menuOptions) && (
              <div className="mb-4">
                <input
                  type="text"
                  value={ussdInput}
                  onChange={e => setUssdInput(e.target.value)}
                  className="w-full border-b border-black px-2 py-1 text-lg"
                  autoFocus
                  maxLength={2}
                />
              </div>
            )}

            {/* Simple Buttons */}
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setUssdResponse(null)}
                className="px-4 py-1 border border-gray-300 bg-gray-100 text-sm">
                Cancel
              </button>
              {ussdResponse.continueSession ? (
                <button
                  onClick={handleSendInput}
                  disabled={!ussdInput.trim() || loading}
                  className="px-4 py-1 border border-gray-300 bg-gray-100 text-sm disabled:bg-gray-200">
                  {loading ? "Sending..." : "OK"}
                </button>
              ) : (
                <button
                  onClick={() => setUssdResponse(null)}
                  className="px-4 py-1 border border-gray-300 bg-gray-100 text-sm">
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

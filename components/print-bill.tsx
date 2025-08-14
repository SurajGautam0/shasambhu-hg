"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Printer, Phone } from "lucide-react"
import Image from "next/image"

interface Booking {
  id: string
  name: string
  dateEnglish: string
  dateNepali: string
  age: number
  address: string
  gameType: "Playzone" | "Skatepark"
  playstationPackage?: "1hr" | "unlimited"
  skateboardBasePackage?: "30min" | "1hr"
  skateboardExtraHours?: number
  tokenNumber: string
  status: "Pending" | "Confirmed" | "Completed"
  price?: number
  phoneNumber?: string
  gender?: string
  numberOfPersons?: number
}

interface PrintBillProps {
  booking: Booking
  onClose: () => void
}

export default function PrintBill({ booking, onClose }: PrintBillProps) {
  const handlePrint = () => {
    window.print()
  }

  const getGameDetails = () => {
    if (booking.gameType === "Playzone") {
      return booking.playstationPackage === "1hr" ? "PZ (1Hr)" : "PZ (Unlimited)"
    } else if (booking.gameType === "Skatepark") {
      let details = booking.skateboardBasePackage === "30min" ? "SP (30min)" : "SP (1Hr)"
      if (booking.skateboardExtraHours && booking.skateboardExtraHours > 0) {
        details += ` +${booking.skateboardExtraHours}Hr`
      }
      return details
    }
    return booking.gameType
  }

  return (
    <>
      {/* Modal for showing before printing */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50 print:hidden">
        <Card className="w-full max-w-xs" style={{ fontFamily: "Arial, sans-serif" }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Print Bill</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <Image
                    src="/sashambhu-new-logo.jpg"
                    alt="Sashambhu Playzone & Skatepark Logo"
                    width={60}
                    height={60}
                    className="rounded-lg shadow-md"
                  />
                </div>
                <p className="text-xs text-gray-600 font-medium">Playzone and Skatepark</p>
                <p className="text-[10px] text-gray-500 flex items-center justify-center gap-0.5">
                  <div className="w-0.5 h-0.5 bg-red-500 rounded-full"></div>
                  Mahalaxmi-9, Sashambhu
                  <div className="w-0.5 h-0.5 bg-red-500 rounded-full"></div>
                </p>
                <p className="text-[10px] text-gray-500 flex items-center justify-center gap-0.5 mt-0.5">
                  <Phone className="h-2.5 w-2.5" />
                  9706531331, 9708904636
                </p>
              </div>
              <div className="border-t border-b py-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Token:</span>
                  <span>{booking.tokenNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Name:</span>
                  <span>{booking.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span>{booking.phoneNumber || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gender:</span>
                  <span>{booking.gender || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span>No. of Persons:</span>
                  <span>{booking.numberOfPersons || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Age:</span>
                  <span>{booking.age}</span>
                </div>
                <div className="flex justify-between">
                  <span>Address:</span>
                  <span>{booking.address}</span>
                </div>
                <div className="flex justify-between">
                  <span>English Date:</span>
                  <span>{booking.dateEnglish}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nepali Date:</span>
                  <span>{booking.dateNepali}</span>
                </div>
                <div className="flex justify-between">
                  <span>Game:</span>
                  <span>{getGameDetails()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Price:</span>
                  <span>{booking.price ? `Rs. ${booking.price}` : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="text-green-600">{booking.status}</span>
                </div>
              </div>
              <div className="text-center text-xs text-gray-600">
                <p>Thank you for visiting! 👋</p>
                <p>Your Entertainment Destination</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handlePrint} className="flex-1">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Bill
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Styling */}
      <style jsx global>{`
       @media print {
  * {
    -webkit-print-color-adjust: exact !important;
    color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body * {
    visibility: hidden !important;
    height: 0 !important;
    overflow: hidden !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
  }

  .pos-receipt, .pos-receipt * {
    visibility: visible !important;
    height: auto !important;
    overflow: visible !important;
    box-sizing: border-box !important;
  }
  
  @page {
    size: 80mm auto;
    margin: 0;
    @top-left { content: none !important; }
    @top-center { content: none !important; }
    @top-right { content: none !important; }
    @bottom-left { content: none !important; }
    @bottom-center { content: none !important; }
    @bottom-right { content: none !important; }
  }
  
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
    color: black !important;
    font-family: Arial, sans-serif !important;
    font-size: 14px !important;
    line-height: 1.3 !important;
    -webkit-font-smoothing: none !important;
    font-smoothing: none !important;
    text-rendering: optimizeSpeed !important;
  }
  
  .pos-receipt {
    display: block !important;
    width: 72mm !important;
    max-width: 72mm !important;
    margin: 0 auto !important;
    padding: 4mm !important;
    background: white !important;
    color: black !important;
    font-family: Arial, sans-serif !important;
    font-size: 14px !important;
    line-height: 1.3 !important;
    page-break-inside: avoid !important;
    -webkit-font-smoothing: none !important;
    font-smoothing: none !important;
    text-rendering: optimizeSpeed !important;
  }
  
  .pos-header {
    text-align: center !important;
    margin-bottom: 4mm !important;
  }
  
  .pos-logo {
    width: 20mm !important;
    height: 20mm !important;
    margin: 0 auto 2mm auto !important;
    border-radius: 50% !important;
  }
  
  .pos-title {
    font-size: 16px !important;
    font-weight: bold !important;
    margin-bottom: 2mm !important;
    letter-spacing: 0.5px !important;
  }
  
  .pos-subtitle {
    font-size: 12px !important;
    margin-bottom: 1mm !important;
  }
  
  .pos-divider {
    border-top: 1px dashed black !important;
    border-bottom: 1px dashed black !important;
    text-align: center !important;
    padding: 2mm 0 !important;
    margin: 3mm 0 !important;
    font-size: 12px !important;
    font-weight: bold !important;
  }
  
  .pos-row {
    display: flex !important;
    justify-content: space-between !important;
    margin-bottom: 1.5mm !important;
    font-size: 12px !important;
    align-items: flex-start !important;
  }
  
  .pos-row-label {
    flex: 0 0 auto !important;
    margin-right: 2mm !important;
    font-weight: normal !important;
  }
  
  .pos-row-value {
    flex: 1 1 auto !important;
    text-align: right !important;
    word-wrap: break-word !important;
    overflow-wrap: break-word !important;
    hyphens: auto !important;
  }
  
  .pos-row-bold {
    font-weight: bold !important;
  }
  
  .pos-footer {
    text-align: center !important;
    margin-top: 4mm !important;
    border-top: 1px dashed black !important;
    padding-top: 3mm !important;
    font-size: 11px !important;
  }
}

      `}</style>

      {/* Printable Receipt */}
      <div className="hidden print:block pos-receipt">
        <div className="pos-header">
          <img src="/sashambhu-new-logo.jpg" alt="Logo" className="pos-logo" />
          <div className="pos-business-name">Sashambhu Playzone & Skatepark</div>
          <div className="pos-address">Mahalaxmi-9, Sashambhu</div>
          <div className="pos-phone">Ph: 9706531331, 9708904636</div>
        </div>

        <div className="pos-receipt-header">RECEIPT</div>

        <div className="pos-row">
          <span>Token:</span>
          <span>#{booking.tokenNumber}</span>
        </div>
        <div className="pos-row">
          <span>Name:</span>
          <span>{booking.name.toUpperCase()}</span>
        </div>
        <div className="pos-row">
          <span>Phone:</span>
          <span>{booking.phoneNumber || "N/A"}</span>
        </div>
        <div className="pos-row">
          <span>Gender:</span>
          <span>{booking.gender || "N/A"}</span>
        </div>
        <div className="pos-row">
          <span>No. of Persons:</span>
          <span>{booking.numberOfPersons || ""}</span>
        </div>
        <div className="pos-row">
          <span>Date:</span>
          <span>{booking.dateEnglish}</span>
        </div>
        <div className="pos-row">
          <span>Age:</span>
          <span>{booking.age}</span>
        </div>
        <div className="pos-row">
          <span>Game:</span>
          <span>{getGameDetails()}</span>
        </div>

        <div className="pos-row pos-total-row">
          <span>TOTAL:</span>
          <span>Rs. {booking.price || 0}/-</span>
        </div>

        <div className="pos-row">
          <span>Status:</span>
          <span>{booking.status}</span>
        </div>

        <div className="pos-footer">
          Thank you for visiting!
          <br />
          {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
        </div>
      </div>
    </>
  )
}

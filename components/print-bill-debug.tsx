"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Printer } from "lucide-react"

interface Booking {
  id: string
  name: string
  dateEnglish: string
  tokenNumber: string
  gameType: "PlayStation" | "Skateboard"
  price?: number
  phoneNumber?: string
}

interface PrintBillDebugProps {
  booking: Booking
  onClose: () => void
}

export default function PrintBillDebug({ booking, onClose }: PrintBillDebugProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 print:hidden">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Debug Print Test</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                This is a simplified test version to ensure your POS-80 printer works correctly.
              </p>

              <div className="bg-gray-100 p-4 rounded text-sm font-mono">
                <div>SHASAMBHU PLAY STATION</div>
                <div>Token: #{booking.tokenNumber}</div>
                <div>Name: {booking.name}</div>
                <div>Game: {booking.gameType}</div>
                <div>Price: Rs. {booking.price || 0}</div>
              </div>

              <Button onClick={handlePrint} className="w-full">
                <Printer className="h-4 w-4 mr-2" />
                Test Print
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ultra-simple print version for testing */}
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 5mm;
          }
          
          body {
            font-family: 'Courier New', monospace;
            font-size: 14px;
            color: black;
            background: white;
          }
          
          .test-receipt {
            width: 70mm;
            color: black;
            background: white;
          }
        }
      `}</style>

      <div className="hidden print:block test-receipt">
        <div style={{ textAlign: "center", marginBottom: "10px" }}>
          <div style={{ fontSize: "16px", fontWeight: "bold" }}>SHASAMBHU PLAY STATION</div>
          <div>Mahalaxmi-9, Lalitpur</div>
          <div>Ph: 9706531331</div>
        </div>

        <div style={{ borderTop: "1px solid black", paddingTop: "5px", marginTop: "10px" }}>
          <div>Token: #{booking.tokenNumber}</div>
          <div>Name: {booking.name}</div>
          <div>Phone: {booking.phoneNumber || "N/A"}</div>
          <div>Date: {booking.dateEnglish}</div>
          <div>Game: {booking.gameType}</div>
          <div style={{ fontWeight: "bold" }}>Price: Rs. {booking.price || 0}</div>
        </div>

        <div style={{ textAlign: "center", marginTop: "10px", borderTop: "1px solid black", paddingTop: "5px" }}>
          <div>Thank you!</div>
          <div>{new Date().toLocaleString()}</div>
        </div>
      </div>
    </>
  )
}

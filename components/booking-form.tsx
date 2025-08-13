"use client"

import { Badge } from "@/components/ui/badge"
import type React from "react"
import { useState, useEffect } from "react"
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { X, Search, Gamepad2, Activity, Users } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import Image from "next/image"

interface BookingFormProps {
  onClose: () => void
  onSuccess: () => void
}

interface PastBooking {
  id: string
  gameType: string
  dateEnglish: string
  status: string
  phoneNumber?: string
  gender?: string
  numberOfPersons?: number
  playstationPackage?: "1hr" | "unlimited"
  skateboardBasePackage?: "30min" | "1hr"
  skateboardExtraHours?: number
}

// Nepali calendar data structure
interface NepaliMonthData {
  year: number
  months: number[]
}

// Nepali calendar data (Bikram Sambat) - sample data for 2080-2085 BS
const nepaliCalendarData: NepaliMonthData[] = [
  { year: 2080, months: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30] },
  { year: 2081, months: [31, 31, 32, 32, 31, 30, 30, 30, 29, 29, 30, 31] },
  { year: 2082, months: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31] },
  { year: 2083, months: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30] },
  { year: 2084, months: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30] },
  { year: 2085, months: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31] },
]

const nepaliMonthNames = [
  "बैशाख",
  "जेठ",
  "आषाढ",
  "श्रावण",
  "भाद्र",
  "आश्विन",
  "कार्तिक",
  "मंसिर",
  "पौष",
  "माघ",
  "फाल्गुन",
  "चैत्र",
]

export default function BookingForm({ onClose, onSuccess }: BookingFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    gender: "",
    numberOfPersons: 1,
    dateEnglish: new Date().toISOString().split("T")[0],
    dateNepali: "",
    age: "",
    address: "",
    gameType: "",
    playstationPackage: "",
    skateboardBasePackage: "",
    skateboardExtraHours: 0,
    tokenNumber: "",
    price: 0,
  })
  const [loading, setLoading] = useState(false)
  const [gamePrices, setGamePrices] = useState<{
    playstation1hrPrice: number
    playstationUnlimitedPrice: number
    skateboard30minPrice: number
    skateboard1hrPrice: number
    skateboardExtraHrPrice: number
  } | null>(null)
  const [customerSearchTerm, setCustomerSearchTerm] = useState("")
  const [customerHistory, setCustomerHistory] = useState<PastBooking[]>([])
  const [searchingCustomer, setSearchingCustomer] = useState(false)

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const pricesDocRef = doc(db, "gamePrices", "currentPrices")
        const pricesDocSnap = await getDoc(pricesDocRef)
        if (pricesDocSnap.exists()) {
          const data = pricesDocSnap.data()
          setGamePrices({
            playstation1hrPrice: data.playstation1hrPrice || 200,
            playstationUnlimitedPrice: data.playstationUnlimitedPrice || 350,
            skateboard30minPrice: data.skateboard30minPrice || 100,
            skateboard1hrPrice: data.skateboard1hrPrice || 150,
            skateboardExtraHrPrice: data.skateboardExtraHrPrice || 100,
          })
        } else {
          setGamePrices({
            playstation1hrPrice: 200,
            playstationUnlimitedPrice: 350,
            skateboard30minPrice: 100,
            skateboard1hrPrice: 150,
            skateboardExtraHrPrice: 100,
          })
        }
      } catch (error) {
        console.error("Error fetching game prices for form:", error)
        setGamePrices({
          playstation1hrPrice: 200,
          playstationUnlimitedPrice: 350,
          skateboard30minPrice: 100,
          skateboard1hrPrice: 150,
          skateboardExtraHrPrice: 100,
        })
      }
    }
    fetchPrices()
  }, [])

  useEffect(() => {
    if (gamePrices) {
      let calculatedPrice = 0
      if (formData.gameType === "Playzone") {
        if (formData.playstationPackage === "1hr") {
          calculatedPrice = gamePrices.playstation1hrPrice
        } else if (formData.playstationPackage === "unlimited") {
          calculatedPrice = gamePrices.playstationUnlimitedPrice
        }
      } else if (formData.gameType === "Skatepark") {
        if (formData.skateboardBasePackage === "30min") {
          calculatedPrice = gamePrices.skateboard30minPrice
        } else if (formData.skateboardBasePackage === "1hr") {
          calculatedPrice = gamePrices.skateboard1hrPrice
        }
        calculatedPrice += formData.skateboardExtraHours * gamePrices.skateboardExtraHrPrice
      }

      // Multiply by number of persons
      calculatedPrice *= formData.numberOfPersons

      setFormData((prev) => ({ ...prev, price: calculatedPrice }))
    }
  }, [
    formData.gameType,
    formData.playstationPackage,
    formData.skateboardBasePackage,
    formData.skateboardExtraHours,
    formData.numberOfPersons,
    gamePrices,
  ])

  // Auto-generate Nepali date when component mounts
  useEffect(() => {
    if (!formData.dateNepali) {
      setFormData((prev) => ({
        ...prev,
        dateNepali: convertToNepaliDate(prev.dateEnglish),
      }))
    }
  }, [formData.dateEnglish, formData.dateNepali])

  const generateTokenNumber = async () => {
    try {
      // Get all existing bookings to find the highest token number
      const bookingsSnapshot = await getDocs(collection(db, "bookings"))
      let maxToken = 0

      bookingsSnapshot.docs.forEach((doc) => {
        const tokenNumber = doc.data().tokenNumber
        if (tokenNumber && typeof tokenNumber === "string") {
          const numericPart = Number.parseInt(tokenNumber.replace(/\D/g, ""))
          if (!isNaN(numericPart) && numericPart > maxToken) {
            maxToken = numericPart
          }
        }
      })

      return (maxToken + 1).toString()
    } catch (error) {
      console.error("Error generating token number:", error)
      return "1"
    }
  }

  const handleCustomerSearch = async () => {
    if (!customerSearchTerm.trim()) {
      setCustomerHistory([])
      return
    }
    setSearchingCustomer(true)
    try {
      const qName = query(collection(db, "bookings"), where("name", "==", customerSearchTerm.trim()))
      const qPhone = query(collection(db, "bookings"), where("phoneNumber", "==", customerSearchTerm.trim()))

      const [nameSnapshot, phoneSnapshot] = await Promise.all([getDocs(qName), getDocs(qPhone)])

      const historyByName = nameSnapshot.docs.map((doc) => ({
        id: doc.id,
        gameType: doc.data().gameType,
        dateEnglish: doc.data().dateEnglish,
        status: doc.data().status,
        phoneNumber: doc.data().phoneNumber,
        gender: doc.data().gender,
        numberOfPersons: doc.data().numberOfPersons,
        playstationPackage: doc.data().playstationPackage,
        skateboardBasePackage: doc.data().skateboardBasePackage,
        skateboardExtraHours: doc.data().skateboardExtraHours,
      })) as PastBooking[]

      const historyByPhone = phoneSnapshot.docs.map((doc) => ({
        id: doc.id,
        gameType: doc.data().gameType,
        dateEnglish: doc.data().dateEnglish,
        status: doc.data().status,
        phoneNumber: doc.data().phoneNumber,
        gender: doc.data().gender,
        numberOfPersons: doc.data().numberOfPersons,
        playstationPackage: doc.data().playstationPackage,
        skateboardBasePackage: doc.data().skateboardBasePackage,
        skateboardExtraHours: doc.data().skateboardExtraHours,
      })) as PastBooking[]

      const combinedHistory = [...historyByName, ...historyByPhone].filter(
        (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
      )

      setCustomerHistory(combinedHistory)
    } catch (error) {
      console.error("Error fetching customer history:", error)
      setCustomerHistory([])
    } finally {
      setSearchingCustomer(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const tokenNumber = formData.tokenNumber || (await generateTokenNumber())

      const bookingData = {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        gender: formData.gender,
        numberOfPersons: formData.numberOfPersons,
        dateEnglish: formData.dateEnglish,
        dateNepali: formData.dateNepali,
        age: Number.parseInt(formData.age),
        address: formData.address,
        gameType: formData.gameType,
        playstationPackage: formData.gameType === "Playzone" ? formData.playstationPackage : null,
        skateboardBasePackage: formData.gameType === "Skatepark" ? formData.skateboardBasePackage : null,
        skateboardExtraHours: formData.gameType === "Skatepark" ? formData.skateboardExtraHours : null,
        tokenNumber,
        status: "Pending",
        price: formData.price,
        createdAt: serverTimestamp(),
      }

      console.log("Creating booking with data:", bookingData)

      const docRef = await addDoc(collection(db, "bookings"), bookingData)
      console.log("Booking created with ID:", docRef.id)

      onSuccess()
    } catch (error) {
      console.error("Error creating booking:", error)
      alert("Error creating booking. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Improved English to Nepali date conversion
  const convertToNepaliDate = (englishDate: string): string => {
    try {
      const englishDateObj = new Date(englishDate)

      // More accurate base reference: 2024-04-13 (English) = 2081-01-01 (Nepali New Year)
      const baseEnglishDate = new Date("2024-04-13")
      const baseNepaliYear = 2081
      const baseNepaliMonth = 0 // Baisakh (0-indexed)
      const baseNepaliDay = 1

      // Calculate difference in days
      const diffTime = englishDateObj.getTime() - baseEnglishDate.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

      let nepaliYear = baseNepaliYear
      let nepaliMonth = baseNepaliMonth
      let nepaliDay = baseNepaliDay + diffDays

      // Adjust for negative days (dates before base date)
      while (nepaliDay <= 0) {
        nepaliMonth--
        if (nepaliMonth < 0) {
          nepaliMonth = 11
          nepaliYear--
        }
        const yearData = nepaliCalendarData.find((data) => data.year === nepaliYear)
        const monthDays = yearData ? yearData.months[nepaliMonth] : 30
        nepaliDay += monthDays
      }

      // Adjust for days exceeding month length
      while (true) {
        const yearData = nepaliCalendarData.find((data) => data.year === nepaliYear)
        const monthDays = yearData ? yearData.months[nepaliMonth] : 30

        if (nepaliDay <= monthDays) break

        nepaliDay -= monthDays
        nepaliMonth++
        if (nepaliMonth > 11) {
          nepaliMonth = 0
          nepaliYear++
        }
      }

      // Format the Nepali date
      const nepaliMonthName = nepaliMonthNames[nepaliMonth]
      return `${nepaliYear} ${nepaliMonthName} ${nepaliDay}`
    } catch (error) {
      console.error("Error converting date:", error)
      // Fallback to simple conversion
      const date = new Date(englishDate)
      const nepaliYear = date.getFullYear() + 57
      const nepaliMonth = nepaliMonthNames[date.getMonth()]
      const nepaliDay = date.getDate()
      return `${nepaliYear} ${nepaliMonth} ${nepaliDay}`
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto shadow-lg border-2 border-blue-200">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-100 p-4 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Image
                src="/sashambhu-new-logo.jpg"
                alt="Sashambhu Playzone & Skatepark Logo"
                width={40}
                height={40}
                className="rounded-lg shadow-md"
              />
            </div>

            <CardTitle>
              <div className="text-xl font-bold text-gray-800">New Booking</div>
              <div className="text-sm font-normal text-gray-600">Sashambhu Play Station</div>
            </CardTitle>
          </div>

          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-semibold text-gray-700">
                Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  setCustomerSearchTerm(e.target.value)
                }}
                required
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="font-semibold text-gray-700">
                Phone Number
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                required
                placeholder="e.g., 98XXXXXXXX"
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold text-gray-700">Gender</Label>
                <RadioGroup
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Male" id="gender-male" />
                    <Label htmlFor="gender-male">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Female" id="gender-female" />
                    <Label htmlFor="gender-female">Female</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numberOfPersons" className="font-semibold text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Number of Persons
                </Label>
                <Input
                  id="numberOfPersons"
                  type="number"
                  value={formData.numberOfPersons}
                  onChange={(e) => setFormData({ ...formData, numberOfPersons: Number(e.target.value) || 1 })}
                  required
                  min="1"
                  max="20"
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-search" className="font-semibold text-gray-700">
                Search Customer History
              </Label>
              <div className="flex gap-2">
                <Input
                  id="customer-search"
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  placeholder="Enter customer name or phone to search"
                  className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                <Button
                  type="button"
                  onClick={handleCustomerSearch}
                  disabled={searchingCustomer}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
              {searchingCustomer && <p className="text-sm text-gray-500 mt-1">Searching...</p>}
              {customerHistory.length > 0 && (
                <Card className="mt-2 border-blue-100 bg-blue-50">
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-base text-blue-800">Past Bookings</CardTitle>
                    <CardDescription className="text-xs text-blue-700">Click to pre-fill details</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <ul className="space-y-1 text-sm">
                      {customerHistory.map((booking) => (
                        <li
                          key={booking.id}
                          className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-2 border border-blue-200 rounded-md bg-white hover:bg-blue-100 cursor-pointer transition-colors"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              name: customerSearchTerm,
                              phoneNumber: booking.phoneNumber || "",
                              gender: booking.gender || "",
                              numberOfPersons: booking.numberOfPersons || 1,
                              gameType: booking.gameType,
                              playstationPackage: booking.playstationPackage || "",
                              skateboardBasePackage: booking.skateboardBasePackage || "",
                              skateboardExtraHours: booking.skateboardExtraHours || 0,
                            }))
                            setCustomerHistory([])
                          }}
                        >
                          <span className="font-medium text-gray-800">
                            {booking.gameType} on {booking.dateEnglish}
                            {booking.numberOfPersons &&
                              booking.numberOfPersons > 1 &&
                              ` (${booking.numberOfPersons} persons)`}
                            {booking.phoneNumber && ` - ${booking.phoneNumber}`}
                          </span>
                          <Badge
                            variant={booking.status === "Completed" ? "default" : "secondary"}
                            className="mt-1 sm:mt-0"
                          >
                            {booking.status}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {customerSearchTerm && !searchingCustomer && customerHistory.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">No past bookings found for "{customerSearchTerm}".</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateEnglish" className="font-semibold text-gray-700">
                  Date (English)
                </Label>
                <Input
                  id="dateEnglish"
                  type="date"
                  value={formData.dateEnglish}
                  onChange={(e) => {
                    const englishDate = e.target.value
                    setFormData({
                      ...formData,
                      dateEnglish: englishDate,
                      dateNepali: convertToNepaliDate(englishDate),
                    })
                  }}
                  required
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateNepali" className="font-semibold text-gray-700">
                  Date (Nepali)
                </Label>
                <Input
                  id="dateNepali"
                  value={formData.dateNepali}
                  onChange={(e) => setFormData({ ...formData, dateNepali: e.target.value })}
                  placeholder="Auto-generated from English date"
                  required
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-blue-50"
                  readOnly
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age" className="font-semibold text-gray-700">
                  Age
                </Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  required
                  min="1"
                  max="100"
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gameType" className="font-semibold text-gray-700">
                  Game Type
                </Label>
                <Select
                  value={formData.gameType}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      gameType: value,
                      playstationPackage: "",
                      skateboardBasePackage: "",
                      skateboardExtraHours: 0,
                    })
                  }
                  required
                >
                  <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Select game" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Playzone">
                      <div className="flex items-center gap-2">
                        <Gamepad2 className="h-4 w-4" /> Playzone
                      </div>
                    </SelectItem>
                    <SelectItem value="Skatepark">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" /> Skatepark
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.gameType === "Playzone" && (
              <div className="space-y-2">
                <Label htmlFor="playstationPackage" className="font-semibold text-gray-700">
                  Playzone Package
                </Label>
                <Select
                  value={formData.playstationPackage}
                  onValueChange={(value) => setFormData({ ...formData, playstationPackage: value })}
                  required
                >
                  <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Select package" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1hr">
                      1 Hour (Rs. {gamePrices?.playstation1hrPrice || 200} per person)
                    </SelectItem>
                    <SelectItem value="unlimited">
                      Unlimited (Rs. {gamePrices?.playstationUnlimitedPrice || 350} per person)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.gameType === "Skatepark" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="skateboardBasePackage" className="font-semibold text-gray-700">
                    Skatepark Base Package
                  </Label>
                  <Select
                    value={formData.skateboardBasePackage}
                    onValueChange={(value) => setFormData({ ...formData, skateboardBasePackage: value })}
                    required
                  >
                    <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Select package" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30min">
                        Half Hour (Rs. {gamePrices?.skateboard30minPrice || 100} per person)
                      </SelectItem>
                      <SelectItem value="1hr">
                        1 Hour (Rs. {gamePrices?.skateboard1hrPrice || 150} per person)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skateboardExtraHours" className="font-semibold text-gray-700">
                    Extra Hours (Rs. {gamePrices?.skateboardExtraHrPrice || 100} per hour per person)
                  </Label>
                  <Input
                    id="skateboardExtraHours"
                    type="number"
                    value={formData.skateboardExtraHours}
                    onChange={(e) => setFormData({ ...formData, skateboardExtraHours: Number(e.target.value) })}
                    min="0"
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="address" className="font-semibold text-gray-700">
                Address
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tokenNumber" className="font-semibold text-gray-700">
                Token Number (Optional)
              </Label>
              <Input
                id="tokenNumber"
                value={formData.tokenNumber}
                onChange={(e) => setFormData({ ...formData, tokenNumber: e.target.value })}
                placeholder="Auto-generated if empty"
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {gamePrices && formData.gameType && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-green-700">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">
                        {formData.numberOfPersons} person{formData.numberOfPersons > 1 ? "s" : ""}
                      </span>
                    </div>
                    {formData.numberOfPersons > 1 && (
                      <div className="text-xs text-green-600">Base price × {formData.numberOfPersons} persons</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-700">Rs. {formData.price.toFixed(2)}</div>
                    <div className="text-xs text-green-600">Total Price</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-md"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Booking"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100 bg-transparent"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

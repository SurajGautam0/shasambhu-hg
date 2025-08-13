"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { collection, getDocs, doc, updateDoc, query, where, onSnapshot, orderBy } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  LogOut,
  Plus,
  Calendar,
  RefreshCw,
  Search,
  Filter,
  Clock,
  Gamepad2,
  Activity,
  Eye,
  Download,
  DollarSign,
  TrendingUp,
  Bell,
  Settings,
  BarChart3,
  Timer,
  Zap,
  Target,
  Award,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  StopCircle,
} from "lucide-react"
import BookingForm from "@/components/booking-form"
import PrintBill from "@/components/print-bill"
import Image from "next/image"

interface Booking {
  id: string
  name: string
  phoneNumber?: string
  gender?: string
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
  createdAt: any
  startTime?: any
  endTime?: any
  actualDuration?: number
}

interface DashboardStats {
  totalBookings: number
  pendingBookings: number
  confirmedBookings: number
  completedBookings: number
  todayRevenue: number
  averageSessionTime: number
  peakHour: string
  conversionRate: number
}

export default function CounterDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showPrintBill, setShowPrintBill] = useState(false)
  const [showBookingDetails, setShowBookingDetails] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [gameFilter, setGameFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("dashboard")
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    completedBookings: 0,
    todayRevenue: 0,
    averageSessionTime: 0,
    peakHour: "N/A",
    conversionRate: 0,
  })
  const [notifications, setNotifications] = useState<string[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [recentActivities, setRecentActivities] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)])
  }

  const addNotification = (message: string) => {
    setNotifications((prev) => [message, ...prev.slice(0, 4)])
    setTimeout(() => {
      setNotifications((prev) => prev.slice(0, -1))
    }, 5000)
  }

  const addActivity = (activity: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setRecentActivities((prev) => [`[${timestamp}] ${activity}`, ...prev.slice(0, 9)])
  }

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/")
        return
      }

      const userDoc = await getDocs(query(collection(db, "users"), where("email", "==", user.email)))
      if (userDoc.empty || userDoc.docs[0].data().role !== "counter") {
        router.push("/")
        return
      }

      addDebugInfo("User authenticated, setting up listeners")
      setupRealtimeListener()
    })

    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    filterBookings()
    calculateStats()
  }, [bookings, searchTerm, statusFilter, gameFilter, activeTab])

  const setupRealtimeListener = () => {
    const today = new Date().toISOString().split("T")[0]
    addDebugInfo(`Setting up real-time listener for date: ${today}`)

    const bookingsQuery = query(collection(db, "bookings"), orderBy("createdAt", "desc"))

    const unsubscribe = onSnapshot(
      bookingsQuery,
      (snapshot) => {
        addDebugInfo(`Received ${snapshot.docs.length} total documents from Firestore`)

        const allBookingsData = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
          }
        }) as Booking[]

        const todayBookings = allBookingsData.filter((booking) => {
          const isToday = booking.dateEnglish === today
          if (isToday) {
            addDebugInfo(`Found today's booking: ${booking.name} (${booking.tokenNumber})`)
          }
          return isToday
        })

        if (bookings.length > 0 && todayBookings.length > bookings.length) {
          const newBookings = todayBookings.slice(0, todayBookings.length - bookings.length)
          newBookings.forEach((booking) => {
            addNotification(`New booking: ${booking.name} (${booking.tokenNumber})`)
            addActivity(`New booking created for ${booking.name}`)
          })
        }

        addDebugInfo(`Filtered to ${todayBookings.length} bookings for today`)
        setBookings(todayBookings)
        setLoading(false)
        setRefreshing(false)
      },
      (error) => {
        addDebugInfo(`Error in real-time listener: ${error.message}`)
        console.error("Error in real-time listener:", error)
        fetchTodayBookings()
      },
    )

    return unsubscribe
  }

  const fetchTodayBookings = async () => {
    try {
      setRefreshing(true)
      const today = new Date().toISOString().split("T")[0]
      addDebugInfo(`Manual fetch for date: ${today}`)

      const allBookingsQuery = query(collection(db, "bookings"), orderBy("createdAt", "desc"))
      const snapshot = await getDocs(allBookingsQuery)

      addDebugInfo(`Fetched ${snapshot.docs.length} total documents`)

      const allBookings = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Booking[]

      const todayBookings = allBookings.filter((booking) => {
        const isToday = booking.dateEnglish === today
        if (isToday) {
          addDebugInfo(`Manual filter found: ${booking.name} (${booking.tokenNumber})`)
        }
        return isToday
      })

      addDebugInfo(`Manual fetch result: ${todayBookings.length} bookings for today`)
      setBookings(todayBookings)
    } catch (error) {
      addDebugInfo(`Error in manual fetch: ${error.message}`)
      console.error("Error fetching bookings:", error)
      setBookings([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const calculateStats = () => {
    const totalBookings = bookings.length
    const pendingBookings = bookings.filter((b) => b.status === "Pending").length
    const confirmedBookings = bookings.filter((b) => b.status === "Confirmed").length
    const completedBookings = bookings.filter((b) => b.status === "Completed").length
    const todayRevenue = bookings
      .filter((b) => b.status === "Completed" && b.price)
      .reduce((sum, b) => sum + (b.price || 0), 0)

    const completedWithDuration = bookings.filter((b) => b.status === "Completed" && b.actualDuration)
    const averageSessionTime =
      completedWithDuration.length > 0
        ? completedWithDuration.reduce((sum, b) => sum + (b.actualDuration || 0), 0) / completedWithDuration.length
        : 0

    const hourCounts: { [key: string]: number } = {}
    bookings.forEach((booking) => {
      if (booking.createdAt) {
        const hour = booking.createdAt.toDate().getHours()
        const hourKey = `${hour}:00`
        hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1
      }
    })
    const peakHour = Object.keys(hourCounts).reduce((a, b) => (hourCounts[a] > hourCounts[b] ? a : b), "N/A")

    const conversionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0

    setStats({
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      todayRevenue,
      averageSessionTime,
      peakHour,
      conversionRate,
    })
  }

  const filterBookings = () => {
    let filtered = bookings

    if (searchTerm) {
      filtered = filtered.filter(
        (booking) =>
          booking.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.tokenNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((booking) => booking.status === statusFilter)
    }

    if (gameFilter !== "all") {
      filtered = filtered.filter((booking) => booking.gameType === gameFilter)
    }

    setFilteredBookings(filtered)
  }

  const confirmBooking = async (bookingId: string) => {
    try {
      await updateDoc(doc(db, "bookings", bookingId), {
        status: "Confirmed",
        startTime: new Date(),
      })
      addDebugInfo(`Confirmed booking: ${bookingId}`)
      addActivity(`Booking confirmed: ${bookingId}`)
      addNotification("Booking confirmed successfully!")
    } catch (error) {
      addDebugInfo(`Error confirming booking: ${error.message}`)
      console.error("Error confirming booking:", error)
    }
  }

  const completeBooking = async (booking: Booking) => {
    try {
      const endTime = new Date()
      const startTime = booking.startTime?.toDate() || booking.createdAt?.toDate() || endTime
      const actualDuration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

      await updateDoc(doc(db, "bookings", booking.id), {
        status: "Completed",
        endTime: endTime,
        actualDuration: actualDuration,
      })
      setSelectedBooking({ ...booking, endTime, actualDuration })
      setShowPrintBill(true)
      addDebugInfo(`Completed booking: ${booking.tokenNumber}`)
      addActivity(`Booking completed: ${booking.name} (${actualDuration} minutes)`)
      addNotification(`Booking completed! Duration: ${actualDuration} minutes`)
    } catch (error) {
      addDebugInfo(`Error completing booking: ${error.message}`)
      console.error("Error completing booking:", error)
    }
  }

  const exportBookings = () => {
    const csvContent = [
      [
        "Token",
        "Name",
        "Phone Number",
        "Gender",
        "Date",
        "Age",
        "Address",
        "Game Type",
        "Package/Duration",
        "Price",
        "Status",
        "Duration (min)",
      ],
      ...filteredBookings.map((booking) => [
        booking.tokenNumber,
        booking.name,
        booking.phoneNumber || "N/A",
        booking.gender || "N/A",
        booking.dateEnglish,
        booking.age.toString(),
        booking.address,
        booking.gameType,
        booking.gameType === "Playzone"
          ? booking.playstationPackage || "N/A"
          : booking.skateboardBasePackage
            ? `${booking.skateboardBasePackage}${booking.skateboardExtraHours ? ` + ${booking.skateboardExtraHours}hr(s) extra` : ""}`
            : "N/A",
        booking.price?.toString() || "N/A",
        booking.status,
        booking.actualDuration?.toString() || "N/A",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bookings-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    addActivity("Exported bookings to CSV")
  }

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/")
  }

  const handleRefresh = () => {
    addDebugInfo("Manual refresh triggered")
    addActivity("Dashboard refreshed")
    fetchTodayBookings()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800"
      case "Confirmed":
        return "bg-blue-100 text-blue-800"
      case "Completed":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
        return <Clock className="h-4 w-4" />
      case "Confirmed":
        return <PlayCircle className="h-4 w-4" />
      case "Completed":
        return <CheckCircle2 className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getGameIcon = (gameType: string) => {
    return gameType === "Playzone" ? <Gamepad2 className="h-4 w-4" /> : <Activity className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <div className="text-xl font-semibold text-gray-700">Loading Advanced Dashboard...</div>
          <div className="text-sm text-gray-500 mt-2">Initializing real-time features</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 gap-4 sm:gap-0">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Image
                  src="/sashambhu-new-logo.jpg"
                  alt="Sashambhu Playzone & Skatepark Logo"
                  width={60}
                  height={60}
                  className="rounded-lg shadow-lg"
                />
                {notifications.length > 0 && (
                  <div className="absolute top-0 right-0 w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
                )}
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">Advanced Counter</h1>
                <p className="text-sm text-gray-600 font-medium">Sashambhu Play Station</p>
                <p className="text-xs text-gray-500">{currentTime.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {notifications.length > 0 && (
                <div className="relative">
                  <Bell className="h-6 w-6 text-orange-500 animate-bounce" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notifications.length}
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={() => setShowBookingForm(true)} className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New Booking
                </Button>
                <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button onClick={handleLogout} variant="outline" size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {notifications.length > 0 && (
          <div className="mb-6 space-y-2">
            {notifications.map((notification, index) => (
              <div key={index} className="bg-blue-100 border-l-4 border-blue-500 p-4 rounded-r-lg animate-slide-in">
                <div className="flex items-center">
                  <Bell className="h-5 w-5 text-blue-500 mr-3" />
                  <p className="text-blue-700 font-medium">{notification}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white transform hover:scale-105 transition-transform">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Today's Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalBookings}</div>
              <p className="text-xs opacity-80 mt-1">{new Date().toLocaleDateString()}</p>
              <Progress value={(stats.totalBookings / 50) * 100} className="mt-2 bg-blue-400" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white transform hover:scale-105 transition-transform">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pendingBookings}</div>
              <p className="text-xs opacity-80 mt-1">Awaiting confirmation</p>
              <div className="flex items-center mt-2">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span className="text-xs">Needs attention</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white transform hover:scale-105 transition-transform">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">Rs. {stats.todayRevenue.toFixed(2)}</div>
              <p className="text-xs opacity-80 mt-1">Today's earnings</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="text-xs">+12% from yesterday</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white transform hover:scale-105 transition-transform">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Conversion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
              <p className="text-xs opacity-80 mt-1">Completion rate</p>
              <Progress value={stats.conversionRate} className="mt-2 bg-purple-400" />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Average Session Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.averageSessionTime.toFixed(0)} min</div>
              <p className="text-xs text-gray-500 mt-1">Per completed session</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Peak Hour
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.peakHour}</div>
              <p className="text-xs text-gray-500 mt-1">Busiest time today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="h-4 w-4" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Excellent</div>
              <p className="text-xs text-gray-500 mt-1">Based on completion rate</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Button onClick={() => setShowBookingForm(true)} className="h-20 bg-green-600 hover:bg-green-700">
                      <div className="text-center">
                        <Plus className="h-6 w-6 mx-auto mb-2" />
                        <div>New Booking</div>
                      </div>
                    </Button>

                    <Button onClick={exportBookings} variant="outline" className="h-20 bg-transparent">
                      <div className="text-center">
                        <Download className="h-6 w-6 mx-auto mb-2" />
                        <div>Export Data</div>
                      </div>
                    </Button>

                    <Button
                      onClick={handleRefresh}
                      variant="outline"
                      className="h-20 bg-transparent"
                      disabled={refreshing}
                    >
                      <div className="text-center">
                        <RefreshCw className={`h-6 w-6 mx-auto mb-2 ${refreshing ? "animate-spin" : ""}`} />
                        <div>Refresh</div>
                      </div>
                    </Button>

                    <Button variant="outline" className="h-20 bg-transparent">
                      <div className="text-center">
                        <Settings className="h-6 w-6 mx-auto mb-2" />
                        <div>Settings</div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {recentActivities.length > 0 ? (
                      recentActivities.map((activity, index) => (
                        <div key={index} className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                          {activity}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No recent activities</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Today's Bookings ({filteredBookings.length})
                  </CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={exportBookings} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Search className="h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search bookings..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1"
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Confirmed">Confirmed</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={gameFilter} onValueChange={setGameFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Game Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Games</SelectItem>
                      <SelectItem value="Playzone">Playzone</SelectItem>
                      <SelectItem value="Skatepark">Skatepark</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("")
                      setStatusFilter("all")
                      setGameFilter("all")
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {filteredBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                      {bookings.length === 0 ? "No bookings for today" : "No bookings match your filters"}
                    </h3>
                    <p className="text-gray-500 mb-6">
                      {bookings.length === 0
                        ? "Create your first booking to get started"
                        : "Try adjusting your search or filters"}
                    </p>
                    {bookings.length === 0 && (
                      <Button onClick={() => setShowBookingForm(true)} className="bg-green-600 hover:bg-green-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Booking
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Token</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Game</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBookings.map((booking) => (
                          <TableRow key={booking.id} className="hover:bg-gray-50">
                            <TableCell className="font-bold text-blue-600">#{booking.tokenNumber}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{booking.name}</div>
                                {booking.phoneNumber && (
                                  <div className="text-sm text-gray-500">{booking.phoneNumber}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getGameIcon(booking.gameType)}
                                <span className="text-sm">
                                  {booking.gameType}
                                  {booking.gameType === "Playzone" && booking.playstationPackage && (
                                    <span className="text-xs text-gray-500 ml-1">({booking.playstationPackage})</span>
                                  )}
                                  {booking.gameType === "Skatepark" && booking.skateboardBasePackage && (
                                    <span className="text-xs text-gray-500 ml-1">
                                      ({booking.skateboardBasePackage}
                                      {booking.skateboardExtraHours && ` +${booking.skateboardExtraHours}hr`})
                                    </span>
                                  )}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">
                              {booking.price ? `Rs. ${booking.price.toFixed(2)}` : "N/A"}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getStatusColor(booking.status)} flex items-center gap-1 w-fit`}>
                                {getStatusIcon(booking.status)}
                                {booking.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{booking.actualDuration ? `${booking.actualDuration} min` : "N/A"}</TableCell>
                            <TableCell>
                              <div className="flex flex-col sm:flex-row gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedBooking(booking)
                                    setShowBookingDetails(true)
                                  }}
                                  className="w-full sm:w-auto"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {booking.status === "Pending" && (
                                  <Button
                                    size="sm"
                                    onClick={() => confirmBooking(booking.id)}
                                    className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                                  >
                                    <PlayCircle className="h-4 w-4 mr-1" />
                                    Start
                                  </Button>
                                )}
                                {booking.status === "Confirmed" && (
                                  <Button
                                    size="sm"
                                    onClick={() => completeBooking(booking)}
                                    className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                                  >
                                    <StopCircle className="h-4 w-4 mr-1" />
                                    Complete
                                  </Button>
                                )}
                                {booking.status === "Completed" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedBooking(booking)
                                      setShowPrintBill(true)
                                    }}
                                    className="w-full sm:w-auto"
                                  >
                                    Print Bill
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Game Type Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <Gamepad2 className="h-4 w-4" />
                        Playzone
                      </span>
                      <span className="font-semibold">{bookings.filter((b) => b.gameType === "Playzone").length}</span>
                    </div>
                    <Progress
                      value={(bookings.filter((b) => b.gameType === "Playzone").length / bookings.length) * 100}
                      className="h-2"
                    />
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Skatepark
                      </span>
                      <span className="font-semibold">{bookings.filter((b) => b.gameType === "Skatepark").length}</span>
                    </div>
                    <Progress
                      value={(bookings.filter((b) => b.gameType === "Skatepark").length / bookings.length) * 100}
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-500" />
                        Pending
                      </span>
                      <span className="font-semibold">{stats.pendingBookings}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <PlayCircle className="h-4 w-4 text-blue-500" />
                        Confirmed
                      </span>
                      <span className="font-semibold">{stats.confirmedBookings}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Completed
                      </span>
                      <span className="font-semibold">{stats.completedBookings}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {recentActivities.length > 0 ? (
                    recentActivities.map((activity, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">{activity}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">No activities recorded yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {debugInfo.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Debug Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs font-mono space-y-1 max-h-32 overflow-y-auto bg-gray-900 text-green-400 p-3 rounded">
                    {debugInfo.map((info, index) => (
                      <div key={index}>{info}</div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {showBookingForm && (
        <BookingForm
          onClose={() => setShowBookingForm(false)}
          onSuccess={() => {
            setShowBookingForm(false)
            addDebugInfo("New booking created, refreshing data")
            addActivity("New booking created successfully")
            setTimeout(() => {
              handleRefresh()
            }, 1000)
          }}
        />
      )}

      {showPrintBill && selectedBooking && (
        <PrintBill
          booking={selectedBooking}
          onClose={() => {
            setShowPrintBill(false)
            setSelectedBooking(null)
          }}
        />
      )}

      <Dialog open={showBookingDetails} onOpenChange={setShowBookingDetails}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Booking Details
            </DialogTitle>
            <DialogDescription>Comprehensive information for booking #{selectedBooking?.tokenNumber}</DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="grid gap-4 py-4 text-sm max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 items-center gap-4 p-3 bg-gray-50 rounded">
                <div className="font-medium">Token:</div>
                <div className="font-bold text-blue-600">#{selectedBooking.tokenNumber}</div>
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <div className="font-medium">Name:</div>
                <div>{selectedBooking.name}</div>
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <div className="font-medium">Phone:</div>
                <div>{selectedBooking.phoneNumber || "N/A"}</div>
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <div className="font-medium">Gender:</div>
                <div>{selectedBooking.gender || "N/A"}</div>
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <div className="font-medium">Date (English):</div>
                <div>{selectedBooking.dateEnglish}</div>
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <div className="font-medium">Date (Nepali):</div>
                <div>{selectedBooking.dateNepali}</div>
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <div className="font-medium">Age:</div>
                <div>{selectedBooking.age} years</div>
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <div className="font-medium">Address:</div>
                <div>{selectedBooking.address}</div>
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <div className="font-medium">Game Type:</div>
                <div className="flex items-center gap-2">
                  {getGameIcon(selectedBooking.gameType)}
                  {selectedBooking.gameType}
                  {selectedBooking.gameType === "Playzone" && selectedBooking.playstationPackage && (
                    <span className="text-xs text-gray-500 ml-1">({selectedBooking.playstationPackage})</span>
                  )}
                  {selectedBooking.gameType === "Skatepark" && selectedBooking.skateboardBasePackage && (
                    <span className="text-xs text-gray-500 ml-1">
                      ({selectedBooking.skateboardBasePackage}
                      {selectedBooking.skateboardExtraHours && ` +${selectedBooking.skateboardExtraHours}hr`})
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <div className="font-medium">Price:</div>
                <div className="font-semibold text-green-600">
                  {selectedBooking.price ? `Rs. ${selectedBooking.price.toFixed(2)}` : "N/A"}
                </div>
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <div className="font-medium">Status:</div>
                <div>
                  <Badge className={`${getStatusColor(selectedBooking.status)} flex items-center gap-1 w-fit`}>
                    {getStatusIcon(selectedBooking.status)}
                    {selectedBooking.status}
                  </Badge>
                </div>
              </div>
              {selectedBooking.actualDuration && (
                <div className="grid grid-cols-2 items-center gap-4">
                  <div className="font-medium">Duration:</div>
                  <div className="font-semibold">{selectedBooking.actualDuration} minutes</div>
                </div>
              )}
              <div className="grid grid-cols-2 items-center gap-4">
                <div className="font-medium">Created At:</div>
                <div>{selectedBooking.createdAt?.toDate().toLocaleString()}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowBookingDetails(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

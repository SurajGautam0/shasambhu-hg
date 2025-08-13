"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  setDoc,
  addDoc,
  getDoc,
  writeBatch,
} from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  LogOut,
  Users,
  Calendar,
  Search,
  DollarSign,
  Save,
  BarChart,
  UserPlus,
  Trash2,
  Edit,
  CheckCircle,
} from "lucide-react"
import { Bar, BarChart as RechartsBarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
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
}

interface User {
  id: string
  email: string
  role: "admin" | "counter"
  name: string
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

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState("")
  const [filterGame, setFilterGame] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [searchToken, setSearchToken] = useState("")
  const [playstation1hrPrice, setPlaystation1hrPrice] = useState<string>("")
  const [playstationUnlimitedPrice, setPlaystationUnlimitedPrice] = useState<string>("")
  const [skateboard30minPrice, setSkateboard30minPrice] = useState<string>("")
  const [skateboard1hrPrice, setSkateboard1hrPrice] = useState<string>("")
  const [skateboardExtraHrPrice, setSkateboardExtraHrPrice] = useState<string>("")

  const [priceSaveLoading, setPriceSaveLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("bookings")
  const [showUserForm, setShowUserForm] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserName, setNewUserName] = useState("")
  const [newUserRole, setNewUserRole] = useState<"admin" | "counter">("counter")
  const [userFormLoading, setUserFormLoading] = useState(false)
  const [revenuePeriod, setRevenuePeriod] = useState<"daily" | "weekly" | "monthly">("daily")
  const [autoApproveLoading, setAutoApproveLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/")
        return
      }

      const userDoc = await getDocs(query(collection(db, "users"), where("email", "==", user.email)))
      if (userDoc.empty || userDoc.docs[0].data().role !== "admin") {
        router.push("/")
        return
      }

      fetchBookings()
      fetchGamePrices()
      fetchUsers()
    })

    return () => unsubscribe()
  }, [router])

  const fetchBookings = async () => {
    try {
      const bookingsQuery = query(collection(db, "bookings"))
      const snapshot = await getDocs(bookingsQuery)
      let bookingsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Booking[]

      bookingsData = bookingsData.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return b.createdAt.seconds - a.createdAt.seconds
        }
        return 0
      })

      setBookings(bookingsData)
      setFilteredBookings(bookingsData)
    } catch (error) {
      console.error("Error fetching bookings:", error)
      setBookings([])
      setFilteredBookings([])
    } finally {
      setLoading(false)
    }
  }

  const fetchGamePrices = async () => {
    try {
      const pricesDocRef = doc(db, "gamePrices", "currentPrices")
      const pricesDocSnap = await getDoc(pricesDocRef)
      if (pricesDocSnap.exists()) {
        const data = pricesDocSnap.data()
        setPlaystation1hrPrice(data.playstation1hrPrice?.toString() || "200")
        setPlaystationUnlimitedPrice(data.playstationUnlimitedPrice?.toString() || "350")
        setSkateboard30minPrice(data.skateboard30minPrice?.toString() || "100")
        setSkateboard1hrPrice(data.skateboard1hrPrice?.toString() || "150")
        setSkateboardExtraHrPrice(data.skateboardExtraHrPrice?.toString() || "100")
      } else {
        setPlaystation1hrPrice("200")
        setPlaystationUnlimitedPrice("350")
        setSkateboard30minPrice("100")
        setSkateboard1hrPrice("150")
        setSkateboardExtraHrPrice("100")
      }
    } catch (error) {
      console.error("Error fetching game prices:", error)
      setPlaystation1hrPrice("200")
      setPlaystationUnlimitedPrice("350")
      setSkateboard30minPrice("100")
      setSkateboard1hrPrice("150")
      setSkateboardExtraHrPrice("100")
    }
  }

  const handleSavePrices = async () => {
    setPriceSaveLoading(true)
    try {
      await setDoc(doc(db, "gamePrices", "currentPrices"), {
        playstation1hrPrice: Number.parseFloat(playstation1hrPrice),
        playstationUnlimitedPrice: Number.parseFloat(playstationUnlimitedPrice),
        skateboard30minPrice: Number.parseFloat(skateboard30minPrice),
        skateboard1hrPrice: Number.parseFloat(skateboard1hrPrice),
        skateboardExtraHrPrice: Number.parseFloat(skateboardExtraHrPrice),
        lastUpdated: new Date(),
      })
      alert("Game prices saved successfully!")
    } catch (error) {
      console.error("Error saving game prices:", error)
      alert("Failed to save game prices.")
    } finally {
      setPriceSaveLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const usersQuery = query(collection(db, "users"))
      const snapshot = await getDocs(usersQuery)
      const usersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[]
      setUsers(usersData)
    } catch (error) {
      console.error("Error fetching users:", error)
      setUsers([])
    }
  }

  useEffect(() => {
    let filtered = bookings

    if (filterDate) {
      filtered = filtered.filter((booking) => booking.dateEnglish === filterDate)
    }
    if (filterGame !== "all") {
      filtered = filtered.filter((booking) => booking.gameType === filterGame)
    }
    if (filterStatus !== "all") {
      filtered = filtered.filter((booking) => booking.status === filterStatus)
    }
    if (searchToken) {
      filtered = filtered.filter((booking) => booking.tokenNumber.toLowerCase().includes(searchToken.toLowerCase()))
    }

    setFilteredBookings(filtered)
  }, [filterDate, filterGame, filterStatus, searchToken, bookings])

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "bookings", bookingId), {
        status: newStatus,
      })
      fetchBookings()
    } catch (error) {
      console.error("Error updating booking:", error)
    }
  }

  const deleteBooking = async (bookingId: string) => {
    if (confirm("Are you sure you want to delete this booking?")) {
      try {
        await deleteDoc(doc(db, "bookings", bookingId))
        fetchBookings()
      } catch (error) {
        console.error("Error deleting booking:", error)
      }
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/")
  }

  const handleAddOrUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setUserFormLoading(true)
    try {
      if (currentUser) {
        await updateDoc(doc(db, "users", currentUser.id), {
          name: newUserName,
          role: newUserRole,
        })
        alert("User updated successfully!")
      } else {
        await addDoc(collection(db, "users"), {
          email: newUserEmail,
          name: newUserName,
          role: newUserRole,
          createdAt: new Date(),
        })
        alert("User added successfully! Remember to create the user in Firebase Authentication as well.")
      }
      setShowUserForm(false)
      setCurrentUser(null)
      setNewUserEmail("")
      setNewUserName("")
      setNewUserRole("counter")
      fetchUsers()
    } catch (error) {
      console.error("Error adding/updating user:", error)
      alert("Failed to add/update user.")
    } finally {
      setUserFormLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (
      confirm(
        `Are you sure you want to delete user ${userName}? This will only remove the user document. You must delete the user from Firebase Authentication manually.`,
      )
    ) {
      try {
        await deleteDoc(doc(db, "users", userId))
        alert("User deleted successfully!")
        fetchUsers()
      } catch (error) {
        console.error("Error deleting user:", error)
        alert("Failed to delete user.")
      }
    }
  }

  const openEditUserForm = (user: User) => {
    setCurrentUser(user)
    setNewUserEmail(user.email)
    setNewUserName(user.name)
    setNewUserRole(user.role)
    setShowUserForm(true)
  }

  const bookingChartData = [
    { name: "Playzone", count: bookings.filter((b) => b.gameType === "Playzone").length },
    { name: "Skatepark", count: bookings.filter((b) => b.gameType === "Skatepark").length },
  ]

  const totalRevenue = useMemo(() => {
    const now = new Date()
    let startDate: Date
    const endDate: Date = now

    switch (revenuePeriod) {
      case "daily":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case "weekly":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
        break
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      default:
        startDate = new Date(0)
    }

    return bookings
      .filter((booking) => {
        if (booking.status === "Completed" && booking.price) {
          const bookingDate = booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.dateEnglish)
          return bookingDate >= startDate && bookingDate <= endDate
        }
        return false
      })
      .reduce((sum, booking) => sum + (booking.price || 0), 0)
      .toFixed(2)
  }, [bookings, revenuePeriod])

  const handleAutoApprove = async () => {
    if (!confirm("Are you sure you want to auto-approve ALL pending bookings? This action cannot be undone.")) {
      return
    }

    setAutoApproveLoading(true)
    try {
      const pendingBookingsQuery = query(collection(db, "bookings"), where("status", "==", "Pending"))
      const snapshot = await getDocs(pendingBookingsQuery)

      if (snapshot.empty) {
        alert("No pending bookings to auto-approve.")
        setAutoApproveLoading(false)
        return
      }

      const batch = writeBatch(db)
      snapshot.docs.forEach((docSnapshot) => {
        batch.update(docSnapshot.ref, { status: "Confirmed" })
      })

      await batch.commit()
      alert(`Successfully auto-approved ${snapshot.docs.length} pending bookings!`)
      fetchBookings()
    } catch (error) {
      console.error("Error auto-approving bookings:", error)
      alert("Failed to auto-approve bookings. Please try again.")
    } finally {
      setAutoApproveLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 gap-4 sm:gap-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Image
                  src="/sashambhu-new-logo.jpg"
                  alt="Sashambhu Playzone & Skatepark Logo"
                  width={50}
                  height={50}
                  className="rounded-lg shadow-md"
                />
              </div>

              <div>
                <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600 font-medium">Sashambhu Play Station</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookings.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {bookings.filter((b) => b.status === "Pending").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Confirmed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {bookings.filter((b) => b.status === "Confirmed").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {bookings.filter((b) => b.status === "Completed").length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Game Price Settings
            </CardTitle>
            <CardDescription>Set the prices for Playzone and Skatepark games.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="playstation-1hr-price">Playzone 1hr Price</Label>
                <Input
                  id="playstation-1hr-price"
                  type="number"
                  value={playstation1hrPrice}
                  onChange={(e) => setPlaystation1hrPrice(e.target.value)}
                  placeholder="e.g., 200"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="playstation-unlimited-price">Playzone Unlimited Price</Label>
                <Input
                  id="playstation-unlimited-price"
                  type="number"
                  value={playstationUnlimitedPrice}
                  onChange={(e) => setPlaystationUnlimitedPrice(e.target.value)}
                  placeholder="e.g., 350"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skateboard-30min-price">Skatepark 30min Price</Label>
                <Input
                  id="skateboard-30min-price"
                  type="number"
                  value={skateboard30minPrice}
                  onChange={(e) => setSkateboard30minPrice(e.target.value)}
                  placeholder="e.g., 100"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skateboard-1hr-price">Skatepark 1hr Price</Label>
                <Input
                  id="skateboard-1hr-price"
                  type="number"
                  value={skateboard1hrPrice}
                  onChange={(e) => setSkateboard1hrPrice(e.target.value)}
                  placeholder="e.g., 150"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skateboard-extra-hr-price">Skatepark Extra Hr Price</Label>
                <Input
                  id="skateboard-extra-hr-price"
                  type="number"
                  value={skateboardExtraHrPrice}
                  onChange={(e) => setSkateboardExtraHrPrice(e.target.value)}
                  placeholder="e.g., 100"
                  min="0"
                />
              </div>
            </div>
            <Button onClick={handleSavePrices} className="mt-6" disabled={priceSaveLoading}>
              <Save className="h-4 w-4 mr-2" />
              {priceSaveLoading ? "Saving..." : "Save Prices"}
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue Summary
            </CardTitle>
            <CardDescription>View revenue from completed bookings.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
              <Label htmlFor="revenue-period" className="shrink-0">
                Period:
              </Label>
              <Select value={revenuePeriod} onValueChange={(value) => setRevenuePeriod(value as any)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-4xl font-bold text-green-600">Rs. {totalRevenue}</div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <TabsTrigger value="bookings">All Bookings</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    All Bookings
                  </CardTitle>
                  <Button
                    onClick={handleAutoApprove}
                    disabled={autoApproveLoading}
                    className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {autoApproveLoading ? "Approving..." : "Auto-Approve Pending"}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Search className="h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search by token..."
                      value={searchToken}
                      onChange={(e) => setSearchToken(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <Input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full sm:w-40"
                  />
                  <Select value={filterGame} onValueChange={setFilterGame}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Game Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Games</SelectItem>
                      <SelectItem value="Playzone">Playzone</SelectItem>
                      <SelectItem value="Skatepark">Skatepark</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
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
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilterDate("")
                      setFilterGame("all")
                      setFilterStatus("all")
                      setSearchToken("")
                    }}
                    className="w-full sm:w-auto"
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Token</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Game</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">{booking.tokenNumber}</TableCell>
                          <TableCell>
                            <div>
                              <div>{booking.name}</div>
                            </div>
                          </TableCell>
                          <TableCell>{booking.gender || "N/A"}</TableCell>
                          <TableCell>
                            <div>
                              <div>{booking.dateEnglish}</div>
                              <div className="text-sm text-gray-500">{booking.dateNepali}</div>
                            </div>
                          </TableCell>
                          <TableCell>
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
                          </TableCell>
                          <TableCell>{booking.price ? `Rs. ${booking.price.toFixed(2)}` : "N/A"}</TableCell>
                          <TableCell>{booking.age}</TableCell>
                          <TableCell className="max-w-[120px] truncate">{booking.address}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Select
                                value={booking.status}
                                onValueChange={(value) => updateBookingStatus(booking.id, value)}
                              >
                                <SelectTrigger className="w-full sm:w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Pending">Pending</SelectItem>
                                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                                  <SelectItem value="Completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteBooking(booking.id)}
                                className="w-full sm:w-auto"
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Manage Users
                </CardTitle>
                <Button onClick={() => setShowUserForm(true)} size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add New User
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.role}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEditUserForm(user)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id, user.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5" />
                  Booking Distribution by Game Type
                </CardTitle>
                <CardDescription>Number of bookings for Playzone vs Skatepark.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    count: {
                      label: "Bookings",
                      color: "hsl(var(--primary))",
                    },
                    Playzone: {
                      label: "Playzone",
                      color: "hsl(var(--chart-1))",
                    },
                    Skatepark: {
                      label: "Skatepark",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={bookingChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showUserForm} onOpenChange={setShowUserForm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentUser ? "Edit User" : "Add New User"}</DialogTitle>
            <CardDescription>
              {currentUser
                ? "Update user details."
                : "Add a new counter worker. Note: Password management for new users must be done directly in Firebase Authentication."}
            </CardDescription>
          </DialogHeader>
          <form onSubmit={handleAddOrUpdateUser} className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Name</Label>
              <Input id="user-name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                required
                disabled={!!currentUser}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-role">Role</Label>
              <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as "admin" | "counter")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="counter">Counter Worker</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={userFormLoading}>
                {userFormLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

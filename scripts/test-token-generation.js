import { initializeApp } from "firebase/app"
import { getFirestore, collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore"

// Firebase configuration (replace with your actual config)
const firebaseConfig = {
  // Your Firebase config here
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Token generation function (same as in booking form)
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

// Create a test booking
const createTestBooking = async (index) => {
  try {
    const tokenNumber = await generateTokenNumber()

    console.log(`Creating booking ${index} with token: ${tokenNumber}`)

    const bookingData = {
      name: `Test User ${index}`,
      phoneNumber: `9800000${index.toString().padStart(3, "0")}`,
      gender: index % 2 === 0 ? "Male" : "Female",
      numberOfPersons: Math.floor(Math.random() * 4) + 1, // 1-4 persons
      dateEnglish: new Date().toISOString().split("T")[0],
      dateNepali: "2081 पौष 15",
      age: Math.floor(Math.random() * 50) + 18, // 18-67 years
      address: `Test Address ${index}`,
      gameType: index % 2 === 0 ? "PlayStation" : "Skateboard",
      playstationPackage: index % 2 === 0 ? "1hr" : null,
      skateboardBasePackage: index % 2 === 1 ? "1hr" : null,
      skateboardExtraHours: index % 2 === 1 ? Math.floor(Math.random() * 3) : null,
      tokenNumber,
      status: "Pending",
      price: Math.floor(Math.random() * 500) + 100, // Random price 100-600
      createdAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, "bookings"), bookingData)
    console.log(`✅ Booking ${index} created with ID: ${docRef.id}, Token: ${tokenNumber}`)

    return { success: true, token: tokenNumber, id: docRef.id }
  } catch (error) {
    console.error(`❌ Error creating booking ${index}:`, error)
    return { success: false, error: error.message }
  }
}

// Test rapid booking creation
const testRapidBookingCreation = async () => {
  console.log("🚀 Starting rapid booking creation test...")
  console.log("Creating 10 bookings simultaneously to test token uniqueness...\n")

  const startTime = Date.now()

  // Create 10 bookings simultaneously
  const promises = Array.from({ length: 10 }, (_, i) => createTestBooking(i + 1))

  try {
    const results = await Promise.all(promises)
    const endTime = Date.now()

    console.log(`\n📊 Test completed in ${endTime - startTime}ms`)

    // Analyze results
    const successful = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)
    const tokens = successful.map((r) => r.token)
    const uniqueTokens = [...new Set(tokens)]

    console.log("🔍 Token Analysis:")
    console.log(`  Total bookings attempted: ${results.length}`)
    console.log(`  Successful bookings: ${successful.length}`)
    console.log(`  Failed bookings: ${failed.length}`)
    console.log(`  Tokens generated: ${tokens.length}`)
    console.log(`  Unique tokens: ${uniqueTokens.length}`)
    console.log(`  Duplicates found: ${tokens.length !== uniqueTokens.length ? "YES ❌" : "NO ✅"}`)

    // Check if tokens are sequential
    const numericTokens = tokens.map((t) => Number.parseInt(t)).sort((a, b) => a - b)
    const isSequential = numericTokens.every((token, index) => {
      if (index === 0) return true
      return token === numericTokens[index - 1] + 1
    })

    console.log(`  Sequential order: ${isSequential ? "YES ✅" : "NO ❌"}`)
    console.log(`  Token sequence: [${numericTokens.join(", ")}]`)

    if (failed.length > 0) {
      console.log("\n❌ Failed bookings:")
      failed.forEach((failure, index) => {
        console.log(`  ${index + 1}. ${failure.error}`)
      })
    }

    if (tokens.length !== uniqueTokens.length) {
      console.log("\n⚠️  DUPLICATE TOKENS DETECTED!")
      const duplicates = tokens.filter((token, index) => tokens.indexOf(token) !== index)
      console.log(`  Duplicate tokens: [${duplicates.join(", ")}]`)
    } else {
      console.log("\n🎉 SUCCESS: All tokens are unique!")
    }
  } catch (error) {
    console.error("❌ Test failed:", error)
  }
}

// Test with random delays (simulating real-world conditions)
const testConcurrentWithDelays = async () => {
  console.log("\n🔄 Starting concurrent booking test with random delays...")

  const startTime = Date.now()

  // Create bookings with random delays
  const promises = Array.from({ length: 5 }, async (_, i) => {
    const delay = Math.random() * 100 // 0-100ms delay
    await new Promise((resolve) => setTimeout(resolve, delay))
    return createTestBooking(i + 11) // Start from 11 to avoid conflicts
  })

  try {
    const results = await Promise.all(promises)
    const endTime = Date.now()

    console.log(`📊 Concurrent test completed in ${endTime - startTime}ms`)

    const successful = results.filter((r) => r.success)
    const tokens = successful.map((r) => r.token)
    const uniqueTokens = [...new Set(tokens)]

    console.log(`🔍 Concurrent Test Results:`)
    console.log(`  Successful: ${successful.length}/${results.length}`)
    console.log(`  Unique tokens: ${uniqueTokens.length}/${tokens.length}`)
    console.log(`  No duplicates: ${tokens.length === uniqueTokens.length ? "✅" : "❌"}`)
  } catch (error) {
    console.error("❌ Concurrent test failed:", error)
  }
}

// Run all tests
const runAllTests = async () => {
  try {
    await testRapidBookingCreation()
    await testConcurrentWithDelays()

    console.log("\n🏁 All tests completed!")
    console.log("💡 Check your Firebase console to verify the bookings were created correctly.")
    console.log("🧹 Remember to clean up test data if needed.")
  } catch (error) {
    console.error("❌ Test suite failed:", error)
  } finally {
    process.exit(0)
  }
}

// Start the tests
runAllTests()

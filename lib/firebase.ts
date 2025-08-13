import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyDLBdyypZ69wMiE-ppsPBHwg97IK4Q_FjA",
  authDomain: "tushar-14942.firebaseapp.com",
  projectId: "tushar-14942",
  storageBucket: "tushar-14942.firebasestorage.app",
  messagingSenderId: "686589234694",
  appId: "1:686589234694:web:0ce769a2252445b2b17d87",
  measurementId: "G-F0W1J2GZN0"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app)

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app)

export default app

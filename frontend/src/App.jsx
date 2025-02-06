import { ConnectButton } from "@rainbow-me/rainbowkit"
import Navigation from "./components/Navigation"
import Dashboard from "./pages/Home"
import { Route, Routes } from "react-router-dom"
import AIChat from "./pages/Chat"

const App = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/chat" element={<AIChat />} />
        </Routes>
      </div>
    </div>
  )
}

export default App

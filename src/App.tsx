import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Dashboard } from './components/Dashboard'
import { AddEntryForm } from './components/AddEntryForm'
import { RemoveEntryForm } from './components/RemoveEntryForm'

function App() {
  return (
    <Router>
      <main className="px-2 md:px-4 lg:px-8 xl:px-16 py-12">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add" element={<AddEntryForm />} />
          <Route path="/remove" element={<RemoveEntryForm />} />
        </Routes>
      </main>
    </Router>
  )
}

export default App

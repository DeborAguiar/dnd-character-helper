import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CharacterProvider } from './context/CharacterContext'
import Layout from './pages/Layout'
import Home from './pages/Home'
import CharacterCreate from './pages/CharacterCreate'
import CharacterSheet from './pages/CharacterSheet'
import LevelUp from './pages/LevelUp'
import CustomClasses from './pages/CustomClasses'
import './App.css'

function App() {
  return (
    <CharacterProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="create" element={<CharacterCreate />} />
            <Route path="sheet" element={<CharacterSheet />} />
            <Route path="level-up" element={<LevelUp />} />
            <Route path="custom-classes" element={<CustomClasses />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CharacterProvider>
  )
}

export default App

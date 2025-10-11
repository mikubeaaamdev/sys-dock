import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Overview from './components/Overview';
import Sidebar from './components/Sidebar';
import './App.css';
import { SidebarProvider } from './context/SidebarContext';
import Performance from './components/Performance';

function App() {
  return (
    <SidebarProvider>
      <BrowserRouter>
        <Sidebar />
        <Layout>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/performance" element={<Performance />} />
            {/* Add other routes as needed */}
          </Routes>
        </Layout>
      </BrowserRouter>
    </SidebarProvider>
  );
}

export default App;

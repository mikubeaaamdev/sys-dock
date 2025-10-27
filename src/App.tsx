import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Overview from './components/Overview';
import Sidebar from './components/Sidebar';
import './App.css';
import { SidebarProvider } from './context/SidebarContext';
import Performance from './components/Performance';
import Processes from './components/Processes';
import { AlertProvider } from './context/AlertContext';
import Widgets from './components/Widgets';

function App() {
  return (
    <AlertProvider>
      <SidebarProvider>
        <BrowserRouter>
          <Sidebar />
          <Layout>
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/processes" element={<Processes />} />
              <Route path="/widgets" element={<Widgets />} />
              {/* Add other routes as needed */}
            </Routes>
          </Layout>
        </BrowserRouter>
      </SidebarProvider>
    </AlertProvider>
  );
}

export default App;

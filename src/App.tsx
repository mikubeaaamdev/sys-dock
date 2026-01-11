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
import Settings from './components/Settings';
import Logs from './components/Logs';

function App() {
  return (
    <AlertProvider>
      <SidebarProvider>
        <BrowserRouter>
          <Sidebar showConfirm={true} />
          <Layout>
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/processes" element={<Processes />} />
              <Route path="/widgets" element={<Widgets />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/settings" element={<Settings />} />
              {/* Add other routes as needed */}
            </Routes>
          </Layout>
        </BrowserRouter>
      </SidebarProvider>
    </AlertProvider>
  );
}

export default App;

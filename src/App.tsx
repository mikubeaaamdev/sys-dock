import Layout from './components/Layout';
import Overview from './components/Overview';
import './App.css';
import { SidebarProvider } from './context/SidebarContext';

function App() {
  return (
    <SidebarProvider>
      <Layout>
        <Overview />
      </Layout>
    </SidebarProvider>
  );
}

export default App;

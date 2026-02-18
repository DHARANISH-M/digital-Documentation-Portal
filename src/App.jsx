import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Documents from './pages/Documents';
import Search from './pages/Search';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import HelpPortal from './pages/HelpPortal';
import Folders from './pages/Folders';

function App() {
    return (
        <AuthProvider>
            <DataProvider>
                <Router>
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />

                        {/* Protected Routes */}
                        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                            <Route index element={<Navigate to="/dashboard" replace />} />
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route path="upload" element={<Upload />} />
                            <Route path="documents" element={<Documents />} />
                            <Route path="folders" element={<Folders />} />
                            <Route path="search" element={<Search />} />
                            <Route path="profile" element={<Profile />} />
                            <Route path="admin" element={<Admin />} />
                            <Route path="help" element={<HelpPortal />} />
                        </Route>
                    </Routes>
                </Router>
            </DataProvider>
        </AuthProvider>
    );
}

export default App;


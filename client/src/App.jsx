import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DonorDashboard } from './pages/DonorDashboard';
import { DonorProfilePage } from './pages/DonorProfilePage';
import { RequesterDashboard } from './pages/RequesterDashboard';
import { CreateRequestPage } from './pages/CreateRequestPage';
import { NearbyDonorsPage } from './pages/NearbyDonorsPage';
import { RequestDetailsPage } from './pages/RequestDetailsPage';
import { NotificationCenterPage } from './pages/NotificationCenterPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { CompatibilityCalculatorPage } from './pages/CompatibilityCalculatorPage';
import { InventoryPage } from './pages/InventoryPage';
import { DonationCampsPage } from './pages/DonationCampsPage';

export function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/compatibility" element={<CompatibilityCalculatorPage />} />

          {/* Donor Routes */}
          <Route
            path="/donor"
            element={
              <ProtectedRoute allowedRoles={['donor']}>
                <DonorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/donor/profile"
            element={
              <ProtectedRoute allowedRoles={['donor']}>
                <DonorProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Hospital & Request Management Routes */}
          <Route
            path="/requester"
            element={
              <ProtectedRoute allowedRoles={['requester', 'admin', 'hospital_admin', 'hospital_staff', 'platform_admin']}>
                <RequesterDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute allowedRoles={['requester', 'admin', 'hospital_admin', 'hospital_staff', 'platform_admin']}>
                <InventoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/camps"
            element={
              <ProtectedRoute>
                <DonationCampsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/requests/new"
            element={
              <ProtectedRoute allowedRoles={['requester', 'admin', 'hospital_admin', 'hospital_staff', 'platform_admin']}>
                <CreateRequestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/donors/discover"
            element={
              <ProtectedRoute allowedRoles={['requester', 'admin', 'hospital_admin', 'hospital_staff', 'platform_admin']}>
                <NearbyDonorsPage />
              </ProtectedRoute>
            }
          />

          {/* Shared Protected Routes */}
          <Route
            path="/requests/:id"
            element={
              <ProtectedRoute>
                <RequestDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationCenterPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Platform Administrator Route */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin', 'platform_admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback 404 Route */}
          <Route
            path="*"
            element={
              <div className="py-24 text-center">
                <h2 className="text-2xl font-bold text-slate-900">404 - Page Not Found</h2>
                <p className="text-sm text-slate-600 mt-2">The requested coordination page does not exist.</p>
                <a
                  href="/"
                  className="mt-4 inline-block px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold"
                >
                  Return to Home
                </a>
              </div>
            }
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;

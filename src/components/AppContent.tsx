import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import Header from './Header';
import ProtectedRoute from './ProtectedRoute';
import LoginForm from './LoginForm';
import BreadcrumbNav from './BreadcrumbNav';
import Dashboard from '../pages/Dashboard';
import ContentGenerator from '../pages/ContentGenerator';
import Images from '../pages/Images';
import Analytics from '../pages/Analytics';
import PlaybookManager from '../pages/PlaybookManager';
import CalendarView from '../pages/CalendarView';
import ClientManagement from '../pages/ClientManagement';
import Settings from '../pages/Settings';
import SocialPosting from '../pages/SocialPosting';
import Publish from '../pages/Publish';
import AIModelSettings from '../pages/AIModelSettings';
import ToneProfiler from '../pages/ToneProfiler';
import Help from '../pages/Help'; // NEW
import ContentStrategyVisualization from '../pages/ContentStrategyVisualization'; // NEW - Feature 10
import ReferenceDocuments from './ReferenceDocuments'; // NEW - Feature 6: Client Reference Document Repository
import TalentMarketplace from '../pages/TalentMarketplace'; // NEW - Feature 5: Talent Marketplace
import TalentProfile from '../pages/TalentProfile'; // NEW - Feature 5: Talent Marketplace
import CreateTalentProfile from '../pages/CreateTalentProfile'; // NEW - Feature 5: Talent Marketplace
import EditTalentProfile from '../pages/EditTalentProfile'; // NEW - Feature 5: Talent Marketplace
import BookTalent from '../pages/BookTalent'; // NEW - Feature 5: Talent Marketplace
import MyBookings from '../pages/MyBookings'; // NEW - Feature 5: Talent Marketplace
import TalentAdmin from '../pages/TalentAdmin'; // NEW - Feature 5: Talent Marketplace
import ManualPayment from '../pages/ManualPayment'; // NEW - Payment System
import TalentEarnings from '../pages/TalentEarnings'; // NEW - Payment System
import ContentList from '../pages/ContentList'; // NEW - Content List Management
import PostCreator from '../pages/PostCreator'; // NEW - Dual-Mode Post Creation
import Reports from '../pages/Reports'; // NEW - Client Report Export
import SystemLogicSettings from '../pages/SystemLogicSettings'; // NEW - System Logic Settings

const AppContent: React.FC = () => {
  const { user, loading } = useUser();
  const [showLoginForm, setShowLoginForm] = useState(false);

  return (
    <div className="min-h-screen animated-bg">
      <Header onShowLogin={() => setShowLoginForm(true)} />
      <main className="content-area max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 relative z-10">
        <BreadcrumbNav />
        <Routes>
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/generate" element={
            <ProtectedRoute>
              <ContentGenerator />
            </ProtectedRoute>
          } />
          <Route path="/content-generator" element={
            <ProtectedRoute>
              <ContentGenerator />
            </ProtectedRoute>
          } />
          <Route path="/images" element={
            <ProtectedRoute>
              <Images />
            </ProtectedRoute>
          } />
          <Route path="/assets" element={
            <ProtectedRoute>
              <Images />
            </ProtectedRoute>
          } />
          <Route path="/social" element={
            <ProtectedRoute>
              <SocialPosting />
            </ProtectedRoute>
          } />
          <Route path="/publish" element={
            <ProtectedRoute>
              <Publish />
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          } />
          <Route path="/playbook" element={
            <ProtectedRoute>
              <PlaybookManager />
            </ProtectedRoute>
          } />
          <Route path="/calendar" element={
            <ProtectedRoute>
              <CalendarView />
            </ProtectedRoute>
          } />
          <Route path="/content-list" element={
            <ProtectedRoute>
              <ContentList />
            </ProtectedRoute>
          } />
          <Route path="/create-post" element={
            <ProtectedRoute>
              <PostCreator />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          } />
          <Route path="/clients" element={
            <ProtectedRoute>
              <ClientManagement />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="/settings/system-logic" element={
            <ProtectedRoute>
              <SystemLogicSettings />
            </ProtectedRoute>
          } />
          <Route path="/settings/ai-models" element={
            <ProtectedRoute>
              <AIModelSettings />
            </ProtectedRoute>
          } />
          <Route path="/tone-profiler" element={
            <ProtectedRoute>
              <ToneProfiler />
            </ProtectedRoute>
          } />
          <Route path="/help" element={
            <ProtectedRoute>
              <Help />
            </ProtectedRoute>
          } />
          <Route path="/help/:category" element={
            <ProtectedRoute>
              <Help />
            </ProtectedRoute>
          } />
                  <Route path="/help/:category/:articleId" element={
                    <ProtectedRoute>
                      <Help />
                    </ProtectedRoute>
                  } />
                  <Route path="/strategy-visualization" element={
                    <ProtectedRoute>
                      <ContentStrategyVisualization />
                    </ProtectedRoute>
                  } />
                  <Route path="/reference-documents" element={
                    <ProtectedRoute>
                      <ReferenceDocuments />
                    </ProtectedRoute>
                  } />
                  <Route path="/talent" element={<TalentMarketplace />} />
                  <Route path="/talent/:id" element={<TalentProfile />} />
                  <Route path="/talent/:id/book" element={
                    <ProtectedRoute>
                      <BookTalent />
                    </ProtectedRoute>
                  } />
                  <Route path="/talent/create-profile" element={
                    <ProtectedRoute>
                      <CreateTalentProfile />
                    </ProtectedRoute>
                  } />
                  <Route path="/bookings" element={
                    <ProtectedRoute>
                      <MyBookings />
                    </ProtectedRoute>
                  } />
                  <Route path="/talent/:id/edit" element={
                    <ProtectedRoute>
                      <EditTalentProfile />
                    </ProtectedRoute>
                  } />
                  <Route path="/talent-admin" element={
                    <ProtectedRoute>
                      <TalentAdmin />
                    </ProtectedRoute>
                  } />
                  
                  {/* Payment System Routes */}
                  <Route path="/payment/:bookingId" element={
                    <ProtectedRoute>
                      <ManualPayment />
                    </ProtectedRoute>
                  } />
                  <Route path="/earnings" element={
                    <ProtectedRoute>
                      <TalentEarnings />
                    </ProtectedRoute>
                  } />
                  
                </Routes>
      </main>
      
      {/* Modal rendered at app level with highest z-index */}
      {showLoginForm && (
        <LoginForm onClose={() => setShowLoginForm(false)} />
      )}
    </div>
  );
};

export default AppContent;

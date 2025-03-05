import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';
import { AISettings } from '../pages/AISettings';
import SystemStatus from '../pages/SystemStatus';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import AIMonitoringDashboard from '../components/AIMonitoringDashboard';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="ai-settings" element={<ProtectedRoute><AISettings /></ProtectedRoute>} />
        <Route path="ai-monitoring" element={<ProtectedRoute><AIMonitoringDashboard /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
};

export default AppRoutes; 
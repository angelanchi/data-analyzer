import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import AnalysisPage from './pages/AnalysisPage';
import ProjectsPage from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import SettingsPage from './pages/SettingsPage';
import { UserProvider } from './contexts/UserContext';
import { CollaborationProvider } from './contexts/CollaborationContext';

function App() {
  return (
    <UserProvider>
      <CollaborationProvider>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/analysis" element={<AnalysisPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Layout>
        </Box>
      </CollaborationProvider>
    </UserProvider>
  );
}

export default App;
import React from 'react';
import { CinematicDashboard } from '../components/Dashboard';

const DashboardDemo: React.FC = () => {
  return (
    <div style={{ 
      width: '100%', 
      height: '100vh',
      overflow: 'auto'
    }}>
      <CinematicDashboard />
    </div>
  );
};

export default DashboardDemo;
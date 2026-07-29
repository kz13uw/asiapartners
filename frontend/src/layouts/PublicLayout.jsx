import React from 'react';
import { Outlet } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Footer';

const PublicLayout = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'radial-gradient(circle at top right, #EBF5FB 0%, #F4F7F9 40%, #D6EBF7 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Global Background Abstract Shapes for Public Pages */}
      <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(43,138,196,0.15) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(255,175,0,0.1) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%', zIndex: 0 }}></div>

      <PublicHeader />

      <main style={{ flexGrow: 1, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
      
      <div style={{ position: 'relative', zIndex: 2 }}>
        <Footer />
      </div>
    </div>
  );
};

export default PublicLayout;

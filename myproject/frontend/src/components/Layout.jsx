import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();
  
  // Force repaint of the page during transitions by triggering a reflow
  useEffect(() => {
    // Add fade-in class to body to trigger animation
    document.body.classList.add('fade-in');
    
    // Cleanup function to remove class when component unmounts
    return () => {
      document.body.classList.remove('fade-in');
    };
  }, [location.pathname]); // Re-run when the route changes

  return (
    <div className="page-wrapper min-h-screen">
      {children}
    </div>
  );
};

export default Layout; 
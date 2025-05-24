import { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../AuthContext';
import axios from 'axios';
import { getToken } from '../utils/auth';

/**
 * Custom hook to monitor and update seller status
 * @returns {Object} - Object containing seller status and refresh function
 */
const useSellerStatus = () => {
  const { user, setUser } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);

  // Function to refresh seller status from the server
  const refreshSellerStatus = useCallback(async (force = false) => {
    const token = getToken();
    if (!token) return false;
    
    // Prevent too frequent refreshes (at most once every 5 seconds)
    const now = Date.now();
    if (!force && now - lastRefreshTime < 5000) {
      return false;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.get("http://localhost:8000/api/users/me/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.data) {
        // Always update user data to ensure it's fresh
        setUser(response.data);
        setLastRefreshTime(now);
        
        // Return true if seller status changed
        if (user && response.data.is_seller !== user.is_seller) {
          console.log("Seller status changed:", response.data.is_seller);
          return true; // Status changed
        }
      }
      return false; // Status didn't change
    } catch (error) {
      console.error("Error refreshing seller status:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, setUser, lastRefreshTime]);

  return { 
    isSeller: user?.is_seller || false, 
    isLoading, 
    refreshSellerStatus 
  };
};

export default useSellerStatus; 
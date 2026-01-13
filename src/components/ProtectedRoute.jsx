import { Navigate } from 'react-router-dom';
import { getAccessToken } from '../api/api';

const ProtectedRoute = ({ children }) => {
  const token = getAccessToken();
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
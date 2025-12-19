import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [hasAdmin, setHasAdmin] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      checkForExistingAdmin();
    } else {
      setIsCheckingAdmin(false);
    }
  }, [isLoading, user]);

  const checkForExistingAdmin = async () => {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');

      if (error) throw error;

      setHasAdmin((count ?? 0) > 0);
    } catch (error) {
      console.error('Error checking for admin:', error);
      setHasAdmin(true);
    } finally {
      setIsCheckingAdmin(false);
    }
  };

  if (isLoading || isCheckingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={hasAdmin ? "/login" : "/register"} replace />;
  }

  return <>{children}</>;
}

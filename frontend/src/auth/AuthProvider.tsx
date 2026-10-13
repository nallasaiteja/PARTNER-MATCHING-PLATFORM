import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RoleType } from '../constants/roles';

export interface User {
  id: string;
  mobile?: string;
  email?: string;
  role: RoleType;
  status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'TERMINATED';
  organizationId: string | null;
}

export interface MemberProfileSummary {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  packageType: 'FREE' | 'PAID';
  currentStep: number;
  termsAccepted: boolean;
  createdByType?: string;
}

interface AuthContextType {
  user: User | null;
  memberProfile: MemberProfileSummary | null;
  setUser: (user: User | null) => void;
  setMemberProfile: (profile: MemberProfileSummary | null) => void;
  setSession: (accessToken: string, user: User, memberProfile?: MemberProfileSummary | null) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [memberProfile, setMemberProfile] = useState<MemberProfileSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedProfile = localStorage.getItem('memberProfile');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error(e);
      }
    }
    if (storedProfile) {
      try {
        setMemberProfile(JSON.parse(storedProfile));
      } catch (e) {
        console.error(e);
      }
    }
    setIsLoading(false);
  }, []);

  const handleSetUser = (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('user');
    }
  };

  const handleSetMemberProfile = (newProfile: MemberProfileSummary | null) => {
    setMemberProfile(newProfile);
    if (newProfile) {
      localStorage.setItem('memberProfile', JSON.stringify(newProfile));
    } else {
      localStorage.removeItem('memberProfile');
    }
  };

  const setSession = (
    accessToken: string,
    newUser: User,
    newProfile?: MemberProfileSummary | null,
  ) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('token', accessToken);
    handleSetUser(newUser);
    if (newProfile) {
      handleSetMemberProfile(newProfile);
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('memberProfile');
    setUser(null);
    setMemberProfile(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        memberProfile,
        setUser: handleSetUser,
        setMemberProfile: handleSetMemberProfile,
        setSession,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

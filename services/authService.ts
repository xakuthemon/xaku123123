import { User } from '../types';

const USER_STORAGE_KEY = 'fraud_detect_user';
const TOKEN_STORAGE_KEY = 'fraud_detect_token';

// Mock user database
const MOCK_USER: User = {
  id: 'usr_001',
  name: 'Alex Mercer',
  email: 'alex.mercer@frauddetect.io',
  role: 'ANALYST',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
};

export const login = async (email: string): Promise<User> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const user = { ...MOCK_USER, email }; // Use provided email for personalization
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  localStorage.setItem(TOKEN_STORAGE_KEY, 'mock_jwt_token_' + Date.now());
  
  return user;
};

export const logout = () => {
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};

export const getCurrentUser = (): User | null => {
  const storedUser = localStorage.getItem(USER_STORAGE_KEY);
  return storedUser ? JSON.parse(storedUser) : null;
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem(TOKEN_STORAGE_KEY);
};
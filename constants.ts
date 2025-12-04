import { Transaction, TransactionType } from './types';

// Used for the "Demo Data" button
export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'TXN-8821-A',
    clientId: 'USR-102',
    amount: 45.50,
    currency: 'USD',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    category: 'Groceries',
    location: 'New York, US',
    type: TransactionType.PAYMENT
  },
  {
    id: 'TXN-8822-B',
    clientId: 'USR-102',
    amount: 12500.00,
    currency: 'USD',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    category: 'Electronics',
    location: 'Lagos, NG', // Sudden location jump
    type: TransactionType.PAYMENT
  },
  {
    id: 'TXN-8823-C',
    clientId: 'USR-551',
    amount: 1200.00,
    currency: 'USD',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    category: 'Transfer',
    location: 'London, UK',
    type: TransactionType.TRANSFER
  },
  {
    id: 'TXN-8824-D',
    clientId: 'USR-102',
    amount: 9.99,
    currency: 'USD',
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    category: 'Subscription',
    location: 'New York, US',
    type: TransactionType.PAYMENT
  },
  {
    id: 'TXN-8825-E',
    clientId: 'USR-999',
    amount: 50000.00,
    currency: 'USD',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    category: 'Withdrawal',
    location: 'Unknown',
    type: TransactionType.WITHDRAWAL
  },
];

export const CATEGORIES = ['Groceries', 'Electronics', 'Travel', 'Utilities', 'Entertainment', 'Transfer', 'Withdrawal'];
export const LOCATIONS = ['New York, US', 'London, UK', 'Paris, FR', 'Tokyo, JP', 'Lagos, NG', 'Moscow, RU', 'Berlin, DE'];

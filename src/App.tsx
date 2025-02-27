import React, { useState, useEffect } from 'react';
import { Wallet, CreditCard, ShoppingCart, Lock, CheckCircle, XCircle, Smartphone, History, RefreshCw, Shield, Tag, Save, AlertCircle } from 'lucide-react';
import { readNFCTag, writeNFCTag, verifyPIN, updateNFCTagBalance, NFCData } from './nfcUtils';

// Simulated blockchain transaction
interface Transaction {
  id: string;
  sender: string;
  recipient: string;
  amount: number;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  hash: string;
}

function App() {
  // App state
  const [activeTab, setActiveTab] = useState<'user' | 'vendor'>('user');
  const [nfcTag, setNfcTag] = useState<NFCData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isNfcScanning, setIsNfcScanning] = useState<boolean>(false);
  const [isNfcWriting, setIsNfcWriting] = useState<boolean>(false);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [showInitModal, setShowInitModal] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [initPin, setInitPin] = useState<string>('');
  const [initBalance, setInitBalance] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [transactionAmount, setTransactionAmount] = useState<string>('');
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [pendingTransaction, setPendingTransaction] = useState<{
    amount: number;
    recipient: string;
  } | null>(null);
  const [loadAmount, setLoadAmount] = useState<string>('');
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null);

  // Brand color
  const brandColor = "#4F20D2";

  // Check if NFC is supported
  useEffect(() => {
    const checkNfcSupport = () => {
      const isSupported = 'NDEFReader' in window;
      setNfcSupported(isSupported);
      
      if (!isSupported) {
        showNotification('NFC is not supported in this browser. Please use Chrome on Android.', 'error');
      }
    };
    
    checkNfcSupport();
  }, []);

  // Scan NFC tag
  const scanNFC = async () => {
    if (!nfcSupported) {
      showNotification('NFC is not supported in this browser', 'error');
      return;
    }
    
    setIsNfcScanning(true);
    
    try {
      const tagData = await readNFCTag();
      setNfcTag(tagData);
      showNotification('NFC tag read successfully', 'success');
    } catch (error) {
      console.error('Error reading NFC tag:', error);
      
      if ((error as Error).message === 'No valid data found on NFC tag') {
        showNotification('This NFC tag needs to be initialized. Would you like to set it up?', 'info');
        setShowInitModal(true);
      } else {
        showNotification(`Error reading NFC tag: ${(error as Error).message}`, 'error');
      }
    } finally {
      setIsNfcScanning(false);
    }
  };

  // Initialize a new NFC tag
  const initializeTag = async () => {
    if (!nfcSupported) {
      showNotification('NFC is not supported in this browser', 'error');
      return;
    }
    
    const balance = parseFloat(initBalance);
    
    if (isNaN(balance) || balance < 0) {
      showNotification('Please enter a valid balance amount', 'error');
      return;
    }
    
    if (initPin.length !== 4 || !/^\d+$/.test(initPin)) {
      showNotification('PIN must be 4 digits', 'error');
      return;
    }
    
    setIsNfcWriting(true);
    
    try {
      // Create new tag data
      const newTagData: NFCData = {
        balance: balance,
        pin: initPin,
        lastUpdated: Date.now(),
        transactions: [],
        id: `nfc-tag-${Date.now()}`
      };
      
      // Write to NFC tag
      await writeNFCTag(newTagData);
      
      // Update state
      setNfcTag(newTagData);
      setShowInitModal(false);
      setInitPin('');
      setInitBalance('');
      
      showNotification('NFC tag initialized successfully', 'success');
    } catch (error) {
      console.error('Error initializing NFC tag:', error);
      showNotification(`Error initializing NFC tag: ${(error as Error).message}`, 'error');
    } finally {
      setIsNfcWriting(false);
    }
  };

  // Show notification
  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type });
    
    // Auto-hide notification after 3 seconds
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Handle PIN input change
  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and limit to 4 digits
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setEnteredPin(value);
    setPinError(null);
  };

  // Handle initialization PIN input change
  const handleInitPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and limit to 4 digits
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setInitPin(value);
  };

  // Verify PIN for transaction
  const verifyPin = async () => {
    if (!nfcTag || !pendingTransaction) return;
    
    if (enteredPin === nfcTag.pin) {
      // PIN is correct, process the transaction
      await processTransaction(pendingTransaction.amount, pendingTransaction.recipient);
      setShowPinModal(false);
      setEnteredPin('');
      setPendingTransaction(null);
    } else {
      // PIN is incorrect
      setPinError('Incorrect PIN. Please try again.');
    }
  };

  // Process transaction after PIN verification
  const processTransaction = async (amount: number, recipient: string) => {
    if (!nfcTag) return;
    
    // Check if user has sufficient balance
    if (nfcTag.balance < amount) {
      showNotification('Insufficient balance', 'error');
      return;
    }
    
    // Generate transaction hash (simplified for demo)
    const txHash = `tx-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    
    // Create new transaction
    const newTransaction: Transaction = {
      id: `tx-${Date.now()}`,
      sender: nfcTag.id,
      recipient: recipient,
      amount: amount,
      timestamp: Date.now(),
      status: isOnline ? 'confirmed' : 'pending',
      hash: txHash,
    };
    
    setIsNfcWriting(true);
    
    try {
      // Update NFC tag balance
      const newBalance = nfcTag.balance - amount;
      const updatedTag = await updateNFCTagBalance(nfcTag, newBalance, txHash);
      
      // Update state
      setNfcTag(updatedTag);
      setTransactions([newTransaction, ...transactions]);
      
      showNotification(
        `Transaction of $${amount.toFixed(2)} ${isOnline ? 'completed' : 'will be processed when online'}`,
        'success'
      );
    } catch (error) {
      console.error('Error updating NFC tag:', error);
      showNotification(`Error processing transaction: ${(error as Error).message}`, 'error');
    } finally {
      setIsNfcWriting(false);
    }
  };

  // Initiate transaction (vendor side)
  const initiateTransaction = () => {
    if (!nfcTag) {
      showNotification('Please scan an NFC tag first', 'error');
      return;
    }
    
    const amount = parseFloat(transactionAmount);
    
    if (isNaN(amount) || amount <= 0) {
      showNotification('Please enter a valid amount', 'error');
      return;
    }
    
    // Set pending transaction and show PIN modal
    setPendingTransaction({
      amount: amount,
      recipient: 'vendor-001',
    });
    
    setShowPinModal(true);
    setEnteredPin('');
  };

  // Load money to NFC tag (user side)
  const loadMoneyToTag = async () => {
    if (!nfcTag) {
      showNotification('Please scan an NFC tag first', 'error');
      return;
    }
    
    const amount = parseFloat(loadAmount);
    
    if (isNaN(amount) || amount <= 0) {
      showNotification('Please enter a valid amount', 'error');
      return;
    }
    
    setIsNfcWriting(true);
    
    try {
      // Update NFC tag balance
      const newBalance = nfcTag.balance + amount;
      const updatedTag = await updateNFCTagBalance(nfcTag, newBalance);
      
      // Update state
      setNfcTag(updatedTag);
      setLoadAmount('');
      
      showNotification(`Successfully loaded $${amount.toFixed(2)} to your NFC tag`, 'success');
    } catch (error) {
      console.error('Error updating NFC tag:', error);
      showNotification(`Error loading money: ${(error as Error).message}`, 'error');
    } finally {
      setIsNfcWriting(false);
    }
  };

  // Toggle online/offline status (for demo purposes)
  const toggleOnlineStatus = () => {
    setIsOnline(!isOnline);
    showNotification(`You are now ${!isOnline ? 'online' : 'offline'}`, 'info');
    
    // If going online, sync pending transactions
    if (!isOnline) {
      const pendingTxs = transactions.filter(tx => tx.status === 'pending');
      
      if (pendingTxs.length > 0) {
        // Simulate blockchain sync
        setTimeout(() => {
          setTransactions(
            transactions.map(tx => tx.status === 'pending' ? { ...tx, status: 'confirmed' } : tx)
          );
          showNotification(`Synced ${pendingTxs.length} pending transactions with blockchain`, 'success');
        }, 2000);
      }
    }
  };

  // Close PIN modal
  const closeModal = () => {
    setShowPinModal(false);
    setPendingTransaction(null);
    setEnteredPin('');
    setPinError(null);
  };

  // Close initialization modal
  const closeInitModal = () => {
    setShowInitModal(false);
    setInitPin('');
    setInitBalance('');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header style={{ backgroundColor: brandColor }} className="text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-6 w-6" />
            <h1 className="text-xl font-bold">NFC Blockchain Pay</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleOnlineStatus}
              className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs ${
                isOnline ? 'bg-green-500' : 'bg-gray-500'
              }`}
            >
              <span>{isOnline ? 'Online' : 'Offline'}</span>
              <RefreshCw className="h-3 w-3" />
            </button>
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('user')}
                className={`px-3 py-1 rounded-md text-sm ${
                  activeTab === 'user' ? 'bg-opacity-30 bg-white' : 'hover:bg-opacity-20 hover:bg-white'
                }`}
              >
                User App
              </button>
              <button
                onClick={() => setActiveTab('vendor')}
                className={`px-3 py-1 rounded-md text-sm ${
                  activeTab === 'vendor' ? 'bg-opacity-30 bg-white' : 'hover:bg-opacity-20 hover:bg-white'
                }`}
              >
                Vendor App
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div 
          className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg max-w-md ${
            notification.type === 'success' ? 'bg-green-100 text-green-800 border-green-300' :
            notification.type === 'error' ? 'bg-red-100 text-red-800 border-red-300' :
            'bg-blue-100 text-blue-800 border-blue-300'
          } border`}
        >
          <div className="flex items-center">
            {notification.type === 'success' && <CheckCircle className="h-5 w-5 mr-2" />}
            {notification.type === 'error' && <XCircle className="h-5 w-5 mr-2" />}
            {notification.type === 'info' && <Shield className="h-5 w-5 mr-2" />}
            <p>{notification.message}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto p-4 md:p-6">
        {/* NFC Support Warning */}
        {nfcSupported === false && (
          <div className="mb-6 bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded-md">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-700">NFC Not Supported</h3>
                <p className="text-sm text-yellow-600">
                  Your browser or device doesn't support Web NFC. Please use Chrome on Android to access all features.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* NFC Tag Info */}
        <section className="mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center">
                <Tag className="h-5 w-5 mr-2" style={{ color: brandColor }} />
                NFC Tag
              </h2>
              <button
                onClick={scanNFC}
                disabled={isNfcScanning || !nfcSupported}
                style={{ backgroundColor: isNfcScanning || !nfcSupported ? undefined : brandColor }}
                className={`flex items-center space-x-1 px-3 py-1 rounded-md text-white ${
                  isNfcScanning || !nfcSupported ? 'bg-gray-400 cursor-not-allowed' : 'hover:bg-opacity-90'
                }`}
              >
                <Smartphone className="h-4 w-4 mr-1" />
                <span>{isNfcScanning ? 'Scanning...' : 'Scan NFC'}</span>
              </button>
            </div>
            
            {nfcTag ? (
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Tag ID</p>
                    <p className="font-mono text-sm">{nfcTag.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Balance</p>
                    <p className="text-xl font-bold" style={{ color: brandColor }}>${nfcTag.balance.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Updated</p>
                    <p className="text-sm">{new Date(nfcTag.lastUpdated).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Transactions</p>
                    <p className="text-sm">{nfcTag.transactions.length} recorded</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-md text-center text-gray-500">
                <p>No NFC tag detected. Click "Scan NFC" to detect a tag.</p>
              </div>
            )}
          </div>
        </section>

        {/* User App Interface */}
        {activeTab === 'user' && (
          <section className="mb-6">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Wallet className="h-5 w-5 mr-2" style={{ color: brandColor }} />
                User App - Load Money
              </h2>
              
              <div className="mb-4">
                <label htmlFor="loadAmount" className="block text-sm font-medium text-gray-700 mb-1">
                  Amount to Load
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">$</span>
                    </div>
                    <input
                      type="number"
                      id="loadAmount"
                      value={loadAmount}
                      onChange={(e) => setLoadAmount(e.target.value)}
                      placeholder="0.00"
                      className="block w-full pl-7 pr-12 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <button
                    onClick={loadMoneyToTag}
                    disabled={!nfcTag || isNfcWriting || !nfcSupported}
                    style={{ backgroundColor: !nfcTag || isNfcWriting || !nfcSupported ? undefined : brandColor }}
                    className={`px-4 py-2 rounded-md text-white ${
                      !nfcTag || isNfcWriting || !nfcSupported ? 'bg-gray-400 cursor-not-allowed' : 'hover:bg-opacity-90'
                    }`}
                  >
                    {isNfcWriting ? (
                      <span className="flex items-center">
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        Writing...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Save className="h-4 w-4 mr-1" />
                        Load Money
                      </span>
                    )}
                  </button>
                </div>
                {!nfcTag && (
                  <p className="mt-1 text-sm text-red-600">Please scan an NFC tag first</p>
                )}
              </div>
              
              <div className="bg-purple-50 p-4 rounded-md">
                <h3 className="text-sm font-medium mb-2" style={{ color: brandColor }}>How it works:</h3>
                <ol className="text-sm list-decimal pl-5 space-y-1" style={{ color: `${brandColor}CC` }}>
                  <li>Scan your NFC tag using the "Scan NFC" button</li>
                  <li>Enter the amount you want to load</li>
                  <li>Click "Load Money" to add funds to your NFC tag</li>
                  <li>Your balance is securely stored on the NFC tag</li>
                  <li>Use your tag for offline payments at any vendor</li>
                </ol>
              </div>
            </div>
          </section>
        )}

        {/* Vendor App Interface */}
        {activeTab === 'vendor' && (
          <section className="mb-6">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2" style={{ color: brandColor }} />
                Vendor App - Process Payment
              </h2>
              
              <div className="mb-4">
                <label htmlFor="transactionAmount" className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction Amount
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">$</span>
                    </div>
                    <input
                      type="number"
                      id="transactionAmount"
                      value={transactionAmount}
                      onChange={(e) => setTransactionAmount(e.target.value)}
                      placeholder="0.00"
                      className="block w-full pl-7 pr-12 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <button
                    onClick={initiateTransaction}
                    disabled={!nfcTag || isNfcWriting || !nfcSupported}
                    style={{ backgroundColor: !nfcTag || isNfcWriting || !nfcSupported ? undefined : brandColor }}
                    className={`px-4 py-2 rounded-md text-white ${
                      !nfcTag || isNfcWriting || !nfcSupported ? 'bg-gray-400 cursor-not-allowed' : 'hover:bg-opacity-90'
                    }`}
                  >
                    Charge
                  </button>
                </div>
                {!nfcTag && (
                  <p className="mt-1 text-sm text-red-600">Please scan customer's NFC tag first</p>
                )}
              </div>
              
              <div className="bg-purple-50 p-4 rounded-md">
                <h3 className="text-sm font-medium mb-2" style={{ color: brandColor }}>Vendor Instructions:</h3>
                <ol className="text-sm list-decimal pl-5 space-y-1" style={{ color: `${brandColor}CC` }}>
                  <li>Scan customer's NFC tag using the "Scan NFC" button</li>
                  <li>Enter the transaction amount</li>
                  <li>Click "Charge" to initiate the transaction</li>
                  <li>Customer will need to enter their PIN to authorize</li>
                  <li>After PIN verification, the amount will be deducted from the NFC tag</li>
                  <li>Transaction will be processed offline and synced when online</li>
                </ol>
              </div>
            </div>
          </section>
        )}

        {/* Transaction History */}
        <section>
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <History className="h-5 w-5 mr-2" style={{ color: brandColor }} />
              Transaction History
            </h2>
            
            {transactions.length === 0 ? (
              <p className="text-gray-500 italic text-center py-4">No transactions yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{tx.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: brandColor }}>
                          ${tx.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(tx.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            tx.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* PIN Verification Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Lock className="h-5 w-5 mr-2" style={{ color: brandColor }} />
                PIN Verification
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-2">
                Please enter your 4-digit PIN to authorize payment of ${pendingTransaction?.amount.toFixed(2)}.
              </p>
              <input
                type="password"
                value={enteredPin}
                onChange={handlePinChange}
                placeholder="Enter 4-digit PIN"
                className={`w-full p-2 border rounded-md focus:ring-2 focus:border-indigo-500 ${
                  pinError ? 'border-red-300 focus:ring-red-200' : `border-gray-300 focus:ring-${brandColor}20`
                }`}
                maxLength={4}
              />
              {pinError && (
                <p className="mt-1 text-sm text-red-600">{pinError}</p>
              )}
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={verifyPin}
                disabled={enteredPin.length !== 4}
                style={{ backgroundColor: enteredPin.length === 4 ? brandColor : undefined }}
                className={`px-4 py-2 rounded-md text-white ${
                  enteredPin.length === 4
                    ? 'hover:bg-opacity-90'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Initialize NFC Tag Modal */}
      {showInitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Tag className="h-5 w-5 mr-2" style={{ color: brandColor }} />
                Initialize NFC Tag
              </h3>
              <button onClick={closeInitModal} className="text-gray-500 hover:text-gray-700">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4 mb-4">
              <p className="text-gray-600">
                This NFC tag needs to be set up before use. Please provide the following information:
              </p>
              
              <div>
                <label htmlFor="initBalance" className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Balance
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    type="number"
                    id="initBalance"
                    value={initBalance}
                    onChange={(e) => setInitBalance(e.target.value)}
                    placeholder="0.00"
                    className="block w-full pl-7 pr-12 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="initPin" className="block text-sm font-medium text-gray-700 mb-1">
                  Set 4-Digit PIN
                </label>
                <input
                  type="password"
                  id="initPin"
                  value={initPin}
                  onChange={handleInitPinChange}
                  placeholder="Enter 4-digit PIN"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  maxLength={4}
                />
                <p className="mt-1 text-xs text-gray-500">
                  This PIN will be required for all future transactions with this tag.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={closeInitModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={initializeTag}
                disabled={initPin.length !== 4 || !initBalance || isNfcWriting}
                style={{ backgroundColor: initPin.length === 4 && initBalance && !isNfcWriting ? brandColor : undefined }}
                className={`px-4 py-2 rounded-md text-white ${
                  initPin.length === 4 && initBalance && !isNfcWriting
                    ? 'hover:bg-opacity-90'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {isNfcWriting ? (
                  <span className="flex items-center">
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    Initializing...
                  </span>
                ) : (
                  "Initialize Tag"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NFC Writing Overlay */}
      {isNfcWriting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center">
            <RefreshCw className="h-10 w-10 animate-spin mb-4" style={{ color: brandColor }} />
            <p className="text-lg font-medium">Writing to NFC Tag...</p>
            <p className="text-sm text-gray-500 mt-2">Please keep the tag near the device</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
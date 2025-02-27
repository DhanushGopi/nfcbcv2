// NFC Tag Utilities
// This file contains functions for interacting with physical NFC tags

// NFC NDEF Record format for our application
export interface NFCData {
    balance: number;
    pin: string; // Encrypted PIN (in a real app, this would be properly hashed)
    lastUpdated: number;
    transactions: string[]; // Transaction hashes
    id: string;
  }
  
  // Function to read data from NFC tag
  export const readNFCTag = (): Promise<NFCData | null> => {
    return new Promise((resolve, reject) => {
      if (!('NDEFReader' in window)) {
        reject(new Error('Web NFC is not supported in this browser'));
        return;
      }
  
      const reader = new (window as any).NDEFReader();
      
      reader.scan()
        .then(() => {
          console.log("Scan started successfully");
          
          reader.addEventListener("reading", ({ message }: any) => {
            // Process NDEF message
            for (const record of message.records) {
              if (record.recordType === "text") {
                const textDecoder = new TextDecoder();
                const text = textDecoder.decode(record.data);
                
                try {
                  // Parse the JSON data from the NFC tag
                  const nfcData: NFCData = JSON.parse(text);
                  resolve(nfcData);
                  return;
                } catch (error) {
                  console.error("Error parsing NFC data:", error);
                  reject(new Error("Invalid data format on NFC tag"));
                  return;
                }
              }
            }
            
            // If we get here, we didn't find a text record
            reject(new Error("No valid data found on NFC tag"));
          });
          
          // Add error listener
          reader.addEventListener("error", (error: any) => {
            console.error(`Error reading NFC: ${error.message}`);
            reject(error);
          });
        })
        .catch((error: any) => {
          console.error(`Error starting NFC scan: ${error.message}`);
          reject(error);
        });
    });
  };
  
  // Function to write data to NFC tag
  export const writeNFCTag = (data: NFCData): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!('NDEFReader' in window)) {
        reject(new Error('Web NFC is not supported in this browser'));
        return;
      }
  
      const writer = new (window as any).NDEFReader();
      
      // Convert data to JSON string
      const jsonData = JSON.stringify(data);
      
      // Create NDEF message
      const ndefMessage = {
        records: [{
          recordType: "text",
          data: jsonData
        }]
      };
      
      // Write to NFC tag
      writer.write(ndefMessage)
        .then(() => {
          console.log("Data written to NFC tag successfully");
          resolve();
        })
        .catch((error: any) => {
          console.error(`Error writing to NFC tag: ${error.message}`);
          reject(error);
        });
    });
  };
  
  // Function to create a new NFC tag with initial data
  export const initializeNFCTag = (initialBalance: number, pin: string): Promise<NFCData> => {
    const newTagData: NFCData = {
      balance: initialBalance,
      pin: pin, // In a real app, this would be properly hashed
      lastUpdated: Date.now(),
      transactions: [],
      id: `nfc-tag-${Date.now()}`
    };
    
    return writeNFCTag(newTagData).then(() => newTagData);
  };
  
  // Function to verify PIN
  export const verifyPIN = (tagData: NFCData, enteredPin: string): boolean => {
    // In a real app, you would use proper cryptographic verification
    return tagData.pin === enteredPin;
  };
  
  // Function to update balance on NFC tag
  export const updateNFCTagBalance = (
    tagData: NFCData, 
    newBalance: number, 
    transactionHash?: string
  ): Promise<NFCData> => {
    const updatedData: NFCData = {
      ...tagData,
      balance: newBalance,
      lastUpdated: Date.now(),
      transactions: transactionHash 
        ? [...tagData.transactions, transactionHash]
        : tagData.transactions
    };
    
    return writeNFCTag(updatedData).then(() => updatedData);
  };
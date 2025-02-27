/// <reference types="vite/client" />

// Add Web NFC API types
interface NDEFMessage {
    records: NDEFRecord[];
  }
  
  interface NDEFRecord {
    recordType: string;
    mediaType?: string;
    id?: string;
    data?: any;
    encoding?: string;
    lang?: string;
  }
  
  interface NDEFReaderEventMap {
    reading: NDEFReadingEvent;
    error: Event;
  }
  
  interface NDEFReadingEvent extends Event {
    message: NDEFMessage;
    serialNumber: string;
  }
  
  interface NDEFReader extends EventTarget {
    scan(): Promise<void>;
    write(message: NDEFMessage | string): Promise<void>;
    addEventListener<K extends keyof NDEFReaderEventMap>(
      type: K,
      listener: (this: NDEFReader, ev: NDEFReaderEventMap[K]) => any,
      options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener<K extends keyof NDEFReaderEventMap>(
      type: K,
      listener: (this: NDEFReader, ev: NDEFReaderEventMap[K]) => any,
      options?: boolean | EventListenerOptions
    ): void;
    removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ): void;
  }
  
  interface Window {
    NDEFReader: {
      prototype: NDEFReader;
      new(): NDEFReader;
    };
  }
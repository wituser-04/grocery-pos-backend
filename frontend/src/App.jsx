import { useState, useCallback, useRef } from 'react';
import './App.css';

function App() {
  const [cartItems, setCartItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Auto-calculate grand total
  const grandTotal = useCallback(() => {
    return cartItems.reduce((total, item) => total + (item.quantity * item.rate || item.total || 0), 0).toFixed(2);
  }, [cartItems]);

  const addToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.productName === product.productName);
      if (existing) {
        return prev.map(item =>
          item.productName === product.productName
            ? { ...item, quantity: item.quantity + product.quantity }
            : item
        );
      }
      return [...prev, { ...product, rate: product.price_per_unit }];
    });
  };

  const removeFromCart = (index) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    console.log('Searching:', searchQuery);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const arrayBuffer = await audioBlob.arrayBuffer();

        // Process audio via IPC
        setIsProcessing(true);
        try {
          if (window.api?.processAudio) {
            const result = await window.api.processAudio(arrayBuffer);
            if (result.success) {
              addToCart(result);
              setVoiceText('✅ Added to cart!');
            } else {
              alert(result.error || 'Processing failed');
            }
          }
        } catch (error) {
          console.error('Audio IPC error:', error);
          alert('Error processing audio');
        } finally {
          setIsProcessing(false);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Mic access error:', error);
      alert('Microphone access denied');
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>POS Billing</h1>
      </header>

      <div className="split-layout">
        {/* Cart */}
        <div className="cart-section">
          <h2>Cart ({cartItems.length})</h2>
          <table className="cart-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {cartItems.map((item, index) => (
                <tr key={index}>
                  <td>{item.productName} ({item.unit})</td>
                  <td>{item.quantity}</td>
                  <td>${item.rate?.toFixed(2) || '0.00'}</td>
                  <td>${(item.quantity * (item.rate || 0)).toFixed(2)}</td>
                  <td><button className="remove-btn" onClick={() => removeFromCart(index)}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="grand-total">
            <strong>Grand Total: ${grandTotal()}</strong>
          </div>
        </div>

        {/* Controls */}
        <div className="controls-section">
          <h2>Add Items</h2>
          
          <form onSubmit={handleSearch} className="search-form">
            <input
              placeholder="Manual search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit">Search</button>
          </form>

          <div className="voice-section">
            <button
              className={`mic-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
              onClick={toggleRecording}
              disabled={isProcessing}
            >
              {isProcessing ? '⏳ Processing...' : isRecording ? '⏹ Stop Recording' : '🎤 Record Voice'}
            </button>
            {voiceText && (
              <div className="voice-text">
                {voiceText}
              </div>
            )}
            <p>Click record, speak shopping items, click stop</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;


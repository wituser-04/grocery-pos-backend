import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';

// REPLACE THIS with your actual Render URL (Keep the /process-audio at the end)
const SERVER_URL = 'https://grocery-pos-api.onrender.com/process-audio'; 

export default function App() {
  const [cartItems, setCartItems] = useState([]);
  const [recording, setRecording] = useState();
  const [isProcessing, setIsProcessing] = useState(false);
  const [grandTotal, setGrandTotal] = useState(0);

  // Request Microphone Permissions on Startup
  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need microphone access to process your voice orders!');
      }
    })();
  }, []);

  // Calculate Grand Total
  useEffect(() => {
    const newTotal = cartItems.reduce((sum, item) => sum + (item.total || 0), 0);
    setGrandTotal(newTotal);
  }, [cartItems]);

  async function startRecording() {
    try {
      // Required for iOS/Android audio settings
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      console.log('🎤 Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Could not start recording. Check permissions.');
    }
  }

  async function stopRecording() {
    setIsProcessing(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('📱 Audio saved locally at:', uri);

      // Prepare the file for the Cloud Server
      const formData = new FormData();
      formData.append('audio', {
        uri: uri,
        type: 'audio/m4a', // Standard for mobile recordings
        name: 'voice.m4a',
      });

      console.log('☁️ Sending to Render...');
      const response = await fetch(SERVER_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = await response.json();
      console.log('Server response:', result);

      if (result.success) {
        setCartItems(prev => [...prev, result]);
      } else {
        Alert.alert('Product Not Found', result.error || 'Could not find that item in the database.');
      }
    } catch (error) {
      console.error('Cloud Processing Error:', error);
      Alert.alert('Connection Error', 'Server is waking up or internet is down. Try again in 10 seconds.');
    } finally {
      setIsProcessing(false);
      setRecording(undefined);
    }
  }

  const renderCartItem = ({ item, index }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.productName}</Text>
        <Text style={styles.itemSubtext}>{item.quantity} {item.unit} @ ₹{item.price_per_unit}</Text>
      </View>
      <Text style={styles.itemTotal}>₹{item.total.toFixed(2)}</Text>
      <TouchableOpacity 
        style={styles.removeBtn}
        onPress={() => setCartItems(prev => prev.filter((_, i) => i !== index))}
      >
        <Text style={styles.removeText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛒 RGVB Mobile POS</Text>
        <Text style={styles.statusText}>Connected to Cloud Brain</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.recordButton,
            (recording || isProcessing) && styles.recordingButton
          ]}
          onPress={recording ? stopRecording : startRecording}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="large" color="white" />
          ) : (
            <Text style={styles.recordButtonText}>
              {recording ? '⏹ Stop & Process' : '🎤 Tap to Speak'}
            </Text>
          )}
        </TouchableOpacity>
        {isProcessing && <Text style={styles.loadingText}>AI is thinking...</Text>}
      </View>

      <FlatList
        data={cartItems}
        renderItem={renderCartItem}
        keyExtractor={(_, index) => index.toString()}
        style={styles.cartList}
        ListEmptyComponent={<Text style={styles.emptyText}>Start speaking to add items!</Text>}
      />

      <View style={styles.footer}>
        <Text style={styles.totalLabel}>Total Amount</Text>
        <Text style={styles.grandTotal}>₹{grandTotal.toFixed(2)}</Text>
        <TouchableOpacity 
          style={styles.checkoutBtn}
          onPress={() => Alert.alert('Success', 'Bill Printed & Saved!')}
        >
          <Text style={styles.checkoutText}>GENERATE BILL</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  header: { marginTop: 40, marginBottom: 20, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#2d3436' },
  statusText: { fontSize: 12, color: '#11998e', fontWeight: 'bold' },
  buttonContainer: { alignItems: 'center', marginVertical: 20 },
  recordButton: { 
    backgroundColor: '#11998e', 
    paddingHorizontal: 50, 
    paddingVertical: 20, 
    borderRadius: 35,
    flexDirection: 'row',
    alignItems: 'center'
  },
  recordingButton: { backgroundColor: '#d63031' },
  recordButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  loadingText: { marginTop: 10, color: '#636e72', fontStyle: 'italic' },
  cartList: { flex: 1 },
  cartItem: { 
    backgroundColor: 'white', 
    flexDirection: 'row', 
    padding: 15, 
    marginVertical: 6, 
    borderRadius: 15,
    alignItems: 'center',
    elevation: 2
  },
  itemInfo: { flex: 2 },
  itemName: { fontSize: 16, fontWeight: 'bold' },
  itemSubtext: { fontSize: 14, color: '#636e72' },
  itemTotal: { fontSize: 16, fontWeight: 'bold', color: '#11998e', marginRight: 10 },
  removeBtn: { backgroundColor: '#fab1a0', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  removeText: { color: '#d63031', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 100, color: '#b2bec3', fontSize: 16 },
  footer: { backgroundColor: 'white', padding: 20, borderRadius: 20, elevation: 10 },
  totalLabel: { textAlign: 'center', color: '#636e72', fontSize: 14 },
  grandTotal: { textAlign: 'center', fontSize: 36, fontWeight: 'bold', color: '#2d3436', marginVertical: 10 },
  checkoutBtn: { backgroundColor: '#11998e', padding: 15, borderRadius: 12, alignItems: 'center' },
  checkoutText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
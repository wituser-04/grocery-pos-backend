import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';

const SERVER_URL = 'http://YOUR-PC-IP:3000/process-audio'; // Replace with your PC IP

export default function App() {
  const [cartItems, setCartItems] = useState([]);
  const [recording, setRecording] = useState();
  const [isProcessing, setIsProcessing] = useState(false);
  const [grandTotal, setGrandTotal] = useState(0);

  useEffect(() => {
    const newTotal = cartItems.reduce((sum, item) => sum + item.total, 0);
    setGrandTotal(newTotal);
  }, [cartItems]);

  async function startRecording() {
    try {
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      console.log('🎤 Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Could not start recording');
    }
  }

  async function stopRecording() {
    setIsProcessing(true);
    try {
      await recording.stopAndUnloadingAsync();
      const uri = recording.getURI();
      console.log('📱 Audio saved:', uri);

      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/webm',
        name: 'voice.webm',
      } as any);

      const response = await fetch(SERVER_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = await response.json();
      console.log('Server response:', result);

      if (result.success) {
        setCartItems(prev => [...prev, result]);
        Alert.alert('Success', `Added ${result.quantity} ${result.productName}`);
      } else {
        Alert.alert('Error', result.error || 'Processing failed');
      }
    } catch (error) {
      console.error('Processing error:', error);
      Alert.alert('Error', 'Failed to process audio');
    } finally {
      setIsProcessing(false);
      setRecording(undefined);
    }
  }

  const renderCartItem = ({ item, index }) => (
    <View style={styles.cartItem}>
      <Text style={styles.itemName}>{item.productName} ({item.unit})</Text>
      <Text style={styles.itemDetails}>
        Qty: {item.quantity} × ₹{item.price_per_unit} = ₹{item.total.toFixed(2)}
      </Text>
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
      <Text style={styles.title}>🛒 Grocery POS Cart</Text>
      
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
              {recording ? '⏹ Stop & Process' : '🎤 Record Voice'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={cartItems}
        renderItem={renderCartItem}
        keyExtractor={(_, index) => index.toString()}
        style={styles.cartList}
        ListEmptyComponent={<Text style={styles.emptyText}>No items in cart</Text>}
      />

      <View style={styles.totalContainer}>
        <Text style={styles.grandTotal}>₹{grandTotal.toFixed(2)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  buttonContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordButton: {
    backgroundColor: '#11998e',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordingButton: {
    backgroundColor: '#ff4757',
  },
  recordButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cartList: {
    flex: 1,
  },
  cartItem: {
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 2,
  },
  itemDetails: {
    fontSize: 16,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
  removeBtn: {
    backgroundColor: '#ff4757',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
    marginTop: 50,
  },
  totalContainer: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  grandTotal: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#11998e',
  },
});



// screens/LogActivityScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { auth, db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

// Mapping for category/activity to Climatiq IDs
const activityMap = {
  Transport: 'passenger_vehicle-vehicle_type_car-fuel_source_na-distance_na-engine_size_na',
  Flight: 'aircraft_type_jet-distance_long-haul-class_economy',
  Waste: 'waste_type_mixed-disposal_landfill',
  Water: 'water_supply-na',
  Electricity: 'electricity-energy_source_grid_mix-location_in',
  Food: 'food_beverage-type_diet_omnivore',
  Clothing: 'clothing-general_na',
  Paper: 'paper-type_na',
  Delivery: 'delivery_type_standard-distance_na',
};

async function estimateCarbonFromActivity(category, distance) {
  const activity_id = activityMap[category] || activityMap.Transport;

  const response = await fetch('https://api.climatiq.io/estimate', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer JWEW3X0ZCS5435AVZDFJAXC1MR',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      emission_factor: {
        activity_id,
        data_version: '23.23',
      },
      parameters: {
        distance: Number(distance) || 5,
        distance_unit: 'km',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Climatiq API Error:', response.status, errorText);
    throw new Error('Failed to estimate carbon');
  }

  const data = await response.json();
  return data.co2e || 0;
}

export default function LogActivityScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Transport');
  const [desc, setDesc] = useState('');
  const [distance, setDistance] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [co2Result, setCo2Result] = useState(null);

  const [user] = useAuthState(auth);
  const userId = user ? user.uid : 'demoUserId';

  const handleSubmit = async () => {
    try {
      const carbonImpact = await estimateCarbonFromActivity(category, distance);

      await addDoc(collection(db, 'activities'), {
        title,
        category,
        desc,
        distance: Number(distance),
        co2: carbonImpact,
        createdAt: serverTimestamp(),
        userId,
      });

      const walletRef = doc(db, 'users', userId);
      await setDoc(walletRef, {
        wallet: {
          nonCarbonCredits: 10,
          carbonCredits: carbonImpact > 0 ? 1 : 0,
        },
      }, { merge: true });

      setCo2Result(carbonImpact);
      setModalVisible(true);
    } catch (error) {
      console.error('Error logging activity:', error);
      Alert.alert('Error', 'Failed to log activity.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Log Sustainability Activity</Text>
      <TextInput style={styles.input} placeholder="Activity Title" value={title} onChangeText={setTitle} />
      <Picker
        selectedValue={category}
        onValueChange={(itemValue) => setCategory(itemValue)}
        style={styles.picker}
      >
        {Object.keys(activityMap).map((cat) => (
          <Picker.Item key={cat} label={cat} value={cat} />
        ))}
      </Picker>
      <TextInput style={styles.input} placeholder="Distance in KM" value={distance} onChangeText={setDistance} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Description" value={desc} onChangeText={setDesc} multiline />
      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Calculate & Submit</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Carbon Estimation</Text>
            <Text style={{ marginVertical: 10 }}>Estimated CO₂: {co2Result} kg</Text>
            <TouchableOpacity onPress={() => {
              setModalVisible(false);
              navigation.goBack();
            }} style={styles.closeButton}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginBottom: 15, padding: 10 },
  picker: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginBottom: 15 },
  button: { backgroundColor: '#28a745', padding: 12, borderRadius: 5 },
  buttonText: { color: 'white', textAlign: 'center' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 10, alignItems: 'center' },
  closeButton: { backgroundColor: '#28a745', padding: 10, marginTop: 15, borderRadius: 5 },
});

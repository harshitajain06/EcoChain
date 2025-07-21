import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function OnboardingScreen({ navigation }) {
  const [role, setRole] = useState('');
  const [name, setName] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EcoChain</Text>
      <TextInput style={styles.input} placeholder="Enter your name" onChangeText={setName} value={name} />
      <TextInput style={styles.input} placeholder="Select your role (Student/Teacher/Admin)" onChangeText={setRole} value={role} />
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Dashboard')}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 28, marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
  input: { borderWidth: 1, marginVertical: 10, padding: 10, borderRadius: 5 },
  button: { backgroundColor: '#0066cc', padding: 12, borderRadius: 5 },
  buttonText: { color: 'white', textAlign: 'center', fontSize: 16 }
});

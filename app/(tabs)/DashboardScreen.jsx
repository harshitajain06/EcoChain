import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export default function DashboardScreen({ navigation }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Welcome Back Hrithik</Text>
      <Text style={styles.subtext}>Current Footprint: 2.5 tCO₂ | Target: 2.0 tCO₂</Text>
      <View style={styles.box}>
        <Text style={styles.title}>Upcoming Activities</Text>
        <Text>🌳 Tree Planting Drive - Apr 27</Text>
        <Text>🌊 Beach Cleanup - Apr 28</Text>
      </View>
      <View style={styles.box}>
        <Text style={styles.title}>Credits Wallet</Text>
        <Text>Carbon Credits: 12.3</Text>
        <Text>Non-Carbon Credits: 210</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('LogActivity')}>
        <Text style={styles.buttonText}>Log Activity</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Rewards')}>
        <Text style={styles.buttonText}>View Rewards</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  subtext: { fontSize: 16, marginBottom: 20 },
  box: { backgroundColor: '#eef', padding: 15, borderRadius: 10, marginBottom: 20 },
  title: { fontWeight: 'bold', marginBottom: 5 },
  button: { backgroundColor: '#007acc', padding: 12, borderRadius: 6, marginBottom: 10 },
  buttonText: { color: 'white', textAlign: 'center' }
});

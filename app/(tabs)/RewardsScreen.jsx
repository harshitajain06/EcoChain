import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function RewardsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Rewards</Text>
      <Text style={styles.subheader}>Badges:</Text>
      <Text>🏅 Eco Badge</Text>
      <Text>♻️ Waste Reducer</Text>
      <Text style={styles.subheader}>Transaction History:</Text>
      <Text>Eco Badge - Earned 10 credits</Text>
      <Text>Reusable Bottle - Redeemed 26 credits</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 15 },
  subheader: { fontSize: 18, fontWeight: '600', marginTop: 10, marginBottom: 5 }
});

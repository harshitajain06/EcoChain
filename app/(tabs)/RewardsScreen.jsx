import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../config/firebase';

const { width } = Dimensions.get('window');

export default function RewardsScreen() {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchTransactions();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const activitiesQuery = query(
        collection(db, 'activities'),
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(activitiesQuery);
      const activities = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'earned'
      }));
      setTransactions(activities.slice(0, 10)); // Get last 10 activities
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const badges = [
    { id: 1, name: 'Eco Warrior', emoji: '🌱', description: 'First activity logged', earned: true },
    { id: 2, name: 'Carbon Saver', emoji: '♻️', description: 'Saved 10kg CO₂', earned: true },
    { id: 3, name: 'Green Champion', emoji: '🏆', description: 'Saved 50kg CO₂', earned: false },
    { id: 4, name: 'Eco Legend', emoji: '🌟', description: 'Saved 100kg CO₂', earned: false },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={styles.headerSection}>
      <Text style={styles.header}>Rewards</Text>
        <Text style={styles.subtitle}>Your achievements and credits</Text>
      </View>

      {/* Credits Summary */}
      <View style={styles.creditsCard}>
        <Text style={styles.cardTitle}>Your Credits</Text>
        <View style={styles.creditsContainer}>
          <View style={styles.creditItem}>
            <Text style={styles.creditEmoji}>🌱</Text>
            <View style={styles.creditDetails}>
              <Text style={styles.creditLabel}>Carbon Credits</Text>
              <Text style={styles.creditValue}>{userData?.wallet?.carbonCredits || 0}</Text>
            </View>
          </View>
          <View style={styles.creditItem}>
            <Text style={styles.creditEmoji}>⭐</Text>
            <View style={styles.creditDetails}>
              <Text style={styles.creditLabel}>Eco Credits</Text>
              <Text style={styles.creditValue}>{userData?.wallet?.nonCarbonCredits || 0}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Badges Section */}
      <View style={styles.badgesCard}>
        <Text style={styles.cardTitle}>Achievement Badges</Text>
        <View style={styles.badgesGrid}>
          {badges.map((badge) => (
            <View key={badge.id} style={[styles.badgeItem, !badge.earned && styles.badgeLocked]}>
              <Text style={[styles.badgeEmoji, !badge.earned && styles.badgeEmojiLocked]}>
                {badge.earned ? badge.emoji : '🔒'}
              </Text>
              <Text style={[styles.badgeName, !badge.earned && styles.badgeNameLocked]}>
                {badge.name}
              </Text>
              <Text style={[styles.badgeDescription, !badge.earned && styles.badgeDescriptionLocked]}>
                {badge.description}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Transaction History */}
      <View style={styles.transactionsCard}>
        <Text style={styles.cardTitle}>Recent Activity</Text>
        {transactions.length > 0 ? (
          transactions.map((transaction, index) => (
            <View key={transaction.id || index} style={styles.transactionItem}>
              <View style={styles.transactionIcon}>
                <Text style={styles.transactionEmoji}>🌱</Text>
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionTitle}>{transaction.title}</Text>
                <Text style={styles.transactionDate}>
                  {transaction.createdAt?.toDate?.()?.toLocaleDateString() || 'Today'}
                </Text>
              </View>
              <View style={styles.transactionValue}>
                <Text style={styles.transactionCredits}>+{transaction.co2?.toFixed(1) || 0}</Text>
                <Text style={styles.transactionLabel}>credits</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.noTransactions}>
            <Text style={styles.noTransactionsText}>No activities yet</Text>
            <Text style={styles.noTransactionsSubtext}>Start logging activities to earn credits!</Text>
          </View>
        )}
      </View>

      {/* Rewards Store */}
      <View style={styles.storeCard}>
        <Text style={styles.cardTitle}>Rewards Store</Text>
        <View style={styles.storeItems}>
          <View style={styles.storeItem}>
            <Text style={styles.storeEmoji}>🌱</Text>
            <View style={styles.storeDetails}>
              <Text style={styles.storeName}>Plant a Tree</Text>
              <Text style={styles.storePrice}>50 credits</Text>
            </View>
            <TouchableOpacity style={styles.redeemButton}>
              <Text style={styles.redeemButtonText}>Redeem</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.storeItem}>
            <Text style={styles.storeEmoji}>♻️</Text>
            <View style={styles.storeDetails}>
              <Text style={styles.storeName}>Eco Kit</Text>
              <Text style={styles.storePrice}>100 credits</Text>
            </View>
            <TouchableOpacity style={styles.redeemButton}>
              <Text style={styles.redeemButtonText}>Redeem</Text>
            </TouchableOpacity>
          </View>
        </View>
    </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fffe',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fffe',
  },
  loadingText: {
    fontSize: 16,
    color: '#2d5a27',
  },
  headerSection: {
    backgroundColor: '#2d5a27',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#a8d5a8',
  },
  creditsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: -15,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d5a27',
    marginBottom: 15,
  },
  creditsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  creditItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8f0',
    padding: 15,
    borderRadius: 15,
    flex: 1,
    marginHorizontal: 5,
  },
  creditEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  creditDetails: {
    flex: 1,
  },
  creditLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  creditValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d5a27',
  },
  badgesCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  badgeItem: {
    width: (width - 80) / 2,
    backgroundColor: '#f0f8f0',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  badgeLocked: {
    backgroundColor: '#f5f5f5',
  },
  badgeEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  badgeEmojiLocked: {
    opacity: 0.5,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d5a27',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeNameLocked: {
    color: '#999',
  },
  badgeDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  badgeDescriptionLocked: {
    color: '#ccc',
  },
  transactionsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f5e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  transactionEmoji: {
    fontSize: 20,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
  },
  transactionValue: {
    alignItems: 'flex-end',
  },
  transactionCredits: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  transactionLabel: {
    fontSize: 12,
    color: '#666',
  },
  noTransactions: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noTransactionsText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  noTransactionsSubtext: {
    fontSize: 14,
    color: '#999',
  },
  storeCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  storeItems: {
    gap: 15,
  },
  storeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 15,
  },
  storeEmoji: {
    fontSize: 24,
    marginRight: 15,
  },
  storeDetails: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  storePrice: {
    fontSize: 14,
    color: '#666',
  },
  redeemButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  redeemButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

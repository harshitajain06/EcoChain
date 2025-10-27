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
  const [activities, setActivities] = useState([]);
  const [rewardsEarned, setRewardsEarned] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchTransactions();
      fetchActivities();
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

  const fetchActivities = async () => {
    try {
      const activitiesQuery = query(
        collection(db, 'activities'),
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(activitiesQuery);
      const activitiesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActivities(activitiesData);
      calculateRewards(activitiesData);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const calculateRewards = (activitiesData) => {
    const rewards = [];
    let totalCo2Saved = 0;
    let totalActivities = activitiesData.length;
    let totalHours = 0;
    let groupActivities = 0;
    let totalCreditsEarned = 0;

    activitiesData.forEach(activity => {
      totalCo2Saved += activity.co2 || 0;
      totalHours += activity.hoursSpent || activity.duration || 0;
      if (activity.isGroupActivity) groupActivities++;
    });

    // Calculate badges based on achievements
    const badges = calculateBadges(totalCo2Saved, totalActivities, totalHours, groupActivities);
    
    // Calculate rewards earned
    const carbonCredits = Math.floor(totalCo2Saved);
    const ecoCredits = Math.floor(totalActivities * 5 + totalHours * 2);
    
    // Calculate total credits from all sources
    totalCreditsEarned = carbonCredits + ecoCredits;
    
    // Add badge credits to total
    badges.forEach(badge => {
      if (badge.earned) {
        totalCreditsEarned += badge.credits || 0;
      }
    });
    
    rewards.push({
      id: 'carbon_credits',
      type: 'credits',
      name: 'Carbon Credits',
      emoji: '🌱',
      amount: carbonCredits,
      description: `Earned from saving ${totalCo2Saved.toFixed(1)}kg CO₂`
    });

    rewards.push({
      id: 'eco_credits',
      type: 'credits',
      name: 'Eco Credits',
      emoji: '⭐',
      amount: ecoCredits,
      description: `Earned from ${totalActivities} activities and ${totalHours.toFixed(1)} hours`
    });

    // Add badge rewards
    badges.forEach(badge => {
      if (badge.earned) {
        rewards.push({
          id: `badge_${badge.id}`,
          type: 'badge',
          name: badge.name,
          emoji: badge.emoji,
          description: badge.description,
          credits: badge.credits || 0
        });
      }
    });

    // Add total credits reward
    rewards.push({
      id: 'total_credits',
      type: 'total',
      name: 'Total Credits Earned',
      emoji: '🏆',
      amount: totalCreditsEarned,
      description: `All credits from activities, badges, and achievements`
    });

    setRewardsEarned(rewards);
  };

  const calculateBadges = (totalCo2, totalActivities, totalHours, groupActivities) => {
    return [
      { 
        id: 1, 
        name: 'Eco Warrior', 
        emoji: '🌱', 
        description: 'First activity logged', 
        earned: totalActivities >= 1,
        credits: 10
      },
      { 
        id: 2, 
        name: 'Carbon Saver', 
        emoji: '♻️', 
        description: 'Saved 10kg CO₂', 
        earned: totalCo2 >= 10,
        credits: 25
      },
      { 
        id: 3, 
        name: 'Green Champion', 
        emoji: '🏆', 
        description: 'Saved 50kg CO₂', 
        earned: totalCo2 >= 50,
        credits: 50
      },
      { 
        id: 4, 
        name: 'Eco Legend', 
        emoji: '🌟', 
        description: 'Saved 100kg CO₂', 
        earned: totalCo2 >= 100,
        credits: 100
      },
      { 
        id: 5, 
        name: 'Time Keeper', 
        emoji: '⏰', 
        description: 'Logged 50+ hours', 
        earned: totalHours >= 50,
        credits: 30
      },
      { 
        id: 6, 
        name: 'Team Player', 
        emoji: '👥', 
        description: '5+ group activities', 
        earned: groupActivities >= 5,
        credits: 20
      },
      { 
        id: 7, 
        name: 'Consistent Saver', 
        emoji: '📈', 
        description: '20+ activities logged', 
        earned: totalActivities >= 20,
        credits: 40
      },
      { 
        id: 8, 
        name: 'Eco Master', 
        emoji: '🎖️', 
        description: 'Saved 200kg CO₂', 
        earned: totalCo2 >= 200,
        credits: 150
      }
    ];
  };

  // Get dynamic badges based on user activities
  const getDynamicBadges = () => {
    if (activities.length === 0) return [];
    
    let totalCo2Saved = 0;
    let totalActivities = activities.length;
    let totalHours = 0;
    let groupActivities = 0;

    activities.forEach(activity => {
      totalCo2Saved += activity.co2 || 0;
      totalHours += activity.hoursSpent || activity.duration || 0;
      if (activity.isGroupActivity) groupActivities++;
    });

    return calculateBadges(totalCo2Saved, totalActivities, totalHours, groupActivities);
  };

  const badges = getDynamicBadges();

  const getStoreItems = () => {
    const walletCredits = (userData?.wallet?.carbonCredits || 0) + (userData?.wallet?.nonCarbonCredits || 0);
    const earnedCredits = rewardsEarned.find(r => r.id === 'total_credits')?.amount || 0;
    const totalCredits = Math.max(walletCredits, earnedCredits);
    
    return [
      {
        id: 'tree_planting',
        name: 'Plant a Tree',
        emoji: '🌱',
        price: 50,
        description: 'We\'ll plant a tree in your name',
        canRedeem: totalCredits >= 50
      },
      {
        id: 'eco_kit',
        name: 'Eco Starter Kit',
        emoji: '♻️',
        price: 100,
        description: 'Reusable water bottle & shopping bag',
        canRedeem: totalCredits >= 100
      },
      {
        id: 'carbon_offset',
        name: 'Carbon Offset Certificate',
        emoji: '📜',
        price: 150,
        description: 'Official certificate for your impact',
        canRedeem: totalCredits >= 150
      },
      {
        id: 'eco_workshop',
        name: 'Eco Workshop Access',
        emoji: '🎓',
        price: 200,
        description: 'Free access to sustainability workshops',
        canRedeem: totalCredits >= 200
      },
      {
        id: 'green_energy',
        name: 'Green Energy Credit',
        emoji: '⚡',
        price: 300,
        description: 'Support renewable energy projects',
        canRedeem: totalCredits >= 300
      },
      {
        id: 'ocean_cleanup',
        name: 'Ocean Cleanup Support',
        emoji: '🌊',
        price: 500,
        description: 'Fund ocean cleanup initiatives',
        canRedeem: totalCredits >= 500
      }
    ];
  };

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
              <Text style={styles.creditValue}>
                {rewardsEarned.find(r => r.id === 'carbon_credits')?.amount || 0}
              </Text>
            </View>
          </View>
          <View style={styles.creditItem}>
            <Text style={styles.creditEmoji}>⭐</Text>
            <View style={styles.creditDetails}>
              <Text style={styles.creditLabel}>Eco Credits</Text>
              <Text style={styles.creditValue}>
                {rewardsEarned.find(r => r.id === 'eco_credits')?.amount || 0}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.totalCreditsContainer}>
          <View style={styles.totalCreditsItem}>
            <Text style={styles.totalCreditsEmoji}>🏆</Text>
            <View style={styles.totalCreditsDetails}>
              <Text style={styles.totalCreditsLabel}>Total Credits Earned</Text>
              <Text style={styles.totalCreditsValue}>
                {rewardsEarned.find(r => r.id === 'total_credits')?.amount || 0}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Rewards Earned Section */}
      <View style={styles.rewardsEarnedCard}>
        <Text style={styles.cardTitle}>Rewards Earned</Text>
        <Text style={styles.rewardsSubtitle}>Based on your logged activities</Text>
        <View style={styles.rewardsList}>
          {rewardsEarned.map((reward) => (
            <View key={reward.id} style={styles.rewardItem}>
              <Text style={styles.rewardEmoji}>{reward.emoji}</Text>
              <View style={styles.rewardDetails}>
                <Text style={styles.rewardName}>{reward.name}</Text>
                <Text style={styles.rewardDescription}>{reward.description}</Text>
                {reward.credits > 0 && (
                  <Text style={styles.rewardCredits}>+{reward.credits} credits</Text>
                )}
              </View>
              {reward.amount && (
                <Text style={styles.rewardAmount}>{reward.amount}</Text>
              )}
            </View>
          ))}
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
              {badge.earned && badge.credits > 0 && (
                <Text style={styles.badgeCredits}>+{badge.credits} credits</Text>
              )}
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
        <Text style={styles.storeSubtitle}>Redeem your earned credits for rewards</Text>
        <View style={styles.storeItems}>
          {getStoreItems().map((item) => (
            <View key={item.id} style={styles.storeItem}>
              <Text style={styles.storeEmoji}>{item.emoji}</Text>
            <View style={styles.storeDetails}>
                <Text style={styles.storeName}>{item.name}</Text>
                <Text style={styles.storePrice}>{item.price} credits</Text>
                <Text style={styles.storeDescription}>{item.description}</Text>
            </View>
              <TouchableOpacity 
                style={[
                  styles.redeemButton, 
                  !item.canRedeem && styles.redeemButtonDisabled
                ]}
                disabled={!item.canRedeem}
              >
                <Text style={[
                  styles.redeemButtonText,
                  !item.canRedeem && styles.redeemButtonTextDisabled
                ]}>
                  {item.canRedeem ? 'Redeem' : 'Need More Credits'}
                </Text>
            </TouchableOpacity>
            </View>
          ))}
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
  totalCreditsContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalCreditsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#ffc107',
  },
  totalCreditsEmoji: {
    fontSize: 28,
    marginRight: 15,
  },
  totalCreditsDetails: {
    flex: 1,
  },
  totalCreditsLabel: {
    fontSize: 16,
    color: '#856404',
    fontWeight: '600',
    marginBottom: 2,
  },
  totalCreditsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffc107',
  },
  rewardsEarnedCard: {
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
  rewardsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  rewardsList: {
    gap: 12,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
  },
  rewardEmoji: {
    fontSize: 24,
    marginRight: 15,
  },
  rewardDetails: {
    flex: 1,
  },
  rewardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  rewardDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  rewardCredits: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '600',
  },
  rewardAmount: {
    fontSize: 18,
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
  badgeCredits: {
    fontSize: 10,
    color: '#4caf50',
    fontWeight: '600',
    marginTop: 4,
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
  storeSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
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
    marginBottom: 2,
  },
  storeDescription: {
    fontSize: 12,
    color: '#999',
  },
  redeemButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  redeemButtonDisabled: {
    backgroundColor: '#ccc',
  },
  redeemButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  redeemButtonTextDisabled: {
    color: '#999',
  },
});

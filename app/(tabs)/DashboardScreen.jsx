import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../config/firebase';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchRecentActivities();
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

  const fetchRecentActivities = async () => {
    try {
      const activitiesQuery = query(
        collection(db, 'activities'),
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(activitiesQuery);
      const activities = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentActivities(activities.slice(0, 3)); // Get last 3 activities
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const calculateProgress = () => {
    const current = 2.5; // This should come from user data
    const target = 2.0;
    return Math.min((current / target) * 100, 100);
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
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.userName}>{user?.displayName || 'Eco Warrior'}</Text>
        <Text style={styles.subtitle}>Let's make today more sustainable</Text>
      </View>

      {/* Profile Completion Prompt */}
      {!userData?.profile?.completedAt && (
        <View style={styles.profilePromptCard}>
          <View style={styles.profilePromptContent}>
            <Text style={styles.profilePromptEmoji}>👤</Text>
            <View style={styles.profilePromptText}>
              <Text style={styles.profilePromptTitle}>Complete Your Profile</Text>
              <Text style={styles.profilePromptSubtitle}>Help us personalize your experience</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.profilePromptButton}
            onPress={() => navigation.getParent()?.navigate('CompleteProfile')}
          >
            <Text style={styles.profilePromptButtonText}>Complete</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Carbon Footprint Card */}
      <View style={styles.footprintCard}>
        <View style={styles.footprintHeader}>
          <Text style={styles.cardTitle}>Carbon Footprint</Text>
          <Text style={styles.footprintValue}>2.5 tCO₂</Text>
        </View>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${calculateProgress()}%` }]} />
          </View>
          <Text style={styles.progressText}>Target: 2.0 tCO₂</Text>
      </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryButton]} 
          onPress={() => navigation.navigate('ActivityLibrary')}
        >
          <Text style={styles.actionButtonText}>📚 Activity Library</Text>
      </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]} 
          onPress={() => navigation.navigate('Rewards')}
        >
          <Text style={styles.actionButtonText}>🏆 Rewards</Text>
      </TouchableOpacity>
      </View>

      {/* Credits Wallet */}
      <View style={styles.walletCard}>
        <Text style={styles.cardTitle}>Credits Wallet</Text>
        <View style={styles.creditsContainer}>
          <View style={styles.creditItem}>
            <Text style={styles.creditLabel}>Carbon Credits</Text>
            <Text style={styles.creditValue}>{userData?.wallet?.carbonCredits || 0}</Text>
          </View>
          <View style={styles.creditItem}>
            <Text style={styles.creditLabel}>Eco Credits</Text>
            <Text style={styles.creditValue}>{userData?.wallet?.nonCarbonCredits || 0}</Text>
          </View>
        </View>
      </View>

      {/* Recent Activities */}
      <View style={styles.activitiesCard}>
        <Text style={styles.cardTitle}>Recent Activities</Text>
        {recentActivities.length > 0 ? (
          recentActivities.map((activity, index) => (
            <View key={activity.id || index} style={styles.activityItem}>
              <Text style={styles.activityTitle}>{activity.title}</Text>
              <Text style={styles.activityCo2}>-{activity.co2?.toFixed(2)} kg CO₂</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noActivities}>No recent activities</Text>
        )}
      </View>

      {/* Upcoming Events */}
      <View style={styles.eventsCard}>
        <Text style={styles.cardTitle}>Upcoming Events</Text>
        <View style={styles.eventItem}>
          <Text style={styles.eventEmoji}>🌳</Text>
          <View style={styles.eventDetails}>
            <Text style={styles.eventTitle}>Tree Planting Drive</Text>
            <Text style={styles.eventDate}>April 27, 2024</Text>
          </View>
        </View>
        <View style={styles.eventItem}>
          <Text style={styles.eventEmoji}>🌊</Text>
          <View style={styles.eventDetails}>
            <Text style={styles.eventTitle}>Beach Cleanup</Text>
            <Text style={styles.eventDate}>April 28, 2024</Text>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    backgroundColor: '#2d5a27',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  greeting: {
    fontSize: 16,
    color: '#a8d5a8',
    marginBottom: 5,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#a8d5a8',
  },
  footprintCard: {
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
  footprintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d5a27',
  },
  footprintValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d5a27',
  },
  progressContainer: {
    marginTop: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e8f5e8',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#4caf50',
  },
  secondaryButton: {
    backgroundColor: '#2196f3',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  walletCard: {
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
  creditsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  creditItem: {
    alignItems: 'center',
  },
  creditLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  creditValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d5a27',
  },
  activitiesCard: {
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
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityTitle: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  activityCo2: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '600',
  },
  noActivities: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  eventsCard: {
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
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  eventEmoji: {
    fontSize: 24,
    marginRight: 15,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
  },
  profilePromptCard: {
    backgroundColor: '#e8f5e8',
    marginHorizontal: 20,
    marginTop: -15,
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  profilePromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profilePromptEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  profilePromptText: {
    flex: 1,
  },
  profilePromptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d5a27',
    marginBottom: 2,
  },
  profilePromptSubtitle: {
    fontSize: 14,
    color: '#4caf50',
  },
  profilePromptButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  profilePromptButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

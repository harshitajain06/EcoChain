import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
    Alert,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, db } from '../../config/firebase';

const categories = ['All', 'Waste', 'Energy', 'Transport', 'Food', 'Water'];
const sortOptions = ['Newest', 'Oldest', 'Most Points', 'Least Points'];

const activityIcons = {
  'Transport': 'bicycle',
  'Waste': 'recycle',
  'Energy': 'flash',
  'Food': 'restaurant',
  'Water': 'water',
  'Flight': 'airplane',
  'Electricity': 'bulb',
  'Recycling': 'recycle',
  'Walking': 'walk',
  'Cycling': 'bicycle',
  'Carpooling': 'car',
  'Public Transport': 'bus',
  'Meat Consumption': 'restaurant',
  'Water Usage': 'water',
  'Default': 'leaf'
};

export default function ActivityLibraryScreen({ navigation }) {
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [user] = useAuthState(auth);
  const userId = user ? user.uid : 'demoUserId';

  useEffect(() => {
    loadActivities();
  }, []);

  useEffect(() => {
    filterAndSortActivities();
  }, [activities, selectedCategory, sortBy, searchQuery]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const activitiesRef = collection(db, 'activities');
      const q = query(
        activitiesRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const activitiesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setActivities(activitiesData);
    } catch (error) {
      console.error('Error loading activities:', error);
      Alert.alert('Error', 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortActivities = () => {
    let filtered = [...activities];

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(activity => 
        activity.category === selectedCategory
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(activity =>
        activity.activityName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort activities
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'Newest':
          return new Date(b.timestamp?.toDate?.() || b.timestamp) - new Date(a.timestamp?.toDate?.() || a.timestamp);
        case 'Oldest':
          return new Date(a.timestamp?.toDate?.() || a.timestamp) - new Date(b.timestamp?.toDate?.() || b.timestamp);
        case 'Most Points':
          return (b.points || 0) - (a.points || 0);
        case 'Least Points':
          return (a.points || 0) - (b.points || 0);
        default:
          return 0;
      }
    });

    setFilteredActivities(filtered);
  };

  const getActivityIcon = (category) => {
    return activityIcons[category] || activityIcons['Default'];
  };

  const getCarbonReduction = (activity) => {
    // Calculate carbon reduction based on activity type and value
    const value = parseFloat(activity.value) || 0;
    let reduction = 0;

    switch (activity.category) {
      case 'Transport':
        if (activity.activityName?.includes('Bike') || activity.activityName?.includes('Cycle')) {
          reduction = value * 0.192; // Assuming 0.192 kg CO2 per km for car vs 0 for bike
        } else if (activity.activityName?.includes('Walk')) {
          reduction = value * 0.192; // Assuming 0.192 kg CO2 per km for car vs 0 for walking
        } else if (activity.activityName?.includes('Public')) {
          reduction = value * 0.103; // Assuming 0.192 - 0.089 = 0.103 kg CO2 per km reduction
        }
        break;
      case 'Waste':
        if (activity.activityName?.includes('Recycling')) {
          reduction = value * 0.5; // Assuming 0.5 kg CO2 per kg waste recycled
        }
        break;
      case 'Energy':
        if (activity.activityName?.includes('Electricity')) {
          reduction = value * 0.4; // Assuming 0.4 kg CO2 per kWh saved
        }
        break;
      case 'Food':
        if (activity.activityName?.includes('Meat')) {
          reduction = value * 7.2; // Assuming 7.2 kg CO2 per day for meat reduction
        }
        break;
      case 'Water':
        if (activity.activityName?.includes('Water')) {
          reduction = value * 0.0003; // Assuming 0.0003 kg CO2 per liter saved
        }
        break;
      default:
        reduction = value * 0.1; // Default calculation
    }

    return Math.round(reduction * 10) / 10; // Round to 1 decimal place
  };

  const getPoints = (activity) => {
    // Calculate points based on carbon reduction
    const carbonReduction = getCarbonReduction(activity);
    return Math.max(10, Math.round(carbonReduction * 5)); // Minimum 10 points, 5 points per kg CO2
  };

  const handleAddToCalendar = (activity) => {
    Alert.alert(
      'Add to Calendar',
      `Would you like to add "${activity.activityName}" to your calendar?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add', onPress: () => {
          // Here you would integrate with calendar functionality
          Alert.alert('Success', 'Activity added to calendar!');
        }}
      ]
    );
  };

  const renderActivityCard = ({ item: activity }) => {
    const carbonReduction = getCarbonReduction(activity);
    const points = getPoints(activity);
    const iconName = getActivityIcon(activity.category);

    return (
      <View style={styles.activityCard}>
        <View style={styles.activityLeft}>
          <View style={styles.activityIcon}>
            <Ionicons name={iconName} size={24} color="white" />
          </View>
          <View style={styles.activityInfo}>
            <Text style={styles.activityTitle}>{activity.activityName}</Text>
            <Text style={styles.activityDescription}>
              {activity.frequency || 'One-time'} • {points} pts
            </Text>
          </View>
        </View>
        
        <View style={styles.activityRight}>
          <View style={styles.carbonTag}>
            <Text style={styles.carbonText}>~{carbonReduction} kg Δ</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddToCalendar(activity)}
          >
            <Text style={styles.addButtonText}>Add to Calendar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCategoryFilter = (category) => (
    <TouchableOpacity
      key={category}
      style={[
        styles.categoryButton,
        selectedCategory === category && styles.selectedCategoryButton
      ]}
      onPress={() => setSelectedCategory(category)}
    >
      <Text style={[
        styles.categoryButtonText,
        selectedCategory === category && styles.selectedCategoryButtonText
      ]}>
        {category}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Activity Library</Text>
        
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#AAAAAA" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search activities"
            placeholderTextColor="#AAAAAA"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map(renderCategoryFilter)}
      </ScrollView>

      {/* Sort Option */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort</Text>
        <TouchableOpacity style={styles.sortButton}>
          <Text style={styles.sortButtonText}>{sortBy}</Text>
          <Ionicons name="chevron-down" size={16} color="white" />
        </TouchableOpacity>
      </View>

      {/* Activities List */}
      <FlatList
        data={filteredActivities}
        renderItem={renderActivityCard}
        keyExtractor={(item) => item.id}
        style={styles.activitiesList}
        contentContainerStyle={styles.activitiesContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="leaf-outline" size={48} color="#4caf50" />
            <Text style={styles.emptyTitle}>No Activities Found</Text>
            <Text style={styles.emptySubtitle}>
              {selectedCategory === 'All' 
                ? 'Start logging activities to see them here!'
                : `No activities found in ${selectedCategory} category`
              }
            </Text>
          </View>
        }
        ListFooterComponent={
          filteredActivities.length > 0 && (
            <TouchableOpacity style={styles.loadMoreButton}>
              <Text style={styles.loadMoreText}>Load more activities</Text>
            </TouchableOpacity>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: 'white',
  },
  categoriesContainer: {
    marginBottom: 20,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryButton: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  selectedCategoryButton: {
    backgroundColor: '#4caf50',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
  selectedCategoryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sortLabel: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  sortButtonText: {
    fontSize: 14,
    color: 'white',
  },
  activitiesList: {
    flex: 1,
  },
  activitiesContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  activityCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#AAAAAA',
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  carbonTag: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  carbonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  addButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '500',
  },
});


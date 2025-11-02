import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { auth, db } from '../../config/firebase';

const categories = ['All', 'Waste', 'Energy', 'Transport', 'Food', 'Water'];
const sortOptions = ['Newest', 'Oldest', 'Most Points', 'Least Points'];

// Predefined activities matching the image exactly
const predefinedActivities = [
  {
    id: '1',
    activityName: 'Bike to School',
    category: 'Transport',
    frequency: '2x per week challenge',
    points: 10,
    carbonReduction: 0.8,
    icon: 'bicycle',
    description: 'Cycle to school twice a week to reduce carbon emissions'
  },
  {
    id: '2',
    activityName: 'Recycling Drive',
    category: 'Waste',
    frequency: '2x per week challenge',
    points: 15,
    carbonReduction: 1.2,
    icon: 'recycle',
    description: 'Participate in recycling drives twice a week'
  },
  {
    id: '3',
    activityName: 'Tree Planting',
    category: 'Energy',
    frequency: '2x per week challenge',
    points: 150,
    carbonReduction: 20,
    icon: 'leaf',
    description: 'Plant trees twice a week to help reduce carbon footprint'
  },
  {
    id: '4',
    activityName: 'Paperless Week',
    category: 'Waste',
    frequency: '2x per week challenge',
    points: 40,
    carbonReduction: 4.0,
    icon: 'document-text',
    description: 'Go paperless for two days each week'
  }
];

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
  const [filteredActivities, setFilteredActivities] = useState(predefinedActivities);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const [user] = useAuthState(auth);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  useEffect(() => {
    filterAndSortActivities();
  }, [selectedCategory, sortBy, searchQuery]);

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

  const filterAndSortActivities = () => {
    let filtered = [...predefinedActivities];

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
          return b.id.localeCompare(a.id);
        case 'Oldest':
          return a.id.localeCompare(b.id);
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

  const getActivityIcon = (activity) => {
    // Use the icon specified in the activity, or fallback to category-based icon
    if (activity.icon) {
      return activity.icon;
    }
    return activityIcons[activity.category] || activityIcons['Default'];
  };

  const handleAddToCalendar = (activity) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to add activities to calendar');
      return;
    }
    
    // Set the selected activity and show calendar modal
    setSelectedActivity(activity);
    setSelectedDate(null);
    setCalendarModalVisible(true);
  };

  const handleDateSelect = (day) => {
    setSelectedDate(day.dateString);
  };

  const handleConfirmAddToCalendar = async () => {
    if (!selectedDate || !selectedActivity) {
      Alert.alert('Error', 'Please select a date');
      return;
    }

    try {
      // Parse the selected date
      const eventDate = new Date(selectedDate);
      
      // Create event in Firestore
      await addDoc(collection(db, 'events'), {
        title: selectedActivity.activityName,
        description: selectedActivity.description || `${selectedActivity.activityName} - ${selectedActivity.frequency}`,
        date: eventDate,
        location: 'TBD',
        schoolName: userData?.profile?.schoolName || 'all',
        specificGrade: userData?.profile?.grade || 'all',
        status: 'upcoming',
        createdAt: new Date(),
        createdBy: user.uid,
        participants: [],
        activityId: selectedActivity.id,
        points: selectedActivity.points,
        carbonReduction: selectedActivity.carbonReduction,
      });

      setCalendarModalVisible(false);
      setSelectedActivity(null);
      setSelectedDate(null);

      Alert.alert(
        'Success', 
        `"${selectedActivity.activityName}" has been added to your calendar! It will appear in your upcoming activities.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error adding activity to calendar:', error);
      Alert.alert('Error', 'Failed to add activity to calendar. Please try again.');
    }
  };

  const handleCancelCalendar = () => {
    setCalendarModalVisible(false);
    setSelectedActivity(null);
    setSelectedDate(null);
  };

  const renderActivityCard = ({ item: activity }) => {
    const iconName = getActivityIcon(activity);

    return (
      <View style={styles.activityCard}>
        <View style={styles.activityLeft}>
          <View style={styles.activityIcon}>
            <Ionicons name={iconName} size={24} color="white" />
          </View>
          <View style={styles.activityInfo}>
            <Text style={styles.activityTitle}>{activity.activityName}</Text>
            <Text style={styles.activityDescription}>
              {activity.frequency} • {activity.points} pts
            </Text>
          </View>
        </View>
        
        <View style={styles.activityRight}>
          <View style={styles.carbonTag}>
            <Text style={styles.carbonText}>~{activity.carbonReduction} kg Δ</Text>
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
        <TouchableOpacity 
          style={styles.sortButton}
          onPress={() => {
            const currentIndex = sortOptions.indexOf(sortBy);
            const nextIndex = (currentIndex + 1) % sortOptions.length;
            setSortBy(sortOptions[nextIndex]);
          }}
        >
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

      {/* Calendar Modal */}
      <Modal
        visible={calendarModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelCalendar}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Select Date for {selectedActivity?.activityName}
            </Text>
            
            <Calendar
              onDayPress={handleDateSelect}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: '#4caf50',
                  selectedTextColor: 'white'
                }
              }}
              minDate={new Date().toISOString().split('T')[0]}
              theme={{
                backgroundColor: '#1E1E1E',
                calendarBackground: '#1E1E1E',
                textSectionTitleColor: '#AAAAAA',
                selectedDayBackgroundColor: '#4caf50',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#4caf50',
                dayTextColor: '#FFFFFF',
                textDisabledColor: '#666666',
                dotColor: '#4caf50',
                selectedDotColor: '#ffffff',
                arrowColor: '#4caf50',
                monthTextColor: '#FFFFFF',
                indicatorColor: '#4caf50',
                textDayFontWeight: '500',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '500',
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 13
              }}
              style={styles.calendar}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={handleCancelCalendar}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, !selectedDate && styles.modalConfirmButtonDisabled]}
                onPress={handleConfirmAddToCalendar}
                disabled={!selectedDate}
              >
                <Text style={styles.modalConfirmButtonText}>Add to Calendar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 60,
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
    marginBottom: 1,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryButton: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
    height: 40,
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
    marginTop: -280,
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
    paddingVertical: 6,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  calendar: {
    borderRadius: 12,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#AAAAAA',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#4caf50',
    alignItems: 'center',
  },
  modalConfirmButtonDisabled: {
    backgroundColor: '#2a2a2a',
    opacity: 0.5,
  },
  modalConfirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});



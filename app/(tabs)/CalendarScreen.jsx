import { Picker } from '@react-native-picker/picker';
import { addDoc, collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Alert, Dimensions, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../config/firebase';

const gradeOptions = ['all', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

const { width } = Dimensions.get('window');

export default function CalendarScreen({ navigation }) {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityDate, setActivityDate] = useState('');
  const [activityLocation, setActivityLocation] = useState('');
  const [activitySchool, setActivitySchool] = useState('');
  const [activityGrade, setActivityGrade] = useState('all');
  const [creating, setCreating] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [participantsModalVisible, setParticipantsModalVisible] = useState(false);
  const [eventParticipants, setEventParticipants] = useState([]);
  const [totalParticipants, setTotalParticipants] = useState(0);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUpcomingEvents();
    }
  }, [user, userData, selectedMonth, selectedYear]);

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

  const fetchUpcomingEvents = async () => {
    try {
      // Fetch events for the selected month/year
      const eventsQuery = query(
        collection(db, 'events'),
        where('status', '==', 'upcoming')
      );
      const querySnapshot = await getDocs(eventsQuery);
      const events = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter events based on user's school and grade for students
      const studentEvents = userData?.role === 'student' ? events.filter(event => {
        // Filter by school: if event has a specific school, it must match
        // If event schoolName is 'all' or empty, show to everyone
        if (event.schoolName && event.schoolName !== 'all' && userData.profile?.schoolName) {
          if (event.schoolName !== userData.profile.schoolName) {
            return false; // Skip this event - school doesn't match
          }
        }
        
        // Filter by grade: if event has a specific grade, it must match
        // If event specificGrade is 'all' or empty, show to everyone
        if (event.specificGrade && event.specificGrade !== 'all' && userData.profile?.grade) {
          if (event.specificGrade !== userData.profile.grade) {
            return false; // Skip this event - grade doesn't match
          }
        }
        
        return true; // Show this event
      }) : events;
      
      // Filter events for the selected month
      const filteredEvents = studentEvents.filter(event => {
        if (!event.date) return false;
        let eventDate;
        try {
          // Handle Firestore Timestamp
          eventDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);
          if (isNaN(eventDate.getTime())) return false; // Invalid date
        } catch (error) {
          console.error('Error parsing date:', error);
          return false;
        }
        // Compare dates ignoring time
        const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        const selectedDateOnly = new Date(selectedYear, selectedMonth, 1);
        return eventDateOnly.getMonth() === selectedMonth && eventDateOnly.getFullYear() === selectedYear;
      });
      
      setUpcomingEvents(filteredEvents);
      
      // Calculate total participants across all events
      const total = filteredEvents.reduce((sum, event) => {
        return sum + (event.participants?.length || 0);
      }, 0);
      setTotalParticipants(total);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction) => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  const handleCreateActivity = () => {
    // Pre-populate with user's school if available
    setActivitySchool(userData?.profile?.schoolName || '');
    setModalVisible(true);
  };

  const handleSubmitActivity = async () => {
    if (!activityTitle || !activityDescription || !activityDate) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setCreating(true);
    try {
      // Create activity in Firestore
      const eventDate = new Date(activityDate);
      await addDoc(collection(db, 'events'), {
        title: activityTitle,
        description: activityDescription,
        date: eventDate,
        location: activityLocation || 'TBD',
        schoolName: activitySchool || (userData?.profile?.schoolName || 'all'),
        specificGrade: activityGrade,
        status: 'upcoming',
        createdAt: new Date(),
        createdBy: user.uid,
        participants: [], // Initialize empty participants array
      });

      // Reset form
      setActivityTitle('');
      setActivityDescription('');
      setActivityDate('');
      setActivityLocation('');
      setActivitySchool('');
      setActivityGrade('all');
      setModalVisible(false);
      
      Alert.alert('Success', 'Activity scheduled successfully!');
      
      // Refresh events
      fetchUpcomingEvents();
    } catch (error) {
      console.error('Error creating activity:', error);
      Alert.alert('Error', 'Failed to schedule activity. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleViewParticipants = (event) => {
    setSelectedEvent(event);
    setEventParticipants(event.participants || []);
    setParticipantsModalVisible(true);
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
        <Text style={styles.welcomeText}>Welcome Back</Text>
        <Text style={styles.userName}>{user?.displayName || 'Staff'}</Text>
        <Text style={styles.subtitle}>Manage your events and activities</Text>
      </View>

      {/* Month Navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navButton}>
          <Text style={styles.navButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {months[selectedMonth]} {selectedYear}
        </Text>
        <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navButton}>
          <Text style={styles.navButtonText}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>📅</Text>
          <Text style={styles.statValue}>{upcomingEvents.length}</Text>
          <Text style={styles.statLabel}>Events</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>👥</Text>
          <Text style={styles.statValue}>{totalParticipants}</Text>
          <Text style={styles.statLabel}>Participants</Text>
        </View>
      </View>

      {/* Upcoming Events */}
      <View style={styles.eventsCard}>
        <Text style={styles.cardTitle}>Upcoming Events</Text>
        {upcomingEvents.length > 0 ? (
          upcomingEvents.map((event, index) => {
            const participantCount = (event.participants || []).length;
            return (
              <View key={event.id || index} style={styles.eventItem}>
                <View style={styles.eventIcon}>
                  <Text style={styles.eventEmoji}>📅</Text>
                </View>
                <View style={styles.eventDetails}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventDescription}>{event.description || 'No description'}</Text>
                  <Text style={styles.eventDate}>
                    {event.date ? (
                      event.date?.toDate ? 
                        event.date.toDate().toLocaleDateString() : 
                        new Date(event.date).toLocaleDateString()
                    ) : 'Date TBD'}
                  </Text>
                  {participantCount > 0 && (
                    <Text style={styles.eventParticipantCount}>
                      👥 {participantCount} participant{participantCount !== 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.viewParticipantsButton}
                  onPress={() => handleViewParticipants(event)}
                >
                  <Text style={styles.viewParticipantsButtonText}>
                    {participantCount > 0 ? 'View' : '0'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        ) : (
          <View style={styles.noEventsContainer}>
            <Text style={styles.noEventsEmoji}>📅</Text>
            <Text style={styles.noEventsText}>No events scheduled for this month</Text>
            <TouchableOpacity 
              style={styles.addEventButton}
              onPress={handleCreateActivity}
            >
              <Text style={styles.addEventButtonText}>+ Add Event</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryButton]} 
          onPress={handleCreateActivity}
        >
          <Text style={styles.actionButtonText}>📝 Create Activity</Text>
        </TouchableOpacity>
      </View>

      {/* View Participants Modal */}
      <Modal visible={participantsModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Participants: {selectedEvent?.title}
            </Text>
            
            {eventParticipants.length > 0 ? (
              <ScrollView style={styles.participantsList}>
                {eventParticipants.map((participant, index) => (
                  <View key={index} style={styles.participantItem}>
                    <View style={styles.participantIcon}>
                      <Text style={styles.participantEmoji}>👤</Text>
                    </View>
                    <View style={styles.participantDetails}>
                      <Text style={styles.participantName}>
                        {participant.userName || 'Student'}
                      </Text>
                      <Text style={styles.participantInfo}>
                        {participant.schoolName || 'Unknown School'} • {participant.grade || 'Unknown Grade'}
                      </Text>
                      <Text style={styles.participantJoined}>
                        Joined: {participant.joinedAt ? 
                          (participant.joinedAt?.toDate ? 
                            participant.joinedAt.toDate().toLocaleDateString() : 
                            new Date(participant.joinedAt).toLocaleDateString()
                          ) : 'Recently'}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noParticipantsContainer}>
                <Text style={styles.noParticipantsEmoji}>👥</Text>
                <Text style={styles.noParticipantsText}>No participants yet</Text>
                <Text style={styles.noParticipantsSubtext}>
                  Students can join this event from their dashboard
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              onPress={() => setParticipantsModalVisible(false)}
              style={styles.modalCancelButton}
            >
              <Text style={styles.modalCancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Activity Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Schedule New Activity</Text>
            
            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>Activity Title *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Tree Planting Drive"
                value={activityTitle}
                onChangeText={setActivityTitle}
              />
            </View>

            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>Description *</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Describe the activity..."
                value={activityDescription}
                onChangeText={setActivityDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>Date *</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                  }}
                  value={activityDate}
                  onChange={(e) => setActivityDate(e.target.value)}
                />
              ) : (
                <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="YYYY-MM-DD (e.g., 2025-01-15)"
                    value={activityDate}
                    editable={false}
                    onPressIn={() => {
                      if (Platform.OS !== 'web') {
                        setShowDatePicker(true);
                      }
                    }}
                  />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>Location</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Central Park"
                value={activityLocation}
                onChangeText={setActivityLocation}
              />
            </View>

            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>School Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Leave blank for your school"
                value={activitySchool}
                onChangeText={setActivitySchool}
              />
            </View>

            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>Target Grade</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={activityGrade}
                  onValueChange={(itemValue) => setActivityGrade(itemValue)}
                  style={styles.picker}
                >
                  {gradeOptions.map((grade) => (
                    <Picker.Item 
                      key={grade} 
                      label={grade === 'all' ? 'All Grades' : grade} 
                      value={grade}
                      color={Platform.OS === 'ios' ? 'black' : '#333'}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitActivity}
                style={[styles.modalSubmitButton, creating && styles.modalSubmitButtonDisabled]}
                disabled={creating}
              >
                <Text style={styles.modalSubmitButtonText}>
                  {creating ? 'Creating...' : 'Schedule'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  welcomeText: {
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
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  navButton: {
    backgroundColor: '#E8F5E8',
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 24,
    color: '#2d5a27',
    fontWeight: 'bold',
  },
  monthText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d5a27',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statEmoji: {
    fontSize: 32,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2d5a27',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  eventsCard: {
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
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d5a27',
    marginBottom: 15,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  eventIcon: {
    width: 50,
    height: 50,
    backgroundColor: '#E8F5E8',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  eventEmoji: {
    fontSize: 24,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  eventDate: {
    fontSize: 12,
    color: '#4caf50',
  },
  eventParticipantCount: {
    fontSize: 12,
    color: '#4caf50',
    marginTop: 4,
    fontWeight: '600',
  },
  eventStatus: {
    fontSize: 12,
    color: '#4caf50',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '600',
  },
  viewParticipantsButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 10,
  },
  viewParticipantsButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  participantsList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  participantIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#E8F5E8',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  participantEmoji: {
    fontSize: 20,
  },
  participantDetails: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  participantInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  participantJoined: {
    fontSize: 12,
    color: '#999',
  },
  noParticipantsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noParticipantsEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  noParticipantsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  noParticipantsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noEventsEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  noEventsText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  addEventButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addEventButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 30,
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    width: '90%',
    maxWidth: 500,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d5a27',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInputContainer: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4caf50',
    alignItems: 'center',
  },
  modalSubmitButtonDisabled: {
    opacity: 0.5,
  },
  modalSubmitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    backgroundColor: '#f8f9fa',
  },
});


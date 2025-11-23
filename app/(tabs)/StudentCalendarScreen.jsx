import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Dimensions, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../config/firebase';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isLargeScreen = width > 768;

export default function StudentCalendarScreen({ navigation }) {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [allEvents, setAllEvents] = useState([]);
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  useEffect(() => {
    if (user && userData) {
      fetchEvents();
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

  const fetchEvents = async () => {
    try {
      const eventsQuery = query(
        collection(db, 'events'),
        where('status', '==', 'upcoming')
      );
      const querySnapshot = await getDocs(eventsQuery);
      const events = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter events based on user's school and grade
      const filteredEvents = userData?.role === 'student' ? events.filter(event => {
        // Filter by school
        if (event.schoolName && event.schoolName !== 'all' && userData.profile?.schoolName) {
          if (event.schoolName !== userData.profile.schoolName) {
            return false;
          }
        }
        
        // Filter by grade
        if (event.specificGrade && event.specificGrade !== 'all' && userData.profile?.grade) {
          if (event.specificGrade !== userData.profile.grade) {
            return false;
          }
        }
        
        return true;
      }) : events;
      
      setAllEvents(filteredEvents);
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

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const hasEventsOnDate = (date) => {
    return allEvents.some(event => {
      if (!event.date) return false;
      try {
        const eventDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);
        return eventDate.getDate() === date &&
               eventDate.getMonth() === selectedMonth &&
               eventDate.getFullYear() === selectedYear;
      } catch (error) {
        return false;
      }
    });
  };

  const getEventsForDate = (date) => {
    return allEvents.filter(event => {
      if (!event.date) return false;
      try {
        const eventDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);
        return eventDate.getDate() === date &&
               eventDate.getMonth() === selectedMonth &&
               eventDate.getFullYear() === selectedYear;
      } catch (error) {
        return false;
      }
    });
  };

  const handleDatePress = (date) => {
    const events = getEventsForDate(date);
    if (events.length > 0) {
      setSelectedDate(date);
      setSelectedDateEvents(events);
      setModalVisible(true);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
    const today = new Date();
    const isCurrentMonth = today.getMonth() === selectedMonth && today.getFullYear() === selectedYear;
    
    const calendarDays = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(
        <View key={`empty-${i}`} style={styles.calendarDay} />
      );
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const hasEvents = hasEventsOnDate(day);
      const isToday = isCurrentMonth && day === today.getDate();
      
      calendarDays.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            hasEvents && styles.calendarDayWithEvent,
            isToday && styles.calendarDayToday,
          ]}
          onPress={() => handleDatePress(day)}
          disabled={!hasEvents}
        >
          <Text style={[
            styles.calendarDayText,
            hasEvents && styles.calendarDayTextWithEvent,
            isToday && styles.calendarDayTextToday,
          ]}>
            {day}
          </Text>
          {hasEvents && <View style={styles.eventDot} />}
        </TouchableOpacity>
      );
    }
    
    return calendarDays;
  };

  const getUpcomingEventsThisMonth = () => {
    const now = new Date();
    return allEvents.filter(event => {
      if (!event.date) return false;
      try {
        const eventDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);
        const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        return eventDate.getMonth() === selectedMonth &&
               eventDate.getFullYear() === selectedYear &&
               eventDateOnly >= nowDateOnly;
      } catch (error) {
        return false;
      }
    }).sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateA - dateB;
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const upcomingEvents = getUpcomingEventsThisMonth();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.contentWrapper}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.welcomeText}>Activities Calendar</Text>
          <Text style={styles.userName}>{user?.displayName || 'Eco Warrior'}</Text>
          <Text style={styles.subtitle}>View and join upcoming activities</Text>
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

        {/* Two-column layout for large screens */}
        <View style={isLargeScreen && isWeb ? styles.desktopLayout : styles.mobileLayout}>
          {/* Calendar */}
          <View style={[styles.calendarCard, isLargeScreen && isWeb && styles.calendarCardDesktop]}>
            {/* Days of week header */}
            <View style={styles.daysOfWeekContainer}>
              {daysOfWeek.map(day => (
                <View key={day} style={styles.dayOfWeekCell}>
                  <Text style={styles.dayOfWeekText}>{day}</Text>
                </View>
              ))}
            </View>
            
            {/* Calendar grid */}
            <View style={styles.calendarGrid}>
              {renderCalendar()}
            </View>
            
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={styles.legendDot} />
                <Text style={styles.legendText}>Has Events</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSquare, styles.todaySquare]} />
                <Text style={styles.legendText}>Today</Text>
              </View>
            </View>
          </View>

          {/* Upcoming Events List */}
          <View style={[styles.eventsCard, isLargeScreen && isWeb && styles.eventsCardDesktop]}>
            <Text style={styles.cardTitle}>
              Upcoming This Month ({upcomingEvents.length})
            </Text>
            <ScrollView 
              style={isLargeScreen && isWeb ? styles.eventsScrollView : null}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={isWeb}
            >
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event, index) => {
                  const eventDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);
                  const participantCount = (event.participants || []).length;
                  
                  return (
                    <View key={event.id || index} style={styles.eventItem}>
                      <View style={styles.eventIcon}>
                        <Text style={styles.eventEmoji}>📅</Text>
                      </View>
                      <View style={styles.eventDetails}>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <Text style={styles.eventDescription}>
                          {event.description || 'No description'}
                        </Text>
                        <Text style={styles.eventDate}>
                          {eventDate.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </Text>
                        {participantCount > 0 && (
                          <Text style={styles.participantCount}>
                            👥 {participantCount} participant{participantCount !== 1 ? 's' : ''}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.noEventsContainer}>
                  <Text style={styles.noEventsEmoji}>📅</Text>
                  <Text style={styles.noEventsText}>
                    No upcoming events this month
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Event Details Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Events on {months[selectedMonth]} {selectedDate}, {selectedYear}
            </Text>
            
            <ScrollView style={styles.modalEventsList}>
              {selectedDateEvents.map((event, index) => {
                const eventDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);
                const participantCount = (event.participants || []).length;
                
                return (
                  <View key={event.id || index} style={styles.modalEventItem}>
                    <View style={styles.modalEventIcon}>
                      <Text style={styles.modalEventEmoji}>📅</Text>
                    </View>
                    <View style={styles.modalEventDetails}>
                      <Text style={styles.modalEventTitle}>{event.title}</Text>
                      <Text style={styles.modalEventDescription}>
                        {event.description || 'No description'}
                      </Text>
                      <Text style={styles.modalEventLocation}>
                        📍 {event.location || 'Location TBD'}
                      </Text>
                      {participantCount > 0 && (
                        <Text style={styles.modalParticipantCount}>
                          👥 {participantCount} participant{participantCount !== 1 ? 's' : ''}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
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
  contentWrapper: {
    maxWidth: isWeb ? 1400 : '100%',
    width: '100%',
    alignSelf: 'center',
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
    paddingHorizontal: isWeb && isLargeScreen ? 40 : 20,
    paddingTop: isWeb && isLargeScreen ? 40 : 20,
    paddingBottom: isWeb && isLargeScreen ? 50 : 30,
    backgroundColor: '#2d5a27',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  welcomeText: {
    fontSize: isWeb && isLargeScreen ? 20 : 16,
    color: '#a8d5a8',
    marginBottom: 5,
  },
  userName: {
    fontSize: isWeb && isLargeScreen ? 36 : 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: isWeb && isLargeScreen ? 18 : 16,
    color: '#a8d5a8',
  },
  mobileLayout: {
    flexDirection: 'column',
  },
  desktopLayout: {
    flexDirection: 'row',
    paddingHorizontal: 40,
    gap: 30,
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isWeb && isLargeScreen ? 40 : 20,
    marginTop: isWeb && isLargeScreen ? 30 : 20,
    marginBottom: isWeb && isLargeScreen ? 30 : 20,
    maxWidth: isWeb && isLargeScreen ? 600 : '100%',
    alignSelf: isWeb && isLargeScreen ? 'flex-start' : 'auto',
    marginLeft: isWeb && isLargeScreen ? 40 : 0,
  },
  navButton: {
    backgroundColor: '#E8F5E8',
    borderRadius: 25,
    width: isWeb && isLargeScreen ? 60 : 50,
    height: isWeb && isLargeScreen ? 60 : 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...(isWeb && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
  },
  navButtonText: {
    fontSize: isWeb && isLargeScreen ? 28 : 24,
    color: '#2d5a27',
    fontWeight: 'bold',
  },
  monthText: {
    fontSize: isWeb && isLargeScreen ? 24 : 20,
    fontWeight: 'bold',
    color: '#2d5a27',
  },
  calendarCard: {
    backgroundColor: 'white',
    marginHorizontal: isLargeScreen && isWeb ? 0 : 20,
    borderRadius: 20,
    padding: isWeb && isLargeScreen ? 25 : 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    ...(isWeb && isLargeScreen && {
      flex: 1,
      maxWidth: 600,
    }),
  },
  calendarCardDesktop: {
    flex: 1,
    marginBottom: 0,
  },
  daysOfWeekContainer: {
    flexDirection: 'row',
    marginBottom: isWeb && isLargeScreen ? 15 : 10,
  },
  dayOfWeekCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: isWeb && isLargeScreen ? 12 : 8,
  },
  dayOfWeekText: {
    fontSize: isWeb && isLargeScreen ? 14 : 12,
    fontWeight: '600',
    color: '#2d5a27',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: isWeb && isLargeScreen ? 8 : 5,
    position: 'relative',
    ...(isWeb && {
      cursor: 'pointer',
    }),
  },
  calendarDayWithEvent: {
    backgroundColor: '#e8f5e8',
    borderRadius: isWeb && isLargeScreen ? 12 : 8,
  },
  calendarDayToday: {
    backgroundColor: '#4caf50',
    borderRadius: isWeb && isLargeScreen ? 12 : 8,
  },
  calendarDayText: {
    fontSize: isWeb && isLargeScreen ? 16 : 14,
    color: '#333',
  },
  calendarDayTextWithEvent: {
    fontWeight: '600',
    color: '#2d5a27',
  },
  calendarDayTextToday: {
    color: 'white',
    fontWeight: 'bold',
  },
  eventDot: {
    position: 'absolute',
    bottom: isWeb && isLargeScreen ? 8 : 5,
    width: isWeb && isLargeScreen ? 6 : 4,
    height: isWeb && isLargeScreen ? 6 : 4,
    borderRadius: isWeb && isLargeScreen ? 3 : 2,
    backgroundColor: '#4caf50',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: isWeb && isLargeScreen ? 20 : 15,
    paddingTop: isWeb && isLargeScreen ? 20 : 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: isWeb && isLargeScreen ? 30 : 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isWeb && isLargeScreen ? 8 : 6,
  },
  legendDot: {
    width: isWeb && isLargeScreen ? 10 : 8,
    height: isWeb && isLargeScreen ? 10 : 8,
    borderRadius: isWeb && isLargeScreen ? 5 : 4,
    backgroundColor: '#4caf50',
  },
  legendSquare: {
    width: isWeb && isLargeScreen ? 20 : 16,
    height: isWeb && isLargeScreen ? 20 : 16,
    borderRadius: isWeb && isLargeScreen ? 5 : 4,
  },
  todaySquare: {
    backgroundColor: '#4caf50',
  },
  legendText: {
    fontSize: isWeb && isLargeScreen ? 14 : 12,
    color: '#666',
  },
  eventsCard: {
    backgroundColor: 'white',
    marginHorizontal: isLargeScreen && isWeb ? 0 : 20,
    borderRadius: 20,
    padding: isWeb && isLargeScreen ? 25 : 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    ...(isWeb && isLargeScreen && {
      flex: 1,
      minWidth: 400,
    }),
  },
  eventsCardDesktop: {
    flex: 1,
    marginBottom: 0,
    maxHeight: 700,
  },
  eventsScrollView: {
    maxHeight: 600,
  },
  cardTitle: {
    fontSize: isWeb && isLargeScreen ? 22 : 18,
    fontWeight: 'bold',
    color: '#2d5a27',
    marginBottom: isWeb && isLargeScreen ? 20 : 15,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: isWeb && isLargeScreen ? 16 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  eventIcon: {
    width: isWeb && isLargeScreen ? 60 : 50,
    height: isWeb && isLargeScreen ? 60 : 50,
    backgroundColor: '#E8F5E8',
    borderRadius: isWeb && isLargeScreen ? 30 : 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: isWeb && isLargeScreen ? 20 : 15,
  },
  eventEmoji: {
    fontSize: isWeb && isLargeScreen ? 28 : 24,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: isWeb && isLargeScreen ? 18 : 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: isWeb && isLargeScreen ? 6 : 4,
  },
  eventDescription: {
    fontSize: isWeb && isLargeScreen ? 15 : 14,
    color: '#666',
    marginBottom: isWeb && isLargeScreen ? 4 : 2,
  },
  eventDate: {
    fontSize: isWeb && isLargeScreen ? 14 : 12,
    color: '#4caf50',
    fontWeight: '600',
  },
  participantCount: {
    fontSize: isWeb && isLargeScreen ? 14 : 12,
    color: '#4caf50',
    marginTop: isWeb && isLargeScreen ? 6 : 4,
    fontWeight: '600',
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: isWeb && isLargeScreen ? 40 : 30,
  },
  noEventsEmoji: {
    fontSize: isWeb && isLargeScreen ? 64 : 48,
    marginBottom: isWeb && isLargeScreen ? 15 : 10,
  },
  noEventsText: {
    fontSize: isWeb && isLargeScreen ? 18 : 16,
    color: '#666',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    ...(isWeb && {
      paddingHorizontal: 20,
    }),
  },
  modalContent: {
    backgroundColor: 'white',
    width: isWeb && isLargeScreen ? '60%' : '90%',
    maxWidth: isWeb && isLargeScreen ? 700 : 500,
    maxHeight: '80%',
    borderRadius: isWeb && isLargeScreen ? 24 : 20,
    padding: isWeb && isLargeScreen ? 32 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: isWeb && isLargeScreen ? 24 : 20,
    fontWeight: 'bold',
    color: '#2d5a27',
    marginBottom: isWeb && isLargeScreen ? 24 : 20,
    textAlign: 'center',
  },
  modalEventsList: {
    maxHeight: isWeb && isLargeScreen ? 500 : 400,
    marginBottom: isWeb && isLargeScreen ? 20 : 16,
  },
  modalEventItem: {
    flexDirection: 'row',
    paddingVertical: isWeb && isLargeScreen ? 16 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalEventIcon: {
    width: isWeb && isLargeScreen ? 50 : 40,
    height: isWeb && isLargeScreen ? 50 : 40,
    backgroundColor: '#E8F5E8',
    borderRadius: isWeb && isLargeScreen ? 25 : 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: isWeb && isLargeScreen ? 16 : 12,
  },
  modalEventEmoji: {
    fontSize: isWeb && isLargeScreen ? 24 : 20,
  },
  modalEventDetails: {
    flex: 1,
  },
  modalEventTitle: {
    fontSize: isWeb && isLargeScreen ? 18 : 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: isWeb && isLargeScreen ? 6 : 4,
  },
  modalEventDescription: {
    fontSize: isWeb && isLargeScreen ? 15 : 14,
    color: '#666',
    marginBottom: isWeb && isLargeScreen ? 6 : 4,
  },
  modalEventLocation: {
    fontSize: isWeb && isLargeScreen ? 14 : 12,
    color: '#4caf50',
    marginBottom: isWeb && isLargeScreen ? 4 : 2,
  },
  modalParticipantCount: {
    fontSize: isWeb && isLargeScreen ? 14 : 12,
    color: '#4caf50',
    marginTop: isWeb && isLargeScreen ? 6 : 4,
    fontWeight: '600',
  },
  modalCloseButton: {
    paddingVertical: isWeb && isLargeScreen ? 14 : 12,
    borderRadius: isWeb && isLargeScreen ? 10 : 8,
    backgroundColor: '#4caf50',
    alignItems: 'center',
    marginTop: isWeb && isLargeScreen ? 12 : 10,
    ...(isWeb && {
      cursor: 'pointer',
    }),
  },
  modalCloseButtonText: {
    fontSize: isWeb && isLargeScreen ? 18 : 16,
    fontWeight: '600',
    color: 'white',
  },
});


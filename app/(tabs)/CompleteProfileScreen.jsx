import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
    Alert,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, db } from '../../config/firebase';

const { width } = Dimensions.get('window');

const gradeOptions = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
  'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
  'Grade 11', 'Grade 12', 'University Year 1', 'University Year 2',
  'University Year 3', 'University Year 4', 'Graduate Student', 'Other'
];

const regionOptions = [
  'UAE', 'USA', 'Canada', 'UK', 'Australia', 'Germany', 'France',
  'India', 'Singapore', 'Japan', 'South Korea', 'Brazil', 'Mexico',
  'South Africa', 'Nigeria', 'Egypt', 'Other'
];

export default function CompleteProfileScreen({ navigation }) {
  const [age, setAge] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [grade, setGrade] = useState('');
  const [region, setRegion] = useState('');
  const [isInEcoClub, setIsInEcoClub] = useState(false);
  const [ngoAffiliation, setNgoAffiliation] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [savedProfile, setSavedProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [user] = useAuthState(auth);
  const userId = user ? user.uid : 'demoUserId';
  const nav = useNavigation();

  // Load existing profile data when component mounts
  useEffect(() => {
    if (user) {
      loadExistingProfile();
    }
  }, [user]);

  const loadExistingProfile = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists() && userDoc.data().profile) {
        const profileData = userDoc.data().profile;
        setAge(profileData.age?.toString() || '');
        setSchoolName(profileData.schoolName || '');
        setGrade(profileData.grade || '');
        setRegion(profileData.region || '');
        setIsInEcoClub(profileData.isInEcoClub || false);
        setNgoAffiliation(profileData.ngoAffiliation || '');
        setIsEditing(true); // Set editing mode if profile exists
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSaveAndContinue = async () => {
    if (!age.trim() || !schoolName.trim() || !grade || !region.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        age: parseInt(age),
        schoolName: schoolName.trim(),
        grade,
        region: region.trim(),
        isInEcoClub,
        ngoAffiliation: ngoAffiliation.trim() || null,
        completedAt: serverTimestamp(),
      };

      // Save profile data to Firestore
      await setDoc(doc(db, 'users', userId), {
        profile: profileData,
        lastUpdated: serverTimestamp(),
      }, { merge: true });

      // Set saved profile data and show modal
      setSavedProfile(profileData);
      setModalVisible(true);
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLifestyleSurvey = () => {
    // Navigate to lifestyle survey using the drawer navigator
    navigation.navigate('LifestyleSurvey');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text style={styles.header}>
          {isEditing ? 'Edit Your Profile' : 'Complete Your Profile'}
        </Text>
        <Text style={styles.subtitle}>
          {isEditing ? 'Update your profile information' : 'Help us personalize your experience'}
        </Text>
      </View>

      {/* Form Card */}
      <View style={styles.formCard}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Age *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Your Age"
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>School Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="E.g., Brighton College Dubai"
            value={schoolName}
            onChangeText={setSchoolName}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Grade *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={grade}
              onValueChange={(itemValue) => setGrade(itemValue)}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label="Select your grade" value="" color="#999" />
              {gradeOptions.map((option) => (
                <Picker.Item 
                  key={option} 
                  label={option} 
                  value={option} 
                  color="white"
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Region *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={region}
              onValueChange={(itemValue) => setRegion(itemValue)}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label="E.g., UAE" value="" color="#999" />
              {regionOptions.map((option) => (
                <Picker.Item 
                  key={option} 
                  label={option} 
                  value={option} 
                  color="white"
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Are you in an Eco Club?</Text>
            <Switch
              value={isInEcoClub}
              onValueChange={setIsInEcoClub}
              trackColor={{ false: '#767577', true: '#4caf50' }}
              thumbColor={isInEcoClub ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>NGO Affiliation (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="E.g., Bhoomi Foundation"
            value={ngoAffiliation}
            onChangeText={setNgoAffiliation}
            placeholderTextColor="#999"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, styles.lifestyleButton]}
          onPress={handleLifestyleSurvey}
        >
          <Text style={styles.buttonText}>Fill Lifestyle Survey</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.saveButton, loading && styles.buttonDisabled]}
          onPress={handleSaveAndContinue}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Saving...' : (isEditing ? 'Update Profile' : 'Save & Continue')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.successIcon}>
              <Text style={styles.successEmoji}>✅</Text>
            </View>
            <Text style={styles.modalTitle}>
              {isEditing ? 'Profile Updated Successfully!' : 'Profile Saved Successfully!'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {isEditing ? 'Your profile details have been updated' : 'Your profile details have been saved'}
            </Text>
            
            {savedProfile && (
              <View style={styles.profileDetails}>
                <Text style={styles.detailsTitle}>
                  {isEditing ? 'Updated Details:' : 'Saved Details:'}
                </Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Age:</Text>
                  <Text style={styles.detailValue}>{savedProfile.age}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>School:</Text>
                  <Text style={styles.detailValue}>{savedProfile.schoolName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Grade:</Text>
                  <Text style={styles.detailValue}>{savedProfile.grade}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Region:</Text>
                  <Text style={styles.detailValue}>{savedProfile.region}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Eco Club:</Text>
                  <Text style={styles.detailValue}>{savedProfile.isInEcoClub ? 'Yes' : 'No'}</Text>
                </View>
                {savedProfile.ngoAffiliation && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>NGO:</Text>
                    <Text style={styles.detailValue}>{savedProfile.ngoAffiliation}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  // Navigate to home/dashboard
                  console.log('Navigating to MainTabs...');
                  
                  // Use multiple navigation approaches for reliability
                  setTimeout(() => {
                    // Try the direct navigation first
                    if (nav.navigate) {
                      try {
                        nav.navigate('MainTabs');
                        console.log('Direct navigation to MainTabs successful');
                        return;
                      } catch (error) {
                        console.log('Direct navigation failed, trying parent navigation');
                      }
                    }
                    
                    // Fallback to parent navigation
                    if (navigation.getParent) {
                      try {
                        navigation.getParent()?.navigate('MainTabs');
                        console.log('Parent navigation to MainTabs successful');
                        return;
                      } catch (error) {
                        console.log('Parent navigation failed, trying reset');
                      }
                    }
                    
                    // Last resort: reset navigation
                    try {
                      navigation.getParent()?.reset({
                        index: 0,
                        routes: [{ name: 'MainTabs' }],
                      });
                      console.log('Navigation reset successful');
                    } catch (error) {
                      console.error('All navigation methods failed:', error);
                    }
                  }, 200); // Slightly longer delay to ensure modal closes
                }}
                style={[styles.modalButton, styles.continueButton]}
              >
                <Text style={styles.modalButtonText}>Continue to Home</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  // Stay on profile screen for editing
                }}
                style={[styles.modalButton, styles.editButton]}
              >
                <Text style={styles.modalButtonText}>Edit Profile</Text>
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
    backgroundColor: '#111111',
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#a8d5a8',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#1E1E1E',
    marginHorizontal: 20,
    marginTop: -15,
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#2a2a2a',
    color: 'white',
  },
  pickerContainer: {
    borderWidth: 2,
    borderColor: '#4caf50',
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    overflow: 'hidden',
    shadowColor: '#4caf50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  picker: {
    height: 60,
    color: 'white',
    fontSize: 16,
    backgroundColor: '#2a2a2a',
  },
  pickerItem: {
    color: 'white',
    fontSize: 16,
    backgroundColor: '#2a2a2a',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  button: {
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 10,
    shadowColor: '#4caf50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  lifestyleButton: {
    backgroundColor: '#4caf50',
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: '#2d5a27',
  },
  buttonDisabled: {
    backgroundColor: '#666',
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e8f5e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successEmoji: {
    fontSize: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#a8d5a8',
    textAlign: 'center',
    marginBottom: 25,
  },
  profileDetails: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 15,
    width: '100%',
    marginBottom: 25,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  detailLabel: {
    fontSize: 16,
    color: '#a8d5a8',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  continueButton: {
    backgroundColor: '#4caf50',
  },
  editButton: {
    backgroundColor: '#2196f3',
  },
  modalButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});

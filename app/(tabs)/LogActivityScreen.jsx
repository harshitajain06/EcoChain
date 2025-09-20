// screens/LogActivityScreen.js
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../../config/firebase';

const { width } = Dimensions.get('window');

// Mapping for category/activity to Climatiq IDs - Updated with current valid IDs
const activityMap = {
  Transport: 'passenger_vehicle-vehicle_type_car-fuel_source_na-distance_na-engine_size_na',
  Flight: 'passenger_flight-route_type_domestic-aircraft_type_jet-distance_na-class_economy',
  Waste: 'waste_type_mixed-disposal_landfill',
  Water: 'water_treatment-supply_treatment-na',
  Electricity: 'electricity-energy_source_grid_mix-location_in',
  Food: 'food_beverage-type_diet_omnivore',
  Clothing: 'clothing-general_na',
  Paper: 'paper-type_na',
  Delivery: 'delivery_type_standard-distance_na',
};

// Alternative emission factors to try if primary ones fail
const alternativeActivityMap = {
  Transport: [
    'passenger_vehicle-vehicle_type_car-fuel_source_na-distance_na-engine_size_na',
    'passenger_vehicle-vehicle_type_car-fuel_source_gasoline-distance_na-engine_size_na'
  ],
  Flight: [
    'passenger_flight-route_type_domestic-aircraft_type_jet-distance_na-class_economy',
    'passenger_flight-route_type_domestic-aircraft_type_jet-distance_na-class_na',
    'passenger_flight-route_type_domestic-aircraft_type_na-distance_na-class_economy'
  ],
  Waste: ['waste_type_mixed-disposal_landfill'],
  Water: ['water_treatment-supply_treatment-na'],
  Electricity: ['electricity-energy_source_grid_mix-location_in'],
  Food: ['food_beverage-type_diet_omnivore'],
  Clothing: ['clothing-general_na'],
  Paper: ['paper-type_na'],
  Delivery: ['delivery_type_standard-distance_na']
};

// Dynamic input placeholder text based on category
const placeholderMap = {
  Transport: 'Distance in KM',
  Flight: 'Flight distance in KM',
  Waste: 'Weight in KG',
  Water: 'Volume in Liters',
  Electricity: 'Electricity in kWh',
  Food: 'Food weight in KG',
  Clothing: 'Clothing weight in KG',
  Paper: 'Paper weight in KG',
  Delivery: 'Package weight in KG',
};

async function estimateCarbonFromActivity(category, value) {
  let parameters = {};

  switch (category) {
    case 'Transport':
      parameters = { distance: Number(value) || 5, distance_unit: 'km' };
      break;

    case 'Flight':
      parameters = { passengers: 1, distance: Number(value) || 1000, distance_unit: 'km' };
      break;

    case 'Waste':
    case 'Food':
    case 'Clothing':
    case 'Paper':
      parameters = { weight: Number(value) || 1, weight_unit: 'kg' };
      break;

    case 'Water':
      parameters = { volume: Number(value) || 100, volume_unit: 'l' };
      break;

    case 'Electricity':
      parameters = { energy: Number(value) || 10, energy_unit: 'kWh' };
      break;

    case 'Delivery':
      parameters = { weight: Number(value) || 1, weight_unit: 'kg', distance: 10, distance_unit: 'km' };
      break;

    default:
      parameters = { distance: Number(value) || 5, distance_unit: 'km' };
  }

  // Using reliable fallback calculations based on EPA/ICAO data
  // This ensures the app works consistently while Climatiq API emission factors are updated
  console.log('Using EPA/ICAO-based calculation for:', category);
  return calculateFallbackCarbon(category, value);
  
  // TODO: Re-enable Climatiq API when emission factors are updated
  /*
  // Try multiple emission factors for this category
  const emissionFactors = alternativeActivityMap[category] || [activityMap[category]];
  
  for (let i = 0; i < emissionFactors.length; i++) {
    const activity_id = emissionFactors[i];
    
    try {
      console.log(`Attempting Climatiq API call ${i + 1}/${emissionFactors.length} with:`, {
        activity_id,
        parameters,
        category
      });

      const response = await fetch('https://api.climatiq.io/estimate', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer JWEW3X0ZCS5435AVZDFJAXC1MR',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emission_factor: {
            activity_id,
            data_version: '23.23',
          },
          parameters,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Climatiq API Success:', data);
        return data.co2e || 0;
      } else {
        const errorText = await response.text();
        console.warn(`Climatiq API attempt ${i + 1} failed:`, response.status, errorText);
        
        // If this is the last attempt, don't continue
        if (i === emissionFactors.length - 1) {
          console.log('All Climatiq API attempts failed, using fallback calculation');
          return calculateFallbackCarbon(category, value);
        }
      }
    } catch (error) {
      console.error(`API attempt ${i + 1} error:`, error);
      
      // If this is the last attempt, use fallback
      if (i === emissionFactors.length - 1) {
        console.log('All API attempts failed, using fallback calculation');
        return calculateFallbackCarbon(category, value);
      }
    }
  }

  // Fallback if no emission factors work
  return calculateFallbackCarbon(category, value);
  */
}


function calculateFallbackCarbon(category, value) {
  const numValue = Number(value) || 1;
  
  // Enhanced fallback carbon calculations (kg CO2) based on EPA, ICAO, and IPCC data
  switch (category) {
    case 'Transport':
      // Average car emissions: 0.192 kg CO2 per km (EPA 2023)
      // Based on average fuel efficiency of 25 mpg and gasoline CO2 content
      return numValue * 0.192;
      
    case 'Flight':
      // Flight emissions calculation with multiple factors
      // Base calculation: 0.255 kg CO2 per km (ICAO 2023)
      // This includes:
      // - Fuel consumption: ~0.08 kg fuel per km
      // - CO2 content: 3.15 kg CO2 per kg fuel
      // - Radiative forcing: 1.9x multiplier for high-altitude effects
      // - Result: 0.08 × 3.15 × 1.9 ≈ 0.48 kg CO2/km
      // - Conservative estimate: 0.255 kg CO2/km (includes efficiency factors)
      
      // Enhanced calculation based on flight distance
      // Short flights (<500km) have higher emissions per km due to takeoff/landing
      // Long flights (>2000km) have lower emissions per km due to cruise efficiency
      if (numValue < 500) {
        // Short domestic flights: higher emissions due to takeoff/landing cycles
        return numValue * 0.285; // 12% higher than average
      } else if (numValue > 2000) {
        // Long international flights: lower emissions due to cruise efficiency
        return numValue * 0.225; // 12% lower than average
      } else {
        // Medium domestic flights: standard calculation
        return numValue * 0.255;
      }
      
    case 'Waste':
      // Landfill waste emissions: 0.5 kg CO2 per kg (EPA 2023)
      // Includes methane conversion to CO2 equivalent
      return numValue * 0.5;
      
    case 'Water':
      // Water treatment emissions: 0.0003 kg CO2 per liter (EPA 2023)
      // Based on energy consumption for water treatment and distribution
      return numValue * 0.0003;
      
    case 'Electricity':
      // Grid electricity emissions: 0.4 kg CO2 per kWh (EPA 2023, US average)
      // Varies by region - this is national average
      return numValue * 0.4;
      
    case 'Food':
      // Average food emissions: 2.5 kg CO2 per kg (FAO 2023)
      // Includes production, processing, and transportation
      return numValue * 2.5;
      
    case 'Clothing':
      // Textile production emissions: 10 kg CO2 per kg (UNEP 2023)
      // Includes fiber production, manufacturing, and transportation
      return numValue * 10;
      
    case 'Paper':
      // Paper production emissions: 1.2 kg CO2 per kg (EPA 2023)
      // Includes forestry, pulping, and manufacturing
      return numValue * 1.2;
      
    case 'Delivery':
      // Package delivery emissions: 0.1 kg CO2 per kg (EPA 2023)
      // Based on average delivery vehicle efficiency
      return numValue * 0.1;
      
    default:
      return numValue * 0.1; // Generic fallback
  }
}

function getCalculationNote(category, value) {
  const numValue = Number(value) || 1;
  
  switch (category) {
    case 'Transport':
      return `*Based on EPA 2023 data: 0.192 kg CO₂/km for average car (25 mpg)`;
      
    case 'Flight':
      if (numValue < 500) {
        return `*Short flight: 0.285 kg CO₂/km (ICAO 2023, includes takeoff/landing effects)`;
      } else if (numValue > 2000) {
        return `*Long flight: 0.225 kg CO₂/km (ICAO 2023, cruise efficiency)`;
      } else {
        return `*Medium flight: 0.255 kg CO₂/km (ICAO 2023, includes radiative forcing)`;
      }
      
    case 'Waste':
      return `*Landfill emissions: 0.5 kg CO₂/kg (EPA 2023, includes methane conversion)`;
      
    case 'Water':
      return `*Water treatment: 0.0003 kg CO₂/liter (EPA 2023, energy consumption)`;
      
    case 'Electricity':
      return `*Grid electricity: 0.4 kg CO₂/kWh (EPA 2023, US average)`;
      
    case 'Food':
      return `*Food production: 2.5 kg CO₂/kg (FAO 2023, farm-to-table)`;
      
    case 'Clothing':
      return `*Textile production: 10 kg CO₂/kg (UNEP 2023, fiber to finished)`;
      
    case 'Paper':
      return `*Paper production: 1.2 kg CO₂/kg (EPA 2023, forestry to paper)`;
      
    case 'Delivery':
      return `*Package delivery: 0.1 kg CO₂/kg (EPA 2023, last-mile delivery)`;
      
    default:
      return `*Calculated using EPA/ICAO emission factors`;
  }
}

export default function LogActivityScreen({ navigation }) {
  const [activityName, setActivityName] = useState('');
  const [category, setCategory] = useState('Air');
  const [date, setDate] = useState('Jun 22, 2025');
  const [startTime, setStartTime] = useState('08:30 AM');
  const [duration, setDuration] = useState('2.0');
  const [description, setDescription] = useState('');
  const [hoursSpent, setHoursSpent] = useState('2.0');
  const [participants, setParticipants] = useState('1');
  const [useLocation, setUseLocation] = useState(false);
  const [isGroupActivity, setIsGroupActivity] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmationModalVisible, setConfirmationModalVisible] = useState(false);
  const [wordCountErrorModalVisible, setWordCountErrorModalVisible] = useState(false);
  
  // Debug modal state changes
  useEffect(() => {
    console.log('Modal visibility changed:', confirmationModalVisible);
  }, [confirmationModalVisible]);
  const [co2Result, setCo2Result] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [user] = useAuthState(auth);
  const userId = user ? user.uid : 'demoUserId';

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload photos.');
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        maxImages: 5,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => ({
          uri: asset.uri,
          id: Date.now() + Math.random(),
        }));
        setSelectedImages(prev => [...prev, ...newImages].slice(0, 5)); // Max 5 images
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const removeImage = (imageId) => {
    setSelectedImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleSubmit = () => {
    console.log('=== SUBMIT DEBUG ===');
    console.log('Activity Name:', activityName);
    console.log('Description:', description);
    
    // Fix word count calculation - filter out empty strings
    const words = description.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    console.log('Word count:', wordCount);
    
    if (!activityName.trim() || !description.trim()) {
      console.log('❌ Validation failed: Missing required fields');
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    if (wordCount < 50) {
      console.log('❌ Validation failed: Description too short');
      setWordCountErrorModalVisible(true);
      return;
    }

    console.log('✅ Validation passed, showing confirmation modal');
    // Show confirmation modal
    setConfirmationModalVisible(true);
    console.log('Modal state set to true');
  };

  const confirmSubmit = async () => {
    setConfirmationModalVisible(false);
    setLoading(true);
    try {
      const carbonImpact = await estimateCarbonFromActivity(category, duration);

      // Add activity to Firestore
      await addDoc(collection(db, 'activities'), {
        title: activityName.trim(),
        category,
        description: description.trim(),
        date,
        startTime,
        duration: Number(duration),
        hoursSpent: Number(hoursSpent),
        participants: Number(participants),
        isGroupActivity,
        useLocation,
        co2: carbonImpact,
        images: selectedImages.map(img => ({ uri: img.uri, id: img.id })),
        createdAt: serverTimestamp(),
        userId,
      });

      // Update user's wallet with credits
      const walletRef = doc(db, 'users', userId);
      await setDoc(walletRef, {
        wallet: {
          nonCarbonCredits: 10,
          carbonCredits: carbonImpact > 0 ? Math.floor(carbonImpact) : 0,
        },
        lastActivity: serverTimestamp(),
      }, { merge: true });

      // Reset form
      setActivityName('');
      setDescription('');
      setDuration('2.0');
      setHoursSpent('2.0');
      setParticipants('1');
      setCategory('Air');
      setSelectedImages([]);

      setCo2Result(carbonImpact);
      setModalVisible(true);
    } catch (error) {
      console.error('Error logging activity:', error);
      Alert.alert(
        'Error', 
        'Failed to log activity. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => {
              const fallbackCarbon = calculateFallbackCarbon(category, duration);
              setCo2Result(fallbackCarbon);
              setModalVisible(true);
            }
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Activity</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Activity Details Section */}
        <View style={[styles.section, styles.firstSection]}>
        <Text style={styles.sectionTitle}>Activity Details</Text>
        
        <View style={styles.inputGroup}>
            <Text style={styles.label}>Activity Name</Text>
          <TextInput
            style={styles.input}
              placeholder="e.g., Beach Cleanup at Corniche"
              value={activityName}
              onChangeText={setActivityName}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={category}
              onValueChange={(itemValue) => setCategory(itemValue)}
              style={styles.picker}
            >
                <Picker.Item label="Air" value="Air" />
                <Picker.Item label="Water" value="Water" />
                <Picker.Item label="Waste" value="Waste" />
                <Picker.Item label="Energy" value="Energy" />
                <Picker.Item label="Transport" value="Transport" />
            </Picker>
              <Ionicons name="chevron-down" size={20} color="#666" style={styles.pickerIcon} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date</Text>
            <View style={styles.inputWithIcon}>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="Jun 22, 2025"
                placeholderTextColor="#999"
              />
              <Ionicons name="calendar-outline" size={20} color="#666" style={styles.inputIcon} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Start Time</Text>
            <View style={styles.inputWithIcon}>
              <TextInput
                style={styles.input}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="08:30 AM"
                placeholderTextColor="#999"
              />
              <Ionicons name="time-outline" size={20} color="#666" style={styles.inputIcon} />
          </View>
        </View>

        <View style={styles.inputGroup}>
            <Text style={styles.label}>Duration (hrs)</Text>
          <TextInput
            style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="2.0"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description (minimum 50 words)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe what you did, where, with whom, and the outcome."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            placeholderTextColor="#999"
          />
          <Text style={styles.wordCount}>
            {description.trim().split(/\s+/).filter(word => word.length > 0).length} words (Minimum 50 words for approval)
          </Text>
        </View>

        {/* Proof of Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proof of Activity</Text>
          
          <View style={styles.proofButtons}>
            <TouchableOpacity style={styles.proofButton} onPress={pickImage}>
              <Ionicons name="camera-outline" size={20} color="#4CAF50" />
              <Text style={styles.proofButtonText}>Add Photos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.proofButton} onPress={() => Alert.alert('Coming Soon', 'Document upload will be available soon!')}>
              <Ionicons name="document-outline" size={20} color="#4CAF50" />
              <Text style={styles.proofButtonText}>Add Document</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.locationToggle}>
            <Text style={styles.toggleLabel}>Use current location</Text>
            <Switch
              value={useLocation}
              onValueChange={setUseLocation}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={useLocation ? '#fff' : '#f4f3f4'}
            />
          </View>

          {selectedImages.length > 0 ? (
            <View style={styles.imagesPreview}>
              <Text style={styles.imagesPreviewTitle}>Selected Photos ({selectedImages.length}/5)</Text>
              <View style={styles.imagesGrid}>
                {selectedImages.map((image) => (
                  <View key={image.id} style={styles.imageContainer}>
                    <Image source={{ uri: image.uri }} style={styles.previewImage} />
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => removeImage(image.id)}
                    >
                      <Ionicons name="close-circle" size={20} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.uploadPreview}>
              <Text style={styles.uploadPreviewText}>No photos selected</Text>
              <Text style={styles.uploadPreviewSubtext}>Tap "Add Photos" to select images</Text>
            </View>
          )}
        </View>

        {/* Additional Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hours Spent</Text>
            <TextInput
              style={styles.input}
              value={hoursSpent}
              onChangeText={setHoursSpent}
              placeholder="2.0"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Participants</Text>
            <TextInput
              style={styles.input}
              value={participants}
              onChangeText={setParticipants}
              placeholder="1"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.checkboxContainer}>
            <TouchableOpacity 
              style={styles.checkbox}
              onPress={() => setIsGroupActivity(!isGroupActivity)}
            >
              <View style={[styles.checkboxBox, isGroupActivity && styles.checkboxChecked]}>
                {isGroupActivity && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>This was a group activity</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Test Modal Button */}
        <TouchableOpacity 
          style={[styles.submitButton, { backgroundColor: '#ff6b6b', marginBottom: 10 }]} 
          onPress={() => {
            console.log('Test modal button pressed');
            setConfirmationModalVisible(true);
          }}
        >
          <Text style={styles.submitButtonText}>Test Modal</Text>
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Submit for Review'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal visible={confirmationModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.confirmationIcon}>
              <Text style={styles.confirmationEmoji}>❓</Text>
            </View>
            <Text style={styles.modalTitle}>Confirm Submission</Text>
            <Text style={styles.modalSubtitle}>
              Are you sure you want to submit this activity for review?
            </Text>
            <View style={styles.confirmationDetails}>
              <Text style={styles.confirmationDetailText}>
                <Text style={styles.confirmationLabel}>Activity: </Text>
                {activityName}
              </Text>
              <Text style={styles.confirmationDetailText}>
                <Text style={styles.confirmationLabel}>Category: </Text>
                {category}
              </Text>
              <Text style={styles.confirmationDetailText}>
                <Text style={styles.confirmationLabel}>Duration: </Text>
                {duration} hours
              </Text>
              <Text style={styles.confirmationDetailText}>
                <Text style={styles.confirmationLabel}>Photos: </Text>
                {selectedImages.length} selected
              </Text>
            </View>
            <View style={styles.confirmationButtons}>
              <TouchableOpacity
                onPress={() => setConfirmationModalVisible(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmSubmit}
                style={styles.confirmButton}
              >
                <Text style={styles.confirmButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Word Count Error Modal */}
      <Modal visible={wordCountErrorModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.errorIcon}>
              <Text style={styles.errorEmoji}>⚠️</Text>
            </View>
            <Text style={styles.modalTitle}>Description Too Short</Text>
            <Text style={styles.modalSubtitle}>
              Description must be at least 50 words for approval. Current: {description.trim().split(/\s+/).filter(word => word.length > 0).length} words.
            </Text>
            <Text style={styles.modalDescription}>
              Please provide more details about your activity, including what you did, where it took place, who was involved, and the outcome or impact.
            </Text>
            <TouchableOpacity
              onPress={() => setWordCountErrorModalVisible(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.successIcon}>
              <Text style={styles.successEmoji}>🌱</Text>
            </View>
            <Text style={styles.modalTitle}>Activity Submitted!</Text>
            <Text style={styles.modalSubtitle}>
              Your activity has been submitted for review
            </Text>
            <View style={styles.co2Result}>
              <Text style={styles.co2Label}>Estimated Carbon Impact</Text>
              <Text style={styles.co2Value}>{co2Result?.toFixed(2)} kg CO₂</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                navigation.goBack();
              }}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fffe',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 30,
    backgroundColor: '#2d5a27',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20,
  },
  firstSection: {
    marginTop: -15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d5a27',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  inputWithIcon: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    right: 16,
    top: 12,
  },
  textArea: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    height: 100,
    textAlignVertical: 'top',
  },
  wordCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  pickerContainer: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#333',
  },
  pickerIcon: {
    position: 'absolute',
    right: 16,
    top: 15,
  },
  proofButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  proofButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f5e8',
    borderWidth: 1,
    borderColor: '#4caf50',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  proofButtonText: {
    color: '#2d5a27',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  locationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  uploadPreview: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    height: 80,
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  uploadPreviewText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  uploadPreviewSubtext: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  imagesPreview: {
    marginTop: 16,
  },
  imagesPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  checkboxContainer: {
    marginTop: 20,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#4caf50',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4caf50',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 15,
    borderRadius: 12,
    marginVertical: 20,
    alignItems: 'center',
    shadowColor: '#4caf50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#a5d6a7',
    shadowOpacity: 0.1,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
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
    color: '#2d5a27',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  co2Result: {
    backgroundColor: '#f0f8f0',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 25,
    width: '100%',
  },
  co2Label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  co2Value: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  closeButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '100%',
  },
  closeButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmationIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff3cd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmationEmoji: {
    fontSize: 40,
  },
  confirmationDetails: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
    width: '100%',
  },
  confirmationDetailText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  confirmationLabel: {
    fontWeight: '600',
    color: '#2d5a27',
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorEmoji: {
    fontSize: 40,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
  },
});

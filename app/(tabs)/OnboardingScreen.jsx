import { Picker } from '@react-native-picker/picker';
import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }) {
  const [role, setRole] = useState('Student');
  const [name, setName] = useState('');
  const [step, setStep] = useState(1);

  const handleContinue = () => {
    if (step === 1) {
      setStep(2);
    } else {
      navigation.navigate('Dashboard');
    }
  };

  const handleSkip = () => {
    navigation.navigate('Dashboard');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text style={styles.title}>Welcome to EcoChain</Text>
        <Text style={styles.subtitle}>
          {step === 1 ? 'Let\'s get to know you better' : 'Choose your sustainability journey'}
        </Text>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: step === 1 ? '50%' : '100%' }]} />
      </View>

      {/* Content Card */}
      <View style={styles.contentCard}>
        {step === 1 ? (
          <>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>What's your name? *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                onChangeText={setName}
                value={name}
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>What's your role? *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={role}
                  onValueChange={(itemValue) => setRole(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Student" value="Student" />
                  <Picker.Item label="Teacher" value="Teacher" />
                  <Picker.Item label="Professional" value="Professional" />
                  <Picker.Item label="Environmentalist" value="Environmentalist" />
                </Picker>
              </View>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Your Sustainability Goals</Text>
            <View style={styles.goalsContainer}>
              <View style={styles.goalItem}>
                <Text style={styles.goalEmoji}>🌱</Text>
                <Text style={styles.goalTitle}>Track Carbon Footprint</Text>
                <Text style={styles.goalDescription}>Monitor your daily environmental impact</Text>
              </View>
              <View style={styles.goalItem}>
                <Text style={styles.goalEmoji}>♻️</Text>
                <Text style={styles.goalTitle}>Earn Green Credits</Text>
                <Text style={styles.goalDescription}>Get rewarded for sustainable actions</Text>
              </View>
              <View style={styles.goalItem}>
                <Text style={styles.goalEmoji}>🏆</Text>
                <Text style={styles.goalTitle}>Achieve Badges</Text>
                <Text style={styles.goalDescription}>Unlock achievements and milestones</Text>
              </View>
            </View>
          </>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, (!name.trim() && step === 1) && styles.buttonDisabled]} 
            onPress={handleContinue}
            disabled={!name.trim() && step === 1}
          >
            <Text style={styles.buttonText}>
              {step === 1 ? 'Continue' : 'Get Started'}
            </Text>
          </TouchableOpacity>
          
          {step === 1 && (
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          )}
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
  headerSection: {
    backgroundColor: '#2d5a27',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#a8d5a8',
    textAlign: 'center',
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#e8f5e8',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4caf50',
    borderRadius: 2,
  },
  contentCard: {
    backgroundColor: 'white',
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d5a27',
    marginBottom: 20,
    textAlign: 'center',
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
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fafafa',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  goalsContainer: {
    gap: 15,
  },
  goalItem: {
    backgroundColor: '#f0f8f0',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  goalEmoji: {
    fontSize: 32,
    marginBottom: 10,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d5a27',
    marginBottom: 5,
    textAlign: 'center',
  },
  goalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 20,
  },
  button: {
    backgroundColor: '#4caf50',
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#4caf50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#a5d6a7',
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 10,
  },
  skipButtonText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 14,
  },
});

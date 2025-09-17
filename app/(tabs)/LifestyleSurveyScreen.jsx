import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../../config/firebase';

const { width } = Dimensions.get('window');

const surveyQuestions = [
  {
    id: 1,
    question: "How do you usually get to school?",
    options: [
      { id: 'school_bus', text: 'School Bus', emoji: '🚌', co2Factor: 0.05 }, // kg CO2 per km
      { id: 'walk', text: 'Walk', emoji: '🚶', co2Factor: 0 },
      { id: 'bicycle', text: 'Bicycle', emoji: '🚴', co2Factor: 0 },
      { id: 'private_car', text: 'Private Car', emoji: '🚗', co2Factor: 0.192 },
      { id: 'rideshare', text: 'Ride-share / Taxi', emoji: '🚕', co2Factor: 0.192 },
    ]
  },
  {
    id: 2,
    question: "How often do you eat meat?",
    options: [
      { id: 'daily', text: 'Daily', emoji: '🥩', co2Factor: 7.2 }, // kg CO2 per day
      { id: 'few_times_week', text: 'Few times a week', emoji: '🍖', co2Factor: 3.6 },
      { id: 'weekly', text: 'Once a week', emoji: '🍗', co2Factor: 1.8 },
      { id: 'rarely', text: 'Rarely', emoji: '🥬', co2Factor: 0.5 },
      { id: 'never', text: 'Never (Vegetarian/Vegan)', emoji: '🌱', co2Factor: 0.2 },
    ]
  },
  {
    id: 3,
    question: "How do you usually shop for clothes?",
    options: [
      { id: 'fast_fashion', text: 'Fast Fashion Brands', emoji: '👕', co2Factor: 15 }, // kg CO2 per item
      { id: 'mid_range', text: 'Mid-range Brands', emoji: '👔', co2Factor: 8 },
      { id: 'sustainable', text: 'Sustainable/Ethical Brands', emoji: '🌿', co2Factor: 3 },
      { id: 'second_hand', text: 'Second-hand/Thrift', emoji: '♻️', co2Factor: 1 },
      { id: 'rarely', text: 'Rarely buy new clothes', emoji: '👖', co2Factor: 0.5 },
    ]
  },
  {
    id: 4,
    question: "How often do you use air conditioning?",
    options: [
      { id: 'always', text: 'Always on', emoji: '❄️', co2Factor: 0.8 }, // kg CO2 per day
      { id: 'often', text: 'Often', emoji: '🌡️', co2Factor: 0.5 },
      { id: 'sometimes', text: 'Sometimes', emoji: '🌤️', co2Factor: 0.2 },
      { id: 'rarely', text: 'Rarely', emoji: '🌿', co2Factor: 0.05 },
      { id: 'never', text: 'Never', emoji: '🌱', co2Factor: 0 },
    ]
  },
  {
    id: 5,
    question: "How do you usually travel for vacations?",
    options: [
      { id: 'flying', text: 'Flying', emoji: '✈️', co2Factor: 0.255 }, // kg CO2 per km
      { id: 'driving', text: 'Driving', emoji: '🚗', co2Factor: 0.192 },
      { id: 'train', text: 'Train', emoji: '🚂', co2Factor: 0.041 },
      { id: 'bus', text: 'Bus', emoji: '🚌', co2Factor: 0.089 },
      { id: 'local', text: 'Stay local/No travel', emoji: '🏠', co2Factor: 0 },
    ]
  },
  {
    id: 6,
    question: "How often do you buy new electronics?",
    options: [
      { id: 'frequently', text: 'Frequently (every 1-2 years)', emoji: '📱', co2Factor: 50 }, // kg CO2 per device
      { id: 'regularly', text: 'Regularly (every 3-4 years)', emoji: '💻', co2Factor: 25 },
      { id: 'occasionally', text: 'Occasionally (every 5+ years)', emoji: '⌚', co2Factor: 10 },
      { id: 'rarely', text: 'Rarely', emoji: '🔧', co2Factor: 2 },
      { id: 'never', text: 'Only when broken', emoji: '♻️', co2Factor: 0.5 },
    ]
  },
  {
    id: 7,
    question: "How do you usually dispose of waste?",
    options: [
      { id: 'mixed', text: 'Mixed waste (no sorting)', emoji: '🗑️', co2Factor: 0.5 }, // kg CO2 per kg waste
      { id: 'partial', text: 'Partial recycling', emoji: '♻️', co2Factor: 0.3 },
      { id: 'good', text: 'Good recycling habits', emoji: '🌱', co2Factor: 0.1 },
      { id: 'excellent', text: 'Excellent (composting, etc.)', emoji: '🌿', co2Factor: 0.05 },
      { id: 'zero', text: 'Zero waste lifestyle', emoji: '♻️', co2Factor: 0.01 },
    ]
  }
];

export default function LifestyleSurveyScreen({ navigation }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [carbonResults, setCarbonResults] = useState(null);

  const [user] = useAuthState(auth);
  const userId = user ? user.uid : 'demoUserId';

  const handleOptionSelect = (optionId) => {
    setSelectedOption(optionId);
  };

  const handleNext = () => {
    if (!selectedOption) {
      Alert.alert('Please select an option', 'You need to select an answer to continue.');
      return;
    }

    const question = surveyQuestions[currentQuestion];
    const selectedAnswer = question.options.find(opt => opt.id === selectedOption);
    
    // Save the answer
    setAnswers(prev => ({
      ...prev,
      [question.id]: {
        optionId: selectedOption,
        co2Factor: selectedAnswer.co2Factor,
        text: selectedAnswer.text
      }
    }));

    if (currentQuestion < surveyQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedOption(null);
    } else {
      // Calculate carbon footprint and save results
      calculateAndSaveCarbonFootprint();
    }
  };

  const calculateAndSaveCarbonFootprint = async () => {
    setLoading(true);
    try {
      // Calculate daily carbon footprint based on answers
      let dailyCarbonFootprint = 0;
      
      // Transportation (assuming 10km daily commute)
      const transportAnswer = answers[1];
      if (transportAnswer) {
        dailyCarbonFootprint += transportAnswer.co2Factor * 10; // 10km daily
      }

      // Diet
      const dietAnswer = answers[2];
      if (dietAnswer) {
        dailyCarbonFootprint += dietAnswer.co2Factor;
      }

      // Clothing (assuming 1 item per month)
      const clothingAnswer = answers[3];
      if (clothingAnswer) {
        dailyCarbonFootprint += clothingAnswer.co2Factor / 30; // Monthly to daily
      }

      // Air conditioning
      const acAnswer = answers[4];
      if (acAnswer) {
        dailyCarbonFootprint += acAnswer.co2Factor;
      }

      // Travel (assuming 2 trips per year, 1000km each)
      const travelAnswer = answers[5];
      if (travelAnswer) {
        dailyCarbonFootprint += (travelAnswer.co2Factor * 2000) / 365; // Annual to daily
      }

      // Electronics (assuming 1 device per year)
      const electronicsAnswer = answers[6];
      if (electronicsAnswer) {
        dailyCarbonFootprint += electronicsAnswer.co2Factor / 365; // Annual to daily
      }

      // Waste (assuming 1kg per day)
      const wasteAnswer = answers[7];
      if (wasteAnswer) {
        dailyCarbonFootprint += wasteAnswer.co2Factor;
      }

      // Convert to annual footprint
      const annualCarbonFootprint = dailyCarbonFootprint * 365;
      const monthlyCarbonFootprint = dailyCarbonFootprint * 30;

      // Save survey results to Firebase
      await setDoc(doc(db, 'users', userId), {
        lifestyleSurvey: {
          answers,
          dailyCarbonFootprint: parseFloat(dailyCarbonFootprint.toFixed(2)),
          monthlyCarbonFootprint: parseFloat(monthlyCarbonFootprint.toFixed(2)),
          annualCarbonFootprint: parseFloat(annualCarbonFootprint.toFixed(2)),
          completedAt: serverTimestamp(),
        },
        lastUpdated: serverTimestamp(),
      }, { merge: true });

      // Set results and show modal
      setCarbonResults({
        daily: parseFloat(dailyCarbonFootprint.toFixed(2)),
        monthly: parseFloat(monthlyCarbonFootprint.toFixed(2)),
        annual: parseFloat(annualCarbonFootprint.toFixed(2)),
      });
      setModalVisible(true);

    } catch (error) {
      console.error('Error saving survey results:', error);
      Alert.alert('Error', 'Failed to save survey results. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      setSelectedOption(null);
    } else {
      navigation.goBack();
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setCarbonResults(null);
  };

  const handleViewDashboard = () => {
    setModalVisible(false);
    navigation.navigate('MainTabs');
  };

  const progress = ((currentQuestion + 1) / surveyQuestions.length) * 100;
  const currentQ = surveyQuestions[currentQuestion];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.questionNumber}>{currentQuestion + 1} of {surveyQuestions.length}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* Question */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{currentQ.question}</Text>
      </View>

      {/* Options */}
      <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
        {currentQ.options.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionButton,
              selectedOption === option.id && styles.selectedOption
            ]}
            onPress={() => handleOptionSelect(option.id)}
          >
            <Text style={styles.optionEmoji}>{option.emoji}</Text>
            <Text style={[
              styles.optionText,
              selectedOption === option.id && styles.selectedOptionText
            ]}>
              {option.text}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.backButton]}
          onPress={handleBack}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.nextButton,
            !selectedOption && styles.disabledButton
          ]}
          onPress={handleNext}
          disabled={!selectedOption || loading}
        >
          <Text style={styles.nextButtonText}>
            {loading ? 'Calculating...' : currentQuestion === surveyQuestions.length - 1 ? 'Finish' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Success Icon */}
            <View style={styles.successIcon}>
              <Text style={styles.successEmoji}>🌱</Text>
            </View>

            {/* Modal Title */}
            <Text style={styles.modalTitle}>Survey Complete!</Text>
            <Text style={styles.modalSubtitle}>Your carbon footprint has been calculated</Text>

            {/* Carbon Footprint Results */}
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Your Carbon Footprint</Text>
              
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Daily</Text>
                <Text style={styles.resultValue}>{carbonResults?.daily} kg CO₂</Text>
              </View>
              
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Monthly</Text>
                <Text style={styles.resultValue}>{carbonResults?.monthly} kg CO₂</Text>
              </View>
              
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>Annual</Text>
                <Text style={styles.resultValue}>{carbonResults?.annual} kg CO₂</Text>
              </View>
            </View>

            {/* Environmental Impact Message */}
            <View style={styles.impactMessage}>
              <Text style={styles.impactText}>
                {carbonResults?.annual < 2000 
                  ? "🌿 Great job! You have a low carbon footprint. Keep up the sustainable habits!"
                  : carbonResults?.annual < 4000
                  ? "🌱 Good effort! Your carbon footprint is moderate. There's room for improvement."
                  : "🌍 Your carbon footprint is high. Consider making some lifestyle changes to reduce your impact."
                }
              </Text>
            </View>

            {/* Modal Buttons */}
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={handleModalClose}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.dashboardButton]}
                onPress={handleViewDashboard}
              >
                <Text style={styles.dashboardButtonText}>View Dashboard</Text>
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
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  questionNumber: {
    fontSize: 16,
    color: '#AAAAAA',
    marginBottom: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
    borderRadius: 2,
  },
  questionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  questionText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    lineHeight: 32,
  },
  optionsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 15,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    borderColor: '#4caf50',
    backgroundColor: '#2a4a2a',
  },
  optionEmoji: {
    fontSize: 24,
    marginRight: 15,
  },
  optionText: {
    fontSize: 18,
    color: 'white',
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#4caf50',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 15,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#666',
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#4caf50',
  },
  disabledButton: {
    backgroundColor: '#666',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2a4a2a',
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
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#AAAAAA',
    textAlign: 'center',
    marginBottom: 30,
  },
  resultsContainer: {
    width: '100%',
    backgroundColor: '#2a2a2a',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4caf50',
    textAlign: 'center',
    marginBottom: 20,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  resultLabel: {
    fontSize: 16,
    color: '#AAAAAA',
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  impactMessage: {
    backgroundColor: '#2a4a2a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 25,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  impactText: {
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 15,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#666',
  },
  closeButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  dashboardButton: {
    backgroundColor: '#4caf50',
  },
  dashboardButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

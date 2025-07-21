import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { auth, db } from "../../config/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  setDoc,
} from "firebase/firestore";
import estimateCarbonFromActivity from "./climatiq";
import { useAuthState } from "react-firebase-hooks/auth";

export default function LogActivityScreen({ navigation }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [desc, setDesc] = useState("");
  const [user] = useAuthState(auth);
  const userId = user ? user.uid : "demoUserId"; // Replace with actual Firebase Auth user ID

  const handleSubmit = async () => {
    try {
      const carbonImpact = await estimateCarbonFromActivity(title, category);

      // Save activity log
      await addDoc(collection(db, "activities"), {
        title,
        category,
        desc,
        co2: carbonImpact,
        createdAt: serverTimestamp(),
        userId,
      });

      const walletRef = doc(db, "users", userId);
      await setDoc(
        walletRef,
        {
          wallet: {
            nonCarbonCredits: 10,
            carbonCredits: carbonImpact > 0 ? 1 : 0,
          },
        },
        { merge: true }
      ); // ✅ creates or updates

      Alert.alert("Success", "Activity logged and credits updated.");
      navigation.goBack();
    } catch (error) {
      console.error("Error logging activity:", error);
      Alert.alert("Error", "Failed to log activity.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Log Activity</Text>
      <TextInput
        style={styles.input}
        placeholder="Activity Title"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={styles.input}
        placeholder="Category (e.g. Waste, Water)"
        value={category}
        onChangeText={setCategory}
      />
      <TextInput
        style={styles.input}
        placeholder="Description"
        value={desc}
        onChangeText={setDesc}
        multiline
      />
      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    marginBottom: 15,
    padding: 10,
  },
  button: { backgroundColor: "#28a745", padding: 12, borderRadius: 5 },
  buttonText: { color: "white", textAlign: "center" },
});

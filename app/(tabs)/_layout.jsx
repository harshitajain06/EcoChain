// src/navigation/StackLayout.jsx
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { createStackNavigator } from "@react-navigation/stack";
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from "react";
import { useAuthState } from 'react-firebase-hooks/auth';
import { Alert } from 'react-native';
import { auth, db } from "../../config/firebase";
import { Colors } from "../../constants/Colors";
import { useColorScheme } from "../../hooks/useColorScheme";
import ActivityLibraryScreen from "./ActivityLibraryScreen";
import CalendarScreen from "./CalendarScreen";
import CompleteProfileScreen from "./CompleteProfileScreen";
import DashboardScreen from "./DashboardScreen";
import LoginRegister from './index';
import LifestyleSurveyScreen from "./LifestyleSurveyScreen";
import LogActivityScreen from "./LogActivityScreen";
import RewardsScreen from "./RewardsScreen";


const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Bottom Tab Navigator Component
const BottomTabs = () => {
  const colorScheme = useColorScheme();
  const [user] = useAuthState(auth);
  const [userRole, setUserRole] = useState('student');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role || 'student');
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserRole();
  }, [user]);

  // If loading, show a simple loading screen
  if (loading) {
    return null;
  }

  const isStaff = userRole === 'staff';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarInactiveTintColor: "gray",
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? "light"].background,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Dashboard" || route.name === "Calendar") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Log Activity") {
            iconName = focused ? "pulse" : "pulse-outline";
          } else if (route.name === "Rewards") {
            iconName = focused ? "trophy" : "trophy-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      {isStaff ? (
        <Tab.Screen 
          name="Calendar" 
          component={CalendarScreen}
          options={{ title: "Calendar" }}
        />
      ) : (
        <>
          <Tab.Screen name="Dashboard" component={DashboardScreen} />
          <Tab.Screen
            name="Log Activity"
            component={LogActivityScreen}
            options={{ title: "Log Activity" }}
          />
          <Tab.Screen
            name="Rewards"
            component={RewardsScreen}
            options={{ title: "Rewards" }}
          />
        </>
      )}
    </Tab.Navigator>
  );
};

// Drawer Navigator Component
const DrawerNavigator = () => {
  const navigation = useNavigation();
  const [user] = useAuthState(auth);
  const [userRole, setUserRole] = useState('student');

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role || 'student');
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      }
    };

    fetchUserRole();
  }, [user]);

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        navigation.replace("LoginRegister");
      })
      .catch((err) => {
        console.error("Logout Error:", err);
        Alert.alert("Error", "Failed to logout. Please try again.");
      });
  };

  const isStaff = userRole === 'staff';

  return (
    <Drawer.Navigator initialRouteName="MainTabs">
      <Drawer.Screen name="MainTabs" component={BottomTabs} options={{ title: 'Home' }} />
      
      {!isStaff && (
        <>
          <Drawer.Screen
            name="CompleteProfile"
            component={CompleteProfileScreen}
            options={{
              title: 'Complete Profile',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="person-outline" size={size} color={color} />
              ),
            }}
          />
          
          <Drawer.Screen
            name="LifestyleSurvey"
            component={LifestyleSurveyScreen}
            options={{
              title: 'Lifestyle Survey',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="clipboard-outline" size={size} color={color} />
              ),
            }}
          />
          
          <Drawer.Screen
            name="ActivityLibrary"
            component={ActivityLibraryScreen}
            options={{
              title: 'Activity Library',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="library-outline" size={size} color={color} />
              ),
            }}
          />
        </>
      )}
      
      <Drawer.Screen
        name="Logout"
        component={BottomTabs}
        options={{
          title: 'Logout',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="log-out-outline" size={size} color={color} />
          ),
        }}
        listeners={{
          drawerItemPress: (e) => {
            e.preventDefault();
            handleLogout();
          },
        }}
      />
    </Drawer.Navigator>
  );
};

// Stack Navigator Component
export default function StackLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: Colors[colorScheme ?? "light"].background,
        },
      }}
    >
    <Stack.Screen name="LoginRegister" component={LoginRegister} />
      <Stack.Screen name="Drawer" component={DrawerNavigator} />
    </Stack.Navigator>
  );
}

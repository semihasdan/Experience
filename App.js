import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Main from './screens/mainStack/Main';
import Search from './screens/searchStack/Search';
import Message from './screens/messageStack/Message';
import Profile from './screens/profileStack/Profile';
import ChatDetails from './screens/mainStack/ChatDetails';
import CreateJobAd from './screens/mainStack/CreateJobAd';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import SignIn from './screens/SignIn';
import SignUp from './screens/SignUp';
import Notifications from './screens/notificationStack/Notifications';
import ApplyScreen from './screens/mainStack/ApplyScreen';
import Chat from './screens/messageStack/Chat';
import firebase from 'firebase/compat';
import Cv from './screens/profileStack/Cv';
import PortfolioAddScreen from './screens/profileStack/PortfolioAddScreen';
import ChatProfile from './screens/messageStack/ChatProfile';
import Accounting from './screens/profileStack/Accounting';
import { Dimensions } from 'react-native';



const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const { width, height } = Dimensions.get('window');

const rw = (num) => (width * num) / 100;
const rh = (num) => (height * num) / 100;

const AuthStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="SignIn" component={SignIn} options={{ headerShown: false, }} />
    <Stack.Screen name="SignUp" component={SignUp} options={{ headerShown: false, }} />
    <Stack.Screen name="Main" component={Main} options={{ headerShown: false, }} />
    <Stack.Screen name="Profile" component={Profile} options={{ headerShown: false, }} />
  </Stack.Navigator>
);

const MainStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="Main" component={Main} options={{ headerShown: false, }} />
    <Stack.Screen name="ChatDetails" component={ChatDetails} options={{ headerShown: false, }} />
    <Stack.Screen name="CreateJobAd" component={CreateJobAd} options={{ headerShown: false, }} />
    <Stack.Screen name="Profile" component={Profile} options={{ headerShown: false, }} />
    <Stack.Screen name="ApplyScreen" component={ApplyScreen} options={{ headerShown: false, }} />
    <Stack.Screen name="Cv" component={Cv} options={{ headerShown: false, }} />
    <Stack.Screen name="PortfolioAddScreen" component={PortfolioAddScreen} options={{ headerShown: false, }} />
    <Stack.Screen name="Accounting" component={Accounting} options={{ headerShown: false, }} />
  </Stack.Navigator>
);
const SearchStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="Search" component={Search} options={{ headerShown: false, }} />
    <Stack.Screen name="ChatDetails" component={ChatDetails} options={{ headerShown: false, }} />
    <Stack.Screen name="CreateJobAd" component={CreateJobAd} options={{ headerShown: false, }} />
    <Stack.Screen name="ApplyScreen" component={ApplyScreen} options={{ headerShown: false, }} />
  </Stack.Navigator>
)


const MessageStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="Message" component={Message} options={{ headerShown: false }} />
    <Stack.Screen name="Chat" component={Chat} options={{
      headerShown: false, headerTitle: 'Chat', tabBarVisible: false,}} />
     <Stack.Screen name="ChatProfile" component={ChatProfile} options={{ headerShown: false }} />
     <Stack.Screen name="ChatDetails" component={ChatDetails} options={{ headerShown: false, }} />
  </Stack.Navigator>
);
const NotificationsStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="Notifications" component={Notifications} options={{ headerShown: false }} />
    <Stack.Screen name="Message" component={Message} options={{ headerShown: false }} />
    <Stack.Screen name="ChatDetails" component={ChatDetails} options={{ headerShown: false, }} />
    <Stack.Screen name="Chat" component={Chat} options={{
      headerShown: false, headerTitle: 'Chat', tabBarVisible: false,
    }}
    />
  </Stack.Navigator>
);

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged((authUser) => {
      setUser(authUser);
    });
    return () => unsubscribe();
  }, []);

  const tabBarOptions = {
    tabBarActiveTintColor: '#008000',
    tabBarInactiveTintColor: 'gray',
    tabBarShowLabel: true,
    tabBarLabelStyle: {
      fontSize: rw(3),
      fontWeight: 'bold',
    },
    tabBarIconStyle: { marginTop: rh(0.5) },
  };

  if (user) {
    return (
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarActiveTintColor: '#008000',
            ...tabBarOptions,
            tabBarInactiveTintColor: 'gray',
            tabBarStyle: [
              {
                display: 'flex',
              },
              null,
            ],
            tabBarIcon: ({ color, size }) => {
              let iconName;

              if (route.name === 'Home') {
                iconName = 'home';
              } else if (route.name === 'SearchStack') {
                iconName = 'magnify';
              } else if (route.name === 'MessageStack') {
                iconName = 'message-processing';
              } else if (route.name === 'NotificationsStack') {
                iconName = 'bell-circle-outline';
              }

              return <MaterialCommunityIcons name={iconName} size={30} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Home" component={MainStack} options={{ headerShown: false, title: "Home" }} />
          <Tab.Screen name="SearchStack" component={SearchStack} options={{ headerShown: false, title: "Search" }} />
          <Tab.Screen name="MessageStack" component={MessageStack} options={{ headerShown: false, title: "Message" }} />
          <Tab.Screen name="NotificationsStack" component={NotificationsStack} options={{ headerShown: false, title: "Notifications" }} />
        </Tab.Navigator>
      </NavigationContainer>
    );
  } else {
    return (


      <NavigationContainer>
        <AuthStack />
      </NavigationContainer>

    );
  }
}
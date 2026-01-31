import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import TranslateScreen from '../screens/TranslateScreen';
import ListenScreen from '../screens/ListenScreen';
import RealtimeWebScreen from '../screens/RealtimeWebScreen';
import { THEME } from '../constants';

// Import our custom icon components
import { HomeIcon } from '../components/icons/HomeIcon';
import { TranslateIcon } from '../components/icons/TranslateIcon';
import { ListenIcon } from '../components/icons/ListenIcon';
import { RealtimeIcon } from '../components/icons/RealtimeIcon';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarShowLabel: false,
                tabBarActiveTintColor: THEME.accent,
                tabBarInactiveTintColor: '#C7C7CC',
                tabBarIcon: ({ focused, color }) => {
                    const size = 28;
                    // You can also change the icon style when focused (e.g. thicker stroke)
                    // But here we rely on color change mainly.

                    if (route.name === 'Home') {
                        return <HomeIcon size={size} color={color} />;
                    } else if (route.name === 'Translate') {
                        return <TranslateIcon size={size} color={color} />;
                    } else if (route.name === 'Listen') {
                    } else if (route.name === 'Listen') {
                        return <ListenIcon size={size} color={color} />;
                    } else if (route.name === 'Realtime') {
                        return <RealtimeIcon size={size} color={color} />;
                    }
                    return null;
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Realtime" component={RealtimeWebScreen} options={{ tabBarLabel: 'Realtime' }} />
            <Tab.Screen name="Translate" component={TranslateScreen} />
            <Tab.Screen name="Listen" component={ListenScreen} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: '#FFF',
        borderTopColor: '#F2F2F7',
        borderTopWidth: 1,
        height: 90,
        paddingTop: 10,
        paddingBottom: 25,
    },
});

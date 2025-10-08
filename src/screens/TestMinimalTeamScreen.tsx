import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const TestMinimalTeamScreen: React.FC<any> = (props) => {
  console.log('[TestMinimalTeamScreen] 🚀 MINIMAL COMPONENT RENDERED');
  console.log('[TestMinimalTeamScreen] Props keys:', Object.keys(props));

  // Try to get team from either navigation props or direct props
  const team = props.data?.team || props.route?.params?.team || props.team;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>MINIMAL TEAM SCREEN</Text>
        <Text style={styles.text}>Team: {team?.name || 'Unknown'}</Text>
        <Text style={styles.text}>ID: {team?.id || 'Unknown'}</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            console.log('[TestMinimalTeamScreen] Back button pressed');
            if (props.onBack) {
              props.onBack();
            } else if (props.navigation) {
              props.navigation.goBack();
            }
          }}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  button: {
    marginTop: 30,
    backgroundColor: '#FF7B1C',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TestMinimalTeamScreen;
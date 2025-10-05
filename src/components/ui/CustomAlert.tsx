/**
 * CustomAlert - Black/Orange themed alert modal
 * Replaces React Native's unstyled Alert.alert() with themed modal
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { theme } from '../../styles/theme';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onClose: () => void;
}

export const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  buttons = [{ text: 'OK', style: 'default' }],
  onClose,
}) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    onClose();
  };

  const getButtonStyle = (style?: string) => {
    switch (style) {
      case 'destructive':
        return styles.destructiveButton;
      case 'cancel':
        return styles.cancelButton;
      default:
        return styles.defaultButton;
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.alertBox, { opacity: fadeAnim }]}>
          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          {message && <Text style={styles.message}>{message}</Text>}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.button, getButtonStyle(button.style)]}
                onPress={() => handleButtonPress(button)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.buttonText,
                    button.style === 'destructive' && styles.destructiveButtonText,
                  ]}
                >
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Static helper method for imperative usage
let alertInstance: {
  show: (
    title: string,
    message?: string,
    buttons?: AlertButton[]
  ) => void;
} | null = null;

export const CustomAlertManager = {
  register: (
    instance: {
      show: (title: string, message?: string, buttons?: AlertButton[]) => void;
    }
  ) => {
    alertInstance = instance;
  },
  alert: (title: string, message?: string, buttons?: AlertButton[]) => {
    if (alertInstance) {
      alertInstance.show(title, message, buttons);
    }
  },
};

// Provider component that should wrap your app
export const CustomAlertProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [alertState, setAlertState] = React.useState<{
    visible: boolean;
    title: string;
    message?: string;
    buttons?: AlertButton[];
  }>({
    visible: false,
    title: '',
    message: '',
    buttons: [{ text: 'OK', style: 'default' }],
  });

  React.useEffect(() => {
    CustomAlertManager.register({
      show: (title, message, buttons) => {
        setAlertState({
          visible: true,
          title,
          message,
          buttons: buttons || [{ text: 'OK', style: 'default' }],
        });
      },
    });
  }, []);

  return (
    <>
      {children}
      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={() => setAlertState({ ...alertState, visible: false })}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    backgroundColor: theme.colors.cardBackground, // #0a0a0a
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.orangeDeep, // Orange border
    padding: 24,
    width: '100%',
    maxWidth: 320,
    shadowColor: theme.colors.orangeDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.orangeBright, // Orange title
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: theme.colors.text, // Light orange text
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultButton: {
    backgroundColor: theme.colors.orangeDeep, // Deep orange
    borderWidth: 1,
    borderColor: theme.colors.orangeBright,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  destructiveButton: {
    backgroundColor: theme.colors.error,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: theme.typography.weights.semiBold,
    color: theme.colors.background, // Black text on orange
  },
  destructiveButtonText: {
    color: theme.colors.text, // Light orange on red
  },
});

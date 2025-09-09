import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { theme } from '../../styles/theme';

interface DropdownMenuItem {
  id: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface DropdownMenuProps {
  visible: boolean;
  onClose: () => void;
  items: DropdownMenuItem[];
  anchorPosition?: { top: number; right: number };
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  visible,
  onClose,
  items,
  anchorPosition = { top: 60, right: 20 },
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={[
            styles.menuContainer,
            {
              position: 'absolute',
              top: anchorPosition.top,
              right: anchorPosition.right,
            },
          ]}
        >
          {items.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                index === 0 && styles.firstMenuItem,
                index === items.length - 1 && styles.lastMenuItem,
              ]}
              onPress={() => {
                item.onPress();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.menuItemText,
                  item.destructive && styles.destructiveText,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menuContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  firstMenuItem: {
    borderTopLeftRadius: theme.borderRadius.medium,
    borderTopRightRadius: theme.borderRadius.medium,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: theme.borderRadius.medium,
    borderBottomRightRadius: theme.borderRadius.medium,
  },
  menuItemText: {
    fontSize: theme.typography.aboutText,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
  destructiveText: {
    color: '#ff4444',
  },
});

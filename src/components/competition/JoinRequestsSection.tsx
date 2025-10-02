/**
 * JoinRequestsSection - Feed of pending join requests with pull-to-refresh
 * Clean black and white minimalistic design
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { theme } from '../../styles/theme';
import { JoinRequestCard, type JoinRequest } from './JoinRequestCard';

interface JoinRequestsSectionProps {
  requests: JoinRequest[];
  onApprove: (request: JoinRequest) => Promise<void>;
  onReject: (request: JoinRequest) => Promise<void>;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const JoinRequestsSection: React.FC<JoinRequestsSectionProps> = ({
  requests,
  onApprove,
  onReject,
  isRefreshing,
  onRefresh,
}) => {
  if (requests.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No pending requests</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Join Requests</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{requests.length}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.text}
            colors={[theme.colors.text]}
          />
        }
      >
        {requests.map((request) => (
          <JoinRequestCard
            key={request.id}
            request={request}
            onApprove={onApprove}
            onReject={onReject}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.textMuted,
  },
});

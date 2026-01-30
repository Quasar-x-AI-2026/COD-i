import { useRouter } from "expo-router";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  MoveLeft,
  TrendingUp,
  XCircle,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

// --- CONFIGURATION ---
const COLORS = {
  primary: "#C4E45F",
  primaryLight: "#F0F8E8",
  background: "#FFFFFF",
  card: "#FFFFFF",
  text: "#000000",
  textSecondary: "#666666",
  border: "#E0E0E0",
  success: "#10B981",
  danger: "#FF453A",
  warning: "#F59E0B",
  shadow: "rgba(0, 0, 0, 0.1)",
};

const fetchSubjectData = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: 1,
          name: "Computer Science",
          code: "CS101",
          total: 45,
          present: 38,
          absent: 7,
        },
        {
          id: 2,
          name: "Mathematics II",
          code: "MATH202",
          total: 40,
          present: 30,
          absent: 10,
        },
        {
          id: 3,
          name: "Physics Lab",
          code: "PHY105",
          total: 20,
          present: 18,
          absent: 2,
        },
        {
          id: 4,
          name: "Data Structures",
          code: "CS201",
          total: 35,
          present: 25,
          absent: 10,
        },
      ]);
    }, 1000);
  });
};

const Attendance = () => {
  const router = useRouter();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await fetchSubjectData();
      setSubjects(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const totalClasses = subjects.reduce((sum, s) => sum + s.total, 0);
  const totalPresent = subjects.reduce((sum, s) => sum + s.present, 0);
  const overallPercentage = Math.round((totalPresent / totalClasses) * 100);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORS.background}
        />
        <View style={styles.headerContainer}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>My Attendance</Text>
            <Text style={styles.headerSub}>Track your attendance records</Text>
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/(students)/Student")}
            activeOpacity={0.7}
          >
            <MoveLeft size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.overallCard}>
            <View style={styles.overallHeader}>
              <View>
                <Text style={styles.overallLabel}>Overall Attendance</Text>
                <View style={styles.overallStatsRow}>
                  <Text style={styles.overallPercentage}>
                    {overallPercentage}%
                  </Text>
                  <View
                    style={[
                      styles.overallBadge,
                      overallPercentage >= 75
                        ? styles.badgeGood
                        : styles.badgeWarning,
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {overallPercentage >= 75 ? "On Track" : "Below 75%"}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.overallIcon}>
                <TrendingUp size={32} color={COLORS.primary} />
              </View>
            </View>

            <View style={styles.overallProgressContainer}>
              <View style={styles.overallProgressBg}>
                <View
                  style={[
                    styles.overallProgressFill,
                    {
                      width: `${overallPercentage}%`,
                      backgroundColor:
                        overallPercentage >= 75
                          ? COLORS.success
                          : COLORS.danger,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.overallStatsGrid}>
              <View style={styles.overallStatItem}>
                <Text style={styles.overallStatValue}>{totalClasses}</Text>
                <Text style={styles.overallStatLabel}>Total Classes</Text>
              </View>
              <View style={styles.overallStatDivider} />
              <View style={styles.overallStatItem}>
                <Text
                  style={[styles.overallStatValue, { color: COLORS.success }]}
                >
                  {totalPresent}
                </Text>
                <Text style={styles.overallStatLabel}>Present</Text>
              </View>
              <View style={styles.overallStatDivider} />
              <View style={styles.overallStatItem}>
                <Text
                  style={[styles.overallStatValue, { color: COLORS.danger }]}
                >
                  {totalClasses - totalPresent}
                </Text>
                <Text style={styles.overallStatLabel}>Absent</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Subject-wise Breakdown</Text>

          {subjects.map((subject) => {
            const percentage = Math.round(
              (subject.present / subject.total) * 100,
            );
            const isLow = percentage < 75;

            return (
              <View key={subject.id} style={styles.card}>
                {/* Header Row */}
                <View style={styles.cardHeader}>
                  <View style={styles.titleGroup}>
                    <View style={styles.iconBox}>
                      <BookOpen size={22} color={COLORS.background} />
                    </View>
                    <View style={styles.titleContent}>
                      <Text style={styles.subjectName}>{subject.name}</Text>
                      <Text style={styles.subjectCode}>{subject.code}</Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.percentBadge,
                      isLow ? styles.badgeDanger : styles.badgeSuccess,
                    ]}
                  >
                    <Text
                      style={[
                        styles.percentText,
                        isLow ? styles.textDanger : styles.textSuccess,
                      ]}
                    >
                      {percentage}%
                    </Text>
                  </View>
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressBg}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${percentage}%`,
                          backgroundColor: isLow
                            ? COLORS.danger
                            : COLORS.success,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressLabel}>
                    {isLow ? "Below 75% Target" : "On Track"}
                  </Text>
                </View>

                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Clock size={16} color={COLORS.textSecondary} />
                    <Text style={styles.statValue}>{subject.total}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>

                  <View style={styles.statDivider} />

                  <View style={styles.statItem}>
                    <CheckCircle2 size={16} color={COLORS.success} />
                    <Text style={[styles.statValue, { color: COLORS.success }]}>
                      {subject.present}
                    </Text>
                    <Text style={styles.statLabel}>Present</Text>
                  </View>

                  <View style={styles.statDivider} />

                  <View style={styles.statItem}>
                    <XCircle size={16} color={COLORS.danger} />
                    <Text style={[styles.statValue, { color: COLORS.danger }]}>
                      {subject.absent}
                    </Text>
                    <Text style={styles.statLabel}>Absent</Text>
                  </View>
                </View>
              </View>
            );
          })}
          <View style={styles.footerContainer}>
            <AlertCircle size={16} color={COLORS.textSecondary} />
            <Text style={styles.footerText}>
              Pull down to refresh attendance data
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default Attendance;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // HEADER STYLES
  headerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginLeft: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // SCROLL CONTENT
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // OVERALL CARD
  overallCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    padding: 24,
    marginBottom: 28,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  overallHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  overallLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  overallStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  overallPercentage: {
    fontSize: 40,
    fontWeight: "900",
    color: COLORS.text,
    lineHeight: 44,
  },
  overallBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeGood: {
    backgroundColor: COLORS.success,
  },
  badgeWarning: {
    backgroundColor: COLORS.danger,
  },
  badgeText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: "700",
  },
  overallIcon: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  overallProgressContainer: {
    marginBottom: 20,
  },
  overallProgressBg: {
    height: 10,
    backgroundColor: COLORS.background,
    borderRadius: 5,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  overallProgressFill: {
    height: "100%",
    borderRadius: 5,
  },
  overallStatsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  overallStatItem: {
    alignItems: "center",
    flex: 1,
  },
  overallStatValue: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  overallStatLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  overallStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },

  // SECTION TITLE
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 14,
    marginTop: 8,
  },

  // SUBJECT CARDS
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  titleContent: {
    flex: 1,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  subjectCode: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  percentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  badgeSuccess: {
    backgroundColor: "#E8F5E9",
  },
  badgeDanger: {
    backgroundColor: "#FFEBEE",
  },
  percentText: {
    fontWeight: "800",
    fontSize: 15,
  },
  textSuccess: {
    color: COLORS.success,
  },
  textDanger: {
    color: COLORS.danger,
  },
  progressContainer: {
    marginBottom: 18,
  },
  progressBg: {
    height: 8,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: "right",
    fontWeight: "600",
    fontStyle: "italic",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },

  footerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 24,
    paddingVertical: 12,
    opacity: 0.6,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
});

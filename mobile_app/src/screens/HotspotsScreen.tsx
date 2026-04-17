import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const HOTSPOTS_DATA = [
  { id: 1, title: 'Marina Beach Road', type: 'Popular', x: '75%', y: '35%', intensity: 0.6, count: 42, color: '#FC4C02' },
  { id: 2, title: 'ECR High-Speed Zone', type: 'Danger', x: '65%', y: '75%', intensity: 0.8, count: 12, color: '#ff4444' },
  { id: 3, title: 'Besant Nagar Promenade', x: '70%', y: '45%', type: 'Popular', intensity: 0.5, count: 28, color: '#FC4C02' },
  { id: 4, title: 'OMR Tech Corridor', x: '55%', y: '60%', type: 'Active', intensity: 0.4, count: 35, color: '#FFA500' },
  { id: 5, title: 'Guindy National Park Loop', x: '50%', y: '40%', type: 'Popular', intensity: 0.7, count: 19, color: '#FC4C02' },
];

export default function HotspotsScreen({ navigation }: any) {
  const [selectedHotspot, setSelectedHotspot] = useState<any>(null);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>COMMUNITY <Text style={styles.accent}>HOTSPOTS</Text></Text>
          <Text style={styles.subtitle}>TAMIL NADU, INDIA (SIMULATION)</Text>
        </View>
      </View>

      <View style={styles.mapWrapper}>
        {/* Mock Map Background */}
        <View style={styles.mockMapBg}>
          <View style={styles.gridLinesVertical} />
          <View style={styles.gridLinesHorizontal} />

          {/* Mock Coastal Line for Chennai area */}
          <View style={styles.coastalLine} />

          {/* Hotspot Visuals */}
          {HOTSPOTS_DATA.map((spot) => (
            <TouchableOpacity
              key={spot.id}
              activeOpacity={0.7}
              onPress={() => setSelectedHotspot(spot)}
              style={[styles.mockMarkerContainer, { top: spot.y, left: spot.x }]}
            >
              <View style={[
                styles.mockHeatCircle,
                {
                  width: 60 * spot.intensity,
                  height: 60 * spot.intensity,
                  backgroundColor: spot.color,
                  opacity: 0.3
                }
              ]} />
              <View style={[styles.customMarker, { borderColor: spot.color }]}>
                <View style={[styles.markerInner, { backgroundColor: spot.color }]} />
              </View>
            </TouchableOpacity>
          ))}

          <Text style={styles.mapLabel}>CHENNAI METRO AREA</Text>
        </View>

        <LinearGradient
          colors={['rgba(15,15,15,0.8)', 'transparent', 'transparent', 'rgba(15,15,15,0.8)']}
          style={styles.mapOverlay}
          pointerEvents="none"
        />

        <View style={styles.mapLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FC4C02' }]} />
            <Text style={styles.legendText}>High Activity</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ff4444' }]} />
            <Text style={styles.legendText}>Danger Zone</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {selectedHotspot ? (
          <View style={styles.detailCard}>
             <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>{selectedHotspot.title}</Text>
                <TouchableOpacity onPress={() => setSelectedHotspot(null)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
             </View>
             <View style={styles.detailRow}>
                <View style={styles.detailStat}>
                  <Text style={styles.statSub}>Riders</Text>
                  <Text style={styles.statMain}>{selectedHotspot.count}</Text>
                </View>
                <View style={styles.detailStat}>
                  <Text style={styles.statSub}>Status</Text>
                  <Text style={[styles.statMain, { color: selectedHotspot.color }]}>{selectedHotspot.type}</Text>
                </View>
                <TouchableOpacity style={styles.goBtn}>
                  <Text style={styles.goBtnText}>ROUTE</Text>
                </TouchableOpacity>
             </View>
          </View>
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Active Hotspots</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>3</Text>
              <Text style={styles.statLabel}>Reported Hazards</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>REAL-TIME FEED</Text>

        <View style={styles.activityItem}>
          <View style={styles.activityIcon}>
            <Text style={{ fontSize: 18 }}>🔥</Text>
          </View>
          <View style={styles.activityBody}>
            <Text style={styles.activityText}><Text style={styles.whiteText}>Marina Beach Road</Text> is currently at peak activity.</Text>
            <Text style={styles.activityTime}>2 mins ago</Text>
          </View>
        </View>

        <View style={styles.activityItem}>
          <View style={[styles.activityIcon, { backgroundColor: 'rgba(255,68,68,0.1)' }]}>
            <Text style={{ fontSize: 18 }}>⚠️</Text>
          </View>
          <View style={styles.activityBody}>
            <Text style={styles.activityText}><Text style={styles.whiteText}>ECR Road</Text> has reported heavy crosswinds.</Text>
            <Text style={styles.activityTime}>15 mins ago</Text>
          </View>
        </View>

        <View style={styles.activityItem}>
          <View style={styles.activityIcon}>
            <Text style={{ fontSize: 18 }}>📍</Text>
          </View>
          <View style={styles.activityBody}>
            <Text style={styles.activityText}><Text style={styles.whiteText}>New Squad Group</Text> formed at Besant Nagar.</Text>
            <Text style={styles.activityTime}>45 mins ago</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
    zIndex: 10,
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  backButton: {
    color: '#FC4C02',
    fontSize: 24,
    fontFamily: 'ChakraPetchBold',
  },
  title: {
    color: '#fff',
    fontFamily: 'BebasNeue',
    fontSize: 28,
    letterSpacing: 1,
    lineHeight: 30,
  },
  accent: {
    color: '#FC4C02',
  },
  subtitle: {
    color: '#666',
    fontFamily: 'ChakraPetchBold',
    fontSize: 10,
    letterSpacing: 2,
    marginTop: -2,
  },
  mapWrapper: {
    width: '100%',
    height: 350,
    position: 'relative',
    backgroundColor: '#111',
    overflow: 'hidden',
  },
  mockMapBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111',
  },
  gridLinesVertical: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#1a1a1a',
    left: '25%',
    width: '50%',
  },
  gridLinesHorizontal: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1a1a1a',
    top: '25%',
    height: '50%',
  },
  coastalLine: {
    position: 'absolute',
    right: '15%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#1a2a3a',
    borderStyle: 'dashed',
  },
  mapLabel: {
    position: 'absolute',
    bottom: 60,
    right: 30,
    color: '#333',
    fontFamily: 'ChakraPetchBold',
    fontSize: 12,
    letterSpacing: 2,
  },
  mockMarkerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockHeatCircle: {
    position: 'absolute',
    borderRadius: 100,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  mapLegend: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(26,26,26,0.9)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    color: '#aaa',
    fontFamily: 'ChakraPetch',
    fontSize: 10,
  },
  customMarker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    color: '#666',
    fontFamily: 'ChakraPetchBold',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 15,
    marginTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontFamily: 'BebasNeue',
    fontSize: 32,
  },
  statLabel: {
    color: '#666',
    fontFamily: 'ChakraPetch',
    fontSize: 10,
    marginTop: 4,
  },
  detailCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FC4C02',
    marginBottom: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  detailTitle: {
    color: '#fff',
    fontFamily: 'BebasNeue',
    fontSize: 24,
    letterSpacing: 0.5,
  },
  closeBtn: {
    color: '#666',
    fontSize: 18,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailStat: {
    flex: 1,
  },
  statSub: {
    color: '#666',
    fontFamily: 'ChakraPetch',
    fontSize: 10,
  },
  statMain: {
    color: '#fff',
    fontFamily: 'ChakraPetchBold',
    fontSize: 16,
  },
  goBtn: {
    backgroundColor: '#FC4C02',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  goBtnText: {
    color: '#fff',
    fontFamily: 'ChakraPetchBold',
    fontSize: 14,
  },
  activityItem: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(252,76,2,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityBody: {
    flex: 1,
  },
  activityText: {
    color: '#aaa',
    fontFamily: 'ChakraPetch',
    fontSize: 13,
    lineHeight: 18,
  },
  whiteText: {
    color: '#fff',
    fontFamily: 'ChakraPetchBold',
  },
  activityTime: {
    color: '#555',
    fontFamily: 'ChakraPetch',
    fontSize: 10,
    marginTop: 2,
  },
});

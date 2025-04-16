"use client"

import type React from "react"
import { useMemo } from "react"
import { View, Text, StyleSheet } from "react-native"
import { Calendar, type DateData } from "react-native-calendars"

interface Medication {
  id: number
  name: string
  dosage: string
  times: string[]
  frequency: string
  customFrequency?: string
  firstTakenDate?: string
}

interface MedicationStatus {
  [date: string]: {
    [medicationId: number]: {
      [time: string]: boolean
    }
  }
}

interface AdherenceCalendarProps {
  medications: Medication[]
  medicationStatus: MedicationStatus
  selectedDate: string
  onDateSelect: (date: DateData) => void
  shouldTakeMedication: (medication: Medication, date: string) => boolean
}

// Define colors for different adherence levels
const ADHERENCE_COLORS = {
  high: "#32cd32", // Green for high adherence (90-100%)
  medium: "#ffd700", // Yellow for medium adherence (50-89%)
  low: "#ff4d4d", // Red for low adherence (0-49%)
  none: "#e0e0e0", // Light gray for no medications
  selected: "#4F8EF7", // Blue for selected day
}

// Define gradient colors for the bottom indicator
const GRADIENT_COLORS = {
  0: "#ff4d4d",
  10: "#ff6347",
  20: "#ff7f50",
  30: "#ffa07a",
  40: "#ffb347",
  50: "#ffd700",
  60: "#dfff00",
  70: "#bfff00",
  80: "#9acd32",
  90: "#7cfc00",
  100: "#32cd32",
}

const AdherenceCalendar: React.FC<AdherenceCalendarProps> = ({
  medications,
  medicationStatus,
  selectedDate,
  onDateSelect,
  shouldTakeMedication,
}) => {
  // Calculate adherence for each day
  const markedDates = useMemo(() => {
    const result: any = {}

    // Get all dates from medication status
    const allDates = Object.keys(medicationStatus)

    allDates.forEach((date) => {
      const dateStatus = medicationStatus[date]
      let totalScheduled = 0
      let totalTaken = 0

      // Count medications scheduled for this date
      medications.forEach((med) => {
        if (shouldTakeMedication(med, date)) {
          // Each time slot counts as one scheduled medication
          totalScheduled += med.times.length

          // Count taken medications
          if (dateStatus[med.id]) {
            Object.values(dateStatus[med.id]).forEach((taken) => {
              if (taken === true) {
                totalTaken++
              }
            })
          }
        }
      })

      // Calculate adherence percentage
      let adherencePercent = 0
      if (totalScheduled > 0) {
        adherencePercent = Math.round((totalTaken / totalScheduled) * 100)
      }

      // Map to closest adherence class (0, 10, 20, ..., 100)
      const adherenceClass = Math.floor(adherencePercent / 10) * 10

      // Determine border color based on adherence percentage
      let borderColor = ADHERENCE_COLORS.none
      if (totalScheduled > 0) {
        if (adherencePercent >= 90) {
          borderColor = ADHERENCE_COLORS.high
        } else if (adherencePercent >= 50) {
          borderColor = ADHERENCE_COLORS.medium
        } else {
          borderColor = ADHERENCE_COLORS.low
        }
      }

      // Get gradient color for the bottom indicator
      const gradientColor = GRADIENT_COLORS[adherenceClass as keyof typeof GRADIENT_COLORS] || GRADIENT_COLORS[0]

      // Add to marked dates
      result[date] = {
        customStyles: {
          container: {
            style: {
              borderWidth: date === selectedDate ? 3 : 2,
              borderColor: date === selectedDate ? ADHERENCE_COLORS.selected : borderColor,
              borderRadius: 4,
              overflow: "hidden",
              position: "relative",
            },
          },
          text: {
            style: {
              color: "black", // Ensure text is visible
            },
          },
        },
        // Add dot if there are medications for this day
        marked: totalScheduled > 0,
        // Handle selected date
        selected: date === selectedDate,
        selectedColor: "transparent", // Use our custom styling instead
      }

      // Add tooltip data
      result[date].tooltip = `${adherencePercent}% taken (${totalTaken}/${totalScheduled})`
    })

    // Add selected date if not already in the list
    if (!result[selectedDate]) {
      result[selectedDate] = {
        selected: true,
        selectedColor: "transparent",
        customStyles: {
          container: {
            style: {
              borderWidth: 3,
              borderColor: ADHERENCE_COLORS.selected,
              borderRadius: 4,
            },
          },
        },
      }
    }

    return result
  }, [medications, medicationStatus, selectedDate, shouldTakeMedication])

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={onDateSelect}
        markedDates={markedDates}
        markingType="custom"
        theme={{
          todayTextColor: "#4F8EF7",
          arrowColor: "#4F8EF7",
          // Custom styles for the calendar
          "stylesheet.calendar.main": {
            container: {
              paddingLeft: 0,
              paddingRight: 0,
            },
          },
          "stylesheet.day.basic": {
            base: {
              width: 32,
              height: 32,
              alignItems: "center",
            },
            today: {
              borderColor: "#4F8EF7",
              borderWidth: 1,
            },
            dot: {
              width: 4,
              height: 4,
              marginTop: 1,
              borderRadius: 2,
              opacity: 0, // Hide the default dots
            },
          },
        }}
      />

      {/* Calendar Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendLabel}>0%</Text>
        <View style={styles.legendGradient} />
        <Text style={styles.legendLabel}>100%</Text>
      </View>

      {/* Border Color Legend */}
      <View style={styles.borderLegend}>
        <View style={styles.borderLegendItem}>
          <View style={[styles.borderSample, { borderColor: ADHERENCE_COLORS.low }]} />
          <Text style={styles.borderLegendText}>Low (0-49%)</Text>
        </View>
        <View style={styles.borderLegendItem}>
          <View style={[styles.borderSample, { borderColor: ADHERENCE_COLORS.medium }]} />
          <Text style={styles.borderLegendText}>Medium (50-89%)</Text>
        </View>
        <View style={styles.borderLegendItem}>
          <View style={[styles.borderSample, { borderColor: ADHERENCE_COLORS.high }]} />
          <Text style={styles.borderLegendText}>High (90-100%)</Text>
        </View>
      </View>

      <Text style={styles.legendTitle}>Medication Adherence</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
  },
  legendGradient: {
    height: 20,
    width: 200,
    marginHorizontal: 10,
    borderRadius: 4,
    backgroundColor: "#f8f9fa",
    // Create a gradient effect with a background image
    backgroundImage: "linear-gradient(to right, #ff4d4d 0%, #ff7f50 20%, #ffd700 50%, #9acd32 80%, #32cd32 100%)",
  },
  legendLabel: {
    fontSize: 12,
    color: "#666",
  },
  legendTitle: {
    textAlign: "center",
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#495057",
  },
  // New styles for border color legend
  borderLegend: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
    padding: 10,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  borderLegendItem: {
    alignItems: "center",
    flexDirection: "row",
  },
  borderSample: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderRadius: 4,
    marginRight: 4,
  },
  borderLegendText: {
    fontSize: 10,
    color: "#666",
  },
})

export default AdherenceCalendar

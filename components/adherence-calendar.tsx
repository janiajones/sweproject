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
    const today = new Date().toISOString().split("T")[0]

    // Get all dates from medication status
    const allDates = Object.keys(medicationStatus)

    // Process all dates with medication status
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

      // Determine border color based on adherence percentage
      let borderColor = "#e0e0e0" // Default gray
      if (totalScheduled > 0) {
        if (adherencePercent >= 90) {
          borderColor = "#32cd32" // Green for high adherence
        } else if (adherencePercent >= 50) {
          borderColor = "#ffd700" // Yellow for medium adherence
        } else {
          borderColor = "#ff4d4d" // Red for low adherence
        }
      }

      // Add to marked dates with explicit styling
      result[date] = {
        selected: date === selectedDate,
        selectedColor: date === selectedDate ? "#4F8EF7" : undefined,
        marked: totalScheduled > 0,
        dotColor: "transparent", // Hide the dots
        customStyles: {
          container: {
            backgroundColor: date === selectedDate ? "#e6f0ff" : undefined,
            borderWidth: 2,
            borderColor: date === selectedDate ? "#4F8EF7" : borderColor,
            borderRadius: 5,
          },
          text: {
            color: "black",
            fontWeight: date === today ? "bold" : "normal",
          },
          dot: {
            color: "transparent",
            backgroundColor: "transparent",
            width: 0,
            height: 0,
          },
        },
      }
    })

    // Make sure selected date is marked even if no medication data
    if (!result[selectedDate]) {
      result[selectedDate] = {
        selected: true,
        selectedColor: "#e6f0ff",
        customStyles: {
          container: {
            backgroundColor: "#e6f0ff",
            borderWidth: 2,
            borderColor: "#4F8EF7",
            borderRadius: 5,
          },
          text: {
            color: "black",
            fontWeight: selectedDate === today ? "bold" : "normal",
          },
        },
      }
    }

    // Add today's date if not already marked
    if (!result[today]) {
      result[today] = {
        customStyles: {
          text: {
            color: "#4F8EF7",
            fontWeight: "bold",
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
        hideExtraDays={true}
        enableSwipeMonths={true}
        theme={{
          todayTextColor: "#4F8EF7",
          arrowColor: "#4F8EF7",
          dotColor: "transparent",
          textDayFontSize: 16,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 14,
          // Completely disable dots
          "stylesheet.day.basic": {
            dot: {
              width: 0,
              height: 0,
              opacity: 0,
            },
          },
          "stylesheet.day.period": {
            dot: {
              width: 0,
              height: 0,
              opacity: 0,
            },
          },
        }}
      />

      {/* Legend for adherence levels */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Medication Adherence</Text>

        <View style={styles.legendRow}>
          <View style={[styles.legendBox, { borderColor: "#ff4d4d" }]} />
          <Text style={styles.legendText}>Low (0-49%)</Text>

          <View style={[styles.legendBox, { borderColor: "#ffd700" }]} />
          <Text style={styles.legendText}>Medium (50-89%)</Text>

          <View style={[styles.legendBox, { borderColor: "#32cd32" }]} />
          <Text style={styles.legendText}>High (90-100%)</Text>
        </View>
      </View>
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
  legendContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  legendTitle: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 10,
    color: "#495057",
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },
  legendBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  legendText: {
    fontSize: 12,
    color: "#666",
    marginRight: 15,
  },
})

export default AdherenceCalendar

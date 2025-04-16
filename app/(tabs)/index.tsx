"use client"

import { useState, useEffect } from "react"
import {
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from "react-native"
import type { DateData } from "react-native-calendars"
import { StatusBar } from "expo-status-bar"

// Import the styles from separate file
import { styles } from "../../styles/app-styles"

// Import the new component
import AdherenceCalendar from "../../components/adherence-calendar"

// Define TypeScript interfaces
interface Medication {
  id: number
  name: string
  dosage: string
  times: string[]
  frequency: string
  customFrequency?: string
  firstTakenDate?: string // Track when medication was first taken
}

interface MedicationStatus {
  [date: string]: {
    [medicationId: number]: {
      [time: string]: boolean
    }
  }
}

interface SuccessMessage {
  visible: boolean
  text: string
  type: string
}

// Time options for medications
const TIME_OPTIONS = ["Morning", "Noon", "Afternoon", "Evening", "Bedtime", "Custom"]

// Frequency options
const FREQUENCY_OPTIONS = ["Daily", "Every other day", "Weekly", "Monthly", "Custom"]

// Initial medication data (empty now since we'll add them)
const INITIAL_MEDICATIONS: Medication[] = []

export default function App() {
  const [screen, setScreen] = useState<"home" | "calendar" | "medications" | "addMedication">("home")
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [medications, setMedications] = useState<Medication[]>(INITIAL_MEDICATIONS)
  const [medicationStatus, setMedicationStatus] = useState<MedicationStatus>({})
  const [successMessage, setSuccessMessage] = useState<SuccessMessage>({
    visible: false,
    text: "",
    type: "",
  })
  const [today] = useState<string>(new Date().toISOString().split("T")[0]) // Current date in YYYY-MM-DD format

  // Form state for adding new medication
  const [newMedName, setNewMedName] = useState<string>("")
  const [newMedDosage, setNewMedDosage] = useState<string>("")
  const [selectedTimes, setSelectedTimes] = useState<string[]>([])
  const [customTime, setCustomTime] = useState<string>("")
  const [timeModalVisible, setTimeModalVisible] = useState<boolean>(false)
  const [frequency, setFrequency] = useState<string>("Daily")
  const [frequencyModalVisible, setFrequencyModalVisible] = useState<boolean>(false)
  const [customFrequency, setCustomFrequency] = useState<string>("")
  const [customFrequencyModalVisible, setCustomFrequencyModalVisible] = useState<boolean>(false)

  // Set today's date as default when app loads
  useEffect(() => {
    setSelectedDate(today)
  }, [today])

  const handleDateSelect = (date: DateData) => {
    setSelectedDate(date.dateString)
    setScreen("medications")
  }

  // Function to determine if a medication should be taken on a specific date
  const shouldTakeMedication = (medication: Medication, date: string): boolean => {
    if (!medication.firstTakenDate) {
      // If medication has never been taken, assume it should start today
      return true
    }

    const firstDate = new Date(medication.firstTakenDate)
    const checkDate = new Date(date)

    // Calculate days difference between first taken date and check date
    const diffTime = Math.abs(checkDate.getTime() - firstDate.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    switch (medication.frequency) {
      case "Daily":
        return true
      case "Every other day":
        // Should take if days difference is even (including 0)
        return diffDays % 2 === 0
      case "Weekly":
        // Should take if days difference is divisible by 7
        return diffDays % 7 === 0
      case "Monthly":
        // Check if it's the same day of the month
        return firstDate.getDate() === checkDate.getDate()
      case "Custom":
        // For custom frequency, we'll just show it every day and let the user decide
        return true
      default:
        return true
    }
  }

  // Function to get the next date when medication should be taken
  const getNextDoseDate = (medication: Medication, currentDate: string): string => {
    if (!medication.firstTakenDate || medication.frequency === "Daily" || medication.frequency === "Custom") {
      return "tomorrow"
    }

    const firstDate = new Date(medication.firstTakenDate)
    const checkDate = new Date(currentDate)

    switch (medication.frequency) {
      case "Every other day": {
        const nextDate = new Date(checkDate)
        nextDate.setDate(checkDate.getDate() + 1)
        if (shouldTakeMedication(medication, nextDate.toISOString().split("T")[0])) {
          return "tomorrow"
        } else {
          return "in 2 days"
        }
      }
      case "Weekly": {
        const diffTime = Math.abs(checkDate.getTime() - firstDate.getTime())
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        const daysUntilNext = 7 - (diffDays % 7)
        if (daysUntilNext === 7) return "today"
        if (daysUntilNext === 1) return "tomorrow"
        return `in ${daysUntilNext} days`
      }
      case "Monthly": {
        const nextDate = new Date(checkDate)
        // Find the next occurrence of the same day of month
        if (firstDate.getDate() > checkDate.getDate()) {
          // Later this month
          nextDate.setDate(firstDate.getDate())
          return `on ${nextDate.toLocaleDateString()}`
        } else if (firstDate.getDate() < checkDate.getDate()) {
          // Next month
          nextDate.setMonth(nextDate.getMonth() + 1)
          nextDate.setDate(firstDate.getDate())
          return `on ${nextDate.toLocaleDateString()}`
        } else {
          // Today is the day
          return "today"
        }
      }
      default:
        return "tomorrow"
    }
  }

  const handleMedicationStatus = (id: number, time: string, status: boolean) => {
    const newStatus: MedicationStatus = { ...medicationStatus }
    if (!newStatus[selectedDate]) {
      newStatus[selectedDate] = {}
    }
    if (!newStatus[selectedDate][id]) {
      newStatus[selectedDate][id] = {}
    }
    newStatus[selectedDate][id][time] = status
    setMedicationStatus(newStatus)

    // If this is the first time the medication is marked as taken, record the date
    if (status) {
      const updatedMedications = medications.map((med) => {
        if (med.id === id && !med.firstTakenDate) {
          return { ...med, firstTakenDate: selectedDate }
        }
        return med
      })
      setMedications(updatedMedications)
    }

    // Show success message
    setSuccessMessage({
      visible: true,
      text: `${time} medication marked as ${status ? "taken" : "not taken"}`,
      type: status ? "taken" : "not-taken",
    })

    // Hide success message after 2 seconds
    setTimeout(() => {
      setSuccessMessage({ visible: false, text: "", type: "" })
    }, 2000)
  }

  const toggleTimeSelection = (time: string) => {
    if (time === "Custom") {
      setTimeModalVisible(false)
      setTimeout(() => {
        setCustomFrequencyModalVisible(true)
      }, 300)
      return
    }

    if (selectedTimes.includes(time)) {
      setSelectedTimes(selectedTimes.filter((t) => t !== time))
    } else {
      setSelectedTimes([...selectedTimes, time])
    }
  }

  const addCustomTime = () => {
    if (customTime.trim()) {
      if (!selectedTimes.includes(customTime.trim())) {
        setSelectedTimes([...selectedTimes, customTime.trim()])
      }
      setCustomTime("")
      setCustomFrequencyModalVisible(false)
    } else {
      Alert.alert("Error", "Please enter a custom time")
    }
  }

  const selectFrequency = (freq: string) => {
    setFrequency(freq)
    if (freq === "Custom") {
      setFrequencyModalVisible(false)
      setTimeout(() => {
        setCustomFrequencyModalVisible(true)
      }, 300)
    } else {
      setFrequencyModalVisible(false)
    }
  }

  const handleAddMedication = () => {
    // Validate inputs
    if (!newMedName.trim()) {
      Alert.alert("Error", "Medication name is required")
      return
    }

    if (!newMedDosage.trim()) {
      Alert.alert("Error", "Dosage is required")
      return
    }

    if (selectedTimes.length === 0) {
      Alert.alert("Error", "Please select at least one time for the medication")
      return
    }

    // Create new medication with unique ID
    const newId = medications.length > 0 ? Math.max(...medications.map((med) => med.id)) + 1 : 1

    const newMedication: Medication = {
      id: newId,
      name: newMedName.trim(),
      dosage: newMedDosage.trim(),
      times: selectedTimes,
      frequency: frequency,
      ...(frequency === "Custom" && { customFrequency: customFrequency }),
      // firstTakenDate will be set when the medication is first marked as taken
    }

    // Add to medications list
    setMedications([...medications, newMedication])

    // Show success message
    setSuccessMessage({
      visible: true,
      text: `${newMedName} added successfully`,
      type: "taken",
    })

    // Reset form
    setNewMedName("")
    setNewMedDosage("")
    setSelectedTimes([])
    setFrequency("Daily")
    setCustomFrequency("")

    // Go back to home screen
    setTimeout(() => {
      setSuccessMessage({ visible: false, text: "", type: "" })
      setScreen("home")
    }, 1500)
  }

  const renderHomeScreen = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Medication Tracker</Text>

      <TouchableOpacity style={styles.logButton} onPress={() => setScreen("calendar")}>
        <Text style={styles.logButtonText}>Log Medication</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.addButton} onPress={() => setScreen("addMedication")}>
        <Text style={styles.addButtonText}>Add New Medication</Text>
      </TouchableOpacity>

      {medications.length > 0 ? (
        <View style={styles.medicationSummary}>
          <Text style={styles.summaryTitle}>Your Medications ({medications.length})</Text>
          <ScrollView style={styles.summaryList}>
            {medications.map((med) => (
              <View key={med.id} style={styles.summaryItem}>
                <Text style={styles.summaryName}>{med.name}</Text>
                <Text style={styles.summaryDetails}>{med.dosage}</Text>
                <Text style={styles.summaryDetails}>Times: {med.times.join(", ")}</Text>
                <Text style={styles.summaryDetails}>
                  Frequency: {med.frequency === "Custom" ? med.customFrequency : med.frequency}
                </Text>
                {med.firstTakenDate && <Text style={styles.summaryDetails}>First taken: {med.firstTakenDate}</Text>}
                <View style={styles.scheduleIndicator}>
                  <Text
                    style={[
                      styles.scheduleText,
                      shouldTakeMedication(med, today) ? styles.takeTodayText : styles.skipTodayText,
                    ]}
                  >
                    {shouldTakeMedication(med, today)
                      ? "✓ Take today"
                      : `✗ Skip today (Next dose ${getNextDoseDate(med, today)})`}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No medications added yet. Tap "Add New Medication" to get started.</Text>
        </View>
      )}
    </View>
  )

  // Then modify the renderCalendarScreen function to use the new component
  // This is just the modified part of the function, not the entire App.tsx

  const renderCalendarScreen = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Select Date</Text>

      {/* Replace the standard Calendar with our AdherenceCalendar */}
      <AdherenceCalendar
        medications={medications}
        medicationStatus={medicationStatus}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        shouldTakeMedication={shouldTakeMedication}
      />

      <TouchableOpacity style={styles.backButton} onPress={() => setScreen("home")}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  )

  const renderMedicationsScreen = () => {
    const dateStatus = medicationStatus[selectedDate] || {}

    // Filter medications that should be taken on the selected date
    const medicationsForDate = medications.filter((med) => shouldTakeMedication(med, selectedDate))
    const skippedMedications = medications.filter((med) => !shouldTakeMedication(med, selectedDate))

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Medications for {selectedDate}</Text>

        {medications.length > 0 ? (
          <ScrollView style={styles.medicationList}>
            {medicationsForDate.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Medications to Take Today:</Text>
                {medicationsForDate.map((med) => (
                  <View key={med.id} style={styles.medicationItem}>
                    <View style={styles.medicationHeader}>
                      <Text style={styles.medicationName}>{med.name}</Text>
                      <Text style={styles.medicationDetails}>
                        {med.dosage} - {med.frequency === "Custom" ? med.customFrequency : med.frequency}
                      </Text>
                    </View>

                    {med.times.map((time) => {
                      const isMarkedTaken = dateStatus[med.id]?.[time] === true
                      const isMarkedNotTaken = dateStatus[med.id]?.[time] === false

                      return (
                        <View key={`${med.id}-${time}`} style={styles.timeRow}>
                          <Text style={styles.timeLabel}>{time}</Text>
                          <View style={styles.statusButtons}>
                            <TouchableOpacity
                              style={[styles.statusButton, isMarkedTaken && styles.takenButton]}
                              onPress={() => handleMedicationStatus(med.id, time, true)}
                            >
                              <Text style={styles.statusButtonText}>Taken</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.statusButton, isMarkedNotTaken && styles.notTakenButton]}
                              onPress={() => handleMedicationStatus(med.id, time, false)}
                            >
                              <Text style={styles.statusButtonText}>Not Taken</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )
                    })}
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.noMedicationsCard}>
                <Text style={styles.noMedicationsTitle}>No medications to take today!</Text>
                <Text style={styles.noMedicationsText}>Enjoy your day off from medications.</Text>
              </View>
            )}

            {skippedMedications.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Skipped Today:</Text>
                {skippedMedications.map((med) => (
                  <View key={med.id} style={styles.skippedMedicationItem}>
                    <View style={styles.medicationHeader}>
                      <Text style={styles.medicationName}>{med.name}</Text>
                      <Text style={styles.medicationDetails}>
                        {med.dosage} - {med.frequency === "Custom" ? med.customFrequency : med.frequency}
                      </Text>
                    </View>
                    <View style={styles.skippedInfo}>
                      <Text style={styles.skippedText}>
                        Not scheduled for today. Next dose {getNextDoseDate(med, selectedDate)}.
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No medications added yet. Go back to add medications.</Text>
          </View>
        )}

        {successMessage.visible && (
          <View
            style={[
              styles.successMessage,
              successMessage.type === "taken" ? styles.takenMessage : styles.notTakenMessage,
            ]}
          >
            <Text style={styles.successMessageText}>{successMessage.text}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.backButton} onPress={() => setScreen("calendar")}>
          <Text style={styles.backButtonText}>Back to Calendar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const renderAddMedicationScreen = () => (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.addMedicationContent}>
        <Text style={styles.title}>Add New Medication</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Medication Name</Text>
          <TextInput
            style={styles.input}
            value={newMedName}
            onChangeText={setNewMedName}
            placeholder="Enter medication name"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Dosage</Text>
          <TextInput
            style={styles.input}
            value={newMedDosage}
            onChangeText={setNewMedDosage}
            placeholder="Enter dosage (e.g., 100mg)"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Times of Day</Text>
          <TouchableOpacity style={styles.selectButton} onPress={() => setTimeModalVisible(true)}>
            <Text style={styles.selectButtonText}>
              {selectedTimes.length > 0 ? selectedTimes.join(", ") : "Select times"}
            </Text>
          </TouchableOpacity>
          {selectedTimes.length > 0 && (
            <View style={styles.selectedTimesContainer}>
              {selectedTimes.map((time) => (
                <View key={time} style={styles.selectedTimeTag}>
                  <Text style={styles.selectedTimeText}>{time}</Text>
                  <TouchableOpacity
                    onPress={() => setSelectedTimes(selectedTimes.filter((t) => t !== time))}
                    style={styles.removeTimeButton}
                  >
                    <Text style={styles.removeTimeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Frequency</Text>
          <TouchableOpacity style={styles.selectButton} onPress={() => setFrequencyModalVisible(true)}>
            <Text style={styles.selectButtonText}>
              {frequency === "Custom" ? customFrequency || "Custom" : frequency}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleAddMedication}>
          <Text style={styles.saveButtonText}>Save Medication</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => setScreen("home")}>
          <Text style={styles.backButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Time Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={timeModalVisible}
        onRequestClose={() => setTimeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Times of Day</Text>
            <Text style={styles.modalSubtitle}>Select multiple times when you take this medication</Text>

            {TIME_OPTIONS.map((time) => (
              <TouchableOpacity
                key={time}
                style={[styles.timeOption, selectedTimes.includes(time) && styles.selectedTimeOption]}
                onPress={() => toggleTimeSelection(time)}
              >
                <Text style={[styles.timeOptionText, selectedTimes.includes(time) && styles.selectedTimeOptionText]}>
                  {time}
                </Text>
                {time !== "Custom" && (
                  <View style={styles.checkboxContainer}>
                    <View style={[styles.checkbox, selectedTimes.includes(time) && styles.checkboxSelected]}>
                      {selectedTimes.includes(time) && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.doneButton} onPress={() => setTimeModalVisible(false)}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Frequency Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={frequencyModalVisible}
        onRequestClose={() => setFrequencyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Frequency</Text>

            {FREQUENCY_OPTIONS.map((freq) => (
              <TouchableOpacity
                key={freq}
                style={[styles.timeOption, frequency === freq && styles.selectedTimeOption]}
                onPress={() => selectFrequency(freq)}
              >
                <Text style={[styles.timeOptionText, frequency === freq && styles.selectedTimeOptionText]}>{freq}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.cancelButton} onPress={() => setFrequencyModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Input Modal (for both custom time and custom frequency) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={customFrequencyModalVisible}
        onRequestClose={() => setCustomFrequencyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {frequency === "Custom" ? "Enter Custom Frequency" : "Enter Custom Time"}
            </Text>

            <TextInput
              style={styles.customInput}
              value={frequency === "Custom" ? customFrequency : customTime}
              onChangeText={frequency === "Custom" ? setCustomFrequency : setCustomTime}
              placeholder={
                frequency === "Custom" ? "E.g., Every 3 days, Twice weekly" : "E.g., 2:30 PM, Before breakfast"
              }
            />

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => {
                if (frequency === "Custom") {
                  if (customFrequency.trim()) {
                    setCustomFrequencyModalVisible(false)
                  } else {
                    Alert.alert("Error", "Please enter a custom frequency")
                  }
                } else {
                  addCustomTime()
                }
              }}
            >
              <Text style={styles.doneButtonText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setCustomFrequencyModalVisible(false)
                if (frequency === "Custom" && !customFrequency) {
                  setFrequency("Daily")
                }
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {successMessage.visible && (
        <View style={[styles.successMessage, styles.takenMessage]}>
          <Text style={styles.successMessageText}>{successMessage.text}</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  )

  let content
  switch (screen) {
    case "home":
      content = renderHomeScreen()
      break
    case "calendar":
      content = renderCalendarScreen()
      break
    case "medications":
      content = renderMedicationsScreen()
      break
    case "addMedication":
      content = renderAddMedicationScreen()
      break
    default:
      content = renderHomeScreen()
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {content}
      <StatusBar style="auto" />
    </SafeAreaView>
  )
}
